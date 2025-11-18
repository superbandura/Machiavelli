/**
 * Utilidades para embarque y desembarque de tropas en flotas
 */

import { Unit } from '@/types'
import { FleetComposition, ArmyComposition, ArmyTroopType } from '@/types/scenario'
import { SHIP_CAPACITY } from '@/data/constants'

/**
 * Calcula la capacidad total de transporte de una flota
 */
export function calculateFleetCapacity(composition: FleetComposition): number {
  let totalCapacity = 0

  for (const [shipType, count] of Object.entries(composition.ships)) {
    const capacity = SHIP_CAPACITY[shipType as keyof typeof SHIP_CAPACITY] || 0
    totalCapacity += capacity * count
  }

  return totalCapacity
}

/**
 * Calcula el número total de tropas embarcadas
 */
export function calculateEmbarkedTroopsCount(
  troops: Partial<Record<ArmyTroopType, number>>
): number {
  return Object.values(troops).reduce((sum, count) => sum + (count || 0), 0)
}

/**
 * Obtiene la capacidad disponible de una flota (total - embarcadas)
 */
export function getAvailableCapacity(fleet: Unit): number {
  if (fleet.type !== 'fleet' || !fleet.composition) return 0

  const totalCapacity = calculateFleetCapacity(fleet.composition as FleetComposition)
  const embarkedCount = fleet.embarkedTroops
    ? calculateEmbarkedTroopsCount(fleet.embarkedTroops.troops)
    : 0

  return totalCapacity - embarkedCount
}

/**
 * Verifica si una flota puede embarcar tropas específicas
 */
export function canEmbarkTroops(
  fleet: Unit,
  troopsToEmbark: Partial<Record<ArmyTroopType, number>>
): { canEmbark: boolean; reason?: string } {
  if (fleet.type !== 'fleet') {
    return { canEmbark: false, reason: 'No es una flota' }
  }

  if (!fleet.composition) {
    return { canEmbark: false, reason: 'Flota sin composición' }
  }

  const availableCapacity = getAvailableCapacity(fleet)
  const troopsCount = calculateEmbarkedTroopsCount(troopsToEmbark)

  if (troopsCount > availableCapacity) {
    return {
      canEmbark: false,
      reason: `Capacidad insuficiente (disponible: ${availableCapacity}, requiere: ${troopsCount})`
    }
  }

  if (troopsCount === 0) {
    return { canEmbark: false, reason: 'No hay tropas para embarcar' }
  }

  return { canEmbark: true }
}

/**
 * Obtiene el total de tropas de un ejército
 */
export function getArmyTroopsCount(composition: ArmyComposition): number {
  return Object.values(composition.troops).reduce((sum, count) => sum + count, 0)
}

/**
 * Verifica si un ejército tiene tropas disponibles
 */
export function hasAvailableTroops(
  army: Unit,
  troopsToEmbark: Partial<Record<ArmyTroopType, number>>
): { hasTroops: boolean; reason?: string } {
  if (army.type !== 'army' || !army.composition) {
    return { hasTroops: false, reason: 'No es un ejército válido' }
  }

  const armyComp = army.composition as ArmyComposition

  for (const [troopType, count] of Object.entries(troopsToEmbark)) {
    const available = armyComp.troops[troopType as ArmyTroopType] || 0
    if ((count || 0) > available) {
      return {
        hasTroops: false,
        reason: `Tropas insuficientes de tipo ${troopType}`
      }
    }
  }

  return { hasTroops: true }
}
