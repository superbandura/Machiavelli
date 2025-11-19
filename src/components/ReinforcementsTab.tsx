import React, { useState, useMemo } from 'react'
import { Timestamp } from 'firebase/firestore'
import type {
  MilitaryCampaign,
  Unit,
  Player,
  Game,
  CampaignReinforcement
} from '@/types/game'
import type { Province } from '@/types/map'
import { calculateReinforcementUnits } from '@/utils/formationHelpers'

interface ReinforcementsTabProps {
  campaign: MilitaryCampaign
  player: Player
  game: Game
  allUnits: Unit[]
  allCampaigns: MilitaryCampaign[]
  provinceMap: Record<string, Province>
  onSave: (reinforcement: Partial<CampaignReinforcement>) => Promise<void>
}

export function ReinforcementsTab({
  campaign,
  player,
  game,
  allUnits,
  allCampaigns,
  provinceMap,
  onSave
}: ReinforcementsTabProps) {
  // Verificar si el jugador es atacante o defensor original
  const defenderFaction = game.map.provinces[campaign.targetProvince]?.controlledBy || ''
  const isOriginalAttacker = player.faction === campaign.declaredByFaction
  const isOriginalDefender = player.faction === defenderFaction

  // Determinar bando inicial basado en participación original
  const initialSide: 'attacker' | 'defender' = isOriginalAttacker
    ? 'attacker'
    : isOriginalDefender
    ? 'defender'
    : 'attacker'

  // Estado: bando seleccionado
  const [selectedSide, setSelectedSide] = useState<'attacker' | 'defender'>(initialSide)

  // Estado: unidades seleccionadas para enviar como refuerzo (siempre empieza vacío)
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([])

  // Estado: guardando
  const [saving, setSaving] = useState(false)

  // Calcular unidades disponibles
  const availableUnits = useMemo(() => {
    return calculateReinforcementUnits(
      campaign,
      player,
      allUnits,
      allCampaigns,
      provinceMap
    )
  }, [campaign, player, allUnits, allCampaigns, provinceMap])

  // Toggle selección de unidad
  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds(prev =>
      prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    )
  }

  // Guardar refuerzo
  const handleSave = async () => {
    if (selectedUnitIds.length === 0) {
      alert('Debes seleccionar al menos una unidad para enviar como refuerzo')
      return
    }

    setSaving(true)
    try {
      // Calcular días aleatorios de llegada (entre 4 y 10 días)
      const randomDays = Math.floor(Math.random() * 7) + 4
      const estimatedArrival = game.turnNumber + randomDays

      const reinforcement: Partial<CampaignReinforcement> = {
        id: `reinforcement-${player.id}-${Date.now()}`,
        playerId: player.id,
        faction: player.faction,
        side: selectedSide,
        unitIds: selectedUnitIds,
        addedAt: Timestamp.now(),
        estimatedArrivalDay: estimatedArrival
      }

      await onSave(reinforcement)

      // Limpiar selección después de enviar exitosamente
      setSelectedUnitIds([])

      alert('Refuerzo enviado exitosamente')
    } catch (error) {
      console.error('Error al guardar refuerzo:', error)
      alert('Error al enviar refuerzo. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const isParticipant = isOriginalAttacker || isOriginalDefender

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#f5efd8] border-2 border-[#6b5d42] rounded-lg p-4">
        <h3 className="text-lg font-heading font-bold text-[#2d1810] mb-2">
          Enviar Refuerzos
        </h3>
        {isParticipant ? (
          <p className="text-sm text-[#4a3f2a]">
            Puedes enviar refuerzos adicionales a tu bando en esta campaña. Cada refuerzo tendrá su propio tiempo de llegada.
          </p>
        ) : (
          <p className="text-sm text-[#4a3f2a]">
            Como jugador neutral, puedes enviar tus unidades como refuerzo a uno de los bandos en esta campaña. Puedes enviar múltiples refuerzos.
          </p>
        )}
      </div>

      {/* Selección de bando */}
      <div className="bg-white/50 border border-[#6b5d42]/30 rounded-lg p-4">
        <label className="block text-sm font-semibold text-[#2d1810] mb-3">
          {isParticipant ? 'Bando reforzado:' : '¿A qué bando quieres reforzar?'}
        </label>
        <div className="flex gap-4">
          <label className={`flex items-center gap-2 ${isParticipant ? 'cursor-default' : 'cursor-pointer'}`}>
            <input
              type="radio"
              value="attacker"
              checked={selectedSide === 'attacker'}
              onChange={(e) => !isParticipant && setSelectedSide(e.target.value as 'attacker')}
              disabled={isParticipant}
              className="w-4 h-4"
            />
            <span className={`text-sm ${isParticipant ? 'text-[#6b5d42]' : 'text-[#2d1810]'}`}>
              Reforzar al <strong>Atacante</strong> ({campaign.declaredByFaction})
            </span>
          </label>
          <label className={`flex items-center gap-2 ${isParticipant ? 'cursor-default' : 'cursor-pointer'}`}>
            <input
              type="radio"
              value="defender"
              checked={selectedSide === 'defender'}
              onChange={(e) => !isParticipant && setSelectedSide(e.target.value as 'defender')}
              disabled={isParticipant}
              className="w-4 h-4"
            />
            <span className={`text-sm ${isParticipant ? 'text-[#6b5d42]' : 'text-[#2d1810]'}`}>
              Reforzar al <strong>Defensor</strong>
            </span>
          </label>
        </div>
        {isParticipant && (
          <p className="text-xs text-[#6b5d42] italic mt-2">
            Como participante original, no puedes cambiar de bando.
          </p>
        )}
      </div>

      {/* Lista de unidades disponibles */}
      <div className="bg-white/50 border border-[#6b5d42]/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-[#2d1810] mb-3">
          Unidades Disponibles ({availableUnits.length})
        </h4>
        {availableUnits.length === 0 ? (
          <p className="text-sm text-[#6b5d42] italic">
            No tienes unidades que puedan llegar a esta provincia.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableUnits.map(unit => (
              <label
                key={unit.id}
                className="flex items-center gap-3 p-2 bg-white border border-[#d4c5a0] rounded hover:bg-[#f5efd8] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedUnitIds.includes(unit.id)}
                  onChange={() => toggleUnit(unit.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#2d1810]">{unit.name}</div>
                  <div className="text-xs text-[#6b5d42]">
                    {unit.type === 'army' ? 'Ejército' : 'Flota'} • {unit.currentPosition}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end pt-4 border-t border-[#6b5d42]/30">
        <button
          onClick={handleSave}
          disabled={saving || selectedUnitIds.length === 0}
          className="px-6 py-2 bg-[#8b4513] text-white font-semibold rounded hover:bg-[#a0522d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Confirmar Refuerzos'}
        </button>
      </div>
    </div>
  )
}
