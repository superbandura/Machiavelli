import { useState } from 'react'
import type { MilitaryCampaign, Unit } from '@/types/game'
import type { FleetShipType } from '@/types/scenario'
import { calculateAvailableShips } from '@/utils/formationHelpers'
import { FLEET_SHIP_TYPES } from '@/data/unitTypes'

interface ShipPoolSummaryProps {
  campaign: MilitaryCampaign
  units: Unit[]
}

/**
 * Mapea tipos de naves a nombres de archivos de iconos
 */
function getShipIconFilename(type: FleetShipType): string {
  const mapping: Record<FleetShipType, string> = {
    galley: 'galera.png',
    cog: 'coca.png'
  }
  return mapping[type]
}

export function ShipPoolSummary({ campaign, units }: ShipPoolSummaryProps) {
  const [hoveredPool, setHoveredPool] = useState<string | null>(null)

  // Validación defensiva: retornar null si campaign no existe
  if (!campaign) {
    console.log('[ShipPoolSummary] ⚠️ No hay campaña')
    return null
  }

  console.log('[ShipPoolSummary] 📊 Renderizando con:', {
    campaignId: campaign.id,
    campaignFleetPool: campaign.fleetPool,
    unitsCount: units.length
  })

  const availableShips = calculateAvailableShips(campaign, units)

  console.log('[ShipPoolSummary] 🚢 availableShips:', availableShips)

  // Convertir a array y ordenar por tipo de nave
  const shipPools = Object.values(availableShips).sort((a, b) => {
    const order: Record<string, number> = {
      galley: 1,
      cog: 2
    }
    return (order[a.type] || 99) - (order[b.type] || 99)
  })

  console.log('[ShipPoolSummary] 📦 shipPools array:', {
    count: shipPools.length,
    pools: shipPools
  })

  if (shipPools.length === 0) {
    console.log('[ShipPoolSummary] ⚠️ No hay barcos para mostrar')
    return null // No mostrar nada si no hay naves
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 relative">
        {shipPools.map((pool) => {
          const shipInfo = FLEET_SHIP_TYPES[pool.type]
          const isHovered = hoveredPool === pool.key

          return (
            <div
              key={pool.key}
              className="relative border-2 border-[#b4a481] rounded-lg p-3 bg-[#d4c4a1] hover:shadow-lg transition-all"
              onMouseEnter={() => setHoveredPool(pool.key)}
              onMouseLeave={() => setHoveredPool(null)}
            >
              {/* Nombre del tipo de nave (arriba) */}
              <h5 className="text-center font-heading font-semibold text-[#2d1810] text-xs mb-2 truncate">
                {shipInfo.name}
              </h5>

              {/* Icono de nave (centrado, grande) */}
              <img
                src={`/icons/${getShipIconFilename(pool.type)}`}
                alt={shipInfo.name}
                className="w-16 h-16 object-contain mx-auto mb-2"
                onError={(e) => {
                  // Fallback si no carga la imagen
                  e.currentTarget.style.display = 'none'
                }}
              />

              {/* Número total (grande, centrado) */}
              <div className="text-center text-2xl font-bold text-[#2d1810]">
                {pool.total}
              </div>

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

              {/* Tooltip personalizado con estilo del juego */}
              {isHovered && (
                <div className="absolute z-[9999] top-full left-1/2 transform -translate-x-1/2 mt-2 pointer-events-none">
                  <div className="bg-[#2d2416] border-2 border-[#6b5d42] rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.6)] px-4 py-3 min-w-[220px]">
                    {/* Header del tooltip */}
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#6b5d42]">
                      <img
                        src={`/icons/${getShipIconFilename(pool.type)}`}
                        alt=""
                        className="w-6 h-6 object-contain"
                      />
                      <div className="flex-1">
                        <h5 className="font-heading font-semibold text-[#f0d877] text-sm">
                          {shipInfo.name}
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
                        <span className="text-[#b4a481]">Total en campaña:</span>
                        <span className="font-heading font-semibold text-[#e8dcc0]">
                          {pool.total}
                        </span>
                      </div>
                    </div>

                    {/* Nota informativa */}
                    <div className="mt-3 pt-2 border-t border-[#6b5d42]">
                      <p className="text-xs text-[#b4a481] italic">
                        Las naves no forman formaciones tácticas
                      </p>
                    </div>

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
