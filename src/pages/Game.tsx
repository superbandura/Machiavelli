import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, addDoc, updateDoc, Timestamp } from 'firebase/firestore'
import type { DiplomaticMessage, MilitaryCampaign } from '@/types/game'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { Game as GameType, Player, Unit, ExtraExpense } from '@/types'
import { FactionDocument } from '@/types/faction'
import { getAllFactions } from '@/lib/factionService'
import { getFactionImageName } from '@/utils/factionHelpers'
import { isCampaignTarget } from '@/utils/gameMapHelpers'
import GameBoard from '@/components/GameBoard'
// OrdersPanel removido - ahora se usa OrdersModal desde ProvinceInfoPanel
import DiplomacyModal from '@/components/DiplomacyModal'
import FactionDiplomacyModal from '@/components/FactionDiplomacyModal'
import TreasuryPanel from '@/components/TreasuryPanel'
import HistoryModal from '@/components/HistoryModal'
import VictoryScreen from '@/components/VictoryScreen'
import FamineMitigationPanel from '@/components/FamineMitigationPanel'
import InactivePlayerVoting from '@/components/InactivePlayerVoting'
import ProvinceInfoPanel from '@/components/ProvinceInfoPanel'
import UnitManagementModal from '@/components/UnitManagementModal'
import HeaderTreasuryInfo from '@/components/HeaderTreasuryInfo'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import MilitaryCampaignPanel from '@/components/MilitaryCampaignPanel'
import MapsPanel, { MapFilter } from '@/components/MapsPanel'
import CampaignManagementModal from '@/components/CampaignManagementModal'
import CampaignsPanel from '@/components/CampaignsPanel'

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
  const [messages, setMessages] = useState<(DiplomaticMessage & { id: string })[]>([])
  const [campaigns, setCampaigns] = useState<MilitaryCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado del mapa
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [mapFilter, setMapFilter] = useState<MapFilter>(null)

  // Estado del modal de campaña
  const [campaignModalData, setCampaignModalData] = useState<{
    province: string
    campaign?: MilitaryCampaign
  } | null>(null)

  // Manejador de cambio de filtro que deselecciona provincia
  const handleFilterChange = (filter: MapFilter) => {
    setMapFilter(filter)
    if (filter !== null) {
      setSelectedProvince(null) // Deseleccionar provincia al activar filtro
    }
  }

  // Estado para forzar avance de fase (testing)
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false)

  // Estado del modal de diplomacia
  const [isDiplomacyModalOpen, setIsDiplomacyModalOpen] = useState(false)

  // Estado del modal de diplomacia por facción
  const [isFactionDiplomacyModalOpen, setIsFactionDiplomacyModalOpen] = useState(false)
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null)

  // Estado del modal de historial
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

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

  // Suscribirse a mensajes diplomáticos para badges de mensajes sin leer
  useEffect(() => {
    if (!gameId) return

    const messagesQuery = query(
      collection(db, 'diplomatic_messages'),
      where('gameId', '==', gameId)
      // orderBy removido - no es necesario para contar mensajes y mejora la actualización en tiempo real
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (DiplomaticMessage & { id: string })[]

      setMessages(messagesData)
    })

    return () => unsubscribe()
  }, [gameId])

  // Suscribirse a campañas activas
  useEffect(() => {
    if (!gameId) return

    const campaignsQuery = query(
      collection(db, 'campaigns'),
      where('gameId', '==', gameId),
      where('status', 'in', ['planning', 'active'])
    )

    const unsubscribe = onSnapshot(campaignsQuery, (snapshot) => {
      const campaignsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MilitaryCampaign[]

      setCampaigns(campaignsData)
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
  }, [])

  const handleBackToLobby = () => {
    navigate('/lobby')
  }

  // Función para contar mensajes sin leer por facción
  const getUnreadCountByFaction = useCallback((faction: string): number => {
    if (!player) return 0

    const playersInFaction = players.filter(p => p.faction === faction)
    const userIds = playersInFaction.map(p => p.userId)

    return messages.filter(
      msg =>
        userIds.includes(msg.from) &&
        msg.to === player.userId &&
        !msg.isRead
    ).length
  }, [messages, players, player])

  // Función para contar total de mensajes sin leer
  const getTotalUnreadCount = useCallback((): number => {
    if (!player) return 0

    return messages.filter(
      msg =>
        msg.to === player.userId &&
        msg.from !== player.userId &&
        !msg.isRead
    ).length
  }, [messages, player])

  // Función para abrir modal de diplomacia por facción
  const handleFactionClick = useCallback((faction: string) => {
    setSelectedFaction(faction)
    setIsFactionDiplomacyModalOpen(true)
  }, [])

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
          {/* Panel izquierdo - Emblema grande + Info de partida + Fase + Tiempo + Tesoro */}
          <div className="flex items-center gap-3">
            {/* Emblema de la facción - Grande, sin panel */}
            <img
              src={`/factions/${getFactionImageName(player.faction)}.png`}
              alt={player.faction}
              className="h-14 w-auto object-contain drop-shadow-lg"
              title={player.faction}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />

            {/* Info de la partida */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#1d1408] rounded-lg border border-[#8b7355]">
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
              gameMap={game.map || { provinces: {} }}
              provinceFaction={provinceFaction}
              currentSeason={game.currentSeason}
              game={game}
              unreadMessagesCount={getTotalUnreadCount()}
              onDiplomacyClick={() => setIsDiplomacyModalOpen(true)}
              onHistoryClick={() => setIsHistoryModalOpen(true)}
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
              campaigns={campaigns}
              onUnitClick={(unit) => setUnitManagementModalUnit(unit)}
              onCampaignClick={(campaign) =>
                setCampaignModalData({ province: campaign.targetProvince, campaign })
              }
            />
          </div>

          {/* MilitaryCampaignPanel - Solo visible si es objetivo válido de campaña */}
          {(() => {
            // Validaciones previas
            if (!selectedProvince || !player || !game.map) return null
            if (game.currentPhase !== 'diplomatic' || game.currentSeason !== 'spring') return null
            if (provinceFaction[selectedProvince] === player.faction) return null

            // Verificar si ya existe una campaña activa sobre esta provincia
            const hasActiveCampaign = campaigns.some(
              c => c.targetProvince === selectedProvince && (c.status === 'planning' || c.status === 'active')
            )
            if (hasActiveCampaign) return null

            // Verificar si es objetivo válido ANTES de renderizar
            const campaignCheck = isCampaignTarget(
              game.map,
              selectedProvince,
              player.id,
              units,
              provinceFaction,
              player.faction
            )

            // Solo mostrar panel si es válido
            if (!campaignCheck.isValid) return null

            return (
              <div className="flex-shrink-0">
                <MilitaryCampaignPanel
                  game={game}
                  provinceId={selectedProvince}
                  currentPlayer={player}
                  units={units}
                  provinceFaction={provinceFaction}
                  onOpenCampaignModal={(provinceId) =>
                    setCampaignModalData({ province: provinceId })
                  }
                />
              </div>
            )
          })()}

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
              gameMap={game.map || { provinces: {}, adjacencies: {} }}
              mapFilter={mapFilter}
              player={player}
              units={visibleUnits}
              campaigns={campaigns}
            />
          </div>

          {/* Emblemas de otras facciones - Flotantes sobre el mapa */}
          {players.filter(p => p.id !== player.id).length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex justify-center items-center gap-6">
              {players
                .filter(p => p.id !== player.id) // Excluir jugador actual
                .map((p) => {
                  const unreadCount = getUnreadCountByFaction(p.faction)

                  return (
                    <button
                      key={p.id}
                      className="group relative transition-transform hover:scale-110"
                      title={p.faction}
                      onClick={() => handleFactionClick(p.faction)}
                    >
                      {/* Emblema sin fondo */}
                      <img
                        src={`/factions/${getFactionImageName(p.faction)}.png`}
                        alt={p.faction}
                        className="w-20 h-20 object-contain group-hover:scale-110 transition-all cursor-pointer drop-shadow-xl"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />

                      {/* Badge de mensajes sin leer */}
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-[#d4af37] text-[#2c1810] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg">
                          {unreadCount}
                        </div>
                      )}
                    </button>
                  )
                })}
            </div>
          )}
        </div>

        {/* Panel lateral derecho - Secciones colapsables */}
        <aside className="w-80 bg-[#d4c4a1] border-l border-[#b4a481] flex flex-col overflow-y-auto">
          {/* Sección: Economía/Tesoro - Expandida por defecto */}
          <CollapsibleSection
            title="Economía"
            icon="/icons/economia.png"
            defaultExpanded={true}
          >
            <TreasuryPanel
              player={player}
              units={visibleUnits}
              currentSeason={game.currentSeason}
              gameMap={game.map || { provinces: {}, adjacencies: {} }}
              provinceFaction={provinceFaction}
              campaigns={campaigns}
            />
          </CollapsibleSection>

          {/* Sección: Eventos Especiales - Solo visible si hay eventos activos */}
          {((game as any).famineProvinces && (game as any).famineProvinces.length > 0) ||
           players.some(p => p.status === 'inactive') ? (
            <CollapsibleSection
              title="Eventos Especiales"
              icon="⚠️"
              defaultExpanded={true}
            >
              <div className="space-y-4">
                {/* Mitigación de hambrunas */}
                {(game as any).famineProvinces && (game as any).famineProvinces.length > 0 && (
                  <FamineMitigationPanel
                    game={game}
                    player={player}
                    units={visibleUnits}
                    famineProvinces={(game as any).famineProvinces}
                    currentPhase={game.currentPhase}
                    onMitigateFamine={handleMitigateFamine}
                  />
                )}

                {/* Votaciones sobre jugadores inactivos */}
                {players.some(p => p.status === 'inactive') && (
                  <InactivePlayerVoting
                    gameId={gameId!}
                    currentPlayer={player}
                    players={players}
                  />
                )}
              </div>
            </CollapsibleSection>
          ) : null}

          {/* Sección: Jugadores */}
          <CollapsibleSection
            title="Jugadores"
            icon="/icons/jugadores.png"
            defaultExpanded={false}
          >
            <div className="space-y-2">
              {players.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      p.id === player.id
                        ? 'border-[#8b4513] bg-[#c4b49a] shadow-md'
                        : 'border-[#b4a481] bg-[#c4b49a]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Emblema de la facción */}
                      <img
                        src={`/factions/${getFactionImageName(p.faction)}.png`}
                        alt={p.faction}
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <div className="flex-1">
                        <div className={`font-serif font-bold text-sm ${
                          p.id === player.id ? 'text-[#8b4513]' : 'text-[#2d1810]'
                        }`}>
                          {p.faction} ({p.displayName})
                          {p.id === player.id && ' - Tú'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#4d3830] mt-1">
                          <span className={p.isAlive ? 'text-green-700' : 'text-red-700'}>
                            {p.isAlive ? '✓ Vivo' : '✗ Eliminado'}
                          </span>
                          {p.status === 'inactive' && (
                            <span className="text-orange-700">• Inactivo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Sección: Campañas */}
          <CollapsibleSection
            title="Campañas"
            icon="/icons/campañas.png"
            defaultExpanded={false}
          >
            <CampaignsPanel
              campaigns={campaigns}
              game={game}
              player={player}
              onSelectCampaign={(campaign) =>
                setCampaignModalData({
                  province: campaign.targetProvince,
                  campaign
                })
              }
            />
          </CollapsibleSection>

          {/* Sección: Mapas */}
          <CollapsibleSection
            title="Mapas"
            icon="/icons/mapa.png"
            defaultExpanded={false}
          >
            <MapsPanel
              activeFilter={mapFilter}
              onFilterChange={handleFilterChange}
            />
          </CollapsibleSection>
        </aside>
      </main>

      {/* Footer */}
      <footer className="bg-[#2d2416] border-t border-[#1d1408] px-4 py-2">
        <div className="text-center text-[#c9a961] text-xs">
          © {new Date().getFullYear()} Adrián Díaz Mesa - Machiavelli
        </div>
      </footer>

      {/* Modal de diplomacia */}
      {isDiplomacyModalOpen && (
        <DiplomacyModal
          game={game}
          currentPlayer={player}
          players={players}
          onClose={() => setIsDiplomacyModalOpen(false)}
        />
      )}

      {/* Modal de diplomacia por facción (simplificado) */}
      {isFactionDiplomacyModalOpen && selectedFaction && (
        <FactionDiplomacyModal
          isOpen={isFactionDiplomacyModalOpen}
          onClose={() => {
            setIsFactionDiplomacyModalOpen(false)
            setSelectedFaction(null)
          }}
          game={game}
          currentPlayer={player}
          targetFaction={selectedFaction}
          players={players}
        />
      )}

      {/* Modal de historial */}
      <HistoryModal
        gameId={gameId!}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

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

      {/* Modal de gestión de campaña */}
      {campaignModalData && player && game && (
        <CampaignManagementModal
          targetProvince={campaignModalData.province}
          existingCampaign={campaignModalData.campaign}
          game={game}
          player={player}
          players={players}
          units={units}
          provinceFaction={provinceFaction}
          campaigns={campaigns}
          onClose={() => setCampaignModalData(null)}
        />
      )}
    </div>
  )
}
