import { Unit } from '@/types'

interface UnitMarkerProps {
  unit: Unit
  color: string
  position: { x: number; y: number }
  onClick?: () => void
}

export default function UnitMarker({ unit, color, position, onClick }: UnitMarkerProps) {
  const getUnitIcon = () => {
    switch (unit.type) {
      case 'army':
        return (
          <g>
            {/* Escudo con espadas cruzadas */}
            <rect x="-8" y="-10" width="16" height="20" rx="2" fill={color} stroke="#000" strokeWidth="1.5" />
            <path d="M -4,-6 L -4,4 M 4,-6 L 4,4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M -6,-2 L 6,-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )

      case 'fleet':
        return (
          <g>
            {/* Barco */}
            <path
              d="M -10,-2 L -6,-8 L 6,-8 L 10,-2 L 8,6 L -8,6 Z"
              fill={color}
              stroke="#000"
              strokeWidth="1.5"
            />
            <path d="M 0,-8 L 0,-14 M -3,-11 L 0,-14 L 3,-11" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="-6" y="-2" width="12" height="4" fill="#fff" opacity="0.3" />
          </g>
        )

      case 'garrison':
        return (
          <g>
            {/* Torre de castillo */}
            <rect x="-8" y="-12" width="16" height="18" fill={color} stroke="#000" strokeWidth="1.5" />
            <rect x="-8" y="-12" width="4" height="3" fill="#000" />
            <rect x="-1" y="-12" width="2" height="3" fill="#000" />
            <rect x="4" y="-12" width="4" height="3" fill="#000" />
            <rect x="-3" y="-2" width="6" height="8" fill="#333" />
          </g>
        )

      default:
        return null
    }
  }

  const getStatusBorder = () => {
    if (unit.status === 'besieged') {
      return (
        <circle
          cx="0"
          cy="0"
          r="14"
          fill="none"
          stroke="#ff0000"
          strokeWidth="2"
          strokeDasharray="3,2"
        />
      )
    }
    return null
  }

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onClick={onClick}
      className="unit-marker cursor-pointer hover:opacity-80 transition-opacity"
      style={{ pointerEvents: 'all' }}
    >
      {/* Sombra */}
      <circle cx="1" cy="1" r="12" fill="#000" opacity="0.3" />

      {/* Fondo circular */}
      <circle cx="0" cy="0" r="12" fill="#fff" stroke="#000" strokeWidth="2" />

      {/* Icono de la unidad */}
      {getUnitIcon()}

      {/* Borde de estado (asediada, etc.) */}
      {getStatusBorder()}

      {/* Contador de asedio (si aplica) */}
      {unit.siegeTurns > 0 && (
        <g>
          <circle cx="10" cy="-10" r="6" fill="#ff0000" stroke="#000" strokeWidth="1" />
          <text
            x="10"
            y="-7"
            textAnchor="middle"
            fill="#fff"
            fontSize="8"
            fontWeight="bold"
          >
            {unit.siegeTurns}
          </text>
        </g>
      )}
    </g>
  )
}
