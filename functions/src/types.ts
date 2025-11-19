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
  controlledBy?: string | null; // ID de la facción que controla la provincia (null = neutral)
  hasCity?: boolean;
  cityName?: string;
  isPort?: boolean;
  income?: number; // Ducados que produce la ciudad (solo si hasCity)
}

export interface GameMap {
  provinces: Record<string, ProvinceInfo>; // Información completa de cada provincia (incluye adjacencies)
}

export interface FactionSetup {
  factionId: string;
  treasury: number; // Ducados iniciales
  provinces: string[]; // IDs de provincias controladas inicialmente
}

export interface ScenarioData {
  availableFactions: string[]; // Facciones disponibles en este escenario
  victoryConditions: {
    victoryPoints: number; // Puntos de victoria (ciudades) requeridos para ganar
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
  currentSeason: 'spring' | 'summer' | 'fall';
  currentPhase: 'diplomatic' | 'orders' | 'resolution';
  maxPlayers: number;
  playersCount: number;

  // ========== DATOS DEL MAPA Y ESCENARIO ==========
  // Estos campos contienen TODA la información necesaria para jugar
  // Se copian del escenario al crear la partida y ya no se consulta el escenario
  map: GameMap; // Mapa completo con provincias y adyacencias
  scenarioData: ScenarioData; // Facciones, neutrales, condiciones de victoria, setups

  // ========== UNIDADES ==========
  // Unidades embebidas en el documento de partida (no colección separada)
  units?: Unit[]; // Opcional porque las Cloud Functions pueden cargarlas del doc

  // ========== SISTEMA ASÍNCRONO ==========
  phaseDeadline: admin.firestore.Timestamp;
  phaseStartedAt: admin.firestore.Timestamp;

  phaseDurations: {
    diplomatic: number; // en horas
    orders: number; // en horas
    resolution: number; // en horas
  };

  // ========== CONFIGURACIÓN Y REGLAS ==========
  gameSettings: {
    advancedRules: boolean;
    optionalRules: {
      famine: boolean;
      plague: boolean;
      assassination: boolean;
    };
    emailNotifications: boolean;
  };

  // ========== DESASTRES ACTIVOS ==========
  activeDisasters: {
    famineProvinces: string[]; // IDs de provincias con marcador de hambre
  };

  // ========== ESTADO INTERNO (SOLO BACKEND) ==========
  // Estos campos SOLO existen en el backend durante resolución
  siegeStatus?: Record<string, { counter: number; besiegerId: string | null; controllerId: string }>;
  famineProvinces?: string[]; // DEPRECATED: usar activeDisasters.famineProvinces, mantenido por compatibilidad

  // ========== METADATOS ==========
  createdAt: admin.firestore.Timestamp;
  createdBy: string; // userId del creador
  updatedAt?: admin.firestore.Timestamp;
}

export interface Player {
  id: string;
  userId: string;
  gameId: string;
  email: string;
  displayName: string;
  faction: string;
  color: string;
  treasury: number;
  assassinTokens?: Record<string, number>; // Map de playerId → cantidad de fichas
  isEliminated: boolean;
  isAlive: boolean;
  lastSeen: admin.firestore.Timestamp;
  hasSubmittedOrders: boolean;
  inactivityCounter?: number;
  status?: 'active' | 'inactive';
  joinedAt: admin.firestore.Timestamp;

  // Campos temporales usados durante resolución
  transfers?: any[];
  assassination?: any;
  bribes?: any[];
}

export interface Unit {
  id: string;
  gameId?: string; // Opcional porque puede estar embebida en Game
  type: 'army' | 'fleet' | 'garrison';
  owner: string; // playerId (o factionId durante lobby)
  currentPosition: string; // ID de la provincia
  status?: 'active' | 'besieged' | 'destroyed'; // Opcional para nuevas unidades
  siegeTurns?: number; // Opcional, 0 por defecto
  visibleTo?: string[]; // Array de playerIds que pueden ver esta unidad (fog of war)
  createdAt?: admin.firestore.Timestamp | Date; // Puede ser Timestamp o Date

  // Composición detallada (nombre y tropas/naves específicas)
  // Nota: tipos de composición no están definidos en backend, se aceptan como any
  name?: string;
  composition?: any; // ArmyComposition | GarrisonComposition | FleetComposition
  embarkedTroops?: any; // Tropas embarcadas (solo para flotas)
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
  convoyRoute?: string[]; // Para convoy
  retreatList?: string[];
  isValid?: boolean;
  validationError?: string;

  // Ruta marítima para campañas anfibias
  maritimeRoute?: {
    path: string[];
    estimatedDays: number;
    departureDay?: number;
    arrivalDay?: number;
  };
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
  ordersData?: any[]; // Full order documents with extraExpenses
  turnNumber: number;
  season: string;
  year: number;
  events: TurnEvent[];
  db: admin.firestore.Firestore;

  // Campos adicionales para estado intermedio
  snapshot?: Record<string, number>; // Snapshot de fondos
  retreatingUnits?: Array<{ unit: Unit; fromProvince: string }>;
  unitsToCreate?: Unit[]; // Unidades a crear durante resolución
  unitsToUpdate?: Unit[]; // Unidades a actualizar
  unitsToDestroy?: string[]; // IDs de unidades a destruir
  provincesToUpdate?: Record<string, Partial<ProvinceInfo>>; // Cambios a provincias
  gameState?: any; // Estado del juego durante resolución
  famineMitigated?: string[]; // Provincias donde se mitigó hambruna
}
