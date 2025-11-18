/**
 * Helpers para trabajar con el mapa del juego
 *
 * Estas funciones reciben el GameMap como parámetro en lugar de usar
 * datos hardcoded, lo que permite que cada partida tenga su propio mapa
 */

import { Unit } from '@/types'
import { GameMap, ProvinceInfo } from '@/types/game'
import { ArmyComposition, FleetComposition } from '@/types/scenario'

/**
 * Obtiene las provincias adyacentes a una provincia dada
 */
export function getAdjacentProvinces(
  map: GameMap,
  provinceId: string
): string[] {
  return map.provinces[provinceId]?.adjacencies || []
}

/**
 * Obtiene las provincias adyacentes válidas para un tipo de unidad específico
 * - Armies: Solo land y port
 * - Fleets: Solo sea y port
 * - Garrisons: No se mueven
 */
export function getValidAdjacentProvinces(
  map: GameMap,
  provinceId: string,
  unitType: 'army' | 'fleet' | 'garrison'
): string[] {
  if (unitType === 'garrison') {
    return [] // Las guarniciones no se mueven
  }

  const adjacent = getAdjacentProvinces(map, provinceId)

  return adjacent.filter((adjId) => {
    const province = map.provinces[adjId]
    if (!province) return false

    if (unitType === 'army') {
      // Ejércitos pueden moverse a tierra y puertos
      return province.type === 'land' || province.type === 'port'
    } else if (unitType === 'fleet') {
      // Flotas pueden moverse a mar y puertos
      return province.type === 'sea' || province.type === 'port'
    }

    return false
  })
}

/**
 * Verifica si una provincia está controlada por un jugador
 * (basado en presencia de guarniciones)
 */
export function isProvinceControlled(
  provinceId: string,
  playerId: string,
  units: Unit[]
): boolean {
  return units.some(
    (u) =>
      u.owner === playerId &&
      u.type === 'garrison' &&
      u.currentPosition === provinceId
  )
}

/**
 * Obtiene las provincias controladas por un jugador
 */
export function getControlledProvinces(
  playerId: string,
  units: Unit[]
): string[] {
  return units
    .filter((u) => u.owner === playerId && u.type === 'garrison')
    .map((u) => u.currentPosition)
}

/**
 * Filtra las unidades visibles para un jugador específico
 * Reglas de visibilidad:
 * - Todas las unidades propias son visibles
 * - Unidades enemigas en territorio controlado son visibles
 * - Unidades enemigas fuera de territorio NO son visibles
 */
export function getVisibleUnits(
  playerId: string,
  allUnits: Unit[],
  controlledProvinces: string[]
): Unit[] {
  return allUnits.filter((unit) => {
    // Ver todas las unidades propias
    if (unit.owner === playerId) return true

    // Ver unidades enemigas en territorio controlado
    if (controlledProvinces.includes(unit.currentPosition)) return true

    // No ver unidades enemigas fuera de territorio
    return false
  })
}

/**
 * Obtiene todas las unidades en una provincia específica
 */
export function getUnitsInProvince(
  provinceId: string,
  units: Unit[]
): Unit[] {
  return units.filter((u) => u.currentPosition === provinceId)
}

/**
 * Obtiene las unidades propias de un jugador
 */
export function getPlayerUnits(playerId: string, units: Unit[]): Unit[] {
  return units.filter((u) => u.owner === playerId)
}

/**
 * Agrupa unidades por provincia
 */
export function groupUnitsByProvince(units: Unit[]): Record<string, Unit[]> {
  return units.reduce((acc, unit) => {
    const province = unit.currentPosition
    if (!acc[province]) acc[province] = []
    acc[province].push(unit)
    return acc
  }, {} as Record<string, Unit[]>)
}

/**
 * Obtiene información de una provincia
 */
export function getProvinceInfo(
  map: GameMap,
  provinceId: string
): ProvinceInfo | undefined {
  return map.provinces[provinceId]
}

/**
 * Verifica si una provincia tiene ciudad
 */
export function hasCity(map: GameMap, provinceId: string): boolean {
  const province = map.provinces[provinceId]
  return province?.hasCity || false
}

/**
 * Obtiene el nombre de la provincia
 */
export function getProvinceName(map: GameMap, provinceId: string): string {
  const province = map.provinces[provinceId]
  return province?.name || provinceId
}

/**
 * Verifica si dos provincias son adyacentes
 */
export function areAdjacentProvinces(
  map: GameMap,
  provinceId1: string,
  provinceId2: string
): boolean {
  const adjacencies = map.provinces[provinceId1]?.adjacencies
  return adjacencies?.includes(provinceId2) || false
}

/**
 * Calcula la distancia entre dos provincias (BFS)
 * Retorna -1 si no hay camino
 */
export function getProvinceDistance(
  map: GameMap,
  fromProvince: string,
  toProvince: string
): number {
  if (fromProvince === toProvince) return 0

  const visited = new Set<string>()
  const queue: Array<{ province: string; distance: number }> = [
    { province: fromProvince, distance: 0 }
  ]

  while (queue.length > 0) {
    const { province, distance } = queue.shift()!

    if (province === toProvince) {
      return distance
    }

    if (visited.has(province)) continue
    visited.add(province)

    const adjacencies = map.provinces[province]?.adjacencies || []
    for (const adjacent of adjacencies) {
      if (!visited.has(adjacent)) {
        queue.push({ province: adjacent, distance: distance + 1 })
      }
    }
  }

  return -1 // No hay camino
}

/**
 * Verifica si una provincia es de tipo tierra
 */
export function isLand(map: GameMap, provinceId: string): boolean {
  const province = map.provinces[provinceId]
  return province?.type === 'land'
}

/**
 * Verifica si una provincia es de tipo mar
 */
export function isSea(map: GameMap, provinceId: string): boolean {
  const province = map.provinces[provinceId]
  return province?.type === 'sea'
}

/**
 * Verifica si una provincia es un puerto
 */
export function isPort(map: GameMap, provinceId: string): boolean {
  const province = map.provinces[provinceId]
  return province?.type === 'port'
}

/**
 * Obtiene el ingreso de una provincia (si tiene ciudad)
 */
export function getProvinceIncome(map: GameMap, provinceId: string): number {
  const province = map.provinces[provinceId]
  return province?.income || 0
}

/**
 * Obtiene todas las ciudades controladas por un jugador
 */
export function getPlayerCities(
  map: GameMap,
  playerId: string,
  units: Unit[]
): string[] {
  const controlledProvinces = getControlledProvinces(playerId, units)
  return controlledProvinces.filter(provinceId => hasCity(map, provinceId))
}

/**
 * Calcula el ingreso total de un jugador
 */
export function calculatePlayerIncome(
  map: GameMap,
  playerId: string,
  units: Unit[]
): number {
  const cities = getPlayerCities(map, playerId, units)
  return cities.reduce((total, cityId) => {
    return total + getProvinceIncome(map, cityId)
  }, 0)
}

/**
 * Verifica si una unidad puede moverse a una provincia destino
 */
export function canUnitMoveTo(
  map: GameMap,
  unit: Unit,
  targetProvinceId: string
): boolean {
  if (unit.type === 'garrison') {
    return false // Las guarniciones no se mueven
  }

  const validDestinations = getValidAdjacentProvinces(
    map,
    unit.currentPosition,
    unit.type
  )

  return validDestinations.includes(targetProvinceId)
}

/**
 * Obtiene las provincias válidas para retreat de una unidad
 */
export function getValidRetreatDestinations(
  map: GameMap,
  unit: Unit,
  units: Unit[]
): string[] {
  if (unit.type === 'garrison') {
    return [] // Las guarniciones no se retiran
  }

  const validAdjacent = getValidAdjacentProvinces(
    map,
    unit.currentPosition,
    unit.type
  )

  // Filtrar provincias que ya están ocupadas por otras unidades
  return validAdjacent.filter(provinceId => {
    const unitsInProvince = getUnitsInProvince(provinceId, units)
    // Puede retirarse si no hay unidades enemigas
    return !unitsInProvince.some(u => u.owner !== unit.owner)
  })
}

/**
 * Verifica si una provincia es costera (puerto o adyacente a mar)
 */
export function isCoastalProvince(map: GameMap, provinceId: string): boolean {
  const province = map.provinces[provinceId]
  if (!province) return false

  // Los puertos son automáticamente costeros
  if (province.type === 'port') return true

  // Las provincias terrestres son costeras si tienen adyacencia a mar
  if (province.type === 'land') {
    return province.adjacencies.some(adjId =>
      map.provinces[adjId]?.type === 'sea'
    )
  }

  return false
}

/**
 * Representa una ruta marítima entre dos provincias
 */
export interface MaritimeRoute {
  path: string[]           // Array de IDs de provincias: ['GEN', 'LS', 'TS', 'NAP']
  distance: number         // Número de saltos totales
  seaZones: string[]       // Solo las zonas de tipo 'sea': ['LS', 'TS']
  estimatedDays: number    // Días estimados de viaje (1 día por zona marítima)
}

/**
 * Encuentra todas las rutas marítimas posibles entre dos provincias
 * usando BFS (Breadth-First Search) modificado para flotas.
 *
 * Solo considera provincias de tipo 'sea' o 'port' (navegables por flotas).
 * Retorna múltiples rutas ordenadas por longitud (más cortas primero).
 *
 * @param map - Mapa del juego
 * @param fromProvince - ID de provincia origen (debe ser puerto)
 * @param toProvince - ID de provincia destino (debe ser puerto o costera)
 * @param maxRoutes - Número máximo de rutas alternativas a retornar (default: 3)
 * @returns Array de rutas marítimas ordenadas por longitud, o null si no hay ruta
 */
export function findMaritimeRoutes(
  map: GameMap,
  fromProvince: string,
  toProvince: string,
  maxRoutes: number = 3
): MaritimeRoute[] | null {
  // Validar que las provincias existen
  if (!map.provinces[fromProvince] || !map.provinces[toProvince]) {
    return null
  }

  // BFS para encontrar todas las rutas
  const queue: { provinceId: string; path: string[] }[] = [
    { provinceId: fromProvince, path: [fromProvince] }
  ]
  const visited = new Set<string>()
  const foundRoutes: string[][] = []
  let shortestDistance: number | null = null

  while (queue.length > 0 && foundRoutes.length < maxRoutes) {
    const { provinceId, path } = queue.shift()!

    // Si llegamos al destino, guardar la ruta
    if (provinceId === toProvince) {
      foundRoutes.push(path)
      if (shortestDistance === null) {
        shortestDistance = path.length
      }
      // Solo seguir buscando rutas de la misma longitud
      if (path.length > shortestDistance + 1) {
        break // Ya encontramos suficientes rutas cercanas a la óptima
      }
      continue
    }

    // Marcar como visitado solo después de verificar si es destino
    // (permite encontrar múltiples rutas)
    const visitKey = `${provinceId}-${path.length}`
    if (visited.has(visitKey)) continue
    visited.add(visitKey)

    // Obtener adyacencias válidas para flotas
    const adjacencies = getValidAdjacentProvinces(map, provinceId, 'fleet')

    for (const adjId of adjacencies) {
      // Evitar ciclos en la misma ruta
      if (path.includes(adjId)) continue

      queue.push({
        provinceId: adjId,
        path: [...path, adjId]
      })
    }
  }

  // Si no se encontraron rutas, retornar null
  if (foundRoutes.length === 0) {
    return null
  }

  // Convertir rutas a formato MaritimeRoute
  return foundRoutes.map(path => {
    // Filtrar solo las zonas de mar (excluir puertos)
    const seaZones = path.filter(pId => map.provinces[pId]?.type === 'sea')

    return {
      path,
      distance: path.length,
      seaZones,
      estimatedDays: seaZones.length // 1 día por zona marítima
    }
  })
}

/**
 * Encuentra la ruta marítima más corta entre dos provincias
 * (atajo para obtener solo la mejor ruta)
 */
export function findShortestMaritimeRoute(
  map: GameMap,
  fromProvince: string,
  toProvince: string
): MaritimeRoute | null {
  const routes = findMaritimeRoutes(map, fromProvince, toProvince, 1)
  return routes ? routes[0] : null
}

/**
 * Encuentra la ruta marítima para un desembarco anfibio
 *
 * Si el destino es una provincia terrestre costera:
 * - Busca la zona marítima adyacente más cercana
 * - Calcula la ruta marítima hasta esa zona
 * - Agrega la provincia costera como destino final
 * - Añade +1 día por el desembarco
 *
 * Si el destino es un puerto, usa la lógica normal
 *
 * @param map - Mapa del juego
 * @param fromPort - Provincia de origen (debe ser puerto o mar)
 * @param toCoast - Provincia destino (puede ser land, port o sea)
 * @returns MaritimeRoute con la ruta completa y duración, o null si no es posible
 */
export function findAmphibiousRoute(
  map: GameMap,
  fromPort: string,
  toCoast: string
): MaritimeRoute | null {
  const targetInfo = map.provinces[toCoast]
  if (!targetInfo) return null

  // Si el destino es terrestre, buscar zona marítima adyacente
  if (targetInfo.type === 'land') {
    // Verificar que sea costera
    if (!isCoastalProvince(map, toCoast)) return null

    // Encontrar zona marítima adyacente
    const seaZone = targetInfo.adjacencies.find(adjId =>
      map.provinces[adjId]?.type === 'sea'
    )

    if (!seaZone) return null

    // Buscar ruta marítima hasta la zona de mar
    const route = findShortestMaritimeRoute(map, fromPort, seaZone)
    if (!route) return null

    // Agregar la provincia costera como destino final
    return {
      path: [...route.path, toCoast],
      distance: route.distance + 1,
      seaZones: route.seaZones,
      estimatedDays: route.estimatedDays + 1  // +1 día por desembarco
    }
  }

  // Si el destino es puerto o mar, usar ruta normal
  return findShortestMaritimeRoute(map, fromPort, toCoast)
}

/**
 * Verifica si una provincia puede ser objetivo de una campaña militar
 *
 * Dos tipos de campañas:
 * 1. Campañas anfibias: Flotas con tropas embarcadas pueden atacar cualquier provincia costera
 * 2. Campañas terrestres: Ejércitos o flotas deben estar en provincias adyacentes al objetivo
 *
 * @param provinceFaction - Mapeo de provincia a facción (para determinar control)
 * @param playerFaction - Facción del jugador actual
 * @returns objeto con `isValid` (booleano) y `adjacentControlledProvinces` (array de IDs)
 */
export function isCampaignTarget(
  map: GameMap,
  targetProvinceId: string,
  playerId: string,
  units: Unit[],
  provinceFaction: Record<string, string>,
  playerFaction: string
): { isValid: boolean; adjacentControlledProvinces: string[] } {
  // NO permitir campañas contra provincias propias
  if (provinceFaction[targetProvinceId] === playerFaction) {
    return { isValid: false, adjacentControlledProvinces: [] }
  }

  // NO permitir campañas contra provincias marítimas (zonas de mar)
  const targetProvince = map.provinces[targetProvinceId]
  if (targetProvince?.type === 'sea') {
    return { isValid: false, adjacentControlledProvinces: [] }
  }

  // Obtener provincias controladas por el jugador
  const controlledProvinces = Object.keys(provinceFaction).filter(
    pId => provinceFaction[pId] === playerFaction
  )

  // Obtener provincias adyacentes a la provincia objetivo
  const adjacentToTarget = getAdjacentProvinces(map, targetProvinceId)

  // Encontrar provincias controladas que son adyacentes al objetivo
  const adjacentControlledProvinces = adjacentToTarget.filter(adjId =>
    controlledProvinces.includes(adjId)
  )

  // ===== CASO 1: CAMPAÑAS ANFIBIAS =====
  // Flotas con tropas embarcadas pueden atacar CUALQUIER provincia costera
  const isTargetCoastal = isCoastalProvince(map, targetProvinceId)

  const hasAmphibiousFleet = isTargetCoastal && units.some(unit => {
    if (unit.owner !== playerId) return false
    if (unit.type !== 'fleet') return false
    if (!unit.composition) return false

    const fleetComp = unit.composition as FleetComposition
    const totalShips = Object.values(fleetComp.ships).reduce((sum, n) => sum + n, 0)

    if (!unit.embarkedTroops) return false
    const embarkedCount = Object.values(unit.embarkedTroops.troops)
      .reduce((sum, n) => sum + (n || 0), 0)

    // Flota con naves Y tropas embarcadas puede atacar CUALQUIER costa
    return totalShips > 0 && embarkedCount > 0
  })

  // ===== CASO 2: CAMPAÑAS TERRESTRES =====
  // Ejércitos o flotas normales deben estar en provincias adyacentes
  const hasAdjacentUnits = adjacentControlledProvinces.length > 0 && units.some(unit => {
    if (unit.owner !== playerId) return false

    // DEBE estar en provincia adyacente al objetivo
    if (!adjacentToTarget.includes(unit.currentPosition)) return false

    if (unit.type !== 'army' && unit.type !== 'fleet') return false
    if (!unit.composition) return false

    // Ejércitos: verificar tropas
    if (unit.type === 'army') {
      const armyComp = unit.composition as ArmyComposition
      const totalTroops = Object.values(armyComp.troops).reduce((sum, n) => sum + n, 0)
      return totalTroops > 0
    }

    // Flotas: verificar naves
    if (unit.type === 'fleet') {
      const fleetComp = unit.composition as FleetComposition
      const totalShips = Object.values(fleetComp.ships).reduce((sum, n) => sum + n, 0)
      return totalShips > 0
    }

    return false
  })

  // La campaña es válida si hay flotas anfibias O unidades adyacentes
  const isValid = hasAmphibiousFleet || hasAdjacentUnits

  return {
    isValid,
    adjacentControlledProvinces: isValid ? adjacentControlledProvinces : []
  }
}
