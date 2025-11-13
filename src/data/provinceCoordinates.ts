// Coordenadas del centro de cada provincia para posicionar unidades
// Basadas en el mapa SVG (viewBox: 0 0 1200 1400)
// NOTA: Las coordenadas son aproximadas y pueden necesitar ajuste fino

export interface ProvinceCoordinates {
  x: number
  y: number
}

export const PROVINCE_COORDINATES: Record<string, ProvinceCoordinates> = {
  // ========== FRANCIA Y FRONTERA OCCIDENTAL ==========
  PRO: { x: 150, y: 200 },   // Provence
  MAR: { x: 297, y: 202 },    // Marseilles
  AVI: { x: 533, y: 169 },    // Avignon

  // ========== SABOYA Y PIAMONTE ==========
  SAV: { x: 386, y: 312 },    // Savoy
  SALZ: { x: 252, y: 552 },   // Saluzzo
  TUR: { x: 393, y: 554 },    // Turin

  // ========== LIGURIA ==========
  GEN: { x: 320, y: 450 },    // Genoa
  MON: { x: 546, y: 345 },    // Montferrat

  // ========== LOMBARDÍA ==========
  MIL: { x: 500, y: 280 },    // Milan
  PAV: { x: 450, y: 350 },    // Pavia
  COM: { x: 500, y: 200 },    // Como
  BER: { x: 580, y: 290 },    // Bergamo
  CRE: { x: 600, y: 330 },    // Cremona
  MAN: { x: 650, y: 370 },    // Mantua

  // ========== EMILIA-ROMAÑA ==========
  PAR: { x: 620, y: 420 },    // Parma
  FOR: { x: 560, y: 460 },    // Fornovo
  MOD: { x: 670, y: 480 },    // Modena
  BOL: { x: 740, y: 520 },    // Bologna
  FER: { x: 800, y: 500 },    // Ferrara
  RAV: { x: 850, y: 550 },    // Ravenna

  // ========== VÉNETO ==========
  VER: { x: 700, y: 380 },    // Verona
  PAD: { x: 800, y: 430 },    // Padua
  VEN: { x: 870, y: 470 },    // Venice
  TRE: { x: 850, y: 360 },    // Treviso
  TRT: { x: 750, y: 300 },    // Trent

  // ========== FRIULI E ISTRIA ==========
  FRI: { x: 950, y: 400 },    // Friuli
  IST: { x: 1000, y: 500 },   // Istria
  SLA: { x: 1050, y: 350 },   // Slavonia/Carniola

  // ========== SUIZA Y AUSTRIA ==========
  SWI: { x: 520, y: 150 },    // Swiss
  TYR: { x: 750, y: 200 },    // Tyrol
  AUS: { x: 900, y: 200 },    // Austria
  CAR: { x: 1070, y: 380 },   // Carniola
  CARIN: { x: 986, y: 226 },  // Carinthia

  // ========== HUNGRÍA Y CROACIA ==========
  HUN: { x: 1050, y: 250 },   // Hungary
  CRO: { x: 1100, y: 450 },   // Croatia

  // ========== COSTA ADRIÁTICA ORIENTAL ==========
  DAL: { x: 1100, y: 600 },   // Dalmatia
  BOS: { x: 1150, y: 700 },   // Bosnia
  HER: { x: 1120, y: 800 },   // Herzegovina
  RAG: { x: 1050, y: 850 },   // Ragusa
  ALB: { x: 1000, y: 950 },   // Albania
  DUR: { x: 950, y: 1000 },   // Durazzo

  // ========== TOSCANA ==========
  LUC: { x: 450, y: 630 },    // Lucca
  PIS: { x: 400, y: 680 },    // Pisa
  PIT: { x: 480, y: 680 },    // Pistoia
  FLO: { x: 520, y: 720 },    // Florence
  SIE: { x: 480, y: 800 },    // Siena
  ARE: { x: 580, y: 780 },    // Arezzo
  PIO: { x: 380, y: 750 },    // Piombino

  // ========== MARCHE Y UMBRÍA ==========
  ANC: { x: 780, y: 750 },    // Ancona (Marche)
  URB: { x: 700, y: 800 },    // Urbino
  PER: { x: 620, y: 850 },    // Perugia
  SPO: { x: 680, y: 900 },    // Spoleto

  // ========== LACIO (ESTADOS PONTIFICIOS) ==========
  ROM: { x: 580, y: 940 },    // Rome
  PAT: { x: 650, y: 920 },    // Patrimony

  // ========== ABRUZOS Y SUR ==========
  AQU: { x: 720, y: 980 },    // Aquila
  CAP: { x: 620, y: 1060 },   // Capua
  NAP: { x: 580, y: 1120 },   // Naples
  SAL: { x: 650, y: 1180 },   // Salerno
  BAR: { x: 800, y: 1100 },   // Bari
  OTR: { x: 850, y: 1200 },   // Otranto

  // ========== SICILIA ==========
  MES: { x: 680, y: 1280 },   // Messina
  PAL: { x: 520, y: 1320 },   // Palermo

  // ========== ISLAS ==========
  COR: { x: 300, y: 600 },    // Corsica
  SAR: { x: 240, y: 900 },    // Sardinia
  TUN: { x: 200, y: 1300 },   // Tunis

  // ========== REGIONES MARÍTIMAS ==========
  GOL: { x: 200, y: 350 },    // Gulf of Lions
  LS: { x: 300, y: 480 },     // Ligurian Sea
  TS: { x: 380, y: 880 },     // Tyrrhenian Sea
  WM: { x: 250, y: 1100 },    // Western Mediterranean
  CM: { x: 450, y: 1250 },    // Central Mediterranean
  GON: { x: 560, y: 1080 },   // Gulf of Naples
  IS: { x: 750, y: 1240 },    // Ionian Sea
  UA: { x: 900, y: 540 },     // Upper Adriatic
  LA: { x: 920, y: 850 },     // Lower Adriatic
}

// Helper para obtener coordenadas de una provincia
export const getProvinceCoordinates = (provinceId: string): ProvinceCoordinates | null => {
  return PROVINCE_COORDINATES[provinceId] || null
}

// Helper para calcular offset cuando hay múltiples unidades en la misma provincia
export const getUnitOffset = (index: number, total: number): { x: number; y: number } => {
  if (total === 1) return { x: 0, y: 0 }

  // Distribuir unidades en círculo alrededor del centro
  const angle = (index / total) * 2 * Math.PI
  const radius = 20 + (total > 3 ? 10 : 0) // Radio aumenta con más unidades

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  }
}
