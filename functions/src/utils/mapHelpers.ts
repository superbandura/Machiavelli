/**
 * Map helpers for Cloud Functions
 *
 * Similar to frontend gameMapHelpers but for backend use
 */

import { GameMap, ProvinceInfo } from '../types'

/**
 * Verifica si dos provincias son adyacentes
 */
export function isAdjacent(map: GameMap, province1: string, province2: string): boolean {
  const adjacencies = map.adjacencies[province1]
  return adjacencies?.includes(province2) || false
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
 * Obtiene información de una provincia
 */
export function getProvinceInfo(map: GameMap, provinceId: string): ProvinceInfo | undefined {
  return map.provinces[provinceId]
}

/**
 * Obtiene las provincias adyacentes a una provincia
 */
export function getAdjacentProvinces(map: GameMap, provinceId: string): string[] {
  return map.adjacencies[provinceId] || []
}

/**
 * Obtiene destinos válidos para una unidad según su tipo
 */
export function getValidDestinations(
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
 * Verifica si una provincia tiene ciudad
 */
export function hasCity(map: GameMap, provinceId: string): boolean {
  const province = map.provinces[provinceId]
  return province?.hasCity || false
}

/**
 * Obtiene el ingreso de una provincia
 */
export function getIncome(map: GameMap, provinceId: string): number {
  const province = map.provinces[provinceId]
  return province?.income || 0
}
