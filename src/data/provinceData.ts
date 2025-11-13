// Tipos de provincia
export type ProvinceType = 'land' | 'sea' | 'port'

// Información de cada provincia
export interface ProvinceInfo {
  id: string
  name: string
  type: ProvinceType
  adjacencies: string[] // IDs de provincias adyacentes
  hasCity?: boolean
  cityName?: string
  isPort?: boolean
  income?: number // Ducados que produce la ciudad (solo si hasCity)
}

// Mapa de adyacencias basado en el nuevo mapa detallado
export const PROVINCE_ADJACENCIES: Record<string, string[]> = {
  // ========== FRANCIA Y FRONTERA OCCIDENTAL ==========
  AVI: ['SWI', 'TUR', 'PRO', 'MAR', 'GOL'],
  PRO: ['AVI', 'MAR', 'SALZ', 'SAV', 'TUR', 'GOL', 'LS'],
  MAR: ['AVI', 'GOL', 'PRO'],

  // ========== SABOYA Y PIAMONTE ==========
  SAV: ['PRO', 'SALZ', 'TUR', 'MON', 'GEN', 'LS', 'GOL'],
  SALZ: ['PRO', 'SAV', 'TUR', 'GEN', 'LS', 'GOL'],
  TUR: ['AVI', 'SWI', 'TYR', 'COM', 'PAV', 'MON', 'SAV', 'SALZ', 'PRO'],

  // ========== LIGURIA ==========
  GEN: ['MON', 'FOR', 'SAV', 'PAV', 'LS', 'SALZ', 'GOL'],
  MON: ['TUR', 'PAV', 'FOR', 'GEN', 'SAV', 'LS'],

  // ========== LOMBARDÍA ==========
  MIL: ['COM', 'TYR', 'CAR', 'CRE', 'MAN', 'MOD', 'BER', 'PAV', 'TRT', 'SLA', 'PAR'],
  COM: ['TUR', 'MIL', 'TYR', 'SWI', 'PAV'],
  PAV: ['TUR', 'COM', 'MIL', 'PAR', 'FOR', 'GEN', 'MON', 'MOD'],
  BER: ['MIL', 'TRT', 'VER', 'MAN', 'CRE'],
  CRE: ['PAR', 'MIL', 'BER', 'MAN'],
  MAN: ['CRE', 'BER', 'VER', 'FER', 'BOL', 'MOD', 'PAR', 'MIL'],

  // ========== EMILIA-ROMAÑA ==========
  PAR: ['FOR', 'PAV', 'MAN', 'CRE', 'MOD', 'MIL', 'TRT'],
  FOR: ['GEN', 'MON', 'PAV', 'PAR', 'MOD'],
  MOD: ['FOR', 'PAR', 'MAN', 'BOL', 'LUC', 'LS', 'PAV', 'MIL'],
  BOL: ['LUC', 'MOD', 'MAN', 'FER', 'UA', 'URB', 'FLO', 'PIT'],
  FER: ['MAN', 'VER', 'PAD', 'BOL', 'UA', 'RAV'],
  RAV: ['FER', 'UA', 'ANC'],

  // ========== VÉNETO ==========
  VER: ['TRT', 'CAR', 'FRI', 'TRE', 'PAD', 'FER', 'MAN', 'BER', 'CARIN'],
  TRT: ['BER', 'PAR', 'MIL', 'TYR', 'CAR', 'VER', 'SLA'],
  PAD: ['VER', 'TRE', 'VEN', 'UA', 'FER'],
  TRE: ['PAD', 'VER', 'FRI', 'VEN'],
  VEN: ['UA', 'PAD', 'TRE', 'FRI'],

  // ========== FRIULI E ISTRIA ==========
  FRI: ['TRE', 'VER', 'CAR', 'VEN', 'UA', 'CARIN'],
  IST: ['UA', 'CAR', 'CRO'],
  SLA: ['HUN', 'CRO', 'CAR', 'AUS', 'TYR', 'MIL', 'TRT', 'CARIN'],

  // ========== SUIZA Y AUSTRIA ==========
  SWI: ['AVI', 'TUR', 'TYR', 'COM', 'AUS'],
  TYR: ['COM', 'MIL', 'TRT', 'SLA', 'CAR', 'CARIN', 'AUS', 'SWI', 'TUR'],
  AUS: ['TYR', 'SWI', 'HUN', 'SLA', 'CAR', 'CARIN'],
  CAR: ['SLA', 'CRO', 'IST', 'UA', 'FRI', 'VER', 'TRT', 'MIL', 'TYR', 'AUS', 'CARIN'],
  CARIN: ['TYR', 'AUS', 'CAR', 'SLA', 'VER', 'FRI'],

  // ========== HUNGRÍA Y CROACIA ==========
  HUN: ['AUS', 'SLA', 'CRO'],
  CRO: ['HUN', 'CAR', 'IST', 'UA', 'DAL', 'BOS', 'SLA'],

  // ========== COSTA ADRIÁTICA ORIENTAL ==========
  DAL: ['UA', 'LA', 'CRO', 'BOS', 'HER'],
  BOS: ['HER', 'DAL', 'CRO'],
  HER: ['LA', 'RAG', 'ALB', 'DAL', 'BOS'],
  RAG: ['LA', 'HER', 'ALB'],
  ALB: ['RAG', 'HER', 'LA', 'DUR', 'IS'],
  DUR: ['LA', 'ALB', 'IS'],

  // ========== TOSCANA ==========
  LUC: ['LS', 'MOD', 'BOL', 'PIT', 'PIS'],
  PIS: ['LS', 'LUC', 'PIT', 'FLO', 'SIE', 'PIO'],
  PIT: ['LUC', 'BOL', 'FLO', 'PIS'],
  FLO: ['PIS', 'PIT', 'BOL', 'URB', 'ARE', 'SIE'],
  SIE: ['PIO', 'PIS', 'FLO', 'ARE', 'PER', 'PAT', 'TS'],
  ARE: ['FLO', 'URB', 'PER', 'SIE'],
  PIO: ['LS', 'TS', 'PIS', 'SIE'],

  // ========== MARCHE Y UMBRÍA ==========
  ANC: ['URB', 'UA', 'LA', 'AQU', 'SPO', 'RAV'],
  URB: ['FLO', 'BOL', 'UA', 'ANC', 'SPO', 'PER', 'ARE'],
  PER: ['SIE', 'ARE', 'URB', 'SPO', 'ROM', 'PAT'],
  SPO: ['PER', 'URB', 'ANC', 'AQU', 'CAP', 'ROM'],

  // ========== LACIO (ESTADOS PONTIFICIOS) ==========
  ROM: ['TS', 'PAT', 'PER', 'SPO', 'CAP'],
  PAT: ['TS', 'SIE', 'PER', 'ROM'],

  // ========== ABRUZOS Y SUR ==========
  AQU: ['SPO', 'ANC', 'LA', 'BAR', 'SAL', 'NAP', 'CAP'],
  CAP: ['TS', 'ROM', 'SPO', 'AQU', 'NAP', 'GON'],
  NAP: ['TS', 'GON', 'SAL', 'AQU', 'CAP'],
  SAL: ['GON', 'NAP', 'AQU', 'BAR', 'OTR'],
  BAR: ['AQU', 'LA', 'OTR', 'SAL'],
  OTR: ['SAL', 'BAR', 'LA', 'IS', 'MES', 'GON'],

  // ========== SICILIA ==========
  MES: ['IS', 'GON', 'OTR', 'PAL', 'CM'],
  PAL: ['TS', 'GON', 'MES', 'IS', 'CM'],

  // ========== ISLAS ==========
  COR: ['GOL', 'LS', 'TS', 'SAR'],
  SAR: ['WM', 'GOL', 'COR', 'TS'],
  TUN: ['CM', 'WM'],

  // ========== REGIONES MARÍTIMAS ==========
  GOL: ['AVI', 'MAR', 'PRO', 'SAV', 'SALZ', 'GEN', 'LS', 'WM', 'SAR', 'COR'],
  LS: ['GOL', 'PRO', 'SAV', 'GEN', 'MON', 'MOD', 'LUC', 'PIS', 'PIO', 'TS', 'COR', 'SALZ'],
  TS: ['LS', 'PIO', 'SIE', 'PAT', 'ROM', 'CAP', 'NAP', 'GON', 'PAL', 'CM', 'WM', 'SAR', 'COR'],
  WM: ['CM', 'TUN', 'GOL', 'SAR', 'TS'],
  CM: ['WM', 'TUN', 'TS', 'PAL', 'MES', 'IS'],
  GON: ['TS', 'NAP', 'CAP', 'SAL', 'OTR', 'MES', 'PAL', 'IS'],
  IS: ['OTR', 'LA', 'DUR', 'ALB', 'CM', 'MES', 'GON', 'PAL'],
  UA: ['LA', 'ANC', 'URB', 'BOL', 'FER', 'PAD', 'VEN', 'FRI', 'CAR', 'IST', 'CRO', 'DAL', 'RAV'],
  LA: ['UA', 'DAL', 'HER', 'RAG', 'ALB', 'IS', 'OTR', 'BAR', 'AQU', 'ANC', 'DUR'],
}

// Información detallada de provincias
export const PROVINCE_INFO: Record<string, ProvinceInfo> = {
  // ========== FRANCIA Y FRONTERA OCCIDENTAL (TERRESTRES CON CIUDAD) ==========
  PRO: { id: 'PRO', name: 'Provence', type: 'port', adjacencies: PROVINCE_ADJACENCIES.PRO, hasCity: true, cityName: 'Provence', isPort: true, income: 2 },
  MAR: { id: 'MAR', name: 'Marseilles', type: 'port', adjacencies: PROVINCE_ADJACENCIES.MAR, hasCity: true, cityName: 'Marseilles', isPort: true, income: 3 },
  AVI: { id: 'AVI', name: 'Avignon', type: 'land', adjacencies: PROVINCE_ADJACENCIES.AVI, hasCity: true, cityName: 'Avignon', income: 2 },

  // ========== SABOYA Y PIAMONTE ==========
  SAV: { id: 'SAV', name: 'Savoy', type: 'land', adjacencies: PROVINCE_ADJACENCIES.SAV, hasCity: true, cityName: 'Savoy', income: 2 },
  SALZ: { id: 'SALZ', name: 'Saluzzo', type: 'land', adjacencies: PROVINCE_ADJACENCIES.SALZ, hasCity: true, cityName: 'Saluzzo', income: 1 },
  TUR: { id: 'TUR', name: 'Turin', type: 'land', adjacencies: PROVINCE_ADJACENCIES.TUR, hasCity: true, cityName: 'Turin', income: 3 },

  // ========== LIGURIA ==========
  GEN: { id: 'GEN', name: 'Genoa', type: 'port', adjacencies: PROVINCE_ADJACENCIES.GEN, hasCity: true, cityName: 'Genoa', isPort: true, income: 4 },
  MON: { id: 'MON', name: 'Montferrat', type: 'land', adjacencies: PROVINCE_ADJACENCIES.MON, hasCity: true, cityName: 'Montferrat', income: 2 },

  // ========== LOMBARDÍA ==========
  MIL: { id: 'MIL', name: 'Milan', type: 'land', adjacencies: PROVINCE_ADJACENCIES.MIL, hasCity: true, cityName: 'Milan', income: 5 },
  COM: { id: 'COM', name: 'Como', type: 'land', adjacencies: PROVINCE_ADJACENCIES.COM, hasCity: true, cityName: 'Como', income: 1 },
  PAV: { id: 'PAV', name: 'Pavia', type: 'land', adjacencies: PROVINCE_ADJACENCIES.PAV, hasCity: true, cityName: 'Pavia', income: 2 },
  BER: { id: 'BER', name: 'Bergamo', type: 'land', adjacencies: PROVINCE_ADJACENCIES.BER, hasCity: true, cityName: 'Bergamo', income: 2 },
  CRE: { id: 'CRE', name: 'Cremona', type: 'land', adjacencies: PROVINCE_ADJACENCIES.CRE, hasCity: true, cityName: 'Cremona', income: 2 },
  MAN: { id: 'MAN', name: 'Mantua', type: 'land', adjacencies: PROVINCE_ADJACENCIES.MAN, hasCity: true, cityName: 'Mantua', income: 2 },

  // ========== EMILIA-ROMAÑA ==========
  PAR: { id: 'PAR', name: 'Parma', type: 'land', adjacencies: PROVINCE_ADJACENCIES.PAR, hasCity: true, cityName: 'Parma', income: 2 },
  FOR: { id: 'FOR', name: 'Fornovo', type: 'land', adjacencies: PROVINCE_ADJACENCIES.FOR, hasCity: false },
  MOD: { id: 'MOD', name: 'Modena', type: 'land', adjacencies: PROVINCE_ADJACENCIES.MOD, hasCity: true, cityName: 'Modena', income: 2 },
  BOL: { id: 'BOL', name: 'Bologna', type: 'land', adjacencies: PROVINCE_ADJACENCIES.BOL, hasCity: true, cityName: 'Bologna', income: 3 },
  FER: { id: 'FER', name: 'Ferrara', type: 'land', adjacencies: PROVINCE_ADJACENCIES.FER, hasCity: true, cityName: 'Ferrara', income: 2 },
  RAV: { id: 'RAV', name: 'Ravenna', type: 'port', adjacencies: PROVINCE_ADJACENCIES.RAV, hasCity: true, cityName: 'Ravenna', isPort: true, income: 2 },

  // ========== VÉNETO ==========
  VER: { id: 'VER', name: 'Verona', type: 'land', adjacencies: PROVINCE_ADJACENCIES.VER, hasCity: true, cityName: 'Verona', income: 2 },
  TRT: { id: 'TRT', name: 'Trent', type: 'land', adjacencies: PROVINCE_ADJACENCIES.TRT, hasCity: true, cityName: 'Trent', income: 1 },
  PAD: { id: 'PAD', name: 'Padua', type: 'land', adjacencies: PROVINCE_ADJACENCIES.PAD, hasCity: true, cityName: 'Padua', income: 2 },
  TRE: { id: 'TRE', name: 'Treviso', type: 'land', adjacencies: PROVINCE_ADJACENCIES.TRE, hasCity: true, cityName: 'Treviso', income: 2 },
  VEN: { id: 'VEN', name: 'Venice', type: 'port', adjacencies: PROVINCE_ADJACENCIES.VEN, hasCity: true, cityName: 'Venice', isPort: true, income: 5 },

  // ========== FRIULI E ISTRIA ==========
  FRI: { id: 'FRI', name: 'Friuli', type: 'land', adjacencies: PROVINCE_ADJACENCIES.FRI, hasCity: true, cityName: 'Friuli', income: 2 },
  IST: { id: 'IST', name: 'Istria', type: 'port', adjacencies: PROVINCE_ADJACENCIES.IST, hasCity: true, cityName: 'Istria', isPort: true, income: 1 },
  SLA: { id: 'SLA', name: 'Slavonia', type: 'land', adjacencies: PROVINCE_ADJACENCIES.SLA, hasCity: false },

  // ========== SUIZA Y AUSTRIA ==========
  SWI: { id: 'SWI', name: 'Swiss', type: 'land', adjacencies: PROVINCE_ADJACENCIES.SWI, hasCity: false },
  TYR: { id: 'TYR', name: 'Tyrol', type: 'land', adjacencies: PROVINCE_ADJACENCIES.TYR, hasCity: false },
  AUS: { id: 'AUS', name: 'Austria', type: 'land', adjacencies: PROVINCE_ADJACENCIES.AUS, hasCity: false },
  CAR: { id: 'CAR', name: 'Carniola', type: 'land', adjacencies: PROVINCE_ADJACENCIES.CAR, hasCity: false },
  CARIN: { id: 'CARIN', name: 'Carinthia', type: 'land', adjacencies: PROVINCE_ADJACENCIES.CARIN, hasCity: false },

  // ========== HUNGRÍA Y CROACIA ==========
  HUN: { id: 'HUN', name: 'Hungary', type: 'land', adjacencies: PROVINCE_ADJACENCIES.HUN, hasCity: false },
  CRO: { id: 'CRO', name: 'Croatia', type: 'land', adjacencies: PROVINCE_ADJACENCIES.CRO, hasCity: false },

  // ========== COSTA ADRIÁTICA ORIENTAL ==========
  DAL: { id: 'DAL', name: 'Dalmatia', type: 'port', adjacencies: PROVINCE_ADJACENCIES.DAL, hasCity: true, cityName: 'Dalmatia', isPort: true, income: 2 },
  BOS: { id: 'BOS', name: 'Bosnia', type: 'land', adjacencies: PROVINCE_ADJACENCIES.BOS, hasCity: false },
  HER: { id: 'HER', name: 'Herzegovina', type: 'land', adjacencies: PROVINCE_ADJACENCIES.HER, hasCity: false },
  RAG: { id: 'RAG', name: 'Ragusa', type: 'port', adjacencies: PROVINCE_ADJACENCIES.RAG, hasCity: true, cityName: 'Ragusa', isPort: true, income: 2 },
  ALB: { id: 'ALB', name: 'Albania', type: 'land', adjacencies: PROVINCE_ADJACENCIES.ALB, hasCity: false },
  DUR: { id: 'DUR', name: 'Durazzo', type: 'port', adjacencies: PROVINCE_ADJACENCIES.DUR, hasCity: true, cityName: 'Durazzo', isPort: true, income: 1 },

  // ========== TOSCANA ==========
  LUC: { id: 'LUC', name: 'Lucca', type: 'land', adjacencies: PROVINCE_ADJACENCIES.LUC, hasCity: true, cityName: 'Lucca', income: 2 },
  PIS: { id: 'PIS', name: 'Pisa', type: 'port', adjacencies: PROVINCE_ADJACENCIES.PIS, hasCity: true, cityName: 'Pisa', isPort: true, income: 2 },
  PIT: { id: 'PIT', name: 'Pistoia', type: 'land', adjacencies: PROVINCE_ADJACENCIES.PIT, hasCity: true, cityName: 'Pistoia', income: 1 },
  FLO: { id: 'FLO', name: 'Florence', type: 'land', adjacencies: PROVINCE_ADJACENCIES.FLO, hasCity: true, cityName: 'Florence', income: 5 },
  SIE: { id: 'SIE', name: 'Siena', type: 'land', adjacencies: PROVINCE_ADJACENCIES.SIE, hasCity: true, cityName: 'Siena', income: 2 },
  ARE: { id: 'ARE', name: 'Arezzo', type: 'land', adjacencies: PROVINCE_ADJACENCIES.ARE, hasCity: true, cityName: 'Arezzo', income: 1 },
  PIO: { id: 'PIO', name: 'Piombino', type: 'port', adjacencies: PROVINCE_ADJACENCIES.PIO, hasCity: true, cityName: 'Piombino', isPort: true, income: 1 },

  // ========== MARCHE Y UMBRÍA ==========
  ANC: { id: 'ANC', name: 'Ancona', type: 'port', adjacencies: PROVINCE_ADJACENCIES.ANC, hasCity: true, cityName: 'Ancona', isPort: true, income: 2 },
  URB: { id: 'URB', name: 'Urbino', type: 'land', adjacencies: PROVINCE_ADJACENCIES.URB, hasCity: true, cityName: 'Urbino', income: 2 },
  PER: { id: 'PER', name: 'Perugia', type: 'land', adjacencies: PROVINCE_ADJACENCIES.PER, hasCity: true, cityName: 'Perugia', income: 2 },
  SPO: { id: 'SPO', name: 'Spoleto', type: 'land', adjacencies: PROVINCE_ADJACENCIES.SPO, hasCity: true, cityName: 'Spoleto', income: 1 },

  // ========== LACIO ==========
  ROM: { id: 'ROM', name: 'Rome', type: 'port', adjacencies: PROVINCE_ADJACENCIES.ROM, hasCity: true, cityName: 'Rome', isPort: true, income: 4 },
  PAT: { id: 'PAT', name: 'Patrimony', type: 'land', adjacencies: PROVINCE_ADJACENCIES.PAT, hasCity: true, cityName: 'Patrimony', income: 2 },

  // ========== ABRUZOS Y SUR ==========
  AQU: { id: 'AQU', name: 'Aquila', type: 'land', adjacencies: PROVINCE_ADJACENCIES.AQU, hasCity: true, cityName: 'Aquila', income: 1 },
  CAP: { id: 'CAP', name: 'Capua', type: 'land', adjacencies: PROVINCE_ADJACENCIES.CAP, hasCity: true, cityName: 'Capua', income: 2 },
  NAP: { id: 'NAP', name: 'Naples', type: 'port', adjacencies: PROVINCE_ADJACENCIES.NAP, hasCity: true, cityName: 'Naples', isPort: true, income: 5 },
  SAL: { id: 'SAL', name: 'Salerno', type: 'port', adjacencies: PROVINCE_ADJACENCIES.SAL, hasCity: true, cityName: 'Salerno', isPort: true, income: 2 },
  BAR: { id: 'BAR', name: 'Bari', type: 'port', adjacencies: PROVINCE_ADJACENCIES.BAR, hasCity: true, cityName: 'Bari', isPort: true, income: 3 },
  OTR: { id: 'OTR', name: 'Otranto', type: 'port', adjacencies: PROVINCE_ADJACENCIES.OTR, hasCity: true, cityName: 'Otranto', isPort: true, income: 1 },

  // ========== SICILIA ==========
  MES: { id: 'MES', name: 'Messina', type: 'port', adjacencies: PROVINCE_ADJACENCIES.MES, hasCity: true, cityName: 'Messina', isPort: true, income: 2 },
  PAL: { id: 'PAL', name: 'Palermo', type: 'port', adjacencies: PROVINCE_ADJACENCIES.PAL, hasCity: true, cityName: 'Palermo', isPort: true, income: 3 },

  // ========== ISLAS ==========
  COR: { id: 'COR', name: 'Corsica', type: 'port', adjacencies: PROVINCE_ADJACENCIES.COR, hasCity: true, cityName: 'Corsica', isPort: true, income: 1 },
  SAR: { id: 'SAR', name: 'Sardinia', type: 'port', adjacencies: PROVINCE_ADJACENCIES.SAR, hasCity: true, cityName: 'Sardinia', isPort: true, income: 2 },
  TUN: { id: 'TUN', name: 'Tunis', type: 'port', adjacencies: PROVINCE_ADJACENCIES.TUN, hasCity: true, cityName: 'Tunis', isPort: true, income: 2 },

  // ========== ZONAS MARÍTIMAS ==========
  LS: { id: 'LS', name: 'Ligurian Sea', type: 'sea', adjacencies: PROVINCE_ADJACENCIES.LS },
  TS: { id: 'TS', name: 'Tyrrhenian Sea', type: 'sea', adjacencies: PROVINCE_ADJACENCIES.TS },
  UA: { id: 'UA', name: 'Upper Adriatic', type: 'sea', adjacencies: PROVINCE_ADJACENCIES.UA },
  LA: { id: 'LA', name: 'Lower Adriatic', type: 'sea', adjacencies: PROVINCE_ADJACENCIES.LA },
  IS: { id: 'IS', name: 'Ionian Sea', type: 'sea', adjacencies: PROVINCE_ADJACENCIES.IS },
  GOL: { id: 'GOL', name: 'Gulf of Lions', type: 'sea', adjacencies: PROVINCE_ADJACENCIES.GOL },
  GON: { id: 'GON', name: 'Gulf of Naples', type: 'sea', adjacencies: PROVINCE_ADJACENCIES.GON },
  WM: { id: 'WM', name: 'Western Mediterranean', type: 'sea', adjacencies: PROVINCE_ADJACENCIES.WM },
  CM: { id: 'CM', name: 'Central Mediterranean', type: 'sea', adjacencies: PROVINCE_ADJACENCIES.CM },
}

// Helpers para validación
export const isAdjacent = (provinceA: string, provinceB: string): boolean => {
  return PROVINCE_ADJACENCIES[provinceA]?.includes(provinceB) ?? false
}

export const getProvinceInfo = (provinceId: string): ProvinceInfo | null => {
  return PROVINCE_INFO[provinceId] || null
}

export const isPort = (provinceId: string): boolean => {
  return PROVINCE_INFO[provinceId]?.isPort ?? false
}

export const isLand = (provinceId: string): boolean => {
  const type = PROVINCE_INFO[provinceId]?.type
  return type === 'land' || type === 'port'
}

export const isSea = (provinceId: string): boolean => {
  return PROVINCE_INFO[provinceId]?.type === 'sea'
}

export const getAdjacentProvinces = (provinceId: string): string[] => {
  return PROVINCE_ADJACENCIES[provinceId] || []
}

// Obtener provincias adyacentes válidas para un tipo de unidad
export const getValidDestinations = (
  currentPosition: string,
  unitType: 'army' | 'fleet' | 'garrison'
): string[] => {
  const adjacencies = getAdjacentProvinces(currentPosition)

  if (unitType === 'garrison') {
    // Las guarniciones no pueden moverse
    return []
  }

  if (unitType === 'army') {
    // Ejércitos solo pueden moverse a provincias terrestres
    return adjacencies.filter(isLand)
  }

  if (unitType === 'fleet') {
    // Flotas pueden moverse a zonas marítimas o puertos
    return adjacencies.filter(prov => isSea(prov) || isPort(prov))
  }

  return []
}
