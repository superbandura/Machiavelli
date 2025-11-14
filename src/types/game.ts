import { Timestamp } from 'firebase/firestore'
import type { ArmyComposition, GarrisonComposition, FleetComposition } from './scenario'

// ==================== MAP DATA ====================
export type ProvinceType = 'land' | 'sea' | 'port'

export interface ProvinceInfo {
  id: string
  name: string
  type: ProvinceType
  adjacencies: string[] // IDs de provincias adyacentes
  controlledBy?: string | null // ID de la facción que controla la provincia (null = neutral)
  hasCity?: boolean
  cityName?: string
  isPort?: boolean
  income?: number // Ducados que produce la ciudad (solo si hasCity)
}

export interface GameMap {
  provinces: Record<string, ProvinceInfo> // Información completa de cada provincia (incluye adjacencies)
}

export interface FactionSetup {
  factionId: string
  treasury: number // Ducados iniciales
  provinces: string[] // IDs de provincias controladas inicialmente
}

export interface ScenarioData {
  availableFactions: string[] // Facciones disponibles en este escenario
  victoryConditions: {
    victoryPoints: number // Puntos de victoria (ciudades) requeridos para ganar
  }
  factionSetups: FactionSetup[] // Setup inicial de cada facción
}

// ==================== GAME ====================
export interface Game {
  id: string
  name?: string // Nombre opcional de la partida
  scenario: string // Nombre del escenario (ej: "Italia 1454 - Paz de Lodi")
  scenarioId?: string // ID del escenario (ej: "ITALIA_1454")
  status: 'waiting' | 'active' | 'finished'
  currentYear: number
  currentSeason: 'spring' | 'summer' | 'fall'
  currentPhase: 'diplomatic' | 'orders' | 'resolution'
  turnNumber: number
  maxPlayers: number
  playersCount: number

  // ========== DATOS DEL MAPA Y ESCENARIO ==========
  // Estos campos contienen TODA la información necesaria para jugar
  // Se copian del escenario al crear la partida y ya no se consulta el escenario
  map: GameMap // Mapa completo con provincias y adyacencias
  scenarioData: ScenarioData // Facciones, neutrales, condiciones de victoria, setups

  // ========== UNIDADES ==========
  // Unidades embebidas en el documento de partida (no colección separada)
  // Durante lobby: owner es factionId, al unirse jugador se actualiza a playerId
  units: Unit[]

  // Sistema asíncrono: Deadlines temporales
  phaseDeadline: Timestamp
  phaseStartedAt: Timestamp

  phaseDurations: {
    diplomatic: number // en horas
    orders: number // en horas
    resolution: number // en horas
  }

  gameSettings: {
    advancedRules: boolean
    optionalRules: {
      famine: boolean
      plague: boolean
      assassination: boolean
    }
    emailNotifications: boolean
  }

  // Marcadores de desastres activos
  activeDisasters: {
    famineProvinces: string[] // IDs de provincias con marcador de hambre
  }

  createdAt: Timestamp
  createdBy: string // userId del creador
  updatedAt: Timestamp
}

// ==================== PLAYER ====================
export interface Player {
  id: string // documentId
  gameId: string // ID de la partida
  userId: string // userId de Firebase Auth
  email: string
  displayName: string
  faction: string // 'Florencia', 'Venecia', 'Milán', etc. (antes "power")
  color: string
  treasury: number // Ducados (solo en juego avanzado)

  // Fichas de asesino: Map de playerId → cantidad de fichas
  assassinTokens: Record<string, number>

  cities: string[] // Array de ciudades controladas
  isEliminated: boolean
  isAlive: boolean // Estado activo del jugador

  // Sistema asíncrono: Tracking de actividad
  lastSeen: Timestamp
  hasSubmittedOrders: boolean
  inactivityCounter?: number // Contador de turnos consecutivos sin órdenes
  status?: 'active' | 'inactive' // Estado de actividad del jugador

  joinedAt: Timestamp
}

// ==================== UNIT ====================
export interface Unit {
  id: string
  type: 'army' | 'fleet' | 'garrison'
  owner: string // playerId (o factionId durante lobby antes de que se una el jugador)
  currentPosition: string // ID de la provincia
  status: 'active' | 'besieged' | 'destroyed'
  siegeTurns: number // Contador de turnos de asedio (0-2)
  visibleTo?: string[] // Array de playerIds que pueden ver esta unidad (fog of war)
  createdAt: Timestamp

  // Composición detallada (nombre y tropas/naves específicas)
  name?: string
  composition?: ArmyComposition | GarrisonComposition | FleetComposition
}

// ==================== ORDERS ====================
export interface OrdersDocument {
  playerId: string
  turnNumber: number
  phase: 'orders'
  orders: Order[]
  extraExpenses?: ExtraExpense[]
  submittedAt: Timestamp
}

export interface Order {
  unitId: string
  action: 'move' | 'hold' | 'support' | 'convoy' | 'besiege' | 'convert'
  targetProvince?: string // Para mover o atacar
  supportedUnit?: string // Para orden de apoyo
  convoyRoute?: string[] // Para convoy
  isValid: boolean // Validado por Cloud Function
  validationError?: string
}

export interface ExtraExpense {
  type: 'remove_famine' | 'bribe' | 'hire_mercenaries' | 'assassination' | 'transfer'
  target?: string // playerId receptor (para transfers, bribe, assassination) o provinceId para remove_famine
  amount?: number // Cantidad de ducados (para transfers)
  cost: number // Coste de la acción
  description?: string // Nota opcional del jugador

  // Campos específicos para ASSASSINATION:
  selectedNumbers?: number[] // Números del dado elegidos (1-6), entre 1 y 3 números
  diceRoll?: number // Resultado del dado (1-6) - se llena durante la resolución
  success?: boolean // Si el asesinato tuvo éxito - se llena durante la resolución
}

// ==================== DIPLOMATIC MESSAGES ====================
export interface DiplomaticMessage {
  id: string
  from: string // playerId
  to: string // playerId (o 'all' para mensajes públicos)
  content: string
  turnNumber: number
  phase: 'diplomatic'
  sentAt: Timestamp
  isRead: boolean
}

// ==================== TURN HISTORY ====================
export interface TurnHistory {
  turnNumber: number
  year: number
  season: string
  phase: 'resolution'
  events: DisasterEvent[]
  assassinations?: AssassinationAttempt[]
  resolutions: Resolution[]
  battles: Battle[]
  resolvedAt: Timestamp
}

export interface DisasterEvent {
  type: 'famine' | 'plague'
  affectedProvinces: string[] // IDs de provincias afectadas
  unitsDestroyed: string[] // IDs de unidades eliminadas
  resolvedBy?: string // playerId si alguien pagó para retirar
}

export interface AssassinationAttempt {
  attacker: string // playerId del atacante
  victim: string // playerId de la víctima
  cost: number // Ducados gastados (12, 24, o 36)
  selectedNumbers: number[] // Números elegidos del dado
  diceRoll: number // Resultado del dado (1-6)
  success: boolean // Si tuvo éxito
  effects?: {
    ordersNullified: number // Cantidad de órdenes anuladas
    garrisonsDestroyed: string[] // IDs de guarniciones asediadas eliminadas
    rebellions: string[] // IDs de provincias que se rebelaron
  }
}

export interface Resolution {
  unitId: string
  action: string
  result: 'success' | 'failed' | 'standoff'
  details: string
}

export interface Battle {
  province: string
  attackers: string[] // unitIds
  defenders: string[] // unitIds
  winner: string // playerId
  retreats: string[] // unitIds que deben retirarse
}
