import { Unit } from '@/types'

interface UnitIconProps {
  type: Unit['type']
  size?: 'sm' | 'md' | 'lg'
  className?: string
  bordered?: boolean
  hasEmbarkedTroops?: boolean // Nuevo: indica si tiene tropas embarcadas
}

/**
 * Componente para mostrar iconos de unidades con imágenes PNG
 * Tamaños:
 * - sm: 16px (para listas compactas)
 * - md: 24px (por defecto, para panels)
 * - lg: 32px (para destacar)
 */
export default function UnitIcon({ type, size = 'md', className = '', bordered = false, hasEmbarkedTroops = false }: UnitIconProps) {
  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-14 h-14',
    lg: 'w-14 h-14'
  }

  const iconConfig = {
    army: {
      icon: '/icons/ejercito.png',
      label: 'Ejército'
    },
    fleet: {
      icon: '/icons/flota.png',
      label: 'Flota'
    },
    garrison: {
      icon: '/icons/guarnicion.png',
      label: 'Guarnición'
    }
  }

  const config = iconConfig[type]
  const sizeClass = sizeClasses[size]

  // Determinar el estilo del borde
  // Solo flotas con tropas embarcadas tienen borde rojo
  const borderClass = hasEmbarkedTroops && type === 'fleet'
    ? 'border-4 border-red-500 rounded p-0.5'
    : ''

  return (
    <div
      className={`
        ${sizeClass}
        inline-flex items-center justify-center
        ${borderClass}
        ${className}
      `}
      title={config.label}
    >
      <img
        src={config.icon}
        alt={config.label}
        className="w-full h-full object-contain"
      />
    </div>
  )
}

/**
 * Variante de texto con icono y label
 */
interface UnitIconWithLabelProps extends UnitIconProps {
  showLabel?: boolean
}

export function UnitIconWithLabel({ type, size = 'md', showLabel = true, className = '', bordered = false, hasEmbarkedTroops = false }: UnitIconWithLabelProps) {
  const labelText = {
    army: 'Ejército',
    fleet: 'Flota',
    garrison: 'Guarnición'
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <UnitIcon type={type} size={size} bordered={bordered} hasEmbarkedTroops={hasEmbarkedTroops} />
      {showLabel && (
        <span className="text-sm text-gray-300 capitalize">
          {labelText[type]}
        </span>
      )}
    </div>
  )
}
