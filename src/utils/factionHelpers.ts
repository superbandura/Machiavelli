/**
 * Mapea IDs de facciones (inglés) a nombres de archivos de emblemas (español)
 */

export function getFactionImageName(factionId: string): string {
  const mapping: Record<string, string> = {
    // Facciones principales
    'FLORENCE': 'florencia',
    'VENICE': 'venecia',
    'MILAN': 'milan',
    'NAPLES': 'napoles',
    'PAPAL': 'papado',

    // Otras facciones
    'GENOA': 'genova',
    'SAVOY': 'saboya',
    'MANTUA': 'mantua',
    'FERRARA': 'ferrara',
    'URBINO': 'urbino',
    'SIENA': 'siena',
    'LUCCA': 'lucca',

    // Poderes externos
    'FRANCE': 'francia',
    'SPAIN': 'espana',
    'HOLY_ROMAN_EMPIRE': 'sacro_imperio',
    'OTTOMAN': 'otomano',
    'ARAGON': 'aragon',
  }

  // Retornar nombre mapeado o normalizar el ID si no existe mapeo
  const mapped = mapping[factionId.toUpperCase()]
  if (mapped) {
    return mapped
  }

  // Fallback: normalizar el ID (eliminar acentos y convertir a minúsculas)
  return factionId
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
