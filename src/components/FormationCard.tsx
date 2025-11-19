import { useState } from 'react'
import type { MilitaryCampaign, Unit, TacticalFormation, DeploymentZone, StrategicOrder, TacticalOrder, Game } from '@/types/game'
import type { ArmyTroopType } from '@/types/scenario'
import { ARMY_TROOP_TYPES } from '@/data/unitTypes'
import {
  calculateAvailableTroops,
  calculateUnassignedTroops,
  validateFormation,
  getDeploymentZoneLabel,
  getStrategicOrderLabel,
  getTacticalOrderLabel,
  getAvailableStrategicOrders,
  getAvailableTacticalOrders
} from '@/utils/formationHelpers'

interface FormationCardProps {
  formation: TacticalFormation
  campaign: MilitaryCampaign
  units: Unit[]
  game?: Game
  currentPlayerFaction: string
  onUpdate: (formationId: string, updates: Partial<TacticalFormation>) => Promise<void>
  onDelete: (formationId: string) => Promise<void>
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

export default function FormationCard({
  formation,
  campaign,
  units,
  game,
  currentPlayerFaction,
  onUpdate,
  onDelete
}: FormationCardProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingQuantity, setIsEditingQuantity] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editedName, setEditedName] = useState(formation.name)
  const [editedQuantity, setEditedQuantity] = useState(formation.quantity)

  const troopInfo = ARMY_TROOP_TYPES[formation.troopType]

  // Verificar si el jugador puede editar esta formación
  const canEdit = formation.faction.toLowerCase() === currentPlayerFaction.toLowerCase()

  // Verificar si esta formación fue creada a partir de tropas de refuerzo
  const isReinforcement = formation.isReinforcement === true

  // Calcular días hasta llegada si es refuerzo y tenemos el juego
  const daysUntilArrival = isReinforcement && game && formation.estimatedArrivalDay
    ? formation.estimatedArrivalDay - game.turnNumber
    : null

  // Calcular disponibilidad para edición de cantidad
  const availableTroops = calculateAvailableTroops(campaign, units)
  const unassignedTroops = calculateUnassignedTroops(
    availableTroops,
    campaign.formations || []
  )
  const key = `${formation.troopType}-${formation.faction}`
  const maxAvailable = (unassignedTroops[key] || 0) + formation.quantity

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      alert('El nombre no puede estar vacío')
      setEditedName(formation.name)
      setIsEditingName(false)
      return
    }

    if (editedName === formation.name) {
      setIsEditingName(false)
      return
    }

    setIsSaving(true)
    try {
      await onUpdate(formation.id, { name: editedName.trim() })
      setIsEditingName(false)
    } catch (error) {
      console.error('Error al actualizar nombre:', error)
      alert('Error al actualizar el nombre')
      setEditedName(formation.name)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveQuantity = async () => {
    if (editedQuantity <= 0) {
      alert('La cantidad debe ser mayor a 0')
      setEditedQuantity(formation.quantity)
      setIsEditingQuantity(false)
      return
    }

    if (editedQuantity === formation.quantity) {
      setIsEditingQuantity(false)
      return
    }

    const validation = validateFormation(
      {
        ...formation,
        quantity: editedQuantity
      },
      availableTroops,
      campaign.formations || [],
      formation.id
    )

    if (!validation.isValid) {
      alert(validation.error || 'Cantidad inválida')
      setEditedQuantity(formation.quantity)
      setIsEditingQuantity(false)
      return
    }

    setIsSaving(true)
    try {
      await onUpdate(formation.id, { quantity: editedQuantity })
      setIsEditingQuantity(false)
    } catch (error) {
      console.error('Error al actualizar cantidad:', error)
      alert('Error al actualizar la cantidad')
      setEditedQuantity(formation.quantity)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangeZone = async (newZone: DeploymentZone) => {
    if (newZone === formation.deploymentZone) return

    setIsSaving(true)
    try {
      await onUpdate(formation.id, { deploymentZone: newZone })
    } catch (error) {
      console.error('Error al actualizar zona:', error)
      alert('Error al actualizar la zona de despliegue')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangeStrategicOrder = async (newOrder: StrategicOrder) => {
    if (newOrder === formation.strategicOrder) return

    setIsSaving(true)
    try {
      await onUpdate(formation.id, { strategicOrder: newOrder })
    } catch (error) {
      console.error('Error al actualizar orden estratégica:', error)
      alert('Error al actualizar la orden estratégica')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangeTacticalOrder = async (newOrder: TacticalOrder) => {
    if (newOrder === formation.tacticalOrder) return

    setIsSaving(true)
    try {
      await onUpdate(formation.id, { tacticalOrder: newOrder })
    } catch (error) {
      console.error('Error al actualizar orden táctica:', error)
      alert('Error al actualizar la orden táctica')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Seguro que deseas eliminar la formación "${formation.name}"?\n\nLas ${formation.quantity} tropas volverán al pool disponible.`)) {
      return
    }

    setIsSaving(true)
    try {
      await onDelete(formation.id)
    } catch (error) {
      console.error('Error al eliminar formación:', error)
      alert('Error al eliminar la formación')
    } finally {
      setIsSaving(false)
    }
  }

  const deploymentZones: DeploymentZone[] = ['left', 'right', 'center', 'reserve']

  return (
    <div className="relative border-2 border-[#b4a481] rounded-lg bg-[#d4c4a1] hover:shadow-lg transition-all">
      {/* Badge "R" de refuerzo (esquina superior izquierda) */}
      {isReinforcement && (
        <div className="absolute -top-2 -left-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10">
          <span className="text-white font-bold text-sm">R</span>
        </div>
      )}

      {/* Días hasta llegada (debajo de badge R) */}
      {daysUntilArrival !== null && daysUntilArrival !== undefined && (
        <div className="absolute top-6 left-0 z-10">
          <span className="inline-block px-2 py-0.5 bg-amber-100 border border-amber-600 rounded text-[10px] font-semibold text-amber-800">
            {daysUntilArrival}d
          </span>
        </div>
      )}

      {/* Botón eliminar (esquina superior derecha) - Solo si puede editar */}
      {canEdit && (
        <button
          onClick={handleDelete}
          disabled={isSaving}
          className="absolute top-2 right-2 w-6 h-6 opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          title="Licenciar formación"
        >
          <img
            src="/icons/licenciar.png"
            alt="Licenciar"
            className="w-full h-full object-contain"
          />
        </button>
      )}

      {/* Card principal */}
      <div className="p-3">
        {/* Todo en una sola fila horizontal */}
        <div className="flex items-center gap-3 justify-between pr-10">
          {/* Icono de tropa */}
          <img
            src={`/icons/${getTroopIconFilename(formation.troopType)}`}
            alt={troopInfo.name}
            className="w-12 h-12 object-contain flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />

          {/* Nombre y tipo */}
          <div className="flex-1 min-w-0" style={{ maxWidth: '180px' }}>
            {isEditingName && canEdit ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') {
                    setEditedName(formation.name)
                    setIsEditingName(false)
                  }
                }}
                className="w-full px-2 py-1 border border-[#6b5d42] rounded bg-white text-sm font-heading font-semibold text-[#2d1810] focus:ring-2 focus:ring-renaissance-gold"
                disabled={isSaving}
                autoFocus
              />
            ) : (
              <h5
                className={`font-heading font-semibold text-[#2d1810] text-sm truncate ${
                  canEdit ? 'cursor-pointer hover:text-[#6b5d42]' : ''
                }`}
                onClick={() => canEdit && setIsEditingName(true)}
                title={canEdit ? 'Click para editar nombre' : formation.name}
              >
                {formation.name}
              </h5>
            )}
            <div className="text-xs text-[#6b5d42] mt-0.5 truncate">
              {troopInfo.name} · <span className="capitalize">{formation.faction}</span>
            </div>
          </div>

          {/* Orden estratégica */}
          <div style={{ width: '150px' }}>
            <label className="block text-[9px] font-heading font-semibold text-[#6b5d42] mb-1 uppercase tracking-wide text-center">
              Estrategia
            </label>
            <select
              value={formation.strategicOrder}
              onChange={(e) => handleChangeStrategicOrder(e.target.value as StrategicOrder)}
              className="w-full px-2 py-1 border border-[#6b5d42] rounded bg-white text-xs text-[#2d1810] font-medium text-center focus:ring-2 focus:ring-renaissance-gold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canEdit || isSaving}
              title={canEdit ? "Orden estratégica para esta formación" : "No puedes modificar formaciones de otras facciones"}
            >
              {getAvailableStrategicOrders(formation.troopType).map(order => (
                <option key={order} value={order}>
                  {getStrategicOrderLabel(order)}
                </option>
              ))}
            </select>
          </div>

          {/* Zona de despliegue visual con texto */}
          <div style={{ width: '120px' }}>
            <label className="block text-[9px] font-heading font-semibold text-[#6b5d42] mb-1 uppercase tracking-wide text-center">
              Zona: <span className="capitalize font-bold">{getDeploymentZoneLabel(formation.deploymentZone)}</span>
            </label>
            <div className="flex justify-center">
              <div className="space-y-0.5" style={{ width: '60px' }}>
                {/* Fila superior: Left, Center, Right */}
                <div className="grid grid-cols-3 gap-0.5">
                  <button
                    onClick={() => handleChangeZone('left')}
                    disabled={!canEdit || isSaving}
                    className={`h-4 w-4 border rounded-sm transition-all ${
                      formation.deploymentZone === 'left'
                        ? 'bg-red-600 border-red-700'
                        : 'bg-white border-[#b4a481] hover:border-[#8b7355]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={canEdit ? "Flanco izquierdo" : "No puedes modificar formaciones de otras facciones"}
                  />
                  <button
                    onClick={() => handleChangeZone('center')}
                    disabled={!canEdit || isSaving}
                    className={`h-4 w-4 border rounded-sm transition-all ${
                      formation.deploymentZone === 'center'
                        ? 'bg-red-600 border-red-700'
                        : 'bg-white border-[#b4a481] hover:border-[#8b7355]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={canEdit ? "Centro" : "No puedes modificar formaciones de otras facciones"}
                  />
                  <button
                    onClick={() => handleChangeZone('right')}
                    disabled={!canEdit || isSaving}
                    className={`h-4 w-4 border rounded-sm transition-all ${
                      formation.deploymentZone === 'right'
                        ? 'bg-red-600 border-red-700'
                        : 'bg-white border-[#b4a481] hover:border-[#8b7355]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={canEdit ? "Flanco derecho" : "No puedes modificar formaciones de otras facciones"}
                  />
                </div>
                {/* Fila inferior: Reserve */}
                <div className="flex justify-center">
                  <button
                    onClick={() => handleChangeZone('reserve')}
                    disabled={!canEdit || isSaving}
                    className={`h-4 w-4 border rounded-sm transition-all ${
                      formation.deploymentZone === 'reserve'
                        ? 'bg-red-600 border-red-700'
                        : 'bg-white border-[#b4a481] hover:border-[#8b7355]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={canEdit ? "Reserva" : "No puedes modificar formaciones de otras facciones"}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Orden táctica */}
          <div style={{ width: '150px' }}>
            <label className="block text-[9px] font-heading font-semibold text-[#6b5d42] mb-1 uppercase tracking-wide text-center">
              Táctica
            </label>
            <select
              value={formation.tacticalOrder}
              onChange={(e) => handleChangeTacticalOrder(e.target.value as TacticalOrder)}
              className="w-full px-2 py-1 border border-[#6b5d42] rounded bg-white text-xs text-[#2d1810] font-medium text-center focus:ring-2 focus:ring-renaissance-gold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canEdit || isSaving}
              title={canEdit ? "Orden táctica para esta formación" : "No puedes modificar formaciones de otras facciones"}
            >
              {getAvailableTacticalOrders(formation.troopType).map(order => (
                <option key={order} value={order}>
                  {getTacticalOrderLabel(order)}
                </option>
              ))}
            </select>
          </div>

          {/* Número de tropas (no editable) */}
          <div className="flex items-center justify-center px-2" style={{ width: '70px' }}>
            <div className="text-5xl font-heading font-bold text-[#2d1810] leading-none">
              {formation.quantity}
            </div>
          </div>

          {/* Emblema de facción */}
          <img
            src={`/factions/${formation.faction.toLowerCase()}.png`}
            alt={formation.faction}
            className="w-10 h-10 object-contain flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      </div>

      {/* Indicador de guardado */}
      {isSaving && (
        <div className="absolute inset-0 bg-[#d4c4a1] bg-opacity-90 flex items-center justify-center rounded-lg">
          <div className="text-[#2d1810] font-heading font-semibold text-sm">Guardando...</div>
        </div>
      )}
    </div>
  )
}
