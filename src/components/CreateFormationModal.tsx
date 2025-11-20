import { useState, useEffect, useMemo } from 'react'
import type { MilitaryCampaign, Unit, TacticalFormation, DeploymentZone } from '@/types/game'
import type { ArmyTroopType, ArmyComposition } from '@/types/scenario'
import { ARMY_TROOP_TYPES } from '@/data/unitTypes'
import {
  calculateAvailableTroops,
  calculateEmbarkedTroops,
  calculateUnassignedTroops,
  calculateUnassignedReinforcementTroops,
  validateFormation,
  generateFormationName,
  createFormation,
  getDeploymentZoneLabel,
  getAvailableStrategicOrders,
  getAvailableTacticalOrders,
  getStrategicOrderLabel,
  getTacticalOrderLabel
} from '@/utils/formationHelpers'

interface CreateFormationModalProps {
  campaign: MilitaryCampaign
  units: Unit[]
  existingFormations: TacticalFormation[]
  onClose: () => void
  onCreate: (formation: TacticalFormation) => Promise<void>
  initialTroopType?: ArmyTroopType
  initialFaction?: string
  isReinforcement?: boolean
  reinforcementId?: string
  estimatedArrivalDay?: number
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

export default function CreateFormationModal({
  campaign,
  units,
  existingFormations,
  onClose,
  onCreate,
  initialTroopType,
  initialFaction,
  isReinforcement,
  reinforcementId,
  estimatedArrivalDay
}: CreateFormationModalProps) {
  const [troopType, setTroopType] = useState<ArmyTroopType | ''>(initialTroopType || '')
  const [faction, setFaction] = useState<string>(initialFaction || '')
  const [quantity, setQuantity] = useState<number>(0)
  const [customName, setCustomName] = useState<string>('')
  const [useCustomName, setUseCustomName] = useState<boolean>(false)
  const [deploymentZone, setDeploymentZone] = useState<DeploymentZone>('center')
  const [strategicOrder, setStrategicOrder] = useState<TacticalFormation['strategicOrder']>('none')
  const [tacticalOrder, setTacticalOrder] = useState<TacticalFormation['tacticalOrder']>('none')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calcular tropas disponibles (condicional: refuerzo vs normal)
  const maxAvailable = useMemo(() => {
    if (!troopType || !faction) return 0

    // MODO REFUERZO: calcular solo para el refuerzo específico
    if (isReinforcement && reinforcementId) {
      const reinforcement = campaign.reinforcements?.find(r => r.id === reinforcementId)
      if (!reinforcement) return 0

      // Obtener unidades del refuerzo
      const reinforcementUnits = units.filter(u => reinforcement.unitIds.includes(u.id))

      // Contar tropas del tipo seleccionado
      let totalCount = 0
      reinforcementUnits.forEach(unit => {
        // Contar tropas de ejércitos
        if (unit.type === 'army' && unit.composition) {
          const armyComp = unit.composition as ArmyComposition
          totalCount += armyComp.troops[troopType] || 0
        }

        // Contar tropas embarcadas en flotas
        if (unit.type === 'fleet' && unit.embarkedTroops?.troops) {
          totalCount += unit.embarkedTroops.troops[troopType] || 0
        }
      })

      // Usar función específica para refuerzos
      return calculateUnassignedReinforcementTroops(
        reinforcementId,
        troopType as ArmyTroopType,
        faction,
        totalCount,
        existingFormations
      )
    }

    // MODO NORMAL: calcular del pool principal
    const normalTroops = calculateAvailableTroops(campaign, units)
    const embarkedTroops = calculateEmbarkedTroops(campaign, units)

    // Combinar ambos pools
    const availableTroops = { ...normalTroops }
    for (const [key, embarkedPool] of Object.entries(embarkedTroops)) {
      if (availableTroops[key]) {
        availableTroops[key].total += embarkedPool.total
      } else {
        availableTroops[key] = embarkedPool
      }
    }

    const unassignedTroops = calculateUnassignedTroops(availableTroops, existingFormations)
    return unassignedTroops[`${troopType}-${faction}`] || 0
  }, [isReinforcement, reinforcementId, troopType, faction, campaign, units, existingFormations])

  // Calcular opciones disponibles (solo para modo normal)
  const { availableTroopTypes, availableFactions } = useMemo(() => {
    // En modo refuerzo, solo hay un tipo y facción disponibles
    if (isReinforcement && reinforcementId) {
      return {
        availableTroopTypes: troopType ? [troopType] : [],
        availableFactions: faction ? [faction] : []
      }
    }

    // Modo normal: calcular pools
    const normalTroops = calculateAvailableTroops(campaign, units)
    const embarkedTroops = calculateEmbarkedTroops(campaign, units)
    const availableTroops = { ...normalTroops }
    for (const [key, embarkedPool] of Object.entries(embarkedTroops)) {
      if (availableTroops[key]) {
        availableTroops[key].total += embarkedPool.total
      } else {
        availableTroops[key] = embarkedPool
      }
    }

    const types = Object.values(availableTroops)
      .map(pool => pool.type)
      .filter((type, index, self) => self.indexOf(type) === index)

    const factions = troopType
      ? Object.values(availableTroops)
          .filter(pool => pool.type === troopType)
          .map(pool => pool.faction)
          .filter((f, index, self) => self.indexOf(f) === index)
      : []

    return { availableTroopTypes: types, availableFactions: factions }
  }, [isReinforcement, reinforcementId, troopType, faction, campaign, units])

  // Auto-seleccionar facción si solo hay una disponible
  useEffect(() => {
    if (troopType && availableFactions.length === 1) {
      setFaction(availableFactions[0])
    } else if (troopType && availableFactions.length > 1 && !availableFactions.includes(faction)) {
      setFaction('')
    }
  }, [troopType, availableFactions, faction])

  // Generar nombre automático
  const autoGeneratedName =
    troopType && faction
      ? generateFormationName(troopType as ArmyTroopType, faction, existingFormations)
      : ''

  const displayName = useCustomName && customName ? customName : autoGeneratedName

  // Ajustar quantity si excede el máximo
  useEffect(() => {
    if (quantity > maxAvailable) {
      setQuantity(maxAvailable)
    }
  }, [maxAvailable, quantity])

  const handleCreate = async () => {
    if (!troopType || !faction) {
      setError('Debes seleccionar tipo de tropa y facción')
      return
    }

    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a 0')
      return
    }

    // Validar que no exceda las tropas disponibles
    if (quantity > maxAvailable) {
      const troopName = ARMY_TROOP_TYPES[troopType as ArmyTroopType]?.name || 'tropas'
      setError(`Solo hay ${maxAvailable} ${troopName} disponibles`)
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const newFormation = createFormation(
        troopType as ArmyTroopType,
        faction,
        quantity,
        deploymentZone,
        existingFormations,
        useCustomName ? customName : undefined,
        strategicOrder,
        tacticalOrder,
        isReinforcement,
        reinforcementId,
        estimatedArrivalDay
      )

      await onCreate(newFormation)
      onClose()
    } catch (err) {
      console.error('Error al crear formación:', err)
      if (err instanceof Error) {
        if (err.message.includes('permission')) {
          setError('Error de permisos. Asegúrate de que las reglas de Firestore estén actualizadas.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Error al crear la formación')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const deploymentZones: DeploymentZone[] = ['left', 'right', 'center', 'reserve']

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[#e8dcc0] rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border-4 border-[#6b5d42]">
        {/* Header */}
        <div className="sticky top-0 bg-[#2d2416] border-b-4 border-[#6b5d42] px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-heading font-bold text-[#f0d877]">Crear Nueva Formación</h2>
            <button
              onClick={onClose}
              className="text-[#b4a481] hover:text-[#f0d877] text-3xl font-bold leading-none transition-colors"
              disabled={isCreating}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Error message */}
          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-900 px-4 py-3 rounded-lg font-heading">
              ⚠️ {error}
            </div>
          )}

          {/* Resumen de tropa pre-seleccionada (si viene de quick-create) */}
          {initialTroopType && initialFaction ? (
            <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-4">
              <div className="flex items-center gap-4">
                <img
                  src={`/icons/${getTroopIconFilename(initialTroopType)}`}
                  alt={ARMY_TROOP_TYPES[initialTroopType].name}
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="flex-1">
                  <h3 className="font-heading font-bold text-[#2d1810] text-lg">
                    {ARMY_TROOP_TYPES[initialTroopType].name}
                  </h3>
                  <p className="text-[#6b5d42] text-sm capitalize">
                    Facción: {initialFaction}
                  </p>
                </div>
                <img
                  src={`/factions/${initialFaction.toLowerCase()}.png`}
                  alt={initialFaction}
                  className="w-12 h-12 object-contain"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Tipo de tropa - Grid visual */}
              <div>
                <label className="block text-sm font-heading font-semibold text-[#2d1810] mb-3 uppercase tracking-wide">
                  Tipo de Tropa *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {availableTroopTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setTroopType(type)
                        setQuantity(0)
                      }}
                      disabled={isCreating}
                      className={`relative p-3 rounded-lg border-2 transition-all ${
                        troopType === type
                          ? 'bg-[#c9a961] border-renaissance-gold shadow-lg'
                          : 'bg-[#d4c4a1] border-[#b4a481] hover:border-[#8b7355]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <img
                        src={`/icons/${getTroopIconFilename(type)}`}
                        alt={ARMY_TROOP_TYPES[type].name}
                        className="w-12 h-12 object-contain mx-auto mb-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <div className="text-xs font-heading font-semibold text-[#2d1810] text-center">
                        {ARMY_TROOP_TYPES[type].name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Facción (si hay múltiples) */}
              {troopType && availableFactions.length > 0 && (
                <div>
                  <label className="block text-sm font-heading font-semibold text-[#2d1810] mb-2 uppercase tracking-wide">
                    Facción *
                  </label>
                  {availableFactions.length === 1 ? (
                    <div className="px-4 py-3 bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg capitalize font-heading font-semibold text-[#2d1810] flex items-center gap-2">
                      <img
                        src={`/factions/${availableFactions[0].toLowerCase()}.png`}
                        alt={availableFactions[0]}
                        className="w-6 h-6 object-contain"
                      />
                      {availableFactions[0]}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableFactions.map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            setFaction(f)
                            setQuantity(0)
                          }}
                          disabled={isCreating}
                          className={`px-4 py-3 rounded-lg border-2 transition-all capitalize font-heading font-semibold flex items-center justify-center gap-2 ${
                            faction === f
                              ? 'bg-[#c9a961] border-renaissance-gold text-[#1d1408]'
                              : 'bg-[#d4c4a1] border-[#b4a481] text-[#2d1810] hover:border-[#8b7355]'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <img
                            src={`/factions/${f.toLowerCase()}.png`}
                            alt={f}
                            className="w-5 h-5 object-contain"
                          />
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Nombre y Cantidad - Fila 1 */}
          {autoGeneratedName && (
            <div className="grid grid-cols-2 gap-4">
              {/* Nombre de la Formación */}
              <div>
                <label className="block text-sm font-heading font-semibold text-[#2d1810] mb-2 uppercase tracking-wide">
                  Nombre de la Formación
                </label>
                <div className="space-y-2">
                  {useCustomName ? (
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#b4a481] rounded-lg bg-white text-[#2d1810] font-heading font-semibold focus:ring-2 focus:ring-renaissance-gold focus:border-renaissance-gold"
                      disabled={isCreating}
                      placeholder="Nombre personalizado"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg font-heading font-semibold text-[#2d1810]">
                      {autoGeneratedName}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setUseCustomName(!useCustomName)
                      if (useCustomName) setCustomName('')
                    }}
                    className="text-sm text-[#c9a961] hover:text-renaissance-gold font-heading font-semibold transition-colors"
                    disabled={isCreating}
                  >
                    {useCustomName ? '← Usar nombre automático' : '✏️ Personalizar nombre'}
                  </button>
                </div>
              </div>

              {/* Cantidad de Tropas */}
              <div>
                <label className="block text-sm font-heading font-semibold text-[#2d1810] mb-2 uppercase tracking-wide">
                  Cantidad de Tropas *
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    min="1"
                    max={maxAvailable}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border-2 border-[#b4a481] rounded-lg bg-white text-[#2d1810] font-heading font-semibold text-lg focus:ring-2 focus:ring-renaissance-gold focus:border-renaissance-gold"
                    disabled={isCreating}
                    placeholder="Ingresa cantidad"
                  />
                  <div className="flex items-center justify-between text-sm font-heading">
                    <span className="text-[#6b5d42]">Disponibles: <span className="font-bold text-[#2d1810]">{maxAvailable}</span></span>
                    {maxAvailable > 0 && (
                      <button
                        onClick={() => setQuantity(maxAvailable)}
                        className="text-[#c9a961] hover:text-renaissance-gold font-semibold transition-colors"
                        disabled={isCreating}
                      >
                        Usar todas
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Zona de despliegue - Visual */}
          {troopType && faction && (
            <div>
              <label className="block text-sm font-heading font-semibold text-[#2d1810] mb-2 uppercase tracking-wide text-center">
                Zona de Despliegue: <span className="capitalize font-normal">{getDeploymentZoneLabel(deploymentZone)}</span>
              </label>
              <div className="flex justify-center">
                <div className="space-y-1" style={{ width: '180px' }}>
                  {/* Fila superior: Left, Center, Right */}
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setDeploymentZone('left')}
                      disabled={isCreating}
                      className={`h-8 border-2 rounded transition-all ${
                        deploymentZone === 'left'
                          ? 'bg-red-600 border-red-700'
                          : 'bg-white border-[#b4a481] hover:border-[#8b7355]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                    <button
                      onClick={() => setDeploymentZone('center')}
                      disabled={isCreating}
                      className={`h-8 border-2 rounded transition-all ${
                        deploymentZone === 'center'
                          ? 'bg-red-600 border-red-700'
                          : 'bg-white border-[#b4a481] hover:border-[#8b7355]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                    <button
                      onClick={() => setDeploymentZone('right')}
                      disabled={isCreating}
                      className={`h-8 border-2 rounded transition-all ${
                        deploymentZone === 'right'
                          ? 'bg-red-600 border-red-700'
                          : 'bg-white border-[#b4a481] hover:border-[#8b7355]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                  </div>
                  {/* Fila inferior: Reserve */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => setDeploymentZone('reserve')}
                      disabled={isCreating}
                      className={`w-16 h-8 border-2 rounded transition-all ${
                        deploymentZone === 'reserve'
                          ? 'bg-red-600 border-red-700'
                          : 'bg-white border-[#b4a481] hover:border-[#8b7355]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#6b5d42] text-center mt-2 font-heading">
                Esta formación luchará en esta zona durante las batallas de la campaña.
              </p>
            </div>
          )}

          {/* Órdenes - Fila 3 */}
          {troopType && faction && (
            <div className="grid grid-cols-2 gap-4">
              {/* Orden Estratégica */}
              <div>
                <label className="block text-sm font-heading font-semibold text-[#2d1810] mb-2 uppercase tracking-wide">
                  Orden Estratégica
                </label>
                <select
                  value={strategicOrder}
                  onChange={(e) => setStrategicOrder(e.target.value as TacticalFormation['strategicOrder'])}
                  className="w-full px-4 py-3 border-2 border-[#b4a481] rounded-lg bg-white text-[#2d1810] font-heading font-semibold focus:ring-2 focus:ring-renaissance-gold focus:border-renaissance-gold"
                  disabled={isCreating}
                >
                  {getAvailableStrategicOrders(troopType as ArmyTroopType).map(order => (
                    <option key={order} value={order}>
                      {getStrategicOrderLabel(order)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orden Táctica */}
              <div>
                <label className="block text-sm font-heading font-semibold text-[#2d1810] mb-2 uppercase tracking-wide">
                  Orden Táctica
                </label>
                <select
                  value={tacticalOrder}
                  onChange={(e) => setTacticalOrder(e.target.value as TacticalFormation['tacticalOrder'])}
                  className="w-full px-4 py-3 border-2 border-[#b4a481] rounded-lg bg-white text-[#2d1810] font-heading font-semibold focus:ring-2 focus:ring-renaissance-gold focus:border-renaissance-gold"
                  disabled={isCreating}
                >
                  {getAvailableTacticalOrders(troopType as ArmyTroopType).map(order => (
                    <option key={order} value={order}>
                      {getTacticalOrderLabel(order)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#2d2416] border-t-4 border-[#6b5d42] px-6 py-4 flex gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-[#6b5d42] hover:bg-[#8b7355] text-[#e8dcc0] rounded-lg font-heading font-semibold transition-colors"
            disabled={isCreating}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={
              isCreating ||
              !troopType ||
              !faction ||
              quantity <= 0 ||
              quantity > maxAvailable
            }
            className="flex-1 px-4 py-3 bg-[#f0d877] hover:bg-[#e8c961] text-[#1d1408] rounded-lg font-heading font-semibold shadow-lg transition-all disabled:bg-[#4a3f2a] disabled:text-[#6b5d42] disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isCreating ? '⏳ Creando...' : '✓ Crear Formación'}
          </button>
        </div>
      </div>
    </div>
  )
}
