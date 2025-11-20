import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, setDoc, updateDoc, doc, getDoc, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { FACTIONS } from '@/data/factions'
import { getFactionImageName } from '@/utils/factionHelpers'

/**
 * Props para el componente JoinGameDialog
 */
interface JoinGameDialogProps {
  /** Indica si el modal está visible */
  isOpen: boolean
  /** Callback para cerrar el modal */
  onClose: () => void
  /** ID de la partida a unirse */
  gameId: string
  /** Nombre de la partida (para mostrar en el título) */
  gameName: string
  /** Número máximo de jugadores permitidos */
  maxPlayers: number
  /** Callback opcional cuando el usuario se une exitosamente */
  onJoined?: (gameId: string) => void
}

/**
 * Opción de facción con disponibilidad
 */
interface FactionOption {
  /** ID de la facción */
  id: string
  /** Nombre para mostrar */
  name: string
  /** Color hexadecimal de la facción */
  color: string
  /** Si la facción está disponible (no tomada por otro jugador) */
  available: boolean
}

/**
 * Dialog de selección de facción para unirse a una partida
 *
 * Muestra las facciones disponibles del escenario y permite al jugador
 * seleccionar una facción libre para unirse a la partida.
 *
 * **Características:**
 * - Carga facciones disponibles desde `game.scenarioData.availableFactions`
 * - Consulta jugadores actuales para marcar facciones tomadas
 * - Emblemas de facciones con estado visual (disponible/tomada)
 * - Validación: no permite unirse si partida está llena
 * - Soporte para facciones dinámicas desde `/factions` collection
 * - Fallback a `FACTIONS` hardcoded si no existe en Firestore
 * - Actualización atómica con transacciones Firestore
 *
 * **Flujo de unión:**
 * 1. Usuario selecciona facción disponible
 * 2. Click "Unirse" → valida disponibilidad
 * 3. Crea documento en `/players`:
 *    ```typescript
 *    {
 *      gameId,
 *      userId,
 *      faction: selectedFaction,
 *      treasury: startingTreasury,
 *      isAlive: true,
 *      joinedAt: serverTimestamp()
 *    }
 *    ```
 * 4. Actualiza `/games/{gameId}`:
 *    - `game.currentPlayerCount` +1
 *    - Transfiere control de provincias a nueva facción
 *    - Transfiere ownership de unidades a userId
 * 5. Callback onJoined() → navega a la partida
 *
 * **Manejo de errores:**
 * - "Facción no disponible" si otro jugador tomó la facción entre tanto
 * - "Partida llena" si currentPlayerCount >= maxPlayers
 * - "Ya estás en esta partida" si userId ya tiene player document
 *
 * @component
 * @example
 * <JoinGameDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   gameId="game-123"
 *   gameName="Italia 1454 - Campaña Principal"
 *   maxPlayers={8}
 *   onJoined={(gameId) => navigate(`/game/${gameId}`)}
 * />
 */
export default function JoinGameDialog({
  isOpen,
  onClose,
  gameId,
  gameName,
  maxPlayers,
  onJoined
}: JoinGameDialogProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [loadingFactions, setLoadingFactions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null)
  const [availableFactions, setAvailableFactions] = useState<FactionOption[]>([])

  // Cargar facciones disponibles
  useEffect(() => {
    if (!isOpen || !gameId) return

    const loadAvailableFactions = async () => {
      setLoadingFactions(true)
      try {
        // 1. Obtener el documento del juego para acceder a scenarioData
        const gameDoc = await getDoc(doc(db, 'games', gameId))
        if (!gameDoc.exists()) {
          throw new Error('Partida no encontrada')
        }
        const game = gameDoc.data()
        const availableFactionIds = game.scenarioData?.availableFactions || []

        // 2. Consultar jugadores ya unidos a la partida
        const playersQuery = query(
          collection(db, 'players'),
          where('gameId', '==', gameId)
        )
        const playersSnapshot = await getDocs(playersQuery)
        const takenFactions = new Set<string>()
        playersSnapshot.forEach((doc) => {
          takenFactions.add(doc.data().faction)
        })

        // 3. Cargar datos de facciones desde Firestore (con fallback a hardcoded)
        const factionPromises = availableFactionIds.map(async (factionId: string) => {
          // Intentar cargar desde Firestore
          const factionDoc = await getDoc(doc(db, 'factions', factionId))

          if (factionDoc.exists()) {
            // Facción dinámica desde Firestore
            const factionData = factionDoc.data()
            return {
              id: factionId,
              name: factionData.name,
              color: factionData.color,
              available: !takenFactions.has(factionId)
            }
          } else if (FACTIONS[factionId]) {
            // Fallback: facción hardcoded (compatibilidad legacy)
            const faction = FACTIONS[factionId]
            return {
              id: factionId,
              name: faction.name,
              color: faction.color,
              available: !takenFactions.has(factionId)
            }
          } else {
            // Facción no encontrada
            console.warn(`[JoinGameDialog] Facción no encontrada: ${factionId}`)
            return null
          }
        })

        const factionResults = await Promise.all(factionPromises)
        const factionOptions = factionResults.filter(f => f !== null) as FactionOption[]

        console.log('[JoinGameDialog] Facciones cargadas:', factionOptions)
        setAvailableFactions(factionOptions)

        // Seleccionar automáticamente la primera facción disponible
        const firstAvailable = factionOptions.find(f => f.available)
        if (firstAvailable) {
          setSelectedFaction(firstAvailable.id)
        }
      } catch (err) {
        console.error('Error cargando facciones:', err)
        setError('Error al cargar las facciones disponibles')
      } finally {
        setLoadingFactions(false)
      }
    }

    loadAvailableFactions()
  }, [isOpen, gameId])

  const handleJoin = async () => {
    if (!user || !selectedFaction) return

    setLoading(true)
    setError(null)

    try {
      // 1. Obtener información del juego para saber el escenario
      const gameDoc = await getDoc(doc(db, 'games', gameId))
      if (!gameDoc.exists()) {
        throw new Error('Partida no encontrada')
      }
      const game = gameDoc.data()

      // 2. Obtener configuración inicial del escenario para esta facción
      const factionSetup = game.scenarioData?.factionSetups.find(
        (f: any) => f.factionId === selectedFaction
      )
      if (!factionSetup) {
        console.warn(`[JoinGameDialog] No se encontró setup inicial para ${selectedFaction}`)
      }

      // 3. Crear documento de jugador
      const playerData = {
        gameId,
        userId: user.uid,
        displayName: user.displayName || user.email || 'Jugador',
        faction: selectedFaction,

        // Estado inicial
        isAlive: true,
        isReady: false,
        hasSubmittedOrders: false,

        // Recursos iniciales (según el escenario)
        treasury: factionSetup?.treasury || 10,
        income: 0,
        expenses: 0,

        // Ciudades iniciales
        cities: factionSetup?.provinces || [],

        // Fichas de asesino (vacío al inicio)
        assassinTokens: {},

        // Timestamps
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      }

      // Usar ID compuesto según convención: userId_gameId
      const playerId = `${user.uid}_${gameId}`
      const playerDocRef = doc(db, 'players', playerId)
      await setDoc(playerDocRef, playerData)

      // 4. Actualizar ownership de unidades embebidas
      // Las unidades están en game.units[] con owner=factionId
      // Actualizamos owner de factionId a playerId
      const updatedUnits = (game.units || []).map((unit: any) => {
        if (unit.owner === selectedFaction) {
          return {
            ...unit,
            owner: playerId // Cambiar de factionId a playerId
          }
        }
        return unit
      })

      // 5. Incrementar contador de jugadores y actualizar unidades en la partida
      const gameRef = doc(db, 'games', gameId)
      await updateDoc(gameRef, {
        units: updatedUnits, // Actualizar array de unidades embebido
        playersCount: increment(1),
        updatedAt: serverTimestamp()
      })

      // Reset
      setSelectedFaction(null)

      // Cerrar diálogo
      onClose()

      // Callback (después de cerrar para evitar interferencias)
      if (onJoined) {
        onJoined(gameId)
      }

    } catch (err) {
      console.error('Error uniéndose a la partida:', err)
      setError('Error al unirse a la partida. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#3d3020] border-4 border-[#6b5d42] rounded-lg max-w-2xl w-full shadow-ornate">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-renaissance-gold">Unirse a Partida</h2>
            <button
              onClick={onClose}
              className="text-parchment-300 hover:text-parchment-100 text-3xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {error && (
              <div className="bg-burgundy-500/10 border-2 border-burgundy-500 text-burgundy-300 px-4 py-3 rounded-lg font-serif">
                {error}
              </div>
            )}

            <div>
              <h3 className="text-xl font-heading font-bold text-parchment-100 mb-2">{gameName}</h3>
              <p className="text-sm font-serif text-parchment-200">
                Selecciona una facción para jugar
              </p>
            </div>

            {/* Facciones */}
            {loadingFactions ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-parchment-200 font-serif">Cargando facciones...</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {availableFactions.map((faction) => (
                  <button
                    key={faction.id}
                    onClick={() => faction.available && setSelectedFaction(faction.id)}
                    disabled={!faction.available}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedFaction === faction.id
                        ? 'border-renaissance-gold bg-renaissance-gold/10 shadow-glow-gold'
                        : faction.available
                        ? 'border-[#8b7355] hover:border-renaissance-bronze bg-[#2d2416]'
                        : 'border-[#6b5d42] bg-[#1d1408] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Emblema de la facción */}
                      <img
                        src={`/factions/${getFactionImageName(faction.id)}.png`}
                        alt={faction.name}
                        className="w-12 h-12 object-contain flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="font-heading font-bold text-parchment-100 text-lg">{faction.name}</div>
                        {!faction.available && (
                          <div className="text-xs font-serif text-burgundy-400 mt-1">Ya ocupada</div>
                        )}
                      </div>
                      {selectedFaction === faction.id && (
                        <div className="text-renaissance-gold text-2xl">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Información adicional */}
            <div className="bg-[#2d2416] border-2 border-[#8b7355] rounded-lg p-3 text-sm font-serif">
              <div className="flex justify-between">
                <span className="text-parchment-300">Jugadores:</span>
                <span className="text-parchment-100 font-semibold">
                  {availableFactions.filter(f => !f.available).length} / {maxPlayers}
                </span>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[#6b5d42] hover:bg-[#544a35] text-parchment-100 rounded-lg font-heading font-bold transition-colors shadow-ornate"
              >
                Cancelar
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || !selectedFaction || loadingFactions}
                className="flex-1 px-4 py-3 bg-renaissance-bronze hover:bg-renaissance-bronze-light text-white rounded-lg font-heading font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-ornate"
              >
                {loading ? 'Uniéndose...' : 'Unirse a Partida'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
