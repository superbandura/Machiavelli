import { useState } from 'react'
import type { MilitaryCampaign, Unit, TacticalFormation } from '@/types/game'
import type { ArmyTroopType } from '@/types/scenario'
import { calculateAvailableTroops, calculateUnassignedTroops, calculateEmbarkedTroops } from '@/utils/formationHelpers'
import { ARMY_TROOP_TYPES } from '@/data/unitTypes'

interface TroopPoolSummaryProps {
  campaign: MilitaryCampaign
  units: Unit[]
  formations: TacticalFormation[]
  onQuickCreate?: (troopType: ArmyTroopType, faction: string) => void
  currentPlayerFaction: string // Facción del jugador actual para filtrar botón de creación
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

export function TroopPoolSummary({ campaign, units, formations, onQuickCreate, currentPlayerFaction }: TroopPoolSummaryProps) {
  const [hoveredPool, setHoveredPool] = useState<string | null>(null)

  // Validación defensiva: retornar null si campaign no existe
  if (!campaign) {
    return null
  }

  // Calcular tropas normales (de ejércitos)
  const normalTroops = calculateAvailableTroops(campaign, units)

  // Calcular tropas embarcadas (de flotas)
  const embarkedTroops = calculateEmbarkedTroops(campaign, units)

  // Combinar ambos pools
  const availableTroops = { ...normalTroops }
  for (const [key, embarkedPool] of Object.entries(embarkedTroops)) {
    if (availableTroops[key]) {
      // Si ya existe este tipo de tropa, sumar las embarcadas
      availableTroops[key].total += embarkedPool.total
    } else {
      // Si no existe, añadir el pool de tropas embarcadas
      availableTroops[key] = embarkedPool
    }
  }

  const unassignedTroops = calculateUnassignedTroops(availableTroops, formations)

  // Convertir a array y ordenar por tipo de tropa
  const troopPools = Object.values(availableTroops).sort((a, b) => {
    const order: Record<string, number> = {
      militia: 1,
      lancers: 2,
      pikemen: 3,
      archers: 4,
      crossbowmen: 5,
      lightCavalry: 6,
      heavyCavalry: 7
    }
    return (order[a.type] || 99) - (order[b.type] || 99)
  })

  if (troopPools.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
        <p className="text-amber-800">
          No hay tropas terrestres disponibles en esta campaña.
        </p>
        <p className="text-sm text-amber-600 mt-1">
          Solo se pueden crear formaciones con ejércitos que tengan tropas terrestres.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 relative">
        {troopPools.map((pool) => {
          const troopInfo = ARMY_TROOP_TYPES[pool.type]
          const available = unassignedTroops[pool.key] || 0
          const assigned = pool.total - available
          const isHovered = hoveredPool === pool.key

          return (
            <div
              key={pool.key}
              className={`relative border-2 border-[#b4a481] rounded-lg p-3 bg-[#d4c4a1] hover:shadow-lg transition-all cursor-pointer ${
                available === 0 ? 'opacity-50 grayscale' : ''
              }`}
              onMouseEnter={() => setHoveredPool(pool.key)}
              onMouseLeave={() => setHoveredPool(null)}
            >
              {/* Nombre del tipo de tropa (arriba) */}
              <h5 className="text-center font-heading font-semibold text-[#2d1810] text-xs mb-2 truncate">
                {troopInfo.name}
              </h5>

              {/* Icono de tropa (centrado, grande) */}
              <img
                src={`/icons/${getTroopIconFilename(pool.type)}`}
                alt={troopInfo.name}
                className="w-16 h-16 object-contain mx-auto mb-2"
                onError={(e) => {
                  // Fallback si no carga la imagen
                  e.currentTarget.style.display = 'none'
                }}
              />

              {/* Número disponible (grande, centrado) */}
              <div className={`text-center text-2xl font-bold ${
                available > 0 ? 'text-[#2d1810]' : 'text-[#6b5d42]'
              }`}>
                {available}
              </div>

              {/* Botón de creación rápida (esquina inferior izquierda) */}
              {/* Solo mostrar si es la facción del jugador actual */}
              {onQuickCreate && available > 0 && pool.faction === currentPlayerFaction.toLowerCase() && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onQuickCreate(pool.type, pool.faction)
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
                src={`/factions/${pool.faction.toLowerCase()}.png`}
                alt={pool.faction}
                className="absolute bottom-2 right-2 w-6 h-6 object-contain opacity-75"
                onError={(e) => {
                  // Fallback si no carga el emblema
                  e.currentTarget.style.display = 'none'
                }}
              />

              {/* Badge de agotadas (opcional, solo si están todas asignadas) */}
              {available === 0 && pool.total > 0 && (
                <div className="absolute top-1 right-1 bg-[#d4a574] text-[#2d1810] text-[10px] font-bold px-1.5 py-0.5 rounded">
                  AGOTADO
                </div>
              )}

              {/* Tooltip personalizado con estilo del juego */}
              {isHovered && (
                <div className="absolute z-[9999] top-full left-1/2 transform -translate-x-1/2 mt-2 pointer-events-none">
                  <div className="bg-[#2d2416] border-2 border-[#6b5d42] rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.6)] px-4 py-3 min-w-[220px]">
                    {/* Header del tooltip */}
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#6b5d42]">
                      <img
                        src={`/icons/${getTroopIconFilename(pool.type)}`}
                        alt=""
                        className="w-6 h-6 object-contain"
                      />
                      <div className="flex-1">
                        <h5 className="font-heading font-semibold text-[#f0d877] text-sm">
                          {troopInfo.name}
                        </h5>
                        <p className="text-[#b4a481] text-xs capitalize">
                          {pool.faction}
                        </p>
                      </div>
                      <img
                        src={`/factions/${pool.faction.toLowerCase()}.png`}
                        alt=""
                        className="w-6 h-6 object-contain"
                      />
                    </div>

                    {/* Estadísticas */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#b4a481]">Total:</span>
                        <span className="font-heading font-semibold text-[#e8dcc0]">
                          {pool.total}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#b4a481]">Disponibles:</span>
                        <span className={`font-heading font-semibold ${
                          available > 0 ? 'text-[#8bc34a]' : 'text-[#6b5d42]'
                        }`}>
                          {available}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#b4a481]">Asignadas:</span>
                        <span className="font-heading font-semibold text-[#64b5f6]">
                          {assigned}
                        </span>
                      </div>
                    </div>

                    {/* Barra de progreso decorativa */}
                    {pool.total > 0 && (
                      <div className="mt-3 pt-2 border-t border-[#6b5d42]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[#1a1410] rounded-full overflow-hidden border border-[#6b5d42]">
                            <div
                              className="h-full bg-gradient-to-r from-[#64b5f6] to-[#42a5f5] transition-all duration-300"
                              style={{ width: `${(assigned / pool.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-[#f0d877] text-xs font-heading font-semibold min-w-[35px] text-right">
                            {((assigned / pool.total) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Flecha del tooltip apuntando hacia arriba */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-[1px]">
                      <div className="border-8 border-transparent border-b-[#6b5d42]"></div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[14px]">
                        <div className="border-[6px] border-transparent border-b-[#2d2416]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}
