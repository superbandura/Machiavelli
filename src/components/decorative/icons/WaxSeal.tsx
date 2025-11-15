interface WaxSealProps {
  variant?: 'gold' | 'burgundy' | 'bronze' | 'purple' | 'silver'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function WaxSeal({
  variant = 'gold',
  className = '',
  size = 'md'
}: WaxSealProps) {
  const colors = {
    gold: '#d4af37',
    burgundy: '#9b2d30',
    bronze: '#cd7f32',
    purple: '#9333ea',
    silver: '#9ca3af'
  }

  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizes[size]} ${className}`}
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
    >
      {/* Círculo de cera */}
      <circle
        cx="50"
        cy="50"
        r="45"
        fill={colors[variant]}
        opacity="0.95"
      />
      {/* Textura de cera (círculo interior más oscuro) */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill={colors[variant]}
        opacity="0.7"
      />
      {/* Sello ornamentado (letra M para Machiavelli) */}
      <text
        x="50"
        y="70"
        fontSize="50"
        fontFamily="Cinzel, serif"
        fontWeight="bold"
        fill="#2c2416"
        textAnchor="middle"
        opacity="0.6"
      >
        M
      </text>
      {/* Borde irregular de cera derretida */}
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={colors[variant]}
        strokeWidth="3"
        opacity="0.8"
        strokeDasharray="5,3"
      />
    </svg>
  )
}
