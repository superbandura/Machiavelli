interface HourglassProps {
  className?: string
  animated?: boolean
}

export default function Hourglass({ className = '', animated = true }: HourglassProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Marco superior */}
      <rect x="15" y="10" width="70" height="8" fill="#8B4513" rx="2" />

      {/* Cristal superior */}
      <path
        d="M25,18 L75,18 L75,35 Q50,48 50,50 L25,35 Z"
        fill="#E8D5C4"
        stroke="#8B4513"
        strokeWidth="1.5"
        opacity="0.4"
      />

      {/* Arena superior */}
      <path
        d="M30,22 L70,22 L70,32 Q50,42 50,45 L30,32 Z"
        fill="#d4af37"
        opacity="0.7"
        className={animated ? 'animate-pulse' : ''}
      />

      {/* Cristal inferior */}
      <path
        d="M25,50 Q50,52 75,50 L75,82 L25,82 Z"
        fill="#E8D5C4"
        stroke="#8B4513"
        strokeWidth="1.5"
        opacity="0.4"
      />

      {/* Arena inferior (acumulándose) */}
      <ellipse cx="50" cy="75" rx="20" ry="8" fill="#d4af37" opacity="0.8" />

      {/* Flujo de arena (centro) */}
      <line
        x1="50"
        y1="45"
        x2="50"
        y2="65"
        stroke="#d4af37"
        strokeWidth="2"
        opacity="0.6"
        className={animated ? 'animate-pulse' : ''}
      />

      {/* Marco inferior */}
      <rect x="15" y="82" width="70" height="8" fill="#8B4513" rx="2" />

      {/* Detalles decorativos */}
      <circle cx="20" cy="14" r="2" fill="#d4af37" />
      <circle cx="80" cy="14" r="2" fill="#d4af37" />
      <circle cx="20" cy="86" r="2" fill="#d4af37" />
      <circle cx="80" cy="86" r="2" fill="#d4af37" />
    </svg>
  )
}
