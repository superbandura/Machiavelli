import { Timestamp } from 'firebase/firestore'
import type { MilitaryCampaign, Unit, TacticalFormation, Player, Game } from '@/types/game'
import type { ArmyComposition, ArmyTroopType, FleetComposition, FleetShipType } from '@/types/scenario'
import type { Province } from '@/types/map'
import { getAdjacentProvinces, isCoastalProvince } from './gameMapHelpers'

/**
 * Información agregada de tropas por tipo y facción
 */
export interface TroopPool {
  type: ArmyTroopType
  faction: string
  total: number
  key: string // Clave compuesta: "pikemen-genova"
}

/**
 * Información agregada de naves por tipo y facción
 */
export interface ShipPool {
  type: FleetShipType
  faction: string
  total: number
  key: string // Clave compuesta: "galley-genova"
}

/**
 * Calcula el pool de tropas disponibles en una campaña
 * Agrupa todas las tropas de las unidades participantes Y refuerzos por tipo y facción
 */
export function calculateAvailableTroops(
  campaign: MilitaryCampaign,
  units: Unit[]
): Record<string, TroopPool> {
  const pool: Record<string, TroopPool> = {}

  // Validar que exista el array de unidades participantes
  if (!campaign.participatingUnits || campaign.participatingUnits.length === 0) {
    return pool
  }

  // Filtrar solo las unidades que participan en esta campaña
  const participatingUnits = units.filter(u =>
    campaign.participatingUnits.includes(u.id)
  )

  for (const unit of participatingUnits) {
    // Solo procesar ejércitos (las flotas no tienen composición de tropas terrestres útil para formaciones)
    if (unit.type !== 'army' || !unit.composition) continue

    const armyComp = unit.composition as ArmyComposition

    // Obtener la facción del owner de la unidad
    // Nota: En campaña activa, owner es playerId, necesitamos la facción
    // Por ahora usamos el declaredByFaction de la campaña como facción principal
    const faction = campaign.declaredByFaction.toLowerCase()

    // Iterar sobre cada tipo de tropa en la composición
    for (const [troopType, count] of Object.entries(armyComp.troops)) {
      if (!count || count <= 0) continue

      const key = `${troopType}-${faction}`

      if (!pool[key]) {
        pool[key] = {
          type: troopType as ArmyTroopType,
          faction,
          total: 0,
          key
        }
      }

      pool[key].total += count
    }
  }

  // Los refuerzos NO se incluyen en el pool disponible para formaciones
  // Se muestran solo en la sección dedicada "Refuerzos Recibidos"
  // con su badge "R" rojo y días hasta llegada

  return pool
}

/**
 * Calcula el pool de naves disponibles en una campaña
 * Agrupa todas las naves de las flotas participantes y refuerzos por tipo y facción
 */
export function calculateAvailableShips(
  campaign: MilitaryCampaign,
  units: Unit[]
): Record<string, ShipPool> {
  console.log('[calculateAvailableShips] 🔍 Calculando barcos disponibles:', {
    campaignId: campaign.id,
    participatingUnits: campaign.participatingUnits?.length || 0,
    fleetPool: campaign.fleetPool
  })

  const pool: Record<string, ShipPool> = {}

  // Validar que exista el array de unidades participantes
  if (!campaign.participatingUnits || campaign.participatingUnits.length === 0) {
    console.log('[calculateAvailableShips] ⚠️ No hay unidades participantes, pero revisando fleetPool...')
  }

  // Filtrar solo las unidades que participan en esta campaña
  const participatingUnits = units.filter(u =>
    campaign.participatingUnits.includes(u.id)
  )

  for (const unit of participatingUnits) {
    // Solo procesar flotas
    if (unit.type !== 'fleet' || !unit.composition) continue

    const fleetComp = unit.composition as FleetComposition

    // Obtener la facción del owner de la unidad
    // Nota: En campaña activa, owner es playerId, necesitamos la facción
    // Por ahora usamos el declaredByFaction de la campaña como facción principal
    const faction = campaign.declaredByFaction.toLowerCase()

    // Iterar sobre cada tipo de nave en la composición
    for (const [shipType, count] of Object.entries(fleetComp.ships)) {
      if (!count || count <= 0) continue

      const key = `${shipType}-${faction}`

      if (!pool[key]) {
        pool[key] = {
          type: shipType as FleetShipType,
          faction,
          total: 0,
          key
        }
      }

      pool[key].total += count
    }
  }

  // Los aliados y refuerzos NO se incluyen en el pool disponible
  // Las naves de aliados están en participatingUnits (después del fix de joinCampaign)
  // Los refuerzos se muestran en su sección dedicada

  // AÑADIR: Barcos del fleetPool (flotas de refuerzo integradas inmediatamente)
  if (campaign.fleetPool) {
    console.log('[calculateAvailableShips] 🚢 Añadiendo barcos del fleetPool:', campaign.fleetPool)
    const faction = campaign.declaredByFaction.toLowerCase()

    // Añadir galeras del pool
    if (campaign.fleetPool.galleys > 0) {
      const key = `galley-${faction}`
      if (!pool[key]) {
        pool[key] = {
          type: 'galley' as FleetShipType,
          faction,
          total: 0,
          key
        }
      }
      pool[key].total += campaign.fleetPool.galleys
      console.log(`[calculateAvailableShips] ✅ Añadidas ${campaign.fleetPool.galleys} galeras, total:`, pool[key].total)
    }

    // Añadir cocas del pool
    if (campaign.fleetPool.cogs > 0) {
      const key = `cog-${faction}`
      if (!pool[key]) {
        pool[key] = {
          type: 'cog' as FleetShipType,
          faction,
          total: 0,
          key
        }
      }
      pool[key].total += campaign.fleetPool.cogs
      console.log(`[calculateAvailableShips] ✅ Añadidas ${campaign.fleetPool.cogs} cocas, total:`, pool[key].total)
    }
  } else {
    console.log('[calculateAvailableShips] ⚠️ No hay fleetPool en la campaña')
  }

  console.log('[calculateAvailableShips] ✅ Pool calculado:', pool)

  return pool
}

/**
 * Calcula el pool de tropas embarcadas en flotas participantes en una campaña
 * Las tropas embarcadas pueden usarse para crear formaciones tácticas
 */
export function calculateEmbarkedTroops(
  campaign: MilitaryCampaign,
  units: Unit[]
): Record<string, TroopPool> {
  const pool: Record<string, TroopPool> = {}

  // Validar que exista el array de unidades participantes
  if (!campaign.participatingUnits || campaign.participatingUnits.length === 0) {
    return pool
  }

  // Filtrar solo las flotas que participan en esta campaña
  const participatingFleets = units.filter(u =>
    campaign.participatingUnits.includes(u.id) && u.type === 'fleet'
  )

  for (const fleet of participatingFleets) {
    // Solo procesar flotas con tropas embarcadas
    if (!fleet.embarkedTroops?.troops) continue

    // Obtener la facción del owner de la unidad
    const faction = campaign.declaredByFaction.toLowerCase()

    // Iterar sobre cada tipo de tropa embarcada
    for (const [troopType, count] of Object.entries(fleet.embarkedTroops.troops)) {
      if (!count || count <= 0) continue

      const key = `${troopType}-${faction}`

      if (!pool[key]) {
        pool[key] = {
          type: troopType as ArmyTroopType,
          faction,
          total: 0,
          key
        }
      }

      pool[key].total += count
    }
  }

  // Añadir tropas embarcadas de aliados
  if (campaign.allies && campaign.allies.length > 0) {
    for (const ally of campaign.allies) {
      // Obtener flotas del aliado
      const allyFleets = units.filter(u =>
        ally.unitIds.includes(u.id) && u.type === 'fleet'
      )

      for (const fleet of allyFleets) {
        if (!fleet.embarkedTroops?.troops) continue

        const faction = ally.faction.toLowerCase()

        // Iterar sobre cada tipo de tropa embarcada
        for (const [troopType, count] of Object.entries(fleet.embarkedTroops.troops)) {
          if (!count || count <= 0) continue

          const key = `${troopType}-${faction}`

          if (!pool[key]) {
            pool[key] = {
              type: troopType as ArmyTroopType,
              faction,
              total: 0,
              key
            }
          }

          pool[key].total += count
        }
      }
    }
  }

  // Los refuerzos NO se incluyen en el pool disponible
  // Se muestran solo en su sección dedicada

  return pool
}

/**
 * Calcula las tropas que aún no han sido asignadas a formaciones
 * NOTA: Solo resta formaciones que NO son de refuerzo (isReinforcement !== true)
 * Las formaciones de refuerzo se gestionan por separado
 */
export function calculateUnassignedTroops(
  availableTroops: Record<string, TroopPool>,
  formations: TacticalFormation[]
): Record<string, number> {
  const unassigned: Record<string, number> = {}

  // Inicializar con todas las tropas disponibles
  for (const [key, pool] of Object.entries(availableTroops)) {
    unassigned[key] = pool.total
  }

  // Restar las tropas asignadas a formaciones (excepto las de refuerzo)
  for (const formation of formations) {
    // Skip formaciones de refuerzo - se gestionan por separado
    if (formation.isReinforcement) continue

    const key = `${formation.troopType}-${formation.faction}`
    if (unassigned[key] !== undefined) {
      unassigned[key] -= formation.quantity
    }
  }

  return unassigned
}

/**
 * Valida que una formación sea válida
 */
export function validateFormation(
  formation: Partial<TacticalFormation>,
  availableTroops: Record<string, TroopPool>,
  existingFormations: TacticalFormation[],
  excludeFormationId?: string // Para validar al editar una formación existente
): { isValid: boolean; error?: string } {
  // Validar campos requeridos
  if (!formation.troopType) {
    return { isValid: false, error: 'Debes seleccionar un tipo de tropa' }
  }

  if (!formation.faction) {
    return { isValid: false, error: 'Debes seleccionar una facción' }
  }

  if (!formation.quantity || formation.quantity <= 0) {
    return { isValid: false, error: 'La cantidad debe ser mayor a 0' }
  }

  if (!formation.deploymentZone) {
    return { isValid: false, error: 'Debes seleccionar una zona de despliegue' }
  }

  // Validar que existan tropas de este tipo/facción
  const key = `${formation.troopType}-${formation.faction}`
  const pool = availableTroops[key]

  if (!pool) {
    return {
      isValid: false,
      error: `No hay tropas disponibles de tipo ${formation.troopType} de ${formation.faction}`
    }
  }

  // Calcular tropas sin asignar (excluyendo la formación que estamos editando si aplica)
  const otherFormations = excludeFormationId
    ? existingFormations.filter(f => f.id !== excludeFormationId)
    : existingFormations

  const unassigned = calculateUnassignedTroops(availableTroops, otherFormations)

  // Validar que no se excedan las tropas disponibles
  if (formation.quantity > unassigned[key]) {
    return {
      isValid: false,
      error: `Solo hay ${unassigned[key]} tropas disponibles de este tipo. Ya asignadas: ${pool.total - unassigned[key]}`
    }
  }

  // Validar orden estratégica
  if (formation.strategicOrder && formation.strategicOrder !== 'none') {
    const availableStrategicOrders = getAvailableStrategicOrders(formation.troopType)
    if (!availableStrategicOrders.includes(formation.strategicOrder)) {
      const troopName = formation.troopType
      return {
        isValid: false,
        error: `La orden estratégica "${formation.strategicOrder}" no está disponible para ${troopName}`
      }
    }
  }

  // Validar orden táctica
  if (formation.tacticalOrder && formation.tacticalOrder !== 'none') {
    const availableTacticalOrders = getAvailableTacticalOrders(formation.troopType)
    if (!availableTacticalOrders.includes(formation.tacticalOrder)) {
      const troopName = formation.troopType
      return {
        isValid: false,
        error: `La orden táctica "${formation.tacticalOrder}" no está disponible para ${troopName}`
      }
    }
  }

  return { isValid: true }
}

/**
 * Genera un nombre automático para una formación
 * Formato: "1ª de [tipo] de [Facción]"
 */
export function generateFormationName(
  troopType: ArmyTroopType,
  faction: string,
  existingFormations: TacticalFormation[]
): string {
  // Nombres legibles de tipos de tropas
  const troopNames: Record<ArmyTroopType, string> = {
    militia: 'milicia',
    lancers: 'lanceros',
    pikemen: 'piqueros',
    archers: 'arqueros',
    crossbowmen: 'ballesteros',
    lightCavalry: 'caballería ligera',
    heavyCavalry: 'caballería pesada'
  }

  // Capitalizar primera letra de la facción
  const factionName = faction.charAt(0).toUpperCase() + faction.slice(1)

  // Contar cuántas formaciones del mismo tipo/facción ya existen
  const sameTypeFormations = existingFormations.filter(
    f => f.troopType === troopType && f.faction.toLowerCase() === faction.toLowerCase()
  )

  const number = sameTypeFormations.length + 1
  const ordinal = number === 1 ? '1ª' : `${number}ª`

  return `${ordinal} de ${troopNames[troopType]} de ${factionName}`
}

/**
 * Genera un ID único para una formación
 */
export function generateFormationId(): string {
  return `formation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Crea una nueva formación con valores por defecto
 */
export function createFormation(
  troopType: ArmyTroopType,
  faction: string,
  quantity: number,
  deploymentZone: TacticalFormation['deploymentZone'],
  existingFormations: TacticalFormation[],
  customName?: string,
  strategicOrder?: TacticalFormation['strategicOrder'],
  tacticalOrder?: TacticalFormation['tacticalOrder'],
  isReinforcement?: boolean,
  reinforcementId?: string,
  estimatedArrivalDay?: number
): TacticalFormation {
  const name = customName || generateFormationName(troopType, faction, existingFormations)

  return {
    id: generateFormationId(),
    name,
    troopType,
    faction: faction.toLowerCase(),
    quantity,
    deploymentZone,
    strategicOrder: strategicOrder || 'none',
    tacticalOrder: tacticalOrder || 'none',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...(isReinforcement !== undefined && { isReinforcement }),
    ...(reinforcementId !== undefined && { reinforcementId }),
    ...(estimatedArrivalDay !== undefined && { estimatedArrivalDay })
  }
}

/**
 * Obtiene el label legible de una zona de despliegue
 */
export function getDeploymentZoneLabel(zone: TacticalFormation['deploymentZone']): string {
  const labels = {
    left: 'Flanco Izquierdo',
    right: 'Flanco Derecho',
    center: 'Centro',
    reserve: 'Reserva'
  }
  return labels[zone]
}

/**
 * Obtiene las órdenes estratégicas disponibles para un tipo de tropa
 */
export function getAvailableStrategicOrders(troopType: ArmyTroopType): TacticalFormation['strategicOrder'][] {
  // Órdenes base disponibles para todos
  const baseOrders: TacticalFormation['strategicOrder'][] = ['none', 'marchar']

  // Caballería ligera: órdenes especializadas de reconocimiento y comunicación
  if (troopType === 'lightCavalry') {
    return [...baseOrders, 'explorar', 'cubrirFlancos', 'mensajeros']
  }

  // Caballería pesada: solo órdenes base (no puede escaramuzar ni forrajear)
  if (troopType === 'heavyCavalry') {
    return baseOrders
  }

  // Infantería y arqueros: pueden escaramuzar y forrajear
  // (militia, lancers, pikemen, archers, crossbowmen)
  return [...baseOrders, 'escaramuza', 'forrajear']
}

/**
 * Obtiene las órdenes tácticas disponibles para un tipo de tropa
 */
export function getAvailableTacticalOrders(troopType: ArmyTroopType): TacticalFormation['tacticalOrder'][] {
  // Unidades de combate cuerpo a cuerpo
  const meleeTypes: ArmyTroopType[] = ['militia', 'lancers', 'pikemen']

  if (meleeTypes.includes(troopType)) {
    return ['none', 'mantener', 'avanzar', 'cargar']
  }

  // Arqueros, ballesteros y caballería (por ahora solo 'none')
  return ['none']
}

/**
 * Obtiene el label legible de una orden estratégica
 */
export function getStrategicOrderLabel(order: TacticalFormation['strategicOrder']): string {
  const labels: Record<TacticalFormation['strategicOrder'], string> = {
    none: 'Sin orden estratégica',
    escaramuza: 'Escaramuza',
    marchar: 'Marchar',
    explorar: 'Explorar',
    cubrirFlancos: 'Cubrir Flancos',
    mensajeros: 'Mensajeros',
    forrajear: 'Forrajear'
  }
  return labels[order]
}

/**
 * Obtiene el label legible de una orden táctica
 */
export function getTacticalOrderLabel(order: TacticalFormation['tacticalOrder']): string {
  const labels: Record<TacticalFormation['tacticalOrder'], string> = {
    none: 'Sin orden táctica',
    mantener: 'Mantener posición',
    avanzar: 'Avanzar',
    cargar: 'Cargar al enemigo'
  }
  return labels[order]
}

/**
 * Calcula las tropas de un refuerzo específico que aún no han sido asignadas a formaciones
 */
export function calculateUnassignedReinforcementTroops(
  reinforcementId: string,
  troopType: ArmyTroopType,
  faction: string,
  totalAvailable: number,
  formations: TacticalFormation[]
): number {
  // Sumar todas las formaciones que provienen de este refuerzo y tipo de tropa
  const assigned = formations
    .filter(f =>
      f.isReinforcement &&
      f.reinforcementId === reinforcementId &&
      f.troopType === troopType &&
      f.faction.toLowerCase() === faction.toLowerCase()
    )
    .reduce((sum, f) => sum + f.quantity, 0)

  return totalAvailable - assigned
}

/**
 * Calcula el total de tropas asignadas a formaciones
 */
export function getTotalAssignedTroops(formations: TacticalFormation[]): number {
  return formations.reduce((sum, f) => sum + f.quantity, 0)
}

/**
 * Obtiene todas las formaciones de un tipo específico
 */
export function getFormationsByType(
  formations: TacticalFormation[],
  troopType: ArmyTroopType
): TacticalFormation[] {
  return formations.filter(f => f.troopType === troopType)
}

/**
 * Obtiene todas las formaciones de una zona de despliegue
 */
export function getFormationsByZone(
  formations: TacticalFormation[],
  zone: TacticalFormation['deploymentZone']
): TacticalFormation[] {
  return formations.filter(f => f.deploymentZone === zone)
}

/**
 * Calcula las unidades disponibles que un jugador puede enviar como refuerzo a una campaña
 *
 * Criterios:
 * - La unidad pertenece al jugador
 * - Es ejército o flota activa
 * - No está asignada a otra campaña activa
 * - Tiene una ruta válida hasta la provincia de campaña (adyacencia terrestre o ruta marítima)
 */
export function calculateReinforcementUnits(
  campaign: MilitaryCampaign,
  player: Player,
  allUnits: Unit[],
  allCampaigns: MilitaryCampaign[],
  provinceMap: Record<string, Province>
): Unit[] {
  const targetProvince = provinceMap[campaign.targetProvince]
  if (!targetProvince) return []

  // Obtener provincias adyacentes al objetivo
  const adjacentProvinces = getAdjacentProvinces({ provinces: provinceMap }, campaign.targetProvince)

  // Filtrar unidades del jugador
  const isTargetCoastalProvince = isCoastalProvince({ provinces: provinceMap }, campaign.targetProvince)

  const playerUnits = allUnits.filter(unit => {
    // Debe pertenecer al jugador
    if (unit.owner !== player.id) return false

    // Solo ejércitos y flotas
    if (unit.type !== 'army' && unit.type !== 'fleet') return false

    // Debe estar activa
    if (unit.status !== 'active') return false

    // Debe tener composición válida
    if (!unit.composition) return false

    // No debe estar en la campaña actual (ya participando)
    if (campaign.participatingUnits.includes(unit.id)) return false

    // No debe estar en otras campañas activas
    const isInOtherCampaign = allCampaigns.some(c =>
      c.id !== campaign.id &&
      c.status === 'active' &&
      c.participatingUnits.includes(unit.id)
    )
    if (isInOtherCampaign) return false

    // No debe estar ya enviada como refuerzo en ninguna campaña activa
    const isAlreadyReinforcement = allCampaigns.some(c =>
      (c.status === 'planning' || c.status === 'active') &&
      c.reinforcements?.some(r => r.unitIds.includes(unit.id))
    )
    if (isAlreadyReinforcement) return false

    // Verificar ruta válida
    const currentPos = unit.currentPosition

    // Si es ejército: debe estar en provincia adyacente
    if (unit.type === 'army') {
      return adjacentProvinces.includes(currentPos)
    }

    // Si es flota: solo puede reforzar provincias costeras
    if (unit.type === 'fleet') {
      // Las flotas solo pueden reforzar provincias costeras
      if (!isTargetCoastalProvince) return false

      // Si es costera, verificar tropas embarcadas o adyacencia
      const hasEmbarkedTroops = unit.embarkedTroops?.troops &&
        Object.values(unit.embarkedTroops.troops).some(count => count > 0)

      if (hasEmbarkedTroops) {
        // Flota con tropas embarcadas puede reforzar cualquier provincia costera
        return true
      }

      // Sin tropas embarcadas, debe estar en un mar adyacente a la provincia
      return adjacentProvinces.includes(currentPos)
    }

    return false
  })

  return playerUnits
}
