import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { MilitaryCampaign, Unit, ArmyComposition, FleetComposition } from '@/types'

/**
 * Obtiene todas las campañas activas para un juego específico
 */
export async function getCampaignsForGame(gameId: string): Promise<MilitaryCampaign[]> {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('gameId', '==', gameId),
      where('status', 'in', ['planning', 'active'])
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MilitaryCampaign))
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return []
  }
}

/**
 * Valida que las unidades seleccionadas puedan participar en una campaña
 */
export function validateCampaignUnits(
  units: Unit[],
  _targetProvince: string,
  hasMaritimeRoute: boolean
): { isValid: boolean; error?: string } {
  if (units.length === 0) {
    return { isValid: false, error: 'Debes seleccionar al menos una unidad' }
  }

  // Solo Army y Fleet pueden participar
  const invalidUnits = units.filter(u => u.type !== 'army' && u.type !== 'fleet')
  if (invalidUnits.length > 0) {
    return { isValid: false, error: 'Solo ejércitos y flotas pueden participar en campañas' }
  }

  // Si hay flotas pero no hay ruta marítima válida
  const hasFleets = units.some(u => u.type === 'fleet')
  if (hasFleets && !hasMaritimeRoute) {
    return {
      isValid: false,
      error: 'Las flotas necesitan una ruta marítima válida hasta el objetivo'
    }
  }

  return { isValid: true }
}

/**
 * Calcula la fuerza total de una campaña basándose en las unidades participantes
 */
export function calculateCampaignStrength(units: Unit[]): number {
  let totalStrength = 0

  for (const unit of units) {
    if (unit.type === 'army' && unit.composition) {
      const armyComp = unit.composition as ArmyComposition

      // Valores de fuerza por tipo de tropa
      const troopStrength: Record<string, number> = {
        militia: 1,
        lancers: 1,
        pikemen: 1,
        archers: 1,
        crossbowmen: 1,
        lightCavalry: 2,
        heavyCavalry: 2
      }

      // Sumar fuerza de todas las tropas
      for (const [troopType, count] of Object.entries(armyComp.troops)) {
        totalStrength += (count || 0) * (troopStrength[troopType] || 1)
      }
    }

    if (unit.type === 'fleet' && unit.composition) {
      const fleetComp = unit.composition as FleetComposition

      // Naves: 2 puntos cada una
      for (const count of Object.values(fleetComp.ships)) {
        totalStrength += (count || 0) * 2
      }

      // Tropas embarcadas: 1 punto cada una
      if (unit.embarkedTroops?.troops) {
        const embarked = unit.embarkedTroops.troops
        totalStrength += Object.values(embarked).reduce((sum: number, count) => sum + (count || 0), 0)
      }
    }
  }

  return totalStrength
}

/**
 * Formatea el nombre de una unidad para mostrar en la UI
 */
export function formatUnitName(unit: Unit): string {
  if (unit.name) return unit.name

  const typeNames = {
    army: 'Ejército',
    fleet: 'Flota',
    garrison: 'Guarnición'
  }

  return `${typeNames[unit.type]} en ${unit.currentPosition}`
}

/**
 * Obtiene un resumen de la composición de una unidad
 */
export function getUnitCompositionSummary(unit: Unit): string {
  if (!unit.composition) return 'Sin tropas'

  if (unit.type === 'army') {
    const comp = unit.composition as ArmyComposition
    const total = Object.values(comp.troops || {}).reduce((sum: number, count) => sum + (count || 0), 0)
    return `${total} tropas`
  }

  if (unit.type === 'fleet') {
    const comp = unit.composition as FleetComposition
    const ships = Object.values(comp.ships || {}).reduce((sum: number, count) => sum + (count || 0), 0)
    const embarked = unit.embarkedTroops?.troops
      ? Object.values(unit.embarkedTroops.troops).reduce((sum: number, count) => sum + (count || 0), 0)
      : 0

    if (embarked > 0) {
      return `${ships} naves, ${embarked} tropas embarcadas`
    }
    return `${ships} naves`
  }

  return ''
}

/**
 * Determina si una campaña es anfibia (requiere transporte marítimo)
 */
export function isAmphibiousCampaign(campaign: MilitaryCampaign): boolean {
  return !!campaign.route && campaign.route.seaZones.length > 0
}

/**
 * Obtiene el estado legible de una campaña
 */
export function getCampaignStatusLabel(status: MilitaryCampaign['status']): string {
  const labels = {
    planning: 'Planificación',
    active: 'En curso',
    completed: 'Completada'
  }
  return labels[status]
}

/**
 * Obtiene el color del badge de estado
 */
export function getCampaignStatusColor(status: MilitaryCampaign['status']): string {
  const colors = {
    planning: 'bg-blue-600',
    active: 'bg-orange-600',
    completed: 'bg-green-600'
  }
  return colors[status]
}
