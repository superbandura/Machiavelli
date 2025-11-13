import { Timestamp } from 'firebase/firestore'
import { ProvinceType } from '@/types/game'

/**
 * Tipos de tropas terrestres para ejércitos (incluye caballería)
 */
export type ArmyTroopType = 'militia' | 'lancers' | 'pikemen' | 'archers' | 'crossbowmen' | 'lightCavalry' | 'heavyCavalry'

/**
 * Tipos de tropas para guarniciones (sin caballería)
 */
export type GarrisonTroopType = 'militia' | 'lancers' | 'pikemen' | 'archers' | 'crossbowmen'

/**
 * Tipos de naves para flotas
 */
export type FleetShipType = 'galley' | 'cog'

/**
 * Composición de un ejército con tipos de tropas
 */
export interface ArmyComposition {
  name: string
  troops: Record<ArmyTroopType, number>
}

/**
 * Composición de una guarnición (sin caballería)
 */
export interface GarrisonComposition {
  name: string
  troops: Record<GarrisonTroopType, number>
}

/**
 * Composición de una flota con tipos de naves
 */
export interface FleetComposition {
  name: string
  ships: Record<FleetShipType, number>
}

/**
 * Union type para todas las unidades detalladas
 */
export type DetailedUnit = ArmyComposition | GarrisonComposition | FleetComposition

/**
 * Datos editables de una provincia en el editor de escenarios
 */
export interface EditableProvinceData {
  id: string
  name: string
  type: ProvinceType
  adjacencies: string[]
  hasCity: boolean
  cityName: string
  isPort: boolean
  income: number
  controlledBy: string | null // Facción que controla (null = neutral)
  units: DetailedUnit[] // Unidades iniciales con composición detallada
}

/**
 * Setup inicial de una facción en el escenario
 */
export interface FactionSetup {
  factionId: string
  treasury: number // Ducados iniciales
  provinces: string[] // IDs de provincias controladas
}

/**
 * Documento de escenario almacenado en Firestore
 */
export interface ScenarioDocument {
  id: string

  // Metadatos y configuración del escenario agrupados
  scenarioData: {
    name: string
    description: string
    year: number
    minPlayers: number
    maxPlayers: number
    availableFactions: string[]
    victoryConditions: {
      victoryPoints: number // Puntos de victoria (ciudades) requeridos para ganar
    }
    factionSetups: FactionSetup[] // Setup de cada facción
    createdBy: string
    createdAt: Timestamp
    updatedAt: Timestamp
  }

  // Datos de provincias (separado para facilitar consultas)
  provinces: EditableProvinceData[] // Datos completos de provincias (controlledBy indica neutrales)
}

/**
 * Datos para crear/actualizar un escenario
 */
export interface ScenarioFormData {
  name: string
  description: string
  year: number
  minPlayers: number
  maxPlayers: number
  victoryConditions: {
    victoryPoints: number // Puntos de victoria (ciudades) requeridos para ganar
  }
  availableFactions: string[]
}

/**
 * Estructura simplificada para listar escenarios
 */
export interface ScenarioListItem {
  id: string
  name: string
  year: number
  minPlayers: number
  maxPlayers: number
}
