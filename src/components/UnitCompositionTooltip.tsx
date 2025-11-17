import { ReactNode } from 'react'
import type { ArmyComposition, GarrisonComposition, FleetComposition } from '@/types/scenario'

interface UnitCompositionTooltipProps {
  composition: ArmyComposition | GarrisonComposition | FleetComposition
  children: ReactNode
}

// Traducciones para tipos de tropas
const TROOP_LABELS: Record<string, string> = {
  militia: 'Milicia',
  lancers: 'Lanceros',
  pikemen: 'Piqueros',
  archers: 'Arqueros',
  crossbowmen: 'Ballesteros',
  lightCavalry: 'Caballería Ligera',
  heavyCavalry: 'Caballería Pesada',
  galley: 'Galeras',
  cog: 'Cocas'
}

function isArmyComposition(comp: ArmyComposition | GarrisonComposition | FleetComposition): comp is ArmyComposition {
  return 'troops' in comp && ('lightCavalry' in comp.troops || 'heavyCavalry' in comp.troops)
}

function isGarrisonComposition(comp: ArmyComposition | GarrisonComposition | FleetComposition): comp is GarrisonComposition {
  return 'troops' in comp && !('lightCavalry' in comp.troops) && !('heavyCavalry' in comp.troops)
}

function isFleetComposition(comp: ArmyComposition | GarrisonComposition | FleetComposition): comp is FleetComposition {
  return 'ships' in comp
}

export default function UnitCompositionTooltip({ composition, children }: UnitCompositionTooltipProps) {
  const renderComposition = () => {
    if (isFleetComposition(composition)) {
      // Flota
      const ships = Object.entries(composition.ships).filter(([_, count]) => count > 0)
      if (ships.length === 0) return <div className="text-gray-400 text-xs">Sin naves</div>

      return (
        <div className="space-y-1">
          {ships.map(([type, count]) => (
            <div key={type} className="flex justify-between gap-3 text-xs">
              <span className="text-[#9db4c7] font-serif">{TROOP_LABELS[type] || type}</span>
              <span className="text-[#f0d877] font-heading font-semibold">{count}</span>
            </div>
          ))}
        </div>
      )
    } else {
      // Ejército o Guarnición
      const troops = Object.entries(composition.troops).filter(([_, count]) => count > 0)
      if (troops.length === 0) return <div className="text-gray-400 text-xs">Sin tropas</div>

      return (
        <div className="space-y-1">
          {troops.map(([type, count]) => (
            <div key={type} className="flex justify-between gap-3 text-xs">
              <span className="text-[#c4b491] font-serif">{TROOP_LABELS[type] || type}</span>
              <span className="text-[#f0d877] font-heading font-semibold">{count}</span>
            </div>
          ))}
        </div>
      )
    }
  }

  const getTotalCount = () => {
    if (isFleetComposition(composition)) {
      return Object.values(composition.ships).reduce((sum, count) => sum + count, 0)
    } else {
      return Object.values(composition.troops).reduce((sum, count) => sum + count, 0)
    }
  }

  return (
    <div className="group relative inline-block">
      {children}

      {/* Tooltip */}
      <div className="absolute left-0 top-full mt-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
        <div className="bg-[#2d2416] border-2 border-[#d4af37] rounded-lg shadow-ornate p-3 min-w-[180px]">
          <div className="font-heading font-semibold text-sm text-[#f0d877] mb-2 border-b border-[#b4a481] pb-1">
            {composition.name}
          </div>
          {renderComposition()}
          <div className="mt-2 pt-2 border-t border-[#b4a481] text-xs font-serif text-[#f0d877]">
            Total: {getTotalCount()} {isFleetComposition(composition) ? 'naves' : 'tropas'}
          </div>
        </div>
      </div>
    </div>
  )
}
