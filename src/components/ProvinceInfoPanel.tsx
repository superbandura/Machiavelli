import { useState, useEffect } from 'react'
import { Unit, Player, Game, Order, MilitaryCampaign } from '@/types'
import { UnitIconWithLabel } from './UnitIcon'
import { getProvinceInfo } from '@/utils/gameMapHelpers'
import UnitCompositionTooltip from './UnitCompositionTooltip'
import { createUnit } from '@/utils/unitOperations'
import { UNIT_CREATION_COSTS } from '@/data/recruitmentCosts'
import OrdersModal from './OrdersModal'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FACTIONS } from '@/data/factions'

interface ProvinceInfoPanelProps {
  game: Game
  provinceId: string | null
  visibleUnits: Unit[]
  players: Player[]
  currentPlayer: Player | null
  controlledProvinces: string[]
  provinceFaction?: Record<string, string>
  campaigns?: MilitaryCampaign[]
  onUnitClick?: (unit: Unit) => void
  onCampaignClick?: (campaign: MilitaryCampaign) => void
}

export default function ProvinceInfoPanel({
  game,
  provinceId,
  visibleUnits,
  players,
  currentPlayer,
  controlledProvinces,
  provinceFaction = {},
  campaigns = [],
  onUnitClick,
  onCampaignClick
}: ProvinceInfoPanelProps) {
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [unitName, setUnitName] = useState('')
  const [showNameInput, setShowNameInput] = useState<'army' | 'fleet' | 'garrison' | null>(null)
  const [selectedUnitForOrders, setSelectedUnitForOrders] = useState<Unit | null>(null)
  const [unitsOrders, setUnitsOrders] = useState<Record<string, Order>>({})

  // Cargar órdenes existentes para todas las unidades del jugador
  useEffect(() => {
    if (!currentPlayer || game.currentPhase !== 'orders') return

    const loadOrders = async () => {
      try {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('gameId', '==', game.id),
          where('playerId', '==', currentPlayer.userId),
          where('turnNumber', '==', game.turnNumber)
        )
        const snapshot = await getDocs(ordersQuery)

        if (!snapshot.empty) {
          const loadedOrders: Record<string, Order> = {}
          snapshot.docs[0].data().orders.forEach((order: Order) => {
            loadedOrders[order.unitId] = order
          })
          setUnitsOrders(loadedOrders)
        }
      } catch (error) {
        console.error('[ProvinceInfoPanel] Error cargando órdenes:', error)
      }
    }

    loadOrders()
  }, [currentPlayer, game.id, game.turnNumber, game.currentPhase])

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

  // Helper para detectar si una unidad está asignada a una campaña
  const getUnitCampaign = (unitId: string): MilitaryCampaign | null => {
    return campaigns.find(c =>
      c.participatingUnits.includes(unitId) &&
      (c.status === 'planning' || c.status === 'active')
    ) || null
  }

  // Helper para convertir nombre de facción a nombre de archivo
  const getFactionImageName = (factionName: string): string => {
    const normalized = factionName.toLowerCase()
    if (normalized.includes('venecia')) return 'venecia'
    if (normalized.includes('milán') || normalized.includes('milan')) return 'milan'
    if (normalized.includes('florencia')) return 'florencia'
    if (normalized.includes('génova') || normalized.includes('genova')) return 'genova'
    if (normalized.includes('pontificios') || normalized.includes('papado')) return 'papado'
    return normalized.replace(/^república de |^ducado de |^reino de |^corona de /i, '').trim()
  }

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
    <div className="p-4 border-b border-[#b4a481]">
      <h3 className="font-bold mb-3 text-gray-800">Información de Provincia</h3>

      {/* Nombre y tipo de provincia */}
      <div className="space-y-3">
        <div>
          {controller && (
            <div className="mb-2 flex justify-center">
              <img
                src={`/factions/${getFactionImageName(controller)}.png`}
                alt={controller}
                title={controller}
                className="w-32 h-32"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="font-bold text-green-800 text-lg mb-1">
            {provinceInfo?.name || provinceId}
          </div>
          <div className="flex items-center gap-2">
            {provinceInfo?.hasCity && (
              <img src="/icons/ciudad.png" alt="Ciudad" className="w-14 h-14" title="Ciudad" />
            )}
            {provinceInfo?.isPort && (
              <img src="/icons/puerto.png" alt="Puerto" className="w-14 h-14" title="Puerto" />
            )}
          </div>
        </div>

        {/* Controlador */}
        {controller && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700 text-sm">Controlada por:</span>
            <span className="font-semibold text-sm text-black">{controller}</span>
          </div>
        )}

        {/* Ingreso (si tiene ciudad) */}
        {provinceInfo?.hasCity && provinceInfo?.income && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700 text-sm">Ingreso:</span>
            <span className="text-amber-700 font-semibold text-sm">
              {provinceInfo.income} ducados
            </span>
          </div>
        )}

        {/* Botones de creación de unidades */}
        {(canCreateGarrison || canCreateArmy || canCreateFleet) && (
          <div className="mt-3 pt-3 border-t border-[#b4a481]">
            <div className="text-sm font-semibold text-gray-800 mb-2">
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
                  className="w-full px-3 py-2 bg-[#f4e4c1] border border-[#b4a481] rounded text-sm text-black placeholder-gray-600 focus:outline-none focus:border-amber-700"
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
              <div className="flex gap-2">
                {/* Botón de Guarnición */}
                {canCreateGarrison && (
                  <button
                    onClick={() => setShowNameInput('garrison')}
                    title={`Guarnición (${UNIT_CREATION_COSTS.garrison}d)`}
                    className="flex-1 p-2 hover:bg-[#c4b491] rounded transition-colors flex items-center justify-center"
                  >
                    <img src="/icons/guarnicion.png" alt="Guarnición" className="w-14 h-14" />
                  </button>
                )}

                {/* Botón de Ejército */}
                {canCreateArmy && (
                  <button
                    onClick={() => setShowNameInput('army')}
                    title={`Ejército (${UNIT_CREATION_COSTS.army}d)`}
                    className="flex-1 p-2 hover:bg-[#c4b491] rounded transition-colors flex items-center justify-center"
                  >
                    <img src="/icons/ejercito.png" alt="Ejército" className="w-14 h-14" />
                  </button>
                )}

                {/* Botón de Flota */}
                {canCreateFleet && (
                  <button
                    onClick={() => setShowNameInput('fleet')}
                    title={`Flota (${UNIT_CREATION_COSTS.fleet}d)`}
                    className="flex-1 p-2 hover:bg-[#c4b491] rounded transition-colors flex items-center justify-center"
                  >
                    <img src="/icons/flota.png" alt="Flota" className="w-14 h-14" />
                  </button>
                )}
              </div>
            )}

            <div className="mt-2 text-xs text-gray-700 italic">
              Las unidades se crean vacías. Haz click en ellas para reclutar tropas.
            </div>
          </div>
        )}

        {/* Divisor */}
        {unitsInProvince.length > 0 && (
          <div className="border-t border-[#b4a481] pt-3 mt-3" />
        )}

        {/* Mis unidades */}
        {myUnits.length > 0 && (
          <div>
            <div className="font-semibold text-blue-800 text-sm mb-2">
              Tus unidades ({myUnits.length})
            </div>
            <div className="space-y-2">
              {myUnits.map(unit => {
                const unitOrder = unitsOrders[unit.id]
                const unitCampaign = getUnitCampaign(unit.id)

                const getOrderText = () => {
                  if (!unitOrder) return 'Sin órdenes'
                  const actionLabels: Record<string, string> = {
                    hold: 'Hold',
                    move: `Move → ${game.map?.provinces?.[unitOrder.targetProvince || '']?.name || unitOrder.targetProvince}`,
                    support: `Support unidad`,
                    convoy: `Convoy`,
                    besiege: `Siege`,
                    convert: `Convert`
                  }
                  return actionLabels[unitOrder.action] || unitOrder.action
                }

                // Verificar si tiene tropas embarcadas
                const hasEmbarkedTroops = unit.type === 'fleet' && unit.embarkedTroops &&
                  Object.values(unit.embarkedTroops.troops).some(count => (count || 0) > 0)

                // Si está en campaña, obtener info de la provincia destino
                const targetProvinceInfo = unitCampaign ? getProvinceInfo(game.map, unitCampaign.targetProvince) : null
                // Si la provincia no tiene controlador, usar 'neutral' por defecto
                const targetFactionId = unitCampaign
                  ? (provinceFaction[unitCampaign.targetProvince] || 'neutral')
                  : null

                return (
                  <div
                    key={unit.id}
                    className="flex items-center gap-2 ml-2 p-2 rounded hover:bg-[#c4b491] transition-colors"
                  >
                    <div
                      onClick={() => {
                        if (!unitCampaign) {
                          onUnitClick?.(unit)
                        }
                      }}
                      className={`flex items-center gap-2 flex-1 ${unitCampaign ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {unit.composition ? (
                        <UnitCompositionTooltip
                          composition={unit.composition}
                          embarkedTroops={unit.embarkedTroops?.troops}
                        >
                          <div className={`flex items-center gap-2 ${unitCampaign ? 'opacity-50' : ''}`}>
                            <UnitIconWithLabel
                              type={unit.type}
                              size="sm"
                              showLabel={false}
                              hasEmbarkedTroops={hasEmbarkedTroops}
                            />
                            <div className="flex flex-col">
                              {unit.name && (
                                <span className="text-sm font-medium text-black">
                                  {unit.name}
                                </span>
                              )}
                              {/* Indicador de campaña */}
                              {unitCampaign && targetProvinceInfo && (
                                <div className="flex items-center gap-1">
                                  <span className="text-red-600 font-bold text-xs">→</span>
                                  {targetFactionId && (
                                    <img
                                      src={`/factions/${getFactionImageName(targetFactionId)}.png`}
                                      alt={targetFactionId}
                                      className="w-3 h-3 object-contain"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  )}
                                  <span className="text-xs text-[#8b7355] font-medium">
                                    {targetProvinceInfo.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </UnitCompositionTooltip>
                      ) : (
                        <div className={`flex items-center gap-2 ${unitCampaign ? 'opacity-50' : ''}`}>
                          <UnitIconWithLabel
                            type={unit.type}
                            size="sm"
                            showLabel={false}
                            hasEmbarkedTroops={hasEmbarkedTroops}
                          />
                          <div className="flex flex-col">
                            {unit.name && (
                              <span className="text-sm font-medium text-black">
                                {unit.name}
                              </span>
                            )}
                            {/* Indicador de campaña */}
                            {unitCampaign && targetProvinceInfo && (
                              <div className="flex items-center gap-1">
                                <span className="text-red-600 font-bold text-xs">→</span>
                                {targetFactionId && (
                                  <img
                                    src={`/factions/${getFactionImageName(targetFactionId)}.png`}
                                    alt={targetFactionId}
                                    className="w-3 h-3 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                )}
                                <span className="text-xs text-[#8b7355] font-medium">
                                  {targetProvinceInfo.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {unit.status === 'besieged' && (
                        <span className="text-xs text-red-700">(Asediada)</span>
                      )}
                      {unit.siegeTurns > 0 && (
                        <span className="text-xs text-orange-700">
                          (Asedio {unit.siegeTurns}/3)
                        </span>
                      )}
                    </div>

                    {/* Botón de órdenes - solo visible en fase de órdenes */}
                    {game.currentPhase === 'orders' && (
                      <div className="relative group">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedUnitForOrders(unit)
                          }}
                          className={`p-1 hover:bg-[#b4a481] rounded transition-colors border-4 ${
                            unitsOrders[unit.id] ? 'border-green-700' : 'border-red-600'
                          }`}
                        >
                          <img
                            src="/icons/mover.png"
                            alt="Órdenes"
                            className="w-10 h-10 object-contain"
                          />
                        </button>

                        {/* Popup al hacer hover */}
                        <div className="absolute right-0 top-full mt-1 px-3 py-2 bg-[#2d2416] border-2 border-[#d4af37] rounded-lg shadow-ornate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 min-w-max">
                          <div className="text-xs font-heading text-[#f0d877]">
                            {getOrderText()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Otras unidades visibles */}
        {isControlled && otherUnits.length > 0 && (
          <div>
            <div className="font-semibold text-amber-800 text-sm mb-2">
              Otras unidades visibles ({otherUnits.length})
            </div>
            <div className="space-y-2">
              {otherUnits.map(unit => {
                const ownerPlayer = players.find(p => p.id === unit.owner)
                const hasEmbarkedTroops = unit.type === 'fleet' && unit.embarkedTroops &&
                  Object.values(unit.embarkedTroops.troops).some(count => (count || 0) > 0)

                return (
                  <div
                    key={unit.id}
                    className="flex items-center gap-2 ml-2 text-gray-800"
                  >
                    {unit.composition ? (
                      <UnitCompositionTooltip
                        composition={unit.composition}
                        embarkedTroops={unit.embarkedTroops?.troops}
                      >
                        <div className="flex items-center gap-2">
                          <UnitIconWithLabel
                            type={unit.type}
                            size="sm"
                            showLabel={false}
                            hasEmbarkedTroops={hasEmbarkedTroops}
                          />
                          {unit.name && (
                            <span className="text-sm font-medium text-black">
                              {unit.name}
                            </span>
                          )}
                        </div>
                      </UnitCompositionTooltip>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UnitIconWithLabel
                          type={unit.type}
                          size="sm"
                          showLabel={false}
                          hasEmbarkedTroops={hasEmbarkedTroops}
                        />
                        {unit.name && (
                          <span className="text-sm font-medium text-black">
                            {unit.name}
                          </span>
                        )}
                      </div>
                    )}
                    {ownerPlayer && (
                      <span className="text-xs text-gray-700">
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

        {/* Campañas activas sobre esta provincia */}
        {provinceId && campaigns.filter(c => c.targetProvince === provinceId).length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#b4a481]">
            <div className="flex items-center gap-2 mb-2">
              <img
                src="/icons/campañas.png"
                alt="Campañas"
                className="w-5 h-5 object-contain opacity-80"
              />
              <h4 className="font-heading font-semibold text-sm text-[#2d1810]">
                Campañas Activas
              </h4>
            </div>
            <div className="space-y-2">
              {campaigns
                .filter(c => c.targetProvince === provinceId)
                .map(campaign => {
                  const targetProvinceInfo = game.map
                    ? getProvinceInfo(game.map, campaign.targetProvince)
                    : null
                  const attackerFaction = FACTIONS[campaign.declaredByFaction]
                  const isOwn = campaign.declaredBy === currentPlayer?.userId

                  // Obtener facción defensora
                  const defenderFactionName = game.map?.provinces[campaign.targetProvince]?.controlledBy || 'neutral'
                  const defenderFaction = FACTIONS[defenderFactionName]

                  return (
                    <div
                      key={campaign.id}
                      onClick={() => onCampaignClick?.(campaign)}
                      className={`bg-[#d4c4a1] border rounded p-2 cursor-pointer transition-all hover:shadow-md ${
                        isOwn
                          ? 'border-renaissance-gold hover:bg-[#c4b49a]'
                          : 'border-[#b4a481] hover:border-[#8b7355]'
                      }`}
                    >
                      {/* Header compacto con emblemas y objetivo */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {/* Emblema del atacante */}
                          <img
                            src={`/factions/${campaign.declaredByFaction.toLowerCase()}.png`}
                            alt={attackerFaction?.name || campaign.declaredByFaction}
                            title={`Atacante: ${attackerFaction?.name || campaign.declaredByFaction}`}
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent && !parent.querySelector('.fallback-emblem-attacker')) {
                                const fallback = document.createElement('div')
                                fallback.className = 'fallback-emblem-attacker w-4 h-4 rounded-full border border-[#4a3f2a]'
                                fallback.style.backgroundColor = attackerFaction?.color || '#9ca3af'
                                fallback.title = attackerFaction?.name || 'Desconocido'
                                parent.insertBefore(fallback, e.currentTarget)
                              }
                            }}
                          />

                          {/* Flecha */}
                          <span className="text-red-600 text-sm font-bold">→</span>

                          {/* Emblema del defensor */}
                          <img
                            src={`/factions/${defenderFactionName.toLowerCase()}.png`}
                            alt={defenderFaction?.name || defenderFactionName}
                            title={`Defensor: ${defenderFaction?.name || defenderFactionName}`}
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent && !parent.querySelector('.fallback-emblem-defender')) {
                                const fallback = document.createElement('div')
                                fallback.className = 'fallback-emblem-defender w-4 h-4 rounded-full border border-[#4a3f2a]'
                                fallback.style.backgroundColor = defenderFaction?.color || '#9ca3af'
                                fallback.title = defenderFaction?.name || 'Desconocido'
                                parent.insertBefore(fallback, e.currentTarget)
                              }
                            }}
                          />

                          <span className="text-xs font-heading font-semibold text-[#2d1810] truncate">
                            {targetProvinceInfo?.name || campaign.targetProvince}
                          </span>
                        </div>

                        {/* Indicadores */}
                        <div className="flex items-center gap-1">
                          {campaign.route && (
                            <img src="/icons/puerto_mini.png" alt="Anfibia" className="w-3 h-3 object-contain" title="Campaña Anfibia" />
                          )}
                          {isOwn && (
                            <span className="text-xs text-renaissance-gold">★</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

      </div>

      {/* Modal de órdenes */}
      {selectedUnitForOrders && currentPlayer && (
        <OrdersModal
          unit={selectedUnitForOrders}
          game={game}
          currentPlayer={currentPlayer}
          allUnits={visibleUnits}
          onClose={() => {
            setSelectedUnitForOrders(null)
            // Recargar órdenes después de cerrar el modal
            const loadOrders = async () => {
              try {
                const ordersQuery = query(
                  collection(db, 'orders'),
                  where('gameId', '==', game.id),
                  where('playerId', '==', currentPlayer.userId),
                  where('turnNumber', '==', game.turnNumber)
                )
                const snapshot = await getDocs(ordersQuery)
                if (!snapshot.empty) {
                  const loadedOrders: Record<string, Order> = {}
                  snapshot.docs[0].data().orders.forEach((order: Order) => {
                    loadedOrders[order.unitId] = order
                  })
                  setUnitsOrders(loadedOrders)
                }
              } catch (error) {
                console.error('[ProvinceInfoPanel] Error recargando órdenes:', error)
              }
            }
            loadOrders()
          }}
        />
      )}
    </div>
  )
}
