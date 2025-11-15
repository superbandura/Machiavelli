interface SeparatorProps {
  variant?: 'gold' | 'burgundy' | 'gray'
  withFlourish?: boolean
  className?: string
}

export default function Separator({
  variant = 'gold',
  withFlourish = true,
  className = ''
}: SeparatorProps) {
  const colors = {
    gold: 'border-renaissance-gold',
    burgundy: 'border-burgundy-400',
    gray: 'border-gray-700'
  }

  const fillColors = {
    gold: 'text-renaissance-gold',
    burgundy: 'text-burgundy-400',
    gray: 'text-gray-700'
  }

  if (!withFlourish) {
    return <div className={`border-t ${colors[variant]} ${className}`} />
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className={`flex-1 border-t ${colors[variant]}`} />
      <svg
        viewBox="0 0 40 20"
        className={`w-8 h-4 ${fillColors[variant]}`}
        fill="currentColor"
      >
        {/* Flourish ornamental central */}
        <path d="M20,2 Q15,8 10,10 Q15,12 20,18 Q25,12 30,10 Q25,8 20,2 Z" />
        <circle cx="20" cy="10" r="2" />
      </svg>
      <div className={`flex-1 border-t ${colors[variant]}`} />
    </div>
  )
}
