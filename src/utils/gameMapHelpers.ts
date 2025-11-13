/**
 * Helpers para trabajar con el mapa del juego
 *
 * Estas funciones reciben el GameMap como parámetro en lugar de usar
 * datos hardcoded, lo que permite que cada partida tenga su propio mapa
 */

import { Unit } from '@/types'
import { GameMap, ProvinceInfo } from '@/types/game'

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
