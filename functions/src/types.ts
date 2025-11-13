/**
 * Tipos TypeScript para Cloud Functions
 */

import * as admin from 'firebase-admin';

export interface Game {
  id: string;
  name?: string;
  scenario: string;
  status: 'waiting' | 'active' | 'finished';
  turnNumber: number;
  currentYear: number;
  currentSeason: 'Primavera' | 'Verano' | 'Otoño';
  currentPhase: 'diplomatic' | 'orders' | 'resolution';
  phaseDeadline: admin.firestore.Timestamp;
  phaseStartedAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
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
