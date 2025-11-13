// Colores de las facciones según el escenario Italia 1454

export interface Faction {
  id: string
  name: string
  color: string
  colorDark: string // Color más oscuro para variantes
}

export const FACTIONS: Record<string, Faction> = {
  FLORENCE: {
    id: 'FLORENCE',
    name: 'República de Florencia',
    color: '#22c55e', // Verde
    colorDark: '#16a34a'
  },
  VENICE: {
    id: 'VENICE',
    name: 'República de Venecia',
    color: '#3b82f6', // Azul
    colorDark: '#2563eb'
  },
  MILAN: {
    id: 'MILAN',
    name: 'Ducado de Milán',
    color: '#ef4444', // Rojo
    colorDark: '#dc2626'
  },
  NAPLES: {
    id: 'NAPLES',
    name: 'Reino de Nápoles',
    color: '#eab308', // Amarillo
    colorDark: '#ca8a04'
  },
  PAPAL: {
    id: 'PAPAL',
    name: 'Estados Pontificios',
    color: '#f8f8f8', // Blanco
    colorDark: '#e5e5e5'
  },
  FRANCE: {
    id: 'FRANCE',
    name: 'Corona de Francia',
    color: '#a855f7', // Púrpura
    colorDark: '#9333ea'
  },
  NEUTRAL: {
    id: 'NEUTRAL',
    name: 'Neutral',
    color: '#9ca3af', // Gris
    colorDark: '#6b7280'
  }
}

// Helper para obtener color por ID de facción
export const getFactionColor = (factionId: string): string => {
  return FACTIONS[factionId]?.color || FACTIONS.NEUTRAL.color
}
