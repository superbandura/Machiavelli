/**
 * Costes de reclutamiento y creación de unidades
 * Todos los valores están en ducados
 */

import { ArmyTroopType, FleetShipType, GarrisonTroopType } from '@/types/scenario'

/**
 * Coste de crear una unidad vacía (sin tropas/barcos)
 */
export const UNIT_CREATION_COSTS = {
  army: 2,
  fleet: 2,
  garrison: 0, // Las guarniciones se crean automáticamente al capturar ciudades
} as const

/**
 * Coste de reclutar tropas para ejércitos (por lote de 100 unidades)
 * Ejemplo: reclutar 100 milicias cuesta 0.5 ducados
 */
export const ARMY_TROOP_COSTS: Record<ArmyTroopType, number> = {
  militia: 0.5, // Milicia - más barata
  lancers: 1, // Lanceros
  pikemen: 1, // Piqueros
  archers: 1.5, // Arqueros
  crossbowmen: 2, // Ballesteros - más caros por su poder
  lightCavalry: 3, // Caballería ligera - cara
  heavyCavalry: 5, // Caballería pesada - muy cara
}

/**
 * Coste de reclutar tropas para guarniciones (por lote de 100 unidades)
 * Las guarniciones no pueden tener caballería
 */
export const GARRISON_TROOP_COSTS: Record<GarrisonTroopType, number> = {
  militia: 0.5,
  lancers: 1,
  pikemen: 1,
  archers: 1.5,
  crossbowmen: 2,
}

/**
 * Coste de reclutar barcos para flotas (por unidad individual)
 * Ejemplo: reclutar 1 galera cuesta 2 ducados
 */
export const FLEET_SHIP_COSTS: Record<FleetShipType, number> = {
  galley: 2, // Galera - más barata
  cog: 3, // Coca - más cara
}

/**
 * Tamaño de lote para reclutamiento de tropas
 */
export const TROOP_BATCH_SIZE = 100

/**
 * Tamaño de lote para reclutamiento de barcos
 */
export const SHIP_BATCH_SIZE = 1

/**
 * Composición mínima requerida para una guarnición válida
 */
export const MINIMUM_GARRISON_MILITIA = 200

/**
 * Nombres por defecto para unidades creadas sin nombre personalizado
 */
export const DEFAULT_UNIT_NAMES = {
  army: 'Ejército',
  fleet: 'Flota',
  garrison: 'Guarnición',
} as const

/**
 * Composición base (vacía) para nuevas unidades
 */
export const EMPTY_ARMY_COMPOSITION = {
  militia: 0,
  lancers: 0,
  pikemen: 0,
  archers: 0,
  crossbowmen: 0,
  lightCavalry: 0,
  heavyCavalry: 0,
}

export const EMPTY_GARRISON_COMPOSITION = {
  militia: 0,
  lancers: 0,
  pikemen: 0,
  archers: 0,
  crossbowmen: 0,
}

export const EMPTY_FLEET_COMPOSITION = {
  galley: 0,
  cog: 0,
}

/**
 * Composición mínima para guarnición (se crea automáticamente al capturar ciudad)
 */
export const MINIMUM_GARRISON_COMPOSITION = {
  militia: MINIMUM_GARRISON_MILITIA,
  lancers: 0,
  pikemen: 0,
  archers: 0,
  crossbowmen: 0,
}
