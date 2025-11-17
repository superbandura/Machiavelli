import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, addDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { Game as GameType, Player, Unit, ExtraExpense } from '@/types'
import { FactionDocument } from '@/types/faction'
import { getAllFactions } from '@/lib/factionService'
import { getFactionImageName } from '@/utils/factionHelpers'
import GameBoard from '@/components/GameBoard'
// OrdersPanel removido - ahora se usa OrdersModal desde ProvinceInfoPanel
import TurnIndicator from '@/components/TurnIndicator'
import DiplomaticChat from '@/components/DiplomaticChat'
import DiplomacyModal from '@/components/DiplomacyModal'
import TreasuryPanel from '@/components/TreasuryPanel'
import TurnHistory from '@/components/TurnHistory'
import VictoryScreen from '@/components/VictoryScreen'
import FamineMitigationPanel from '@/components/FamineMitigationPanel'
import InactivePlayerVoting from '@/components/InactivePlayerVoting'
import ProvinceInfoPanel from '@/components/ProvinceInfoPanel'
import UnitManagementModal from '@/components/UnitManagementModal'
import HeaderTreasuryInfo from '@/components/HeaderTreasuryInfo'

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

  // Estado de la pestaña activa (chat o historial)
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat')

  // Estado para forzar avance de fase (testing)
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false)

  // Estado del modal de diplomacia
  const [isDiplomacyModalOpen, setIsDiplomacyModalOpen] = useState(false)

  // Estado del modal de gestión de unidades
  const [unitManagementModalUnit, setUnitManagementModalUnit] = useState<Unit | null>(null)

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

  // Listener en tiempo real para el currentPlayer (actualiza treasury automáticamente)
  useEffect(() => {
    if (!player?.id) return

    const playerDocRef = doc(db, 'players', player.id)

    const unsubscribe = onSnapshot(playerDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setPlayer({ id: snapshot.id, ...snapshot.data() } as Player)
      }
    })

    return () => unsubscribe()
  }, [player?.id])

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

    // Actualizar con las provincias controladas por jugadores (basándose en guarniciones)
    units
      .filter(u => u.type === 'garrison')
      .forEach((garrison) => {
        const owner = players.find(p => p.id === garrison.owner)
        if (owner) {
          result[garrison.currentPosition] = owner.faction
        }
      })

    return result
  }, [players, game, units])

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
    <div className="h-screen overflow-hidden bg-[#f4e4c1] text-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-[#2d2416] border-b border-[#1d1408] p-4">
        <div className="flex justify-between items-center">
          {/* Panel izquierdo - Info de partida + Fase + Tiempo + Tesoro */}
          <div className="flex items-center gap-3">
            {/* Info de la partida */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#1d1408] rounded-lg border border-[#8b7355]">
              {/* Emblema de la facción */}
              <img
                src={`/factions/${getFactionImageName(player.faction)}.png`}
                alt={player.faction}
                className="w-8 h-8 object-contain"
                title={player.faction}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="h-8 w-px bg-[#8b7355]"></div>
              <img
                src="/icons/mapa.png"
                alt="Partida"
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div>
                <div className="text-[10px] text-[#c9a961] uppercase tracking-wider">Partida</div>
                <div className="text-base font-bold text-[#f4e4c1] leading-tight">{game.name || game.scenario}</div>
              </div>
              <div className="h-8 w-px bg-[#8b7355] mx-2"></div>
              <div>
                <div className="text-[10px] text-[#c9a961] uppercase tracking-wider">Turno</div>
                <div className="text-base font-bold text-[#f4e4c1] leading-tight">{game.turnNumber}</div>
              </div>
              <div className="h-8 w-px bg-[#8b7355] mx-2"></div>
              <div>
                <div className="text-[10px] text-[#c9a961] uppercase tracking-wider">Año</div>
                <div className="text-base font-bold text-[#f4e4c1] leading-tight">
                  {game.currentYear} - {
                    game.currentSeason === 'spring' ? 'Primavera' :
                    game.currentSeason === 'summer' ? 'Verano' :
                    game.currentSeason === 'fall' ? 'Otoño' :
                    game.currentSeason
                  }
                </div>
              </div>
            </div>

            {/* Panel de fase, tiempo y tesoro */}
            <HeaderTreasuryInfo
              player={player}
              factions={factions}
              units={visibleUnits}
              gameMap={game.map || { provinces: {}, adjacencies: {} }}
              provinceFaction={provinceFaction}
              currentSeason={game.currentSeason}
              game={game}
              onDiplomacyClick={() => setIsDiplomacyModalOpen(true)}
            />
          </div>

          {/* Botones derecha */}
          <div className="flex items-center gap-3">
            {/* Botón para forzar avance de fase (solo visible para el creador) */}
            {game.createdBy === user?.uid && (
              <button
                onClick={handleForcePhaseAdvance}
                disabled={isAdvancingPhase}
                className="p-2 bg-[#1d1408] hover:bg-[#2d2416] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-[#8b7355] hover:border-[#c9a961] transition-colors"
                title="Forzar avance de fase (solo para testing)"
              >
                <img
                  src="/icons/avanzar.png"
                  alt="Avanzar fase"
                  className="w-8 h-8 object-contain"
                />
              </button>
            )}
            <button
              onClick={handleBackToLobby}
              className="p-2 bg-[#1d1408] hover:bg-[#2d2416] rounded-lg border border-[#8b7355] hover:border-[#c9a961] transition-colors"
              title="Volver al Lobby"
            >
              <img
                src="/icons/lobby.png"
                alt="Volver al Lobby"
                className="w-8 h-8 object-contain"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Panel izquierdo - Provincia + Órdenes (si aplica) */}
        <aside className="w-80 bg-[#d4c4a1] border-r border-[#b4a481] flex flex-col overflow-y-auto">
          {/* ProvinceInfoPanel - Siempre visible */}
          <div className="flex-shrink-0">
            <ProvinceInfoPanel
              game={game}
              provinceId={selectedProvince}
              visibleUnits={visibleUnits}
              players={players}
              currentPlayer={player}
              controlledProvinces={myControlledProvinces}
              provinceFaction={provinceFaction}
              onUnitClick={(unit) => setUnitManagementModalUnit(unit)}
            />
          </div>

          {/* OrdersPanel removido - ahora las órdenes se dan desde el modal en ProvinceInfoPanel */}
        </aside>

        {/* Mapa */}
        <div className="flex-1 p-4 bg-[#f4e4c1] relative">
          <div className="w-full h-full overflow-hidden">
            <GameBoard
              onProvinceClick={handleProvinceClick}
              selectedProvince={selectedProvince}
              famineProvinces={(game as any).famineProvinces || []}
              provinceFaction={provinceFaction}
              factions={factions}
            />
          </div>

          {/* Emblemas de otras facciones - Flotantes sobre el mapa */}
          {players.filter(p => p.id !== player.id).length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex justify-center items-center gap-6">
              {players
                .filter(p => p.id !== player.id) // Excluir jugador actual
                .map((p) => {
                  return (
                    <button
                      key={p.id}
                      className="group relative transition-transform hover:scale-110"
                      title={p.faction}
                      onClick={() => {
                        // TODO: Abrir modal de facción
                        console.log('Click en facción:', p.faction)
                      }}
                    >
                      {/* Borde decorativo estilo escudo */}
                      <div className="relative bg-white rounded-sm border-4 border-[#8b7355] shadow-xl p-2">
                        {/* Borde interno dorado */}
                        <div className="absolute inset-0 border-2 border-[#c9a961] rounded-sm m-1"></div>

                        {/* Emblema */}
                        <img
                          src={`/factions/${getFactionImageName(p.faction)}.png`}
                          alt={p.faction}
                          className="w-16 h-16 object-contain relative z-10 group-hover:brightness-110 transition-all cursor-pointer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>

        {/* Panel lateral derecho */}
        <aside className="w-80 bg-[#d4c4a1] border-l border-[#b4a481] flex flex-col overflow-y-auto">
          {/* Paneles superiores - agrupados para no colapsar */}
          <div className="flex-shrink-0">
            {/* TreasuryPanel - Información económica detallada */}
            <div className="p-2 border-b border-[#b4a481]">
              <TreasuryPanel
                player={player}
                units={visibleUnits}
                currentSeason={game.currentSeason}
                gameMap={game.map || { provinces: {}, adjacencies: {} }}
                provinceFaction={provinceFaction}
              />
            </div>

            {/* FamineMitigationPanel - Mitigar hambrunas */}
            {(game as any).famineProvinces && (game as any).famineProvinces.length > 0 && (
              <div className="p-2 border-b border-[#b4a481]">
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
              <div className="p-2 border-b border-[#b4a481]">
                <InactivePlayerVoting
                  gameId={gameId!}
                  currentPlayer={player}
                  players={players}
                />
              </div>
            )}
          </div>

          {/* Tabs de navegación */}
          <div className="flex border-b border-[#b4a481] flex-shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-2 py-2 font-medium text-xs transition-colors ${
                activeTab === 'chat'
                  ? 'bg-gray-900 text-purple-400 border-b-2 border-purple-500'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              💬 Diplomacia
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-2 py-2 font-medium text-xs transition-colors ${
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
            {activeTab === 'chat' ? (
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
          <div className="p-2 border-t border-[#b4a481] flex-shrink-0">
            <h3 className="font-bold mb-1 text-sm">Jugadores ({players.length})</h3>
            <div className="space-y-0.5 text-xs">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex justify-between items-center ${
                    p.id === player.id ? 'text-blue-400 font-bold' : 'text-gray-300'
                  }`}
                >
                  <span>{p.faction}</span>
                  <span className="text-[10px] text-gray-500">
                    {p.isAlive ? '✓ Vivo' : '✗ Eliminado'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Modal de diplomacia */}
      {isDiplomacyModalOpen && (
        <DiplomacyModal
          game={game}
          currentPlayer={player}
          players={players}
          onClose={() => setIsDiplomacyModalOpen(false)}
        />
      )}

      {/* Modal de gestión de unidades */}
      {unitManagementModalUnit && player && game && (
        <UnitManagementModal
          unit={unitManagementModalUnit}
          game={game}
          currentPlayer={player}
          allUnits={units}
          onClose={() => setUnitManagementModalUnit(null)}
        />
      )}
    </div>
  )
}
