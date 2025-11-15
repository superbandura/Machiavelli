interface OrnamentedBorderProps {
  children: React.ReactNode
  variant?: 'gold' | 'burgundy' | 'bronze'
  className?: string
}

export default function OrnamentedBorder({
  children,
  variant = 'gold',
  className = ''
}: OrnamentedBorderProps) {
  const borderColors = {
    gold: 'border-renaissance-gold',
    burgundy: 'border-burgundy-400',
    bronze: 'border-renaissance-bronze'
  }

  const shadowColors = {
    gold: 'shadow-glow-gold',
    burgundy: 'shadow-glow-burgundy',
    bronze: 'shadow-ornate'
  }

  return (
    <div className={`relative ${className}`}>
      {/* Border principal */}
      <div className={`
        border-2 ${borderColors[variant]}
        rounded-lg
        ${shadowColors[variant]}
        relative
        overflow-hidden
      `}>
        {/* Esquinas ornamentadas */}
        <div className="absolute top-0 left-0 w-4 h-4">
          <svg viewBox="0 0 20 20" className={`fill-${borderColors[variant].replace('border-', 'text-')}`}>
            <path d="M0,0 L20,0 L20,5 Q10,8 5,20 L0,20 Z" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-4 h-4 transform rotate-90">
          <svg viewBox="0 0 20 20" className={`fill-${borderColors[variant].replace('border-', 'text-')}`}>
            <path d="M0,0 L20,0 L20,5 Q10,8 5,20 L0,20 Z" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 w-4 h-4 transform -rotate-90">
          <svg viewBox="0 0 20 20" className={`fill-${borderColors[variant].replace('border-', 'text-')}`}>
            <path d="M0,0 L20,0 L20,5 Q10,8 5,20 L0,20 Z" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 transform rotate-180">
          <svg viewBox="0 0 20 20" className={`fill-${borderColors[variant].replace('border-', 'text-')}`}>
            <path d="M0,0 L20,0 L20,5 Q10,8 5,20 L0,20 Z" />
          </svg>
        </div>

        {/* Contenido */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  )
}
