import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, addDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { Game as GameType, Player, Unit, ExtraExpense } from '@/types'
import { FactionDocument } from '@/types/faction'
import { getAllFactions } from '@/lib/factionService'
import GameBoard from '@/components/GameBoard'
import OrdersPanel from '@/components/OrdersPanel'
import TurnIndicator from '@/components/TurnIndicator'
import DiplomaticChat from '@/components/DiplomaticChat'
import TreasuryPanel from '@/components/TreasuryPanel'
import TurnHistory from '@/components/TurnHistory'
import VictoryScreen from '@/components/VictoryScreen'
import FamineMitigationPanel from '@/components/FamineMitigationPanel'
import InactivePlayerVoting from '@/components/InactivePlayerVoting'
import ProvinceInfoPanel from '@/components/ProvinceInfoPanel'

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Estado
  const [game, setGame] = useState<GameType | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [factions, setFactions] = useState<FactionDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado del mapa
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)

  // Estado de la pestaña activa (chat, órdenes o historial)
  const [activeTab, setActiveTab] = useState<'orders' | 'chat' | 'history'>('orders')

  // Estado para forzar avance de fase (testing)
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false)

  // Cargar datos de la partida
  useEffect(() => {
    if (!gameId || !user) {
      navigate('/lobby')
      return
    }

    const loadGameData = async () => {
      try {
        // Cargar partida
        const gameDoc = await getDoc(doc(db, 'games', gameId))
        if (!gameDoc.exists()) {
          setError('Partida no encontrada')
          return
        }

        const gameData = { id: gameDoc.id, ...gameDoc.data() } as GameType
        setGame(gameData)

        // Buscar jugador actual
        const playersQuery = query(
          collection(db, 'players'),
          where('gameId', '==', gameId),
          where('userId', '==', user.uid)
        )
        const playersSnapshot = await getDocs(playersQuery)

        if (!playersSnapshot.empty) {
          const playerDoc = playersSnapshot.docs[0]
          setPlayer({ id: playerDoc.id, ...playerDoc.data() } as Player)
        } else {
          setError('No estás en esta partida')
          return
        }

        setLoading(false)
      } catch (err) {
        console.error('Error cargando partida:', err)
        setError('Error al cargar la partida')
        setLoading(false)
      }
    }

    loadGameData()
  }, [gameId, user, navigate])

  // Suscribirse al juego (en tiempo real)
  // Las unidades ahora están embebidas en el documento de la partida
  useEffect(() => {
    if (!gameId) return

    const unsubscribe = onSnapshot(doc(db, 'games', gameId), (snapshot) => {
      if (snapshot.exists()) {
        const gameData = { id: snapshot.id, ...snapshot.data() } as GameType
        setGame(gameData)

        // Extraer unidades embebidas
        setUnits(gameData.units || [])
      }
    })

    return () => unsubscribe()
  }, [gameId])

  // Cargar facciones dinámicas desde Firestore
  useEffect(() => {
    const loadFactions = async () => {
      try {
        const loadedFactions = await getAllFactions()
        console.log('[Game] Facciones cargadas:', loadedFactions.length)
        setFactions(loadedFactions)
      } catch (err) {
        console.error('[Game] Error cargando facciones:', err)
      }
    }

    loadFactions()
  }, [])

  // Suscribirse a jugadores
  useEffect(() => {
    if (!gameId) return

    const playersQuery = query(
      collection(db, 'players'),
      where('gameId', '==', gameId)
    )

    const unsubscribe = onSnapshot(playersQuery, (snapshot) => {
      const playersData: Player[] = []
      snapshot.forEach((doc) => {
        playersData.push({ id: doc.id, ...doc.data() } as Player)
      })
      setPlayers(playersData)
    })

    return () => unsubscribe()
  }, [gameId])

  // Calcular mapeo de jugadores a facciones y control de provincias
  // IMPORTANTE: Esto debe estar ANTES de cualquier return early (reglas de hooks)
  // NOTA: playerFactions comentado temporalmente (no usado actualmente)
  // const playerFactions: Record<string, string> = useMemo(() => {
  //   const result: Record<string, string> = {}
  //   players.forEach((p) => {
  //     result[p.id] = p.faction
  //   })

  //   // Agregar facciones sin jugador asignado al mapeo
  //   if (game?.scenarioData) {
  //     game.scenarioData.availableFactions.forEach((factionId) => {
  //       if (!players.some((p) => p.faction === factionId)) {
  //         result[factionId] = factionId
  //       }
  //     })
  //   }

  //   return result
  // }, [players, game])

  const provinceFaction = useMemo(() => {
    const result: Record<string, string> = {}

    if (!game) return result

    // Usar scenarioData para obtener el control inicial de provincias
    if (game.scenarioData) {
      game.scenarioData.factionSetups.forEach((factionSetup) => {
        factionSetup.provinces.forEach((provinceId) => {
          result[provinceId] = factionSetup.factionId
        })
      })
    }

    // Actualizar con las ciudades controladas por jugadores (basándose en player.cities)
    players.forEach((p) => {
      if (p.cities) {
        p.cities.forEach((cityId) => {
          result[cityId] = p.faction
        })
      }
    })

    return result
  }, [players, game])

  // Calcular provincias controladas por el jugador (basado en guarniciones)
  const myControlledProvinces = useMemo(() => {
    if (!player) return []
    return units
      .filter(u => u.owner === player.id && u.type === 'garrison')
      .map(u => u.currentPosition)
  }, [units, player])

  // Filtrar unidades visibles (fog of war)
  const visibleUnits = useMemo(() => {
    if (!player) return []

    return units.filter(unit => {
      // Ver todas las unidades propias
      if (unit.owner === player.id) return true

      // Ver unidades en territorio controlado
      if (myControlledProvinces.includes(unit.currentPosition)) return true

      // No ver unidades enemigas
      return false
    })
  }, [units, player, myControlledProvinces])

  // Handlers (usar useCallback para evitar recreación en cada render)
  const handleProvinceClick = useCallback((provinceId: string) => {
    setSelectedProvince(provinceId)
    setSelectedUnit(null)
  }, [])

  const handleUnitClick = useCallback((unit: Unit) => {
    setSelectedUnit(unit)
    setSelectedProvince(unit.currentPosition)
  }, [])

  const handleBackToLobby = () => {
    navigate('/lobby')
  }

  const handleForcePhaseAdvance = async () => {
    if (!gameId || !game) return

    // Confirmar acción
    if (!confirm('¿Estás seguro de que quieres forzar el avance de fase? Esta acción procesará el turno inmediatamente.')) {
      return
    }

    setIsAdvancingPhase(true)

    try {
      const functions = getFunctions()
      const forcePhaseAdvance = httpsCallable(functions, 'forcePhaseAdvance')

      await forcePhaseAdvance({ gameId })

      alert('Fase avanzada exitosamente')
    } catch (error: any) {
      console.error('Error forzando avance de fase:', error)
      alert(`Error: ${error.message || 'No se pudo forzar el avance de fase'}`)
    } finally {
      setIsAdvancingPhase(false)
    }
  }

  const handleMitigateFamine = async (provinceId: string) => {
    if (!gameId || !player || !game) {
      throw new Error('Missing game or player data')
    }

    try {
      // Crear el gasto extra
      const expense: ExtraExpense = {
        type: 'remove_famine',
        target: provinceId,
        cost: 3,
        description: `Mitigar hambruna en ${provinceId}`
      }

      // Buscar documento de órdenes existente para este turno
      const ordersQuery = query(
        collection(db, 'orders'),
        where('playerId', '==', player.id),
        where('turnNumber', '==', game.turnNumber)
      )
      const ordersSnapshot = await getDocs(ordersQuery)

      if (!ordersSnapshot.empty) {
        // Ya existe un documento de órdenes, actualizar
        const orderDoc = ordersSnapshot.docs[0]
        const existingData = orderDoc.data()
        const existingExpenses = existingData.extraExpenses || []

        // Verificar si ya pagó por esta provincia
        const alreadyPaid = existingExpenses.some(
          (e: ExtraExpense) => e.type === 'remove_famine' && e.target === provinceId
        )

        if (alreadyPaid) {
          throw new Error('Ya has pagado para mitigar esta hambruna')
        }

        await updateDoc(doc(db, 'orders', orderDoc.id), {
          extraExpenses: [...existingExpenses, expense]
        })
      } else {
        // Crear nuevo documento de órdenes con el gasto
        await addDoc(collection(db, 'orders'), {
          playerId: player.id,
          gameId: gameId,
          turnNumber: game.turnNumber,
          phase: 'orders',
          orders: [],
          extraExpenses: [expense],
          submittedAt: Timestamp.now()
        })
      }

      // Actualizar el tesoro del jugador localmente (optimistic update)
      setPlayer(prev => prev ? { ...prev, treasury: prev.treasury - 3 } : null)
    } catch (error) {
      console.error('Error saving famine mitigation:', error)
      throw error
    }
  }

  // Loading y error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Cargando partida...</div>
      </div>
    )
  }

  if (error || !game || !player) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error || 'No se pudo cargar la partida'}</p>
          <button
            onClick={handleBackToLobby}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Volver al Lobby
          </button>
        </div>
      </div>
    )
  }

  // Si el juego está terminado, mostrar pantalla de victoria
  if (game.status === 'finished') {
    return (
      <VictoryScreen
        game={game}
        players={players}
        units={units}
        currentPlayer={player}
        onBackToLobby={handleBackToLobby}
      />
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{game.name || game.scenario}</h1>
            <div className="flex gap-4 text-sm text-gray-400 mt-1">
              <span>Turno {game.turnNumber}</span>
              <span>•</span>
              <span>{game.currentYear} - {game.currentSeason}</span>
              <span>•</span>
              <span className="capitalize">{game.currentPhase}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Jugando como:</div>
              <div className="font-bold">{player.faction}</div>
            </div>
            {/* Botón para forzar avance de fase (solo visible para el creador) */}
            {game.createdBy === user?.uid && (
              <button
                onClick={handleForcePhaseAdvance}
                disabled={isAdvancingPhase}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
                title="Forzar avance de fase (solo para testing)"
              >
                {isAdvancingPhase ? '⏳ Avanzando...' : '⚡ Forzar Avance'}
              </button>
            )}
            <button
              onClick={handleBackToLobby}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Volver al Lobby
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Mapa */}
        <div className="flex-1 p-4 overflow-hidden">
          <GameBoard
            onProvinceClick={handleProvinceClick}
            selectedProvince={selectedProvince}
            famineProvinces={(game as any).famineProvinces || []}
            provinceFaction={provinceFaction}
            factions={factions}
          />
        </div>

        {/* Panel lateral */}
        <aside className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col overflow-y-auto">
          {/* Paneles superiores - agrupados para no colapsar */}
          <div className="flex-shrink-0">
            {/* TurnIndicator con información de turno y countdown */}
            <div className="p-4 border-b border-gray-700">
              <TurnIndicator game={game} />
            </div>

            {/* TreasuryPanel - Información económica */}
            <div className="p-4 border-b border-gray-700">
              <TreasuryPanel
                player={player}
                units={visibleUnits}
                currentSeason={game.currentSeason}
                gameMap={game.map || { provinces: {}, adjacencies: {} }}
              />
            </div>

            {/* FamineMitigationPanel - Mitigar hambrunas */}
            {(game as any).famineProvinces && (game as any).famineProvinces.length > 0 && (
              <div className="p-4 border-b border-gray-700">
                <FamineMitigationPanel
                  game={game}
                  player={player}
                  units={visibleUnits}
                  famineProvinces={(game as any).famineProvinces}
                  currentPhase={game.currentPhase}
                  onMitigateFamine={handleMitigateFamine}
                />
              </div>
            )}

            {/* InactivePlayerVoting - Votar sobre jugadores inactivos */}
            {players.some(p => p.status === 'inactive') && (
              <div className="p-4 border-b border-gray-700">
                <InactivePlayerVoting
                  gameId={gameId!}
                  currentPlayer={player}
                  players={players}
                />
              </div>
            )}

            {/* Información de provincia seleccionada */}
            <ProvinceInfoPanel
              game={game}
              provinceId={selectedProvince}
              visibleUnits={visibleUnits}
              players={players}
              currentPlayer={player}
              controlledProvinces={myControlledProvinces}
              provinceFaction={provinceFaction}
            />
          </div>

          {/* Tabs de navegación */}
          <div className="flex border-b border-gray-700 flex-shrink-0">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 px-3 py-3 font-medium text-sm transition-colors ${
                activeTab === 'orders'
                  ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-500'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              ⚔️ Órdenes
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-3 py-3 font-medium text-sm transition-colors ${
                activeTab === 'chat'
                  ? 'bg-gray-900 text-purple-400 border-b-2 border-purple-500'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              💬 Diplomacia
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-3 py-3 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'bg-gray-900 text-yellow-400 border-b-2 border-yellow-500'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              📜 Historial
            </button>
          </div>

          {/* Contenido de las pestañas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'orders' ? (
              <OrdersPanel
                game={game}
                player={player}
                units={visibleUnits}
                selectedUnit={selectedUnit}
                onUnitSelect={handleUnitClick}
                currentPhase={game.currentPhase}
                turnNumber={game.turnNumber}
              />
            ) : activeTab === 'chat' ? (
              <DiplomaticChat
                gameId={gameId!}
                currentPlayer={player}
                players={players}
                currentPhase={game.currentPhase}
                turnNumber={game.turnNumber}
              />
            ) : (
              <TurnHistory gameId={gameId!} />
            )}
          </div>

          {/* Jugadores */}
          <div className="p-4 border-t border-gray-700 flex-shrink-0">
            <h3 className="font-bold mb-2">Jugadores ({players.length})</h3>
            <div className="space-y-1 text-sm">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex justify-between items-center ${
                    p.id === player.id ? 'text-blue-400 font-bold' : 'text-gray-300'
                  }`}
                >
                  <span>{p.faction}</span>
                  <span className="text-xs text-gray-500">
                    {p.isAlive ? '✓ Vivo' : '✗ Eliminado'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
