import { Unit } from '@/types'

interface UnitIconProps {
  type: Unit['type']
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Componente para mostrar iconos de unidades
 * Tamaños:
 * - sm: 16px (para listas compactas)
 * - md: 24px (por defecto, para panels)
 * - lg: 32px (para destacar)
 */
export default function UnitIcon({ type, size = 'md', className = '' }: UnitIconProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-sm',
    md: 'w-6 h-6 text-base',
    lg: 'w-8 h-8 text-lg'
  }

  const iconConfig = {
    army: {
      emoji: '⚔️',
      label: 'Ejército',
      bgColor: 'bg-red-900/30',
      borderColor: 'border-red-500',
      textColor: 'text-red-300'
    },
    fleet: {
      emoji: '⛵',
      label: 'Flota',
      bgColor: 'bg-blue-900/30',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-300'
    },
    garrison: {
      emoji: '🏰',
      label: 'Guarnición',
      bgColor: 'bg-yellow-900/30',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-300'
    }
  }

  const config = iconConfig[type]
  const sizeClass = sizeClasses[size]

  return (
    <div
      className={`
        ${sizeClass}
        ${config.bgColor}
        ${config.borderColor}
        ${config.textColor}
        inline-flex items-center justify-center
        rounded border
        ${className}
      `}
      title={config.label}
    >
      <span className="leading-none">{config.emoji}</span>
    </div>
  )
}

/**
 * Variante de texto con icono y label
 */
interface UnitIconWithLabelProps extends UnitIconProps {
  showLabel?: boolean
}

export function UnitIconWithLabel({ type, size = 'md', showLabel = true, className = '' }: UnitIconWithLabelProps) {
  const labelText = {
    army: 'Ejército',
    fleet: 'Flota',
    garrison: 'Guarnición'
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <UnitIcon type={type} size={size} />
      {showLabel && (
        <span className="text-sm text-gray-300 capitalize">
          {labelText[type]}
        </span>
      )}
    </div>
  )
}
