import { ArmyTroopType, GarrisonTroopType, FleetShipType } from '@/types/scenario'

/**
 * Metadatos de tipos de tropas para ejércitos (incluye caballería)
 */
export const ARMY_TROOP_TYPES: Record<ArmyTroopType, { name: string; icon: string }> = {
  militia: { name: 'Milicia', icon: '🛡️' },
  lancers: { name: 'Lanceros', icon: '🔱' },
  pikemen: { name: 'Piqueros', icon: '⚔️' },
  archers: { name: 'Arqueros', icon: '🏹' },
  crossbowmen: { name: 'Ballesteros', icon: '🎯' },
  lightCavalry: { name: 'Caballería Ligera', icon: '🐎' },
  heavyCavalry: { name: 'Caballería Pesada', icon: '🐴' }
}

/**
 * Metadatos de tipos de tropas para guarniciones (sin caballería)
 */
export const GARRISON_TROOP_TYPES: Record<GarrisonTroopType, { name: string; icon: string }> = {
  militia: { name: 'Milicia', icon: '🛡️' },
  lancers: { name: 'Lanceros', icon: '🔱' },
  pikemen: { name: 'Piqueros', icon: '⚔️' },
  archers: { name: 'Arqueros', icon: '🏹' },
  crossbowmen: { name: 'Ballesteros', icon: '🎯' }
}

/**
 * Metadatos de tipos de naves para flotas
 */
export const FLEET_SHIP_TYPES: Record<FleetShipType, { name: string; icon: string }> = {
  galley: { name: 'Galera', icon: '⛵' },
  cog: { name: 'Coca', icon: '🚢' }
}

/**
 * Incremento por defecto al añadir tropas terrestres
 */
export const TROOP_INCREMENT = 100

/**
 * Incremento para añadir naves (de 1 en 1)
 */
export const FLEET_INCREMENT = 1
