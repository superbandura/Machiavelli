/**
 * Configuración de Escenarios Jugables
 *
 * Define las diferentes configuraciones iniciales disponibles
 * para crear una partida
 */

export interface ScenarioConfig {
  id: string
  name: string
  description: string
  year: number
  minPlayers: number
  maxPlayers: number
  difficulty: 'tutorial' | 'medium' | 'hard'
  estimatedDuration: string // ej: "8-15 turnos"
  victoryConditions: {
    citiesRequired: Record<number, number> // playerCount → cities needed
    timeLimit: number // máximo de turnos
  }
  availableFactions: string[] // IDs de facciones disponibles
  neutralTerritories: string[] // Territorios neutrales iniciales
}

export const SCENARIOS: Record<string, ScenarioConfig> = {
  ITALIA_1454: {
    id: 'ITALIA_1454',
    name: 'Italia 1454 - Paz de Lodi',
    description: 'El escenario clásico. Las cinco grandes potencias italianas luchan por el control de la península después de la Paz de Lodi.',
    year: 1454,
    minPlayers: 5,
    maxPlayers: 6,
    difficulty: 'medium',
    estimatedDuration: '8-15 turnos (2-4 años)',
    victoryConditions: {
      citiesRequired: {
        5: 8,  // Con 5 jugadores: 8 ciudades
        6: 9   // Con 6 jugadores: 9 ciudades
      },
      timeLimit: 12 // 12 turnos = 4 años
    },
    availableFactions: ['FLORENCE', 'VENICE', 'MILAN', 'NAPLES', 'PAPAL', 'FRANCE'],
    neutralTerritories: ['COR', 'SAR', 'TUR', 'SALZ', 'MON', 'AVI', 'TUN', 'SWI']  // Islands, minor states, and buffer zones
  },

  ITALIA_1494: {
    id: 'ITALIA_1494',
    name: 'Italia 1494 - Las Guerras Italianas',
    description: 'Escenario avanzado con la invasión francesa. España y el Sacro Imperio también entran en juego. Más caótico y diplomático.',
    year: 1494,
    minPlayers: 6,
    maxPlayers: 8,
    difficulty: 'hard',
    estimatedDuration: '10-18 turnos (3-6 años)',
    victoryConditions: {
      citiesRequired: {
        6: 9,   // Con 6 jugadores: 9 ciudades
        7: 10,  // Con 7 jugadores: 10 ciudades
        8: 11   // Con 8 jugadores: 11 ciudades
      },
      timeLimit: 15 // 15 turnos = 5 años
    },
    availableFactions: ['FLORENCE', 'VENICE', 'MILAN', 'NAPLES', 'PAPAL', 'FRANCE', 'SPAIN', 'AUSTRIA'],
    neutralTerritories: ['COR', 'SAR']
  },

  TUTORIAL: {
    id: 'TUTORIAL',
    name: 'Tutorial - Italia Simplificada',
    description: 'Versión reducida para aprender las mecánicas. Solo 4 jugadores en un mapa más pequeño. Ideal para principiantes.',
    year: 1454,
    minPlayers: 3,
    maxPlayers: 4,
    difficulty: 'tutorial',
    estimatedDuration: '5-8 turnos (2-3 años)',
    victoryConditions: {
      citiesRequired: {
        3: 5,  // Con 3 jugadores: 5 ciudades
        4: 6   // Con 4 jugadores: 6 ciudades
      },
      timeLimit: 9 // 9 turnos = 3 años
    },
    availableFactions: ['FLORENCE', 'VENICE', 'MILAN', 'PAPAL'],
    neutralTerritories: [
      // French territories (northwestern)
      'SAV', 'PRO', 'MAR', 'TUR', 'SALZ', 'AVI', 'SWI',
      // Tuscany buffer zones
      'LUC', 'PIS', 'SIE', 'ARE', 'PIO',
      // Emilia-Romagna buffer
      'PAR', 'FOR', 'MOD', 'BOL', 'FER', 'RAV',
      // Southern Kingdom (Naples)
      'NAP', 'CAP', 'SAL', 'BAR', 'OTR', 'AQU',
      // Islands
      'COR', 'SAR', 'MES', 'PAL', 'TUN',
      // Eastern territories
      'TRT', 'TYR', 'FRI', 'IST', 'DAL', 'CRO', 'TRE',
      // Minor states
      'MON', 'URB', 'SPO'
    ]
  }
}

export const getScenario = (scenarioId: string): ScenarioConfig | null => {
  // Primero intentar buscar por ID
  if (SCENARIOS[scenarioId]) {
    return SCENARIOS[scenarioId]
  }

  // Si no se encuentra, intentar buscar por nombre (para compatibilidad con partidas antiguas)
  const scenarioByName = Object.values(SCENARIOS).find(s => s.name === scenarioId)
  return scenarioByName || null
}

export const getScenariosList = (): ScenarioConfig[] => {
  return Object.values(SCENARIOS)
}

export const getVictoryCitiesRequired = (scenarioId: string, playerCount: number): number => {
  const scenario = SCENARIOS[scenarioId]
  if (!scenario) return 9 // Default

  return scenario.victoryConditions.citiesRequired[playerCount] || 9
}

/**
 * Obtiene el setup inicial de una facción en un escenario
 */
export const getInitialSetup = (scenarioId: string, factionId: string) => {
  const scenarioSetup = SCENARIO_SETUPS[scenarioId]
  if (!scenarioSetup) return null

  return scenarioSetup[factionId] || null
}

/**
 * Configuración inicial de unidades y ciudades por escenario
 *
 * NOTA: Esta información se usará en el futuro para crear
 * el setup inicial automático de cada escenario.
 * Por ahora, el setup se hace manualmente en Firebase.
 */
export interface InitialSetup {
  [factionId: string]: {
    cities: string[]         // IDs de provincias con ciudad controlada
    garrison: string[]       // IDs donde colocar guarnición inicial
    armies: string[]         // IDs donde colocar ejércitos
    fleets: string[]         // IDs donde colocar flotas
    treasury: number         // Ducados iniciales
  }
}

export const SCENARIO_SETUPS: Record<string, InitialSetup> = {
  ITALIA_1454: {
    FLORENCE: {
      cities: ['FLO'],           // Florence city (capital)
      garrison: ['FLO'],         // Garrison in Florence
      armies: ['FLO', 'PER'],    // Army in Florence, army in Perugia (Umbria expansion)
      fleets: [],
      treasury: 15
    },
    VENICE: {
      cities: ['VEN', 'PAD'],    // Venice city + Padua
      garrison: ['VEN'],         // Garrison in Venice
      armies: ['VER'],           // Army in Verona (mainland defense)
      fleets: ['UA'],            // Fleet in Upper Adriatic
      treasury: 18
    },
    MILAN: {
      cities: ['MIL', 'GEN'],    // Milan city + Genoa
      garrison: ['MIL'],         // Garrison in Milan
      armies: ['MIL', 'PAV'],    // Armies in Milan and Pavia
      fleets: ['LS'],            // Fleet in Ligurian Sea (Genoa's port)
      treasury: 18
    },
    NAPLES: {
      cities: ['NAP', 'BAR'],    // Naples city + Bari
      garrison: ['NAP'],         // Garrison in Naples
      armies: ['CAP'],           // Army in Capua (buffer zone)
      fleets: ['GON'],           // Fleet in Gulf of Naples
      treasury: 18
    },
    PAPAL: {
      cities: ['ROM'],           // Rome city (capital)
      garrison: ['ROM'],         // Garrison in Rome
      armies: ['ROM', 'PAT'],    // Armies in Rome and Patrimony
      fleets: [],
      treasury: 15
    },
    FRANCE: {
      cities: ['MAR'],           // Marseilles (French Mediterranean port)
      garrison: ['SAV'],         // Garrison in Savoy (Alpine defense)
      armies: ['SAV', 'PRO'],    // Armies in Savoy and Provence
      fleets: ['GOL'],           // Fleet in Gulf of Lions
      treasury: 15
    }
  },

  TUTORIAL: {
    FLORENCE: {
      cities: ['FLO', 'PER'],    // Florence + Perugia (Umbria)
      garrison: ['FLO'],
      armies: ['FLO', 'PER'],
      fleets: [],
      treasury: 12
    },
    VENICE: {
      cities: ['VEN', 'PAD'],    // Venice + Padua
      garrison: ['VEN'],
      armies: ['VEN', 'VER'],    // Venice + Verona
      fleets: ['UA'],
      treasury: 12
    },
    MILAN: {
      cities: ['MIL', 'GEN'],    // Milan + Genoa
      garrison: ['MIL'],
      armies: ['MIL', 'PAV'],    // Milan + Pavia
      fleets: ['LS'],
      treasury: 12
    },
    PAPAL: {
      cities: ['ROM', 'ANC'],    // Rome + Ancona (Marches)
      garrison: ['ROM'],
      armies: ['ROM', 'PAT'],    // Rome + Patrimony
      fleets: [],
      treasury: 12
    }
  },

  // ITALIA_1494: Se implementará en el futuro cuando se añadan España y Austria al juego
  ITALIA_1494: {}
}
