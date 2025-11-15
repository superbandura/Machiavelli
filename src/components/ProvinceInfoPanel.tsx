import { useState } from 'react'
import { Unit, Player, Game } from '@/types'
import { UnitIconWithLabel } from './UnitIcon'
import { getProvinceInfo } from '@/utils/gameMapHelpers'
import UnitCompositionTooltip from './UnitCompositionTooltip'
import { createUnit } from '@/utils/unitOperations'
import { UNIT_CREATION_COSTS } from '@/data/recruitmentCosts'

interface ProvinceInfoPanelProps {
  game: Game
  provinceId: string | null
  visibleUnits: Unit[]
  players: Player[]
  currentPlayer: Player | null
  controlledProvinces: string[]
  provinceFaction?: Record<string, string>
  onUnitClick?: (unit: Unit) => void
}

export default function ProvinceInfoPanel({
  game,
  provinceId,
  visibleUnits,
  players,
  currentPlayer,
  controlledProvinces,
  provinceFaction = {},
  onUnitClick
}: ProvinceInfoPanelProps) {
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [unitName, setUnitName] = useState('')
  const [showNameInput, setShowNameInput] = useState<'army' | 'fleet' | 'garrison' | null>(null)

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

  const provinceInfo = getProvinceInfo(game.map, provinceId)
  const unitsInProvince = visibleUnits.filter(u => u.currentPosition === provinceId)
  const myUnits = unitsInProvince.filter(u => u.owner === currentPlayer?.id)
  const otherUnits = unitsInProvince.filter(u => u.owner !== currentPlayer?.id)
  const isControlled = controlledProvinces.includes(provinceId)
  const controller = provinceFaction[provinceId]

  // Verificar si el jugador controla esta provincia según el mapa del juego
  const isControlledByMe = provinceInfo?.controlledBy === currentPlayer?.faction

  // Condiciones para crear unidades (solo requieren control de provincia según mapa)
  const canCreateGarrison = game.currentPhase === 'orders' && isControlledByMe
  const canCreateArmy = game.currentPhase === 'orders' && provinceInfo?.hasCity && isControlledByMe
  const canCreateFleet = game.currentPhase === 'orders' && provinceInfo?.isPort && isControlledByMe

  const handleCreateUnit = async (unitType: 'army' | 'fleet' | 'garrison') => {
    if (!currentPlayer || !provinceId) return

    try {
      setCreatingUnit(true)

      // Nombre por defecto para guarnición: "Guarnición de [nombre provincia]"
      const defaultName = unitType === 'garrison'
        ? `Guarnición de ${provinceInfo?.name || provinceId}`
        : undefined

      await createUnit(
        game.id,
        currentPlayer.id,
        provinceId,
        unitType,
        unitName.trim() || defaultName
      )
      setUnitName('')
      setShowNameInput(null)

      const unitLabel = unitType === 'army' ? 'Ejército' : unitType === 'fleet' ? 'Flota' : 'Guarnición'
      alert(`✓ ${unitLabel} creado exitosamente`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setCreatingUnit(false)
    }
  }

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

        {/* Botones de creación de unidades */}
        {(canCreateGarrison || canCreateArmy || canCreateFleet) && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-sm font-semibold text-gray-400 mb-2">
              Crear Unidad
            </div>

            {/* Formulario de creación */}
            {showNameInput ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder={`Nombre ${showNameInput === 'army' ? 'del ejército' : showNameInput === 'fleet' ? 'de la flota' : 'de la guarnición'} (opcional)`}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  maxLength={50}
                  disabled={creatingUnit}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCreateUnit(showNameInput)}
                    disabled={creatingUnit}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                  >
                    {creatingUnit ? 'Creando...' : `Crear (${UNIT_CREATION_COSTS[showNameInput]}d)`}
                  </button>
                  <button
                    onClick={() => {
                      setShowNameInput(null)
                      setUnitName('')
                    }}
                    disabled={creatingUnit}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Botón de Guarnición - Siempre visible */}
                {canCreateGarrison && (
                  <button
                    onClick={() => setShowNameInput('garrison')}
                    className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <span>🏰</span>
                    <span>Guarnición ({UNIT_CREATION_COSTS.garrison}d)</span>
                  </button>
                )}

                {/* Botones de Ejército y Flota en la misma fila */}
                {(canCreateArmy || canCreateFleet) && (
                  <div className="flex gap-2">
                    {canCreateArmy && (
                      <button
                        onClick={() => setShowNameInput('army')}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🗡️</span>
                        <span>Ejército ({UNIT_CREATION_COSTS.army}d)</span>
                      </button>
                    )}
                    {canCreateFleet && (
                      <button
                        onClick={() => setShowNameInput('fleet')}
                        className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                      >
                        <span>⛵</span>
                        <span>Flota ({UNIT_CREATION_COSTS.fleet}d)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500 italic">
              Las unidades se crean vacías. Haz click en ellas para reclutar tropas.
            </div>
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
                  onClick={() => onUnitClick?.(unit)}
                  className="flex items-center justify-between gap-2 ml-2 p-2 rounded hover:bg-gray-700 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 text-gray-300">
                    {unit.composition ? (
                      <UnitCompositionTooltip composition={unit.composition}>
                        <div className="flex items-center gap-2">
                          <UnitIconWithLabel type={unit.type} size="sm" />
                          {unit.name && (
                            <span className="text-sm font-medium text-gray-200">
                              {unit.name}
                            </span>
                          )}
                        </div>
                      </UnitCompositionTooltip>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UnitIconWithLabel type={unit.type} size="sm" />
                        {unit.name && (
                          <span className="text-sm font-medium text-gray-200">
                            {unit.name}
                          </span>
                        )}
                      </div>
                    )}
                    {unit.status === 'besieged' && (
                      <span className="text-xs text-red-400">(Asediada)</span>
                    )}
                    {unit.siegeTurns > 0 && (
                      <span className="text-xs text-orange-400">
                        (Asedio {unit.siegeTurns}/3)
                      </span>
                    )}
                  </div>
                  {game.currentPhase === 'orders' && (
                    <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      ⚙️ Gestionar
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
                    {unit.composition ? (
                      <UnitCompositionTooltip composition={unit.composition}>
                        <div className="flex items-center gap-2">
                          <UnitIconWithLabel type={unit.type} size="sm" />
                          {unit.name && (
                            <span className="text-sm font-medium text-gray-200">
                              {unit.name}
                            </span>
                          )}
                        </div>
                      </UnitCompositionTooltip>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UnitIconWithLabel type={unit.type} size="sm" />
                        {unit.name && (
                          <span className="text-sm font-medium text-gray-200">
                            {unit.name}
                          </span>
                        )}
                      </div>
                    )}
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
