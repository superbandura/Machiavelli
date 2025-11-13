/**
 * Tipos TypeScript para Cloud Functions
 */

import * as admin from 'firebase-admin';

// ==================== MAP DATA ====================
export type ProvinceType = 'land' | 'sea' | 'port';

export interface ProvinceInfo {
  id: string;
  name: string;
  type: ProvinceType;
  adjacencies: string[]; // IDs de provincias adyacentes
  hasCity?: boolean;
  cityName?: string;
  isPort?: boolean;
  income?: number; // Ducados que produce la ciudad (solo si hasCity)
}

export interface GameMap {
  provinces: Record<string, ProvinceInfo>; // Información completa de cada provincia
  adjacencies: Record<string, string[]>; // Mapa de adyacencias
}

export interface FactionSetup {
  factionId: string;
  treasury: number; // Ducados iniciales
  provinces: string[]; // IDs de provincias controladas inicialmente
}

export interface ScenarioData {
  availableFactions: string[]; // Facciones disponibles en este escenario
  neutralTerritories: string[]; // Territorios neutrales al inicio
  victoryConditions: {
    citiesRequired: Record<number, number>; // Mapa de jugadores -> ciudades requeridas
    timeLimit: number; // Límite de turnos para victoria
  };
  factionSetups: FactionSetup[]; // Setup inicial de cada facción
}

export interface Game {
  id: string;
  name?: string;
  scenario: string;
  scenarioId?: string;
  status: 'waiting' | 'active' | 'finished';
  turnNumber: number;
  currentYear: number;
  currentSeason: 'Primavera' | 'Verano' | 'Otoño';
  currentPhase: 'diplomatic' | 'orders' | 'resolution';
  phaseDeadline: admin.firestore.Timestamp;
  phaseStartedAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;

  // ========== DATOS DEL MAPA Y ESCENARIO ==========
  // Estos campos contienen TODA la información necesaria para jugar
  // Se copian del escenario al crear la partida y ya no se consulta el escenario
  map: GameMap; // Mapa completo con provincias y adyacencias
  scenarioData: ScenarioData; // Facciones, neutrales, condiciones de victoria, setups

  eventsConfig?: {
    famine: boolean;
    plague: boolean;
  };
  siegeStatus?: Record<string, { counter: number; besiegerId: string | null; controllerId: string }>;
  famineProvinces?: string[];
  [key: string]: any;
}

export interface Player {
  id: string;
  userId: string;
  gameId: string;
  faction: string;
  isAlive: boolean;
  treasury: number;
  hasSubmittedOrders: boolean;
  inactivityCounter?: number;
  status?: 'active' | 'inactive';
  [key: string]: any;
}

export interface Unit {
  id: string;
  gameId: string;
  owner: string; // player ID
  type: 'army' | 'fleet' | 'garrison';
  currentPosition: string; // provincia ID
  status?: 'active' | 'besieged' | 'destroyed';
  siegeTurns?: number;
  visibleTo?: string[]; // Array de playerIds que pueden ver esta unidad (fog of war)
  [key: string]: any;
}

export interface Order {
  id: string;
  gameId: string;
  unitId: string;
  playerId: string;
  turnNumber: number;
  action: 'hold' | 'move' | 'support' | 'convoy' | 'besiege' | 'convert';
  targetProvince?: string;
  supportedUnit?: string;
  retreatList?: string[];
  isValid?: boolean;
  validationError?: string;
  [key: string]: any;
}

export interface TurnEvent {
  type: string;
  [key: string]: any;
}

export interface ResolutionContext {
  gameId: string;
  gameData: Game;
  map: GameMap; // Mapa del juego para validaciones y lógica
  players: Player[];
  units: Unit[];
  orders: Order[];
  turnNumber: number;
  season: string;
  year: number;
  events: TurnEvent[];
  db: admin.firestore.Firestore;
  // Campos adicionales para estado intermedio
  snapshot?: Record<string, number>; // Snapshot de fondos
  retreatingUnits?: Array<{ unit: Unit; fromProvince: string }>;
  [key: string]: any;
}
