import { Unit, Player } from '@/types'
import { PROVINCE_ADJACENCIES, PROVINCE_INFO } from '@/data/provinceData'

/**
 * Obtiene las provincias adyacentes a una provincia dada
 */
export function getAdjacentProvinces(provinceId: string): string[] {
  return PROVINCE_ADJACENCIES[provinceId] || []
}

/**
 * Obtiene las provincias adyacentes válidas para un tipo de unidad específico
 * - Armies: Solo land y port
 * - Fleets: Solo sea y port
 * - Garrisons: No se mueven
 */
export function getValidAdjacentProvinces(
  provinceId: string,
  unitType: 'army' | 'fleet' | 'garrison'
): string[] {
  if (unitType === 'garrison') {
    return [] // Las guarniciones no se mueven
  }

  const adjacent = getAdjacentProvinces(provinceId)

  return adjacent.filter((adjId) => {
    const province = PROVINCE_INFO[adjId]
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
export function getProvinceInfo(provinceId: string) {
  return PROVINCE_INFO[provinceId]
}

/**
 * Verifica si una provincia tiene ciudad
 */
export function hasCity(provinceId: string): boolean {
  const province = PROVINCE_INFO[provinceId]
  return province?.hasCity || false
}

/**
 * Obtiene el nombre de la provincia
 */
export function getProvinceName(provinceId: string): string {
  const province = PROVINCE_INFO[provinceId]
  return province?.name || provinceId
}

/**
 * Verifica si dos provincias son adyacentes
 */
export function areAdjacentProvinces(
  provinceId1: string,
  provinceId2: string
): boolean {
  const adjacencies = PROVINCE_ADJACENCIES[provinceId1]
  return adjacencies?.includes(provinceId2) || false
}

/**
 * Calcula la distancia entre dos provincias (BFS)
 * Retorna -1 si no hay camino
 */
export function getProvinceDistance(
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

    const adjacencies = PROVINCE_ADJACENCIES[province] || []
    for (const adjacent of adjacencies) {
      if (!visited.has(adjacent)) {
        queue.push({ province: adjacent, distance: distance + 1 })
      }
    }
  }

  return -1 // No hay camino
}
