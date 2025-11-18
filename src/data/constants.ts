/**
 * Constantes del juego Machiavelli
 */

import { FleetShipType } from '@/types/scenario'

/**
 * Capacidad de transporte de tropas por tipo de nave
 * - Galera (galley): 50 tropas
 * - Coca (cog): 100 tropas
 */
export const SHIP_CAPACITY: Record<FleetShipType, number> = {
  galley: 50,
  cog: 100
} as const

/**
 * Nombres legibles de tipos de naves
 */
export const SHIP_NAMES: Record<FleetShipType, string> = {
  galley: 'Galera',
  cog: 'Coca'
} as const
