import { Timestamp } from 'firebase/firestore'
import type { ArmyComposition, GarrisonComposition, FleetComposition } from './scenario'

// ==================== MARITIME ROUTES ====================
/**
 * Representa una ruta marítima entre dos provincias
 */
export interface MaritimeRoute {
  path: string[]           // Array de IDs de provincias: ['GEN', 'LS', 'TS', 'NAP']
  distance: number         // Número de saltos totales
  seaZones: string[]       // Solo las zonas de tipo 'sea': ['LS', 'TS']
  estimatedDays: number    // Días estimados de viaje (1 día por zona marítima)
}

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

  // Tropas embarcadas (solo para flotas)
  embarkedTroops?: {
    troops: Partial<Record<import('@/types/scenario').ArmyTroopType, number>>
    sourceUnitId?: string // ID del ejército que embarcó (para rastreo)
  }
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

  // Ruta marítima para campañas anfibias
  maritimeRoute?: {
    path: string[]          // Ruta completa: ['GEN', 'LS', 'TS', 'NAP']
    estimatedDays: number   // Días estimados de viaje
    departureDay?: number   // Día del turno en que zarpa (para resolución futura)
    arrivalDay?: number     // Día estimado de llegada (para resolución futura)
  }
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

// ==================== MILITARY CAMPAIGNS ====================
/**
 * Aliado que se une a una campaña durante fase diplomática
 * Sus tropas participan desde el inicio de la campaña
 */
export interface CampaignAlly {
  id: string // UUID único del aliado
  playerId: string // ID del jugador aliado
  faction: string // Facción del jugador
  side: 'attacker' | 'defender' // Bando al que apoya
  unitIds: string[] // IDs de unidades asignadas
  joinedAt: Timestamp // Timestamp de cuando se unió
}

/**
 * Refuerzo enviado por un jugador neutral a una campaña militar
 * Estos refuerzos llegan tarde (durante fase de órdenes)
 */
export interface CampaignReinforcement {
  id: string // UUID único del refuerzo
  playerId: string // ID del jugador que envía el refuerzo
  faction: string // Facción del jugador
  side: 'attacker' | 'defender' // Bando al que refuerza
  unitIds: string[] // IDs de unidades asignadas como refuerzo
  formations?: TacticalFormation[] // Formaciones tácticas del refuerzo
  addedAt: Timestamp // Timestamp de cuando se añadió el refuerzo
  estimatedArrivalDay?: number // Día del turno en que el refuerzo estará disponible (opcional)
}

export interface MilitaryCampaign {
  id: string // Document ID de Firestore
  gameId: string // Referencia al juego
  targetProvince: string // ID de la provincia objetivo
  declaredBy: string // playerId del jugador que declara la campaña
  declaredByFaction: string // Facción del jugador que declara
  turnDeclared: number // Turno en que se declaró (para futuras restricciones)
  year: number // Año de la declaración
  status: 'planning' | 'active' | 'completed' // Estado de la campaña
  participatingUnits: string[] // Array de unitIds que participan
  route?: MaritimeRoute // Ruta marítima si es campaña anfibia
  createdAt: Timestamp // Timestamp de creación
  resolvedAt?: Timestamp // Timestamp de resolución (cuando se completa)
  formations?: TacticalFormation[] // Formaciones tácticas organizadas para la campaña
  generalStrategy?: GeneralStrategy // Estrategia general de la campaña
  allies?: CampaignAlly[] // Aliados que se unieron en fase diplomática (participan desde inicio)
  reinforcements?: CampaignReinforcement[] // Refuerzos que se unieron en fase de órdenes (llegan tarde)
}

// ==================== CAMPAIGN STRATEGY ====================
/**
 * Estrategia general de la campaña militar
 * - conquista: Objetivo principal es capturar territorio
 * - batalla: Buscar batalla decisiva con el enemigo
 * - tanteo: Operaciones de reconocimiento limitadas
 * - razzia: Incursiones rápidas de saqueo
 * - retirada: Repliegue ordenado
 */
export type GeneralStrategy = 'conquista' | 'batalla' | 'tanteo' | 'razzia' | 'retirada'

// ==================== TACTICAL FORMATIONS ====================
/**
 * Zona de despliegue en el campo de batalla
 */
export type DeploymentZone = 'left' | 'right' | 'center' | 'reserve'

/**
 * Órdenes estratégicas para formaciones
 * - none: Sin orden estratégica
 * - escaramuza: Táctica de hostigamiento (infantería y arqueros)
 * - marchar: Movimiento rápido (todos)
 * - explorar: Reconocimiento del terreno (caballería ligera)
 * - cubrirFlancos: Protección de flancos (caballería ligera)
 * - mensajeros: Comunicaciones y enlaces (caballería ligera)
 * - forrajear: Búsqueda de suministros (infantería y arqueros)
 */
export type StrategicOrder = 'none' | 'escaramuza' | 'marchar' | 'explorar' | 'cubrirFlancos' | 'mensajeros' | 'forrajear'

/**
 * Órdenes tácticas para formaciones en batalla
 * - none: Sin orden táctica específica
 * - mantener: Mantener posición defensiva (milicia, lanceros, piqueros)
 * - avanzar: Avance controlado (milicia, lanceros, piqueros)
 * - cargar: Carga al enemigo (milicia, lanceros, piqueros)
 */
export type TacticalOrder = 'none' | 'mantener' | 'avanzar' | 'cargar'

/**
 * Formación táctica: agrupación de tropas del mismo tipo y facción
 * con asignación de órdenes y zona de despliegue
 */
export interface TacticalFormation {
  id: string // UUID único de la formación
  name: string // Nombre de la formación (ej: "1ª de piqueros de Génova")
  troopType: import('@/types/scenario').ArmyTroopType // Tipo de tropa ('pikemen', 'militia', etc.)
  faction: string // Facción de las tropas (ej: 'genova', 'venice')
  quantity: number // Cantidad de tropas asignadas a esta formación
  deploymentZone: DeploymentZone // Zona de batalla donde se desplegará
  strategicOrder: StrategicOrder // Orden estratégica asignada
  tacticalOrder: TacticalOrder // Orden táctica para la batalla
  createdAt: Timestamp // Timestamp de creación
  updatedAt: Timestamp // Timestamp de última actualización
  isReinforcement?: boolean // Indica si esta formación fue creada a partir de tropas de refuerzo
  reinforcementId?: string // ID del refuerzo del que proviene (si isReinforcement es true)
  estimatedArrivalDay?: number // Día estimado de llegada (heredado del refuerzo, si aplica)
}

// ==================== DIPLOMATIC MESSAGES ====================
export interface DiplomaticMessage {
  id: string
  gameId: string // ID de la partida
  from: string // userId del remitente (Firebase Auth UID)
  to: string // userId del destinatario (Firebase Auth UID) o 'all' para mensajes públicos
  content: string
  turnNumber: number
  phase: 'diplomatic'
  sentAt: Timestamp
  isRead: boolean
}

// ==================== WAR COUNCIL MESSAGES ====================
/**
 * Mensajes del Consejo de Guerra
 * Chat privado para facciones del mismo bando en una campaña militar
 */
export interface WarCouncilMessage {
  id: string
  gameId: string // ID de la partida
  campaignId: string // ID de la campaña militar
  from: string // userId del remitente (Firebase Auth UID)
  senderFaction: 'attacker' | 'defender' // Bando del emisor
  content: string
  sentAt: Timestamp
  readBy: string[] // Array de userIds que han leído el mensaje
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
