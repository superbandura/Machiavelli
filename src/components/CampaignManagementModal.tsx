/**
 * CampaignManagementModal - Modal para gestionar campañas militares
 *
 * Cinco tabs según la fase del juego:
 * - Tab "Planificar" (diplomatic phase): Seleccionar unidades y declarar campaña
 * - Tab "Gestión Táctica" (orders phase): Gestionar fuerzas atacantes y órdenes
 * - Tab "Defensa" (orders phase): Gestionar fuerzas defensoras y apoyos
 * - Tab "Consejo de Guerra": Planificación estratégica y coordinación
 * - Tab "Historial": Historial de batallas y eventos de la campaña
 */

import { useState, useEffect, useMemo } from 'react'
import type { Unit, Player, Game, MilitaryCampaign, MaritimeRoute, TacticalFormation, WarCouncilMessage } from '@/types/game'
import type { FleetComposition, ArmyComposition, ArmyTroopType } from '@/types/scenario'
import { collection, addDoc, doc, updateDoc, onSnapshot, Timestamp, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import {
  validateCampaignUnits,
  calculateCampaignStrength,
  formatUnitName,
  getUnitCompositionSummary
} from '@/utils/campaignHelpers'
import { findAmphibiousRoute, getProvinceInfo, isCoastalProvince, getProvinceName } from '@/utils/gameMapHelpers'
import { getFactionImageName } from '@/utils/factionHelpers'
import { calculateUnassignedReinforcementTroops } from '@/utils/formationHelpers'
import { TroopPoolSummary } from './TroopPoolSummary'
import { ShipPoolSummary } from './ShipPoolSummary'
import CreateFormationModal from './CreateFormationModal'
import FormationCard from './FormationCard'
import WarCouncilChat from './WarCouncilChat'
import TacticalDeploymentModal from './TacticalDeploymentModal'
import { ReinforcementsTab } from './ReinforcementsTab'
import { ReinforcementTroopCard } from './ReinforcementTroopCard'

interface CampaignManagementModalProps {
  targetProvince: string
  existingCampaign?: MilitaryCampaign
  game: Game
  player: Player
  players: Player[]
  units: Unit[]
  provinceFaction: Record<string, string>
  campaigns: MilitaryCampaign[]
  onClose: () => void
}

export default function CampaignManagementModal({
  targetProvince,
  existingCampaign,
  game,
  player,
  players,
  units,
  provinceFaction,
  campaigns,
  onClose
}: CampaignManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'plan' | 'tactics' | 'defensive' | 'council' | 'history' | 'reinforcements'>('plan')
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set())
  const [selectedSide, setSelectedSide] = useState<'attacker' | 'defender' | null>(null) // Bando elegido por jugador neutral
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showCreateFormationModal, setShowCreateFormationModal] = useState(false)
  const [showDeploymentModal, setShowDeploymentModal] = useState(false)
  const [quickCreateTroopType, setQuickCreateTroopType] = useState<import('@/types/scenario').ArmyTroopType | undefined>(undefined)
  const [quickCreateFaction, setQuickCreateFaction] = useState<string | undefined>(undefined)
  const [quickCreateIsReinforcement, setQuickCreateIsReinforcement] = useState<boolean>(false)
  const [quickCreateReinforcementId, setQuickCreateReinforcementId] = useState<string | undefined>(undefined)
  const [quickCreateEstimatedArrival, setQuickCreateEstimatedArrival] = useState<number | undefined>(undefined)
  const [liveCampaign, setLiveCampaign] = useState<MilitaryCampaign | undefined>(existingCampaign)
  const [unreadCouncilMessages, setUnreadCouncilMessages] = useState(0)

  // Estados para secciones plegables en Gestión Táctica
  const [showTroopPool, setShowTroopPool] = useState(true)
  const [showShipPool, setShowShipPool] = useState(false)
  const [showReinforcements, setShowReinforcements] = useState(false)

  // Determinar bando del jugador en la campaña (DEBE estar antes de los useEffect que lo usan)
  const currentPlayerSide = useMemo<'attacker' | 'defender' | null>(() => {
    if (!liveCampaign || !game.map) return null

    const defenderFaction = game.map.provinces[liveCampaign.targetProvince]?.controlledBy || ''

    // Verificar si el jugador es atacante o defensor original
    if (player.faction === liveCampaign.declaredByFaction) {
      return 'attacker'
    } else if (player.faction === defenderFaction) {
      return 'defender'
    }

    // Verificar si el jugador es un aliado (se unió en fase diplomática)
    const playerAlly = liveCampaign.allies?.find(a => a.playerId === player.id)
    if (playerAlly) {
      return playerAlly.side // 'attacker' o 'defender'
    }

    // Verificar si el jugador ha enviado refuerzos (se unió en fase de órdenes)
    const playerReinforcement = liveCampaign.reinforcements?.find(r => r.playerId === player.id)
    if (playerReinforcement) {
      return playerReinforcement.side // 'attacker' o 'defender'
    }

    return null // Jugador neutral sin refuerzos
  }, [liveCampaign, game.map, player.faction, player.id])

  // Determinar tab inicial según fase y bando del jugador
  useEffect(() => {
    if (liveCampaign) {
      if (game.currentPhase === 'orders') {
        // Fase de órdenes: mostrar tab apropiado según el bando
        if (currentPlayerSide === 'attacker') {
          setActiveTab('tactics')
        } else if (currentPlayerSide === 'defender') {
          setActiveTab('defensive')
        } else {
          // Jugador neutral sin refuerzos: mostrar Refuerzos
          setActiveTab('reinforcements')
        }
      } else if (game.currentPhase === 'diplomatic') {
        // Fase diplomática: mostrar Plan si es participante, sino Historial
        if (currentPlayerSide !== null) {
          setActiveTab('plan')
        } else {
          setActiveTab('history')
        }
      } else {
        // Fase de resolución: mostrar Historial
        setActiveTab('history')
      }
    } else {
      // Sin campaña activa: mostrar Plan
      setActiveTab('plan')
    }
  }, [liveCampaign, game.currentPhase, currentPlayerSide])

  // Cargar unidades ya seleccionadas si es campaña existente
  // SOLO pre-seleccionar las unidades que pertenecen al jugador actual
  useEffect(() => {
    if (liveCampaign && liveCampaign.participatingUnits) {
      // Filtrar solo las unidades del jugador actual
      const playerUnitIds = liveCampaign.participatingUnits.filter(unitId => {
        const unit = game.units.find(u => u.id === unitId)
        return unit && unit.owner === player.id
      })
      setSelectedUnits(new Set(playerUnitIds))
    }
  }, [liveCampaign, game.units, player.id])

  // Listener en tiempo real para actualizaciones de la campaña
  useEffect(() => {
    if (!existingCampaign?.id) {
      setLiveCampaign(existingCampaign)
      return
    }

    console.log('[Campaign Listener] 🎯 Suscribiéndose a campaña:', existingCampaign.id)

    const unsubscribe = onSnapshot(
      doc(db, 'campaigns', existingCampaign.id),
      (snapshot) => {
        if (snapshot.exists()) {
          const campaignData = { id: snapshot.id, ...snapshot.data() } as MilitaryCampaign

          console.log('[Campaign Listener] 🔄 Campaña actualizada:', {
            campaignId: campaignData.id,
            fleetPool: campaignData.fleetPool,
            reinforcements: campaignData.reinforcements?.length || 0,
            participatingUnits: campaignData.participatingUnits?.length || 0
          })

          setLiveCampaign(campaignData)
        }
      },
      (error) => {
        console.error('[Campaign] Error en listener:', error)
      }
    )

    return () => unsubscribe()
  }, [existingCampaign?.id])

  // Listener para mensajes no leídos del Consejo de Guerra
  useEffect(() => {
    if (!liveCampaign?.id) {
      setUnreadCouncilMessages(0)
      return
    }

    // Determinar el bando del jugador actual
    const defenderFaction = game.map?.provinces[liveCampaign.targetProvince]?.controlledBy || ''
    const currentPlayerSide: 'attacker' | 'defender' | null =
      player.faction === liveCampaign.declaredByFaction
        ? 'attacker'
        : player.faction === defenderFaction
        ? 'defender'
        : null

    if (!currentPlayerSide) {
      setUnreadCouncilMessages(0)
      return
    }

    const messagesQuery = query(
      collection(db, 'war_council_messages'),
      where('gameId', '==', game.id),
      where('campaignId', '==', liveCampaign.id)
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      let unreadCount = 0
      snapshot.forEach((docSnap) => {
        const msg = docSnap.data() as WarCouncilMessage
        // Solo contar mensajes del bando actual que NO han sido leídos
        if (msg.senderFaction === currentPlayerSide && !msg.readBy?.includes(player.userId)) {
          unreadCount++
        }
      })
      setUnreadCouncilMessages(unreadCount)
    })

    return () => unsubscribe()
  }, [liveCampaign?.id, game.id, game.map, player.userId, player.faction, liveCampaign?.targetProvince, liveCampaign?.declaredByFaction])

  // Filtrar unidades disponibles según posición geográfica
  const availableUnits = useMemo(() => {
    if (!game.map) return []

    // Filtro base: solo unidades del jugador, Army/Fleet, activas
    const playerUnits = units.filter(
      u =>
        u.owner === player.id &&
        (u.type === 'army' || u.type === 'fleet') &&
        u.status === 'active'
    )

    // Obtener unitIds ya asignados a campañas activas (excepto la campaña actual si existe)
    const assignedUnitIds = new Set(
      campaigns
        .filter(c =>
          c.gameId === game.id &&
          (c.status === 'planning' || c.status === 'active') &&
          c.id !== liveCampaign?.id  // Excluir la campaña actual al editar
        )
        .flatMap(c => [
          ...c.participatingUnits,
          // También incluir unidades enviadas como refuerzos
          ...(c.reinforcements?.flatMap(r => r.unitIds) || [])
        ])
    )

    // Obtener provincias adyacentes al objetivo
    const targetProvinceData = game.map.provinces[targetProvince]
    const adjacentProvinces = targetProvinceData?.adjacencies || []

    // Verificar si el objetivo es costero (para campañas anfibias)
    const isTargetCoastal = isCoastalProvince(game.map, targetProvince)

    const result = playerUnits.filter(unit => {
      // Validar que la unidad no esté ya asignada a otra campaña
      if (assignedUnitIds.has(unit.id)) {
        return false
      }

      // Validar que la unidad tenga composición válida
      if (!unit.composition) {
        return false
      }

      // CASO 1: FLOTAS
      if (unit.type === 'fleet') {
        // Validar que tenga naves
        const fleetComp = unit.composition as FleetComposition
        const totalShips = Object.values(fleetComp.ships || {}).reduce((sum, n) => sum + n, 0)
        if (totalShips === 0) {
          return false
        }

        // CASO 1A: Flotas con tropas embarcadas (campañas anfibias)
        if (unit.embarkedTroops) {
          const embarkedCount = Object.values(unit.embarkedTroops.troops || {})
            .reduce((sum, n) => sum + (n || 0), 0)

          // Pueden atacar CUALQUIER costa desde CUALQUIER posición
          if (embarkedCount > 0 && isTargetCoastal) {
            return true
          }
        }

        // CASO 1B: Flotas sin tropas embarcadas
        // Solo pueden atacar provincias adyacentes navegables
        if (!adjacentProvinces.includes(unit.currentPosition)) {
          return false
        }

        const targetInfo = game.map.provinces[targetProvince]
        const isNavigable = targetInfo?.type === 'sea' || targetInfo?.type === 'port'
        return isNavigable
      }

      // CASO 2: EJÉRCITOS
      if (unit.type === 'army') {
        // Validar que el ejército tenga tropas
        const armyComp = unit.composition as ArmyComposition
        const totalTroops = Object.values(armyComp.troops || {}).reduce((sum, n) => sum + n, 0)
        if (totalTroops === 0) {
          return false
        }

        // Deben estar en provincia adyacente al objetivo
        if (!adjacentProvinces.includes(unit.currentPosition)) {
          return false
        }

        // El objetivo debe ser terrestre (land o port)
        const targetInfo = game.map.provinces[targetProvince]
        const isTerrestrial = targetInfo?.type === 'land' || targetInfo?.type === 'port'
        return isTerrestrial
      }

      return false
    })

    return result
  }, [units, player.id, game.map, targetProvince, campaigns])

  // Calcular ruta anfibia si hay flotas seleccionadas
  const maritimeRoute = useMemo<MaritimeRoute | null>(() => {
    if (!game.map) return null

    const selectedUnitObjs = availableUnits.filter(u => selectedUnits.has(u.id))
    const hasFleets = selectedUnitObjs.some(u => u.type === 'fleet')

    if (!hasFleets) return null

    // Buscar flota con posición para calcular ruta
    const fleet = selectedUnitObjs.find(u => u.type === 'fleet')
    if (!fleet) return null

    return findAmphibiousRoute(game.map, fleet.currentPosition, targetProvince)
  }, [game.map, selectedUnits, availableUnits, targetProvince])

  // Toggle selección de unidad
  const toggleUnitSelection = (unitId: string) => {
    const newSelection = new Set(selectedUnits)
    if (newSelection.has(unitId)) {
      newSelection.delete(unitId)
    } else {
      newSelection.add(unitId)
    }
    setSelectedUnits(newSelection)
  }

  // Calcular fuerza total
  const totalStrength = useMemo(() => {
    const selectedUnitObjs = availableUnits.filter(u => selectedUnits.has(u.id))
    return calculateCampaignStrength(selectedUnitObjs)
  }, [selectedUnits, availableUnits])

  // Validar selección
  const validation = useMemo(() => {
    const selectedUnitObjs = availableUnits.filter(u => selectedUnits.has(u.id))
    return validateCampaignUnits(selectedUnitObjs, targetProvince, !!maritimeRoute)
  }, [selectedUnits, availableUnits, targetProvince, maritimeRoute])

  // Calcular cards de refuerzo para el atacante (memoizado para evitar días cambiantes)
  const attackerReinforcementCards = useMemo(() => {
    if (!liveCampaign?.reinforcements) return []

    const troopCards: Array<{
      troopType: ArmyTroopType
      quantity: number
      available: number
      faction: string
      daysUntilArrival: number
      reinforcementId: string
      estimatedArrivalDay: number
      key: string
    }> = []

    liveCampaign.reinforcements
      .filter(r => r.side === 'attacker')
      .forEach(reinforcement => {
        // Usar estimatedArrivalDay del refuerzo (debe existir siempre)
        if (!reinforcement.estimatedArrivalDay) {
          console.error('Refuerzo sin estimatedArrivalDay:', reinforcement.id)
          return
        }
        const daysUntilArrival = reinforcement.estimatedArrivalDay - game.turnNumber

        // Obtener todas las unidades de este refuerzo
        const reinforcementUnits = units.filter(u => reinforcement.unitIds.includes(u.id))

        // Agregar tropas por tipo de todas las unidades del refuerzo
        const troopTotals = new Map<ArmyTroopType, number>()

        reinforcementUnits.forEach(unit => {
          // Procesar ejércitos
          if (unit.type === 'army' && unit.composition) {
            const armyComp = unit.composition as ArmyComposition

            Object.entries(armyComp.troops).forEach(([troopType, count]) => {
              if (count > 0) {
                const currentTotal = troopTotals.get(troopType as ArmyTroopType) || 0
                troopTotals.set(troopType as ArmyTroopType, currentTotal + count)
              }
            })
          }

          // Procesar flotas con tropas embarcadas
          if (unit.type === 'fleet' && unit.embarkedTroops?.troops) {
            Object.entries(unit.embarkedTroops.troops).forEach(([troopType, count]) => {
              if (count && count > 0) {
                const currentTotal = troopTotals.get(troopType as ArmyTroopType) || 0
                troopTotals.set(troopType as ArmyTroopType, currentTotal + count)
              }
            })
          }
        })

        // Crear una card por tipo de tropa con el total agregado
        troopTotals.forEach((totalCount, troopType) => {
          const available = calculateUnassignedReinforcementTroops(
            reinforcement.id,
            troopType,
            reinforcement.faction,
            totalCount,
            liveCampaign.formations || []
          )

          troopCards.push({
            troopType,
            quantity: totalCount,
            available,
            faction: reinforcement.faction,
            daysUntilArrival,
            reinforcementId: reinforcement.id,
            estimatedArrivalDay: reinforcement.estimatedArrivalDay!,
            key: `${reinforcement.id}-${troopType}`
          })
        })
      })

    return troopCards
  }, [liveCampaign?.reinforcements, liveCampaign?.formations, units, game.turnNumber])

  // Calcular cards de refuerzo para el defensor (memoizado para evitar días cambiantes)
  const defenderReinforcementCards = useMemo(() => {
    if (!liveCampaign?.reinforcements) return []

    const troopCards: Array<{
      troopType: ArmyTroopType
      quantity: number
      available: number
      faction: string
      daysUntilArrival: number
      reinforcementId: string
      estimatedArrivalDay: number
      key: string
    }> = []

    liveCampaign.reinforcements
      .filter(r => r.side === 'defender')
      .forEach(reinforcement => {
        // Usar estimatedArrivalDay del refuerzo (debe existir siempre)
        if (!reinforcement.estimatedArrivalDay) {
          console.error('Refuerzo sin estimatedArrivalDay:', reinforcement.id)
          return
        }
        const daysUntilArrival = reinforcement.estimatedArrivalDay - game.turnNumber

        // Obtener todas las unidades de este refuerzo
        const reinforcementUnits = units.filter(u => reinforcement.unitIds.includes(u.id))

        // Agregar tropas por tipo de todas las unidades del refuerzo
        const troopTotals = new Map<ArmyTroopType, number>()

        reinforcementUnits.forEach(unit => {
          if (unit.type === 'army' && unit.composition) {
            const armyComp = unit.composition as ArmyComposition

            Object.entries(armyComp.troops).forEach(([troopType, count]) => {
              if (count > 0) {
                const currentTotal = troopTotals.get(troopType as ArmyTroopType) || 0
                troopTotals.set(troopType as ArmyTroopType, currentTotal + count)
              }
            })
          }

          // Procesar flotas con tropas embarcadas
          if (unit.type === 'fleet' && unit.embarkedTroops?.troops) {
            Object.entries(unit.embarkedTroops.troops).forEach(([troopType, count]) => {
              if (count && count > 0) {
                const currentTotal = troopTotals.get(troopType as ArmyTroopType) || 0
                troopTotals.set(troopType as ArmyTroopType, currentTotal + count)
              }
            })
          }
        })

        // Crear una card por tipo de tropa con el total agregado
        troopTotals.forEach((totalCount, troopType) => {
          const available = calculateUnassignedReinforcementTroops(
            reinforcement.id,
            troopType,
            reinforcement.faction,
            totalCount,
            liveCampaign.formations || []
          )

          troopCards.push({
            troopType,
            quantity: totalCount,
            available,
            faction: reinforcement.faction,
            daysUntilArrival,
            reinforcementId: reinforcement.id,
            estimatedArrivalDay: reinforcement.estimatedArrivalDay!,
            key: `${reinforcement.id}-${troopType}`
          })
        })
      })

    return troopCards
  }, [liveCampaign?.reinforcements, liveCampaign?.formations, units, game.turnNumber])

  // Handler para declarar campaña
  const handleDeclareCampaign = async () => {
    if (!validation.isValid) {
      setSaveMessage(validation.error || 'Selección inválida')
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const campaignData: any = {
        gameId: game.id,
        targetProvince,
        declaredBy: player.userId,
        declaredByFaction: player.faction,
        turnDeclared: game.turnNumber,
        year: game.currentYear,
        status: 'planning',
        participatingUnits: Array.from(selectedUnits),
        createdAt: Timestamp.now()
      }

      // Solo añadir route si existe (Firestore no acepta undefined)
      if (maritimeRoute) {
        campaignData.route = maritimeRoute
      }

      await addDoc(collection(db, 'campaigns'), campaignData)

      setSaveMessage('¡Campaña declarada con éxito!')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error al declarar campaña:', error)
      setSaveMessage('Error al guardar la campaña')
    } finally {
      setIsSaving(false)
    }
  }

  // Handler para unirse a una campaña existente como aliado
  const handleJoinCampaign = async () => {
    if (!liveCampaign) {
      setSaveMessage('No hay campaña a la que unirse')
      return
    }

    if (!selectedSide) {
      setSaveMessage('Debes seleccionar un bando')
      return
    }

    if (selectedUnits.size === 0) {
      setSaveMessage('Debes seleccionar al menos una unidad')
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Logging detallado para debugging
      const selectedUnitsArray = Array.from(selectedUnits)
      const selectedUnitsDetails = selectedUnitsArray.map(id => {
        const unit = game.units.find(u => u.id === id)
        return { id, owner: unit?.owner, type: unit?.type, position: unit?.currentPosition }
      })

      console.log('[joinCampaign] Datos enviados:', {
        gameId: game.id,
        campaignId: liveCampaign.id,
        playerId: player.id,
        playerFaction: player.faction,
        side: selectedSide,
        unitIds: selectedUnitsArray,
        selectedUnitsDetails
      })

      // Llamar a Cloud Function para unirse a la campaña
      const joinCampaignFunction = httpsCallable(functions, 'joinCampaign')
      const result = await joinCampaignFunction({
        gameId: game.id,
        campaignId: liveCampaign.id,
        playerId: player.id,
        side: selectedSide,
        unitIds: selectedUnitsArray
      })

      const response = result.data as { success: boolean; message: string }

      setSaveMessage(response.message || `¡Te has unido como ${selectedSide === 'attacker' ? 'Atacante' : 'Defensor'}!`)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Error al unirse a la campaña:', error)
      setSaveMessage(error.message || 'Error al unirse a la campaña')
    } finally {
      setIsSaving(false)
    }
  }

  // Handlers para formaciones tácticas
  const handleCreateFormation = async (formation: TacticalFormation) => {
    if (!liveCampaign) return

    try {
      // Usar Cloud Function para bypasear Security Rules
      const createFormationFn = httpsCallable(functions, 'createFormation')
      await createFormationFn({
        gameId: game.id,
        campaignId: liveCampaign.id,
        formation: formation
      })
    } catch (error) {
      console.error('Error al crear formación:', error)
      throw error // Re-lanzar para que CreateFormationModal lo capture
    }
  }

  const handleUpdateFormation = async (formationId: string, updates: Partial<TacticalFormation>) => {
    if (!liveCampaign || !liveCampaign.formations) return

    try {
      // Usar Cloud Function para bypasear Security Rules
      const updateFormationFn = httpsCallable(functions, 'updateFormation')
      await updateFormationFn({
        gameId: game.id,
        campaignId: liveCampaign.id,
        formationId: formationId,
        updates: updates
      })
    } catch (error) {
      console.error('Error al actualizar formación:', error)
      throw error
    }
  }

  const handleDeleteFormation = async (formationId: string) => {
    if (!liveCampaign || !liveCampaign.formations) return

    try {
      // Usar Cloud Function para bypasear Security Rules
      const deleteFormationFn = httpsCallable(functions, 'deleteFormation')
      await deleteFormationFn({
        gameId: game.id,
        campaignId: liveCampaign.id,
        formationId: formationId
      })
    } catch (error) {
      console.error('Error al eliminar formación:', error)
      throw error
    }
  }

  const handleQuickCreateFormation = (troopType: import('@/types/scenario').ArmyTroopType, faction: string) => {
    setQuickCreateTroopType(troopType)
    setQuickCreateFaction(faction)
    setQuickCreateIsReinforcement(false)
    setQuickCreateReinforcementId(undefined)
    setQuickCreateEstimatedArrival(undefined)
    setShowCreateFormationModal(true)
  }

  const handleQuickCreateFromReinforcement = (
    troopType: import('@/types/scenario').ArmyTroopType,
    faction: string,
    reinforcementId: string,
    estimatedArrivalDay: number
  ) => {
    setQuickCreateTroopType(troopType)
    setQuickCreateFaction(faction)
    setQuickCreateIsReinforcement(true)
    setQuickCreateReinforcementId(reinforcementId)
    setQuickCreateEstimatedArrival(estimatedArrivalDay)
    setShowCreateFormationModal(true)
  }

  /**
   * Procesa flotas enviadas como refuerzos:
   * - Integra los barcos al fleetPool de la campaña inmediatamente
   * - Si la flota tiene tropas embarcadas, las añade al reinforcement
   *
   * @param unitIds IDs de las unidades del refuerzo
   * @param fleetPool Pool actual de flotas de la campaña
   * @returns Objeto con el pool actualizado y flag indicando si hay tropas embarcadas
   */
  const processFleetReinforcement = (
    unitIds: string[],
    fleetPool: { galleys: number; cogs: number } = { galleys: 0, cogs: 0 }
  ): { updatedFleetPool: { galleys: number; cogs: number }; hasEmbarkedTroops: boolean } => {
    let galleys = fleetPool.galleys
    let cogs = fleetPool.cogs
    let hasEmbarkedTroops = false

    const reinforcementUnits = units.filter(u => unitIds.includes(u.id))

    console.log('[processFleetReinforcement] 🔍 Procesando unidades:', {
      unitIds,
      reinforcementUnits: reinforcementUnits.map(u => ({
        id: u.id,
        type: u.type,
        hasComposition: !!u.composition,
        hasEmbarkedTroops: !!u.embarkedTroops
      }))
    })

    reinforcementUnits.forEach(unit => {
      if (unit.type === 'fleet' && unit.composition) {
        const fleetComp = unit.composition as FleetComposition

        console.log('[processFleetReinforcement] 🚢 Procesando flota:', {
          unitId: unit.id,
          ships: fleetComp.ships,
          galleys: fleetComp.ships?.galley,
          cogs: fleetComp.ships?.cog,
          embarkedTroops: unit.embarkedTroops
        })

        // Sumar los barcos al pool (leer de fleetComp.ships)
        galleys += fleetComp.ships?.galley || 0
        cogs += fleetComp.ships?.cog || 0

        // Verificar si tiene tropas embarcadas
        if (unit.embarkedTroops?.troops) {
          const hasTroops = Object.values(unit.embarkedTroops.troops).some(count => count && count > 0)
          if (hasTroops) {
            hasEmbarkedTroops = true
          }
        }
      }
    })

    console.log('[processFleetReinforcement] ✅ Resultado:', {
      updatedFleetPool: { galleys, cogs },
      hasEmbarkedTroops
    })

    return {
      updatedFleetPool: { galleys, cogs },
      hasEmbarkedTroops
    }
  }

  // Handler para guardar refuerzo
  const handleSaveReinforcement = async (reinforcement: Partial<import('@/types/game').CampaignReinforcement>) => {
    if (!liveCampaign) return

    console.log('[handleSaveReinforcement] 🚀 Iniciando guardado:', {
      reinforcement,
      liveCampaignId: liveCampaign.id
    })

    // Validar que estimatedArrivalDay existe (campo obligatorio)
    if (reinforcement.estimatedArrivalDay === undefined) {
      console.error('[handleSaveReinforcement] ERROR: refuerzo sin estimatedArrivalDay:', reinforcement)
      throw new Error('El refuerzo debe tener un estimatedArrivalDay válido')
    }

    try {
      const currentReinforcements = liveCampaign.reinforcements || []
      const currentFleetPool = liveCampaign.fleetPool || { galleys: 0, cogs: 0 }

      console.log('[handleSaveReinforcement] 📦 Estado actual:', {
        currentReinforcements: currentReinforcements.length,
        currentFleetPool
      })

      // Procesar flotas en el refuerzo
      const { updatedFleetPool, hasEmbarkedTroops } = processFleetReinforcement(
        reinforcement.unitIds || [],
        currentFleetPool
      )

      console.log('[handleSaveReinforcement] 🚢 Resultado processFleetReinforcement:', {
        updatedFleetPool,
        hasEmbarkedTroops,
        cambioEnPool: updatedFleetPool.galleys !== currentFleetPool.galleys ||
                      updatedFleetPool.cogs !== currentFleetPool.cogs
      })

      // 1. ACTUALIZAR FLEETPOOL VÍA CLOUD FUNCTION (si cambió)
      if (updatedFleetPool.galleys !== currentFleetPool.galleys || updatedFleetPool.cogs !== currentFleetPool.cogs) {
        console.log('[handleSaveReinforcement] 🔧 Llamando a Cloud Function updateCampaignFleetPool:', updatedFleetPool)

        const updateFleetPoolFn = httpsCallable(functions, 'updateCampaignFleetPool')
        await updateFleetPoolFn({
          gameId: game.id,
          campaignId: liveCampaign.id,
          fleetPool: updatedFleetPool
        })

        console.log('[handleSaveReinforcement] ✅ fleetPool actualizado vía Cloud Function')
      }

      // 2. ACTUALIZAR REINFORCEMENTS VÍA UPDATEDOC
      const hasArmies = reinforcement.unitIds?.some(id => {
        const unit = units.find(u => u.id === id)
        return unit?.type === 'army'
      })

      // Determinar tipo de refuerzo
      const isFleetOnly = !hasEmbarkedTroops && !hasArmies

      // SIEMPRE añadir a reinforcements[], incluso si es solo flota
      const reinforcementToAdd = {
        ...reinforcement,
        ...(isFleetOnly && { isFleetOnly: true }) // Marcar si es solo flota
      }

      const updatedReinforcements = [...currentReinforcements, reinforcementToAdd]

      console.log('[handleSaveReinforcement] 📝 Actualizando reinforcements vía updateDoc:', {
        tipo: isFleetOnly ? 'solo flota' : 'tropas/ejércitos',
        total: updatedReinforcements.length
      })

      await updateDoc(doc(db, 'campaigns', liveCampaign.id), {
        reinforcements: updatedReinforcements,
        updatedAt: Timestamp.now()
      })

      console.log('[handleSaveReinforcement] ✅ Reinforcement registrado en Firestore')

      console.log('[handleSaveReinforcement] ✅ Guardado completo exitoso')
    } catch (error) {
      console.error('Error al guardar refuerzo en Firestore:', error)
      throw error
    }
  }

  // Información de la provincia objetivo
  const targetProvinceInfo = game.map ? getProvinceInfo(game.map, targetProvince) : null
  const targetFaction = provinceFaction[targetProvince]

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Solo cerrar si el click fue directamente en el overlay, no en contenido hijo
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="bg-[#e8dcc0] border-4 border-[#4a3f2a] rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#2d2416] border-b-4 border-[#6b5d42] flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <img src="/icons/campañas.png" alt="" className="w-8 h-8 object-contain" />
            <div>
              <h2 className="text-2xl font-heading text-[#f0d877]">Campaña Militar</h2>
              {targetProvinceInfo && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#e8dcc0]">Objetivo: {targetProvinceInfo.name}</span>
                  <img
                    src={targetFaction ? `/factions/${getFactionImageName(targetFaction)}.png` : '/factions/neutral.png'}
                    alt={targetFaction || 'Neutral'}
                    title={targetFaction || 'Neutral'}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-[#e8dcc0] hover:text-[#f0d877] text-2xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-[#6b5d42] bg-[#2d2416]">
          {/* Tab Plan: visible para todos durante fase diplomática para permitir unirse como aliado */}
          {game.currentPhase === 'diplomatic' && (
            <button
              onClick={() => setActiveTab('plan')}
              className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2
                ${
                  activeTab === 'plan'
                    ? 'bg-[#4a3f2a] text-[#e8dcc0] border-b-4 border-renaissance-gold shadow-inner'
                    : 'text-[#e8dcc0] hover:bg-[#3d3422]'
                }`}
            >
              <img src="/icons/reclutar.png" alt="" className="w-6 h-6 object-contain" />
              Planificar Campaña
            </button>
          )}

          {/* Tab Tactics: solo para atacantes */}
          {currentPlayerSide === 'attacker' && (
            <button
              onClick={() => setActiveTab('tactics')}
              disabled={!liveCampaign || game.currentPhase !== 'orders'}
              className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2
                ${
                  activeTab === 'tactics'
                    ? 'bg-[#4a3f2a] text-[#e8dcc0] border-b-4 border-renaissance-gold shadow-inner'
                    : !liveCampaign || game.currentPhase !== 'orders'
                    ? 'text-[#8b7355] cursor-not-allowed'
                    : 'text-[#e8dcc0] hover:bg-[#3d3422]'
                }`}
            >
              <img src="/icons/mapa.png" alt="" className="w-6 h-6 object-contain" />
              Gestión Táctica
            </button>
          )}

          {/* Tab Defensive: solo para defensores */}
          {currentPlayerSide === 'defender' && (
            <button
              onClick={() => setActiveTab('defensive')}
              disabled={!liveCampaign || game.currentPhase !== 'orders'}
              className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2
                ${
                  activeTab === 'defensive'
                    ? 'bg-[#4a3f2a] text-[#e8dcc0] border-b-4 border-renaissance-gold shadow-inner'
                    : !liveCampaign || game.currentPhase !== 'orders'
                    ? 'text-[#8b7355] cursor-not-allowed'
                    : 'text-[#e8dcc0] hover:bg-[#3d3422]'
                }`}
            >
              <img src="/icons/guarnicion.png" alt="" className="w-6 h-6 object-contain" />
              Defensa
            </button>
          )}

          {/* Tab Council: solo para atacantes y defensores */}
          {currentPlayerSide !== null && (
            <button
              onClick={() => setActiveTab('council')}
              disabled={!liveCampaign}
              className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2 relative
                ${
                  activeTab === 'council'
                    ? 'bg-[#4a3f2a] text-[#e8dcc0] border-b-4 border-renaissance-gold shadow-inner'
                    : !liveCampaign
                    ? 'text-[#8b7355] cursor-not-allowed'
                    : 'text-[#e8dcc0] hover:bg-[#3d3422]'
                }`}
            >
              <img src="/icons/campañas.png" alt="" className="w-6 h-6 object-contain" />
              Consejo de Guerra
              {unreadCouncilMessages > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCouncilMessages}
                </span>
              )}
            </button>
          )}

          {/* Tab History: para todos */}
          <button
            onClick={() => setActiveTab('history')}
            disabled={!liveCampaign}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2
              ${
                activeTab === 'history'
                  ? 'bg-[#4a3f2a] text-[#e8dcc0] border-b-4 border-renaissance-gold shadow-inner'
                  : !liveCampaign
                  ? 'text-[#8b7355] cursor-not-allowed'
                  : 'text-[#e8dcc0] hover:bg-[#3d3422]'
              }`}
          >
            <img src="/icons/historial.png" alt="" className="w-6 h-6 object-contain" />
            Historial
          </button>

          {/* Tab Refuerzos: para todos los jugadores en fase de órdenes */}
          {liveCampaign && game.currentPhase === 'orders' && (
            <button
              onClick={() => setActiveTab('reinforcements')}
              className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2
                ${
                  activeTab === 'reinforcements'
                    ? 'bg-[#4a3f2a] text-[#e8dcc0] border-b-4 border-renaissance-gold shadow-inner'
                    : 'text-[#e8dcc0] hover:bg-[#3d3422]'
                }`}
            >
              <img src="/icons/reclutar.png" alt="" className="w-6 h-6 object-contain" />
              Refuerzos
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'plan' && (
            <div className="space-y-6">
              {/* Información de la campaña */}
              <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-4">
                <h3 className="text-lg font-heading font-semibold text-[#2d1810] mb-2">
                  Información de la Campaña
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-[#4a3f2a]">Turno:</span>{' '}
                    <span className="text-[#2d1810]">
                      {game.currentSeason === 'spring' ? 'Primavera' : 'Otoño'} {game.currentYear}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#4a3f2a]">Fase:</span>{' '}
                    <span className="text-[#2d1810]">Diplomática</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#4a3f2a]">Fuerza Total:</span>{' '}
                    <span className="text-[#2d1810] font-bold">{totalStrength} puntos</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#4a3f2a]">Unidades:</span>{' '}
                    <span className="text-[#2d1810]">{selectedUnits.size} seleccionadas</span>
                  </div>
                </div>

                {/* Ruta anfibia */}
                {maritimeRoute && (
                  <div className="mt-4 p-3 bg-[#4a7c9e]/20 border border-[#4a7c9e] rounded">
                    <div className="flex items-center gap-2 text-sm text-[#2d1810]">
                      <img
                        src="/icons/puerto_mini.png"
                        alt=""
                        className="w-5 h-5 object-contain"
                      />
                      <span className="font-semibold">Ruta Anfibia Detectada:</span>
                      <span>
                        {maritimeRoute.path.join(' → ')} ({maritimeRoute.estimatedDays} días de
                        navegación)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de bando (solo si es jugador neutral que quiere unirse) */}
              {liveCampaign && currentPlayerSide === null && (
                <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-4">
                  <h3 className="text-lg font-heading font-semibold text-[#2d1810] mb-3">
                    Seleccionar Bando
                  </h3>
                  <p className="text-sm text-[#4a3f2a] mb-4">
                    Elige a quién quieres apoyar en esta campaña. Tus tropas participarán desde el inicio.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setSelectedSide('attacker')}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-heading font-semibold
                        ${selectedSide === 'attacker'
                          ? 'bg-red-900/20 border-red-700 text-red-900 shadow-md'
                          : 'bg-[#f4e4c1] border-[#b4a481] text-[#4a3f2a] hover:border-red-700'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={`/factions/${liveCampaign.declaredByFaction.toLowerCase()}.png`}
                            alt={liveCampaign.declaredByFaction}
                            className="w-8 h-8 object-contain"
                          />
                          <span>Apoyar al Atacante</span>
                        </div>
                        <div className="text-xs opacity-75">
                          ({liveCampaign.declaredByFaction})
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedSide('defender')}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-heading font-semibold
                        ${selectedSide === 'defender'
                          ? 'bg-blue-900/20 border-blue-700 text-blue-900 shadow-md'
                          : 'bg-[#f4e4c1] border-[#b4a481] text-[#4a3f2a] hover:border-blue-700'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={`/factions/${(game.map.provinces[liveCampaign.targetProvince]?.controlledBy || 'neutral').toLowerCase()}.png`}
                            alt={game.map.provinces[liveCampaign.targetProvince]?.controlledBy || 'Neutral'}
                            className="w-8 h-8 object-contain"
                          />
                          <span>Apoyar al Defensor</span>
                        </div>
                        <div className="text-xs opacity-75">
                          ({game.map.provinces[liveCampaign.targetProvince]?.controlledBy || 'Neutral'})
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Selector de unidades */}
              <div>
                <h3 className="text-lg font-heading font-semibold text-[#2d1810] mb-3">
                  Seleccionar Fuerzas Participantes
                </h3>

                {availableUnits.length === 0 ? (
                  <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-6 text-center">
                    <p className="text-[#4a3f2a]">
                      No tienes unidades disponibles para esta campaña
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableUnits.map(unit => (
                      <div
                        key={unit.id}
                        onClick={() => (!liveCampaign || currentPlayerSide === null) && toggleUnitSelection(unit.id)}
                        className={`bg-[#d4c4a1] border-2 rounded-lg p-4 transition-all
                          ${(!liveCampaign || currentPlayerSide === null) ? 'cursor-pointer' : 'cursor-default'}
                          ${
                            selectedUnits.has(unit.id)
                              ? 'border-renaissance-gold shadow-md bg-[#c4b49a]'
                              : (liveCampaign && currentPlayerSide !== null)
                              ? 'border-[#b4a481]'
                              : 'border-[#b4a481] hover:border-[#8b7355]'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Checkbox - Visible si NO es campaña existente O si es jugador neutral que quiere unirse */}
                          {(!liveCampaign || currentPlayerSide === null) && (
                            <input
                              type="checkbox"
                              checked={selectedUnits.has(unit.id)}
                              onChange={() => toggleUnitSelection(unit.id)}
                              className="w-5 h-5 accent-renaissance-gold cursor-pointer"
                            />
                          )}

                          {/* Icono tipo */}
                          <img
                            src={
                              unit.type === 'army' ? '/icons/reclutar.png' : '/icons/puerto_mini.png'
                            }
                            alt={unit.type}
                            className="w-8 h-8 object-contain"
                          />

                          {/* Info */}
                          <div className="flex-1">
                            <h4 className="font-heading font-semibold text-[#2d1810]">
                              {formatUnitName(unit)}
                            </h4>
                            <p className="text-sm text-[#4a3f2a]">
                              {getUnitCompositionSummary(unit)}
                            </p>
                          </div>

                          {/* Ubicación */}
                          <div className="text-right">
                            <p className="text-xs text-[#6b5d42]">Origen</p>
                            <p className="text-sm font-semibold text-[#2d1810]">
                              {getProvinceName(game.map, unit.currentPosition)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fuerzas Participantes en la Campaña */}
              {liveCampaign && (
                <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-4">
                  <h3 className="text-lg font-heading font-semibold text-[#2d1810] mb-3">
                    Fuerzas Participantes en la Campaña
                  </h3>

                  {/* Unidades del Declarante */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={`/factions/${liveCampaign.declaredByFaction.toLowerCase()}.png`}
                        alt={liveCampaign.declaredByFaction}
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <h4 className="font-heading font-semibold text-[#2d1810]">
                        Declarante: {liveCampaign.declaredByFaction}
                      </h4>
                    </div>
                    <div className="space-y-2 ml-7">
                      {units
                        .filter(u => liveCampaign.participatingUnits.includes(u.id))
                        .map(unit => {
                          const unitPlayer = players.find(p => p.id === unit.owner)
                          return (
                            <div
                              key={unit.id}
                              className="flex items-center gap-2 p-2 bg-[#f4e4c1] rounded border border-[#b4a481]"
                            >
                              <img
                                src={unit.type === 'army' ? '/icons/reclutar.png' : '/icons/puerto_mini.png'}
                                alt={unit.type}
                                className="w-6 h-6 object-contain"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-[#2d1810]">{unit.name || `${unit.type === 'army' ? 'Ejército' : 'Flota'} en ${unit.currentPosition}`}</p>
                                <p className="text-xs text-[#4a3f2a]">
                                  {getUnitCompositionSummary(unit)} • {getProvinceName(game.map, unit.currentPosition)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>

                  {/* Unidades de Aliados */}
                  {liveCampaign.allies && liveCampaign.allies.length > 0 && (
                    <div className="space-y-4">
                      {liveCampaign.allies.map(ally => {
                        const allyPlayer = players.find(p => p.id === ally.playerId)
                        const allyUnits = units.filter(u => ally.unitIds.includes(u.id))

                        return (
                          <div key={ally.id}>
                            <div className="flex items-center gap-2 mb-2">
                              <img
                                src={`/factions/${ally.faction.toLowerCase()}.png`}
                                alt={ally.faction}
                                className="w-5 h-5 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                              <h4 className="font-heading font-semibold text-[#2d1810]">
                                Aliado: {ally.faction}
                              </h4>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                ally.side === 'attacker'
                                  ? 'bg-red-200 text-red-800'
                                  : 'bg-blue-200 text-blue-800'
                              }`}>
                                {ally.side === 'attacker' ? 'Atacante' : 'Defensor'}
                              </span>
                            </div>
                            <div className="space-y-2 ml-7">
                              {allyUnits.map(unit => (
                                <div
                                  key={unit.id}
                                  className="flex items-center gap-2 p-2 bg-[#f4e4c1] rounded border border-[#b4a481]"
                                >
                                  <img
                                    src={unit.type === 'army' ? '/icons/reclutar.png' : '/icons/puerto_mini.png'}
                                    alt={unit.type}
                                    className="w-6 h-6 object-contain"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#2d1810]">{unit.name || `${unit.type === 'army' ? 'Ejército' : 'Flota'} en ${unit.currentPosition}`}</p>
                                    <p className="text-xs text-[#4a3f2a]">
                                      {getUnitCompositionSummary(unit)} • {getProvinceName(game.map, unit.currentPosition)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Mensaje de error */}
              {!validation.isValid && selectedUnits.size > 0 && (
                <div className="bg-red-100 border-2 border-red-600 rounded-lg p-3">
                  <p className="text-red-800 text-sm font-semibold">{validation.error}</p>
                </div>
              )}

              {/* Mensaje de guardado */}
              {saveMessage && (
                <div
                  className={`border-2 rounded-lg p-3 ${
                    saveMessage.includes('éxito')
                      ? 'bg-green-100 border-green-600 text-green-800'
                      : 'bg-red-100 border-red-600 text-red-800'
                  }`}
                >
                  <p className="text-sm font-semibold">{saveMessage}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tactics' && liveCampaign && (
            <div className="space-y-6">
              {/* Estrategia General */}
              <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-heading font-semibold text-[#2d1810]">
                    Estrategia General
                  </h3>
                  <select
                    value={liveCampaign.generalStrategy || 'conquista'}
                    onChange={async (e) => {
                      const newStrategy = e.target.value as import('@/types/game').GeneralStrategy
                      try {
                        await updateDoc(doc(db, 'campaigns', liveCampaign.id), {
                          generalStrategy: newStrategy,
                          updatedAt: Timestamp.now()
                        })
                      } catch (error) {
                        console.error('Error al actualizar estrategia general:', error)
                        alert('Error al actualizar la estrategia general')
                      }
                    }}
                    className="flex-1 max-w-xs px-3 py-2 border-2 border-[#6b5d42] rounded bg-white text-sm text-[#2d1810] font-medium text-center focus:ring-2 focus:ring-renaissance-gold"
                  >
                    <option value="conquista">Conquista</option>
                    <option value="batalla">Batalla</option>
                    <option value="tanteo">Tanteo</option>
                    <option value="razzia">Razzia</option>
                    <option value="retirada">Retirada</option>
                  </select>
                </div>
              </div>

              {/* Resumen de tropas disponibles - Plegable */}
              <div className="border-2 border-[#b4a481] rounded-lg overflow-visible">
                <button
                  onClick={() => setShowTroopPool(!showTroopPool)}
                  className="w-full bg-[#d4c4a1] hover:bg-[#c9b591] px-4 py-3 flex items-center justify-between transition-colors"
                >
                  <h4 className="font-heading font-semibold text-[#2d1810] text-lg">
                    Pool de Tropas Disponibles
                  </h4>
                  <span className="text-[#2d1810] text-xl transition-transform duration-200" style={{ transform: showTroopPool ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ▶
                  </span>
                </button>
                {showTroopPool && (
                  <div className="p-4 bg-[#f4e4c1]/20">
                    <TroopPoolSummary
                      campaign={liveCampaign}
                      units={units}
                      formations={liveCampaign.formations || []}
                      onQuickCreate={handleQuickCreateFormation}
                      currentPlayerFaction={player.faction}
                    />
                  </div>
                )}
              </div>

              {/* Resumen de naves disponibles - Plegable */}
              <div className="border-2 border-[#b4a481] rounded-lg overflow-visible">
                <button
                  onClick={() => setShowShipPool(!showShipPool)}
                  className="w-full bg-[#d4c4a1] hover:bg-[#c9b591] px-4 py-3 flex items-center justify-between transition-colors"
                >
                  <h4 className="font-heading font-semibold text-[#2d1810] text-lg">
                    Naves Participantes
                  </h4>
                  <span className="text-[#2d1810] text-xl transition-transform duration-200" style={{ transform: showShipPool ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ▶
                  </span>
                </button>
                {showShipPool && (
                  <div className="p-4 bg-[#f4e4c1]/20">
                    <ShipPoolSummary
                      campaign={liveCampaign}
                      units={units}
                    />
                  </div>
                )}
              </div>

              {/* Sección de Refuerzos Recibidos - Plegable */}
              {attackerReinforcementCards.length > 0 && (
                <div className="border-2 border-[#b4a481] rounded-lg overflow-visible">
                  <button
                    onClick={() => setShowReinforcements(!showReinforcements)}
                    className="w-full bg-[#d4c4a1] hover:bg-[#c9b591] px-4 py-3 flex items-center justify-between transition-colors"
                  >
                    <h4 className="font-heading font-semibold text-[#2d1810] text-lg">
                      Refuerzos Recibidos ({attackerReinforcementCards.length})
                    </h4>
                    <span className="text-[#2d1810] text-xl transition-transform duration-200" style={{ transform: showReinforcements ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      ▶
                    </span>
                  </button>
                  {showReinforcements && (
                    <div className="p-4 bg-[#f4e4c1]/20">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {attackerReinforcementCards.map(card => (
                          <ReinforcementTroopCard
                            key={card.key}
                            troopType={card.troopType}
                            quantity={card.available}
                            faction={card.faction}
                            daysUntilArrival={card.daysUntilArrival}
                            reinforcementId={card.reinforcementId}
                            estimatedArrivalDay={card.estimatedArrivalDay}
                            onQuickCreate={handleQuickCreateFromReinforcement}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Header de formaciones */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-heading font-semibold text-[#2d1810]">
                  Formaciones Tácticas
                </h3>
                <button
                  onClick={() => setShowDeploymentModal(true)}
                  className="flex items-center justify-center p-2 border-2 border-renaissance-gold hover:bg-renaissance-gold/10 rounded transition-colors"
                  title="Ver Despliegue Táctico"
                >
                  <img src="/icons/campañas.png" alt="Ver Despliegue" className="w-8 h-8 object-contain" />
                </button>
              </div>

              {/* Lista de formaciones */}
              {liveCampaign.formations && liveCampaign.formations.length > 0 ? (
                <div className="space-y-3">
                  {liveCampaign.formations.map(formation => (
                    <FormationCard
                      key={formation.id}
                      formation={formation}
                      campaign={liveCampaign}
                      units={units}
                      game={game}
                      currentPlayerFaction={player.faction}
                      onUpdate={handleUpdateFormation}
                      onDelete={handleDeleteFormation}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-8 text-center">
                  <img
                    src="/icons/reclutar.png"
                    alt=""
                    className="w-16 h-16 object-contain mx-auto mb-4 opacity-50"
                  />
                  <h4 className="text-lg font-heading font-semibold text-[#2d1810] mb-2">
                    No hay formaciones creadas
                  </h4>
                  <p className="text-[#4a3f2a]">
                    Haz click en el icono <img src="/icons/incremento.png" alt="+" className="inline w-4 h-4 mx-1" /> de cualquier tropa disponible para crear una formación
                  </p>
                </div>
              )}

              {/* Información adicional */}
              <div className="bg-[#f4e4c1] border-2 border-[#b4a481] rounded-lg p-4">
                <h4 className="font-heading font-semibold text-[#2d1810] mb-2 flex items-center gap-2">
                  <span>ℹ️</span>
                  Sobre las Formaciones
                </h4>
                <ul className="space-y-1 text-sm text-[#4a3f2a]">
                  <li>• Click en <img src="/icons/incremento.png" alt="+" className="inline w-3 h-3 mx-0.5" /> para crear una formación con ese tipo de tropa</li>
                  <li>• Las formaciones agrupan tropas del mismo tipo y facción</li>
                  <li>• Puedes asignar cada formación a una zona de batalla (flancos, centro, reserva)</li>
                  <li>• Las órdenes estratégicas y tácticas estarán disponibles en futuras versiones</li>
                  <li>• Las formaciones persisten entre turnos mientras la campaña esté activa</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'defensive' && liveCampaign && (
            <div className="space-y-6">
              {/* Sección de Refuerzos Recibidos */}
              {defenderReinforcementCards.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-heading font-semibold text-[#2d1810]">
                    Refuerzos Recibidos
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {defenderReinforcementCards.map(card => (
                      <ReinforcementTroopCard
                        key={card.key}
                        troopType={card.troopType}
                        quantity={card.available}
                        faction={card.faction}
                        daysUntilArrival={card.daysUntilArrival}
                        reinforcementId={card.reinforcementId}
                        estimatedArrivalDay={card.estimatedArrivalDay}
                        onQuickCreate={handleQuickCreateFromReinforcement}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Placeholder para fuerzas defensoras */}
              <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-8 text-center">
                <img
                  src="/icons/guarnicion.png"
                  alt=""
                  className="w-16 h-16 object-contain mx-auto mb-4 opacity-50"
                />
                <h3 className="text-xl font-heading font-semibold text-[#2d1810] mb-2">
                  Gestión de Fuerzas Defensoras
                </h3>
                <p className="text-[#4a3f2a]">
                  Contenido pendiente de implementación
                </p>
                <p className="text-sm text-[#6b5d42] mt-2">
                  Aquí podrás organizar las fuerzas defensoras y los apoyos de tus aliados
                </p>
              </div>
            </div>
          )}

          {activeTab === 'council' && liveCampaign && (
            <div className="h-full flex flex-col">
              <WarCouncilChat
                gameId={game.id}
                campaign={liveCampaign}
                currentPlayer={player}
                players={players}
                game={game}
              />
            </div>
          )}

          {activeTab === 'history' && liveCampaign && (
            <div className="space-y-6">
              {/* Placeholder para historial de campaña */}
              <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-8 text-center">
                <img
                  src="/icons/historial.png"
                  alt=""
                  className="w-16 h-16 object-contain mx-auto mb-4 opacity-50"
                />
                <h3 className="text-xl font-heading font-semibold text-[#2d1810] mb-2">
                  Historial de Campaña
                </h3>
                <p className="text-[#4a3f2a]">
                  Contenido pendiente de implementación
                </p>
                <p className="text-sm text-[#6b5d42] mt-2">
                  Aquí verás los resultados de las batallas, eventos especiales y el desarrollo de la campaña
                </p>
              </div>
            </div>
          )}

          {/* Tab Refuerzos */}
          {activeTab === 'reinforcements' && liveCampaign && game.map && (
            <ReinforcementsTab
              campaign={liveCampaign}
              player={player}
              game={game}
              allUnits={units}
              allCampaigns={campaigns}
              provinceMap={game.map.provinces}
              onSave={handleSaveReinforcement}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-[#6b5d42] bg-[#2d2416] flex justify-between items-center rounded-b-lg">
          {activeTab === 'plan' && (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#6b5d42] hover:bg-[#8b7355] text-[#e8dcc0] rounded font-heading font-semibold transition-colors"
              >
                Cancelar
              </button>
              {/* Botón para declarar campaña (atacante original) */}
              {!liveCampaign && (
                <button
                  onClick={handleDeclareCampaign}
                  disabled={!validation.isValid || isSaving}
                  className={`px-6 py-2 rounded font-heading font-semibold transition-colors
                    ${
                      validation.isValid && !isSaving
                        ? 'bg-renaissance-gold hover:bg-[#c9a961] text-[#1d1408]'
                        : 'bg-[#4a3f2a] text-[#8b7355] cursor-not-allowed'
                    }`}
                >
                  {isSaving ? 'Declarando...' : 'Declarar Campaña'}
                </button>
              )}
              {/* Botón para unirse a campaña (jugador neutral) */}
              {liveCampaign && currentPlayerSide === null && (
                <button
                  onClick={handleJoinCampaign}
                  disabled={!selectedSide || selectedUnits.size === 0 || isSaving}
                  className={`px-6 py-2 rounded font-heading font-semibold transition-colors
                    ${
                      selectedSide && selectedUnits.size > 0 && !isSaving
                        ? 'bg-renaissance-gold hover:bg-[#c9a961] text-[#1d1408]'
                        : 'bg-[#4a3f2a] text-[#8b7355] cursor-not-allowed'
                    }`}
                >
                  {isSaving ? 'Uniéndote...' : 'Unirse a Campaña'}
                </button>
              )}
            </>
          )}

          {(activeTab === 'tactics' || activeTab === 'defensive' || activeTab === 'council' || activeTab === 'history' || activeTab === 'reinforcements') && (
            <button
              onClick={onClose}
              className="w-full px-6 py-2 bg-[#6b5d42] hover:bg-[#8b7355] text-[#e8dcc0] rounded font-heading font-semibold transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      {/* Modal para crear formación */}
      {showCreateFormationModal && liveCampaign && (
        <CreateFormationModal
          campaign={liveCampaign}
          units={units}
          existingFormations={liveCampaign.formations || []}
          onClose={() => {
            setShowCreateFormationModal(false)
            setQuickCreateTroopType(undefined)
            setQuickCreateFaction(undefined)
            setQuickCreateIsReinforcement(false)
            setQuickCreateReinforcementId(undefined)
            setQuickCreateEstimatedArrival(undefined)
          }}
          onCreate={handleCreateFormation}
          initialTroopType={quickCreateTroopType}
          initialFaction={quickCreateFaction}
          isReinforcement={quickCreateIsReinforcement}
          reinforcementId={quickCreateReinforcementId}
          estimatedArrivalDay={quickCreateEstimatedArrival}
        />
      )}

      {/* Modal de Despliegue Táctico */}
      {showDeploymentModal && liveCampaign && (
        <TacticalDeploymentModal
          isOpen={showDeploymentModal}
          onClose={() => setShowDeploymentModal(false)}
          formations={liveCampaign.formations || []}
          reinforcements={liveCampaign.reinforcements || []}
        />
      )}
    </div>
  )
}
