import { Unit, Player } from '@/types'
import { UnitIconWithLabel } from './UnitIcon'
import { getProvinceInfo } from '@/utils/provinceHelpers'

interface ProvinceInfoPanelProps {
  provinceId: string | null
  visibleUnits: Unit[]
  players: Player[]
  currentPlayer: Player | null
  controlledProvinces: string[]
  provinceFaction?: Record<string, string>
}

export default function ProvinceInfoPanel({
  provinceId,
  visibleUnits,
  players,
  currentPlayer,
  controlledProvinces,
  provinceFaction = {}
}: ProvinceInfoPanelProps) {
  if (!provinceId) {
    return (
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-bold mb-2 text-gray-400">Información de Provincia</h3>
        <div className="text-gray-500 text-sm italic">
          Haz click en una provincia del mapa para ver información
        </div>
      </div>
    )
  }

  const provinceInfo = getProvinceInfo(provinceId)
  const unitsInProvince = visibleUnits.filter(u => u.currentPosition === provinceId)
  const myUnits = unitsInProvince.filter(u => u.owner === currentPlayer?.id)
  const otherUnits = unitsInProvince.filter(u => u.owner !== currentPlayer?.id)
  const isControlled = controlledProvinces.includes(provinceId)
  const controller = provinceFaction[provinceId]

  return (
    <div className="p-4 border-b border-gray-700">
      <h3 className="font-bold mb-3 text-gray-400">Información de Provincia</h3>

      {/* Nombre y tipo de provincia */}
      <div className="space-y-3">
        <div>
          <div className="font-bold text-green-400 text-lg mb-1">
            {provinceInfo?.name || provinceId}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="capitalize">{provinceInfo?.type || 'Desconocido'}</span>
            {provinceInfo?.hasCity && (
              <>
                <span>•</span>
                <span className="text-yellow-400">Ciudad</span>
              </>
            )}
            {provinceInfo?.isPort && (
              <>
                <span>•</span>
                <span className="text-blue-400">Puerto</span>
              </>
            )}
          </div>
        </div>

        {/* Controlador */}
        {controller && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Controlada por:</span>
            <span className="font-semibold text-sm">{controller}</span>
          </div>
        )}

        {/* Ingreso (si tiene ciudad) */}
        {provinceInfo?.hasCity && provinceInfo?.income && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Ingreso:</span>
            <span className="text-yellow-400 font-semibold text-sm">
              {provinceInfo.income} ducados
            </span>
          </div>
        )}

        {/* Divisor */}
        {unitsInProvince.length > 0 && (
          <div className="border-t border-gray-700 pt-3 mt-3" />
        )}

        {/* Mis unidades */}
        {myUnits.length > 0 && (
          <div>
            <div className="font-semibold text-blue-400 text-sm mb-2">
              Tus unidades ({myUnits.length})
            </div>
            <div className="space-y-2">
              {myUnits.map(unit => (
                <div
                  key={unit.id}
                  className="flex items-center gap-2 ml-2 text-gray-300"
                >
                  <UnitIconWithLabel type={unit.type} size="sm" />
                  {unit.status === 'besieged' && (
                    <span className="text-xs text-red-400">(Asediada)</span>
                  )}
                  {unit.siegeTurns > 0 && (
                    <span className="text-xs text-orange-400">
                      (Asedio {unit.siegeTurns}/3)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Otras unidades visibles */}
        {isControlled && otherUnits.length > 0 && (
          <div>
            <div className="font-semibold text-yellow-400 text-sm mb-2">
              Otras unidades visibles ({otherUnits.length})
            </div>
            <div className="space-y-2">
              {otherUnits.map(unit => {
                const ownerPlayer = players.find(p => p.id === unit.owner)
                return (
                  <div
                    key={unit.id}
                    className="flex items-center gap-2 ml-2 text-gray-300"
                  >
                    <UnitIconWithLabel type={unit.type} size="sm" />
                    {ownerPlayer && (
                      <span className="text-xs text-gray-400">
                        ({ownerPlayer.faction})
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Mensaje si no hay unidades visibles */}
        {unitsInProvince.length === 0 && (
          <div className="text-gray-500 text-sm italic">
            No hay unidades visibles en esta provincia
          </div>
        )}

        {/* Indicador de territorio controlado */}
        {isControlled && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center gap-2 text-green-400 text-xs">
              <span>✓</span>
              <span>Territorio controlado (tienes visibilidad)</span>
            </div>
          </div>
        )}

        {/* Advertencia si no es territorio controlado y hay unidades */}
        {!isControlled && myUnits.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center gap-2 text-orange-400 text-xs">
              <span>⚠</span>
              <span>Sin visibilidad de unidades enemigas</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
