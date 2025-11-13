import { Timestamp } from 'firebase/firestore'
import { ProvinceType } from '@/types/game'

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
  garrisons: number // Cantidad de guarniciones iniciales
  armies: number // Cantidad de ejércitos iniciales
  fleets: number // Cantidad de flotas iniciales
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
  name: string
  description: string
  year: number
  minPlayers: number
  maxPlayers: number
  difficulty: 'tutorial' | 'medium' | 'hard'
  estimatedDuration: string
  victoryConditions: {
    citiesRequired: Record<number, number>
    timeLimit: number
  }
  availableFactions: string[]
  neutralTerritories: string[]

  // Datos extendidos para el editor
  factionSetups: FactionSetup[] // Setup de cada facción
  provinces: EditableProvinceData[] // Datos completos de provincias

  // Metadata
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
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
  difficulty: 'tutorial' | 'medium' | 'hard'
  estimatedDuration: string
  victoryConditions: {
    citiesRequired: Record<number, number>
    timeLimit: number
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
  difficulty: 'tutorial' | 'medium' | 'hard'
  minPlayers: number
  maxPlayers: number
}
