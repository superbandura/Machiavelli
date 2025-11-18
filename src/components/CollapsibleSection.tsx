import { ReactNode, useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  icon?: string
  children: ReactNode
  defaultExpanded?: boolean
  className?: string
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultExpanded = false,
  className = ''
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Detectar si el icono es una ruta de imagen o un emoji
  const isImagePath = icon?.includes('.png') || icon?.includes('.jpg') || icon?.includes('.svg')

  return (
    <div className={`border-b border-[#b4a481] ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-[#c4b49a] to-[#d4c4a1] hover:from-[#b4a48a] hover:to-[#c4b49a] transition-colors border-b border-[#a49471]"
      >
        <div className="flex items-center gap-3 font-serif text-[#2d1810]">
          {icon && (
            isImagePath ? (
              <img
                src={icon}
                alt={title}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="text-3xl">{icon}</span>
            )
          )}
          <span className="font-semibold text-base">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-[#2d1810] transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div
        className={`transition-all duration-200 overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 bg-[#d4c4a1]">
          {children}
        </div>
      </div>
    </div>
  )
}
