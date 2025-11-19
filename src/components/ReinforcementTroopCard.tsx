import type { ArmyTroopType } from '@/types/scenario'
import { ARMY_TROOP_TYPES } from '@/data/unitTypes'

interface ReinforcementTroopCardProps {
  troopType: ArmyTroopType
  quantity: number
  faction: string
  daysUntilArrival: number
  onQuickCreate?: (troopType: ArmyTroopType, faction: string) => void
}

/**
 * Mapea tipos de tropas a nombres de archivos de iconos
 */
function getTroopIconFilename(type: ArmyTroopType): string {
  const mapping: Record<ArmyTroopType, string> = {
    militia: 'milicia.png',
    lancers: 'lancero.png',
    pikemen: 'piquero.png',
    archers: 'arquero.png',
    crossbowmen: 'ballestero.png',
    lightCavalry: 'caballeria_ligera.png',
    heavyCavalry: 'caballeria_pesada.png'
  }
  return mapping[type]
}

export function ReinforcementTroopCard({
  troopType,
  quantity,
  faction,
  daysUntilArrival,
  onQuickCreate
}: ReinforcementTroopCardProps) {
  const troopInfo = ARMY_TROOP_TYPES[troopType]
  const hasArrived = daysUntilArrival <= 0

  return (
    <div className="relative border-2 border-[#b4a481] rounded-lg p-3 bg-[#d4c4a1] shadow-md">
      {/* Badge "R" roja en esquina superior izquierda */}
      <div className="absolute -top-2 -left-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10">
        <span className="text-white font-bold text-sm">R</span>
      </div>

      {/* Nombre del tipo de tropa (arriba) */}
      <h5 className="text-center font-heading font-semibold text-[#2d1810] text-xs mb-2 truncate">
        {troopInfo.name}
      </h5>

      {/* Icono de tropa (centrado, grande) */}
      <img
        src={`/icons/${getTroopIconFilename(troopType)}`}
        alt={troopInfo.name}
        className="w-16 h-16 object-contain mx-auto mb-2"
        onError={(e) => {
          // Fallback si no carga la imagen
          e.currentTarget.style.display = 'none'
        }}
      />

      {/* Número disponible (grande, centrado) */}
      <div className="text-center text-2xl font-bold text-[#2d1810] mb-2">
        {quantity}
      </div>

      {/* Días hasta llegada */}
      <div className="text-center mb-2">
        <span className="inline-block px-2 py-0.5 bg-amber-100 border border-amber-600 rounded text-[10px] font-semibold text-amber-800">
          {daysUntilArrival}d
        </span>
      </div>

      {/* Botón de creación rápida (esquina inferior izquierda) */}
      {onQuickCreate && quantity > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onQuickCreate(troopType, faction)
          }}
          className="absolute bottom-2 left-2 w-6 h-6 opacity-60 hover:opacity-100 transition-opacity hover:scale-110"
          title="Crear formación rápida"
        >
          <img
            src="/icons/incremento.png"
            alt="Crear formación"
            className="w-full h-full object-contain"
          />
        </button>
      )}

      {/* Emblema de facción (esquina inferior derecha) */}
      <img
        src={`/factions/${faction.toLowerCase()}.png`}
        alt={faction}
        className="absolute bottom-2 right-2 w-6 h-6 object-contain opacity-75"
        onError={(e) => {
          // Fallback si no carga el emblema
          e.currentTarget.style.display = 'none'
        }}
      />
    </div>
  )
}
