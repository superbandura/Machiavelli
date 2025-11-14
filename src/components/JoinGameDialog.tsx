import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, setDoc, updateDoc, doc, getDoc, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { FACTIONS } from '@/data/factions'

interface JoinGameDialogProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  gameName: string
  maxPlayers: number
  onJoined?: (gameId: string) => void
}

interface FactionOption {
  id: string
  name: string
  color: string
  available: boolean
}

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
      <div className="bg-gray-800 rounded-lg max-w-lg w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Unirse a Partida</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium text-white mb-2">{gameName}</h3>
              <p className="text-sm text-gray-400">
                Selecciona una facción para jugar
              </p>
            </div>

            {/* Facciones */}
            {loadingFactions ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-gray-400">Cargando facciones...</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableFactions.map((faction) => (
                  <button
                    key={faction.id}
                    onClick={() => faction.available && setSelectedFaction(faction.id)}
                    disabled={!faction.available}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedFaction === faction.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : faction.available
                        ? 'border-gray-600 hover:border-gray-500 bg-gray-700'
                        : 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: faction.color }}
                      />
                      <div className="flex-1">
                        <div className="font-bold text-white">{faction.name}</div>
                        {!faction.available && (
                          <div className="text-xs text-red-400">Ya ocupada</div>
                        )}
                      </div>
                      {selectedFaction === faction.id && (
                        <div className="text-blue-400">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Información adicional */}
            <div className="bg-gray-900 rounded-lg p-3 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Jugadores:</span>
                <span className="text-white font-medium">
                  {availableFactions.filter(f => !f.available).length} / {maxPlayers}
                </span>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || !selectedFaction || loadingFactions}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
