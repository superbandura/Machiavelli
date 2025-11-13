import { useState, useEffect } from 'react'
import { ScenarioFormData, ScenarioListItem, FactionSetup, EditableProvinceData } from '@/types/scenario'
import { FactionDocument } from '@/types/faction'
import { getAllFactions } from '@/lib/factionService'
import FactionTreasuryPanel from './FactionTreasuryPanel'

interface ScenarioInfoPanelProps {
  formData: ScenarioFormData
  onChange: (data: ScenarioFormData) => void
  scenarios: ScenarioListItem[]
  selectedScenarioId: string | null
  onSelectScenario: (id: string | null) => void
  onSave: () => void
  onDelete: () => void
  onNew: () => void
  saving: boolean
  onCloneProvinces: () => void
  onResetProvinces: () => void
  onExportTemplate: () => void
  onImportTemplate: (event: React.ChangeEvent<HTMLInputElement>) => void
  factionSetups: FactionSetup[]
  onFactionSetupsChange: (setups: FactionSetup[]) => void
  provinces: EditableProvinceData[]
  factions: FactionDocument[]
}

export default function ScenarioInfoPanel({
  formData,
  onChange,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onSave,
  onDelete,
  onNew,
  saving,
  onCloneProvinces,
  onResetProvinces,
  onExportTemplate,
  onImportTemplate,
  factionSetups,
  onFactionSetupsChange,
  provinces,
  factions,
}: ScenarioInfoPanelProps) {
  const toggleFaction = (factionId: string) => {
    const current = formData.availableFactions
    const updated = current.includes(factionId)
      ? current.filter((id) => id !== factionId)
      : [...current, factionId]
    onChange({ ...formData, availableFactions: updated })
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Información del Escenario</h2>
        <div className="flex gap-2">
          <button
            onClick={onNew}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
          >
            Nuevo
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {selectedScenarioId && (
            <button
              onClick={onDelete}
              disabled={saving}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors disabled:opacity-50"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Selector de escenario */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Escenario
        </label>
        <select
          value={selectedScenarioId || ''}
          onChange={(e) => onSelectScenario(e.target.value || null)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Nuevo Escenario --</option>
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name} ({scenario.year})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Italia 1454"
          />
        </div>

        {/* Año */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Año
          </label>
          <input
            type="number"
            value={formData.year}
            onChange={(e) => onChange({ ...formData, year: parseInt(e.target.value) || 1454 })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Descripción
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Descripción del escenario..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Min Players */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Min Jugadores
          </label>
          <input
            type="number"
            min={2}
            value={formData.minPlayers}
            onChange={(e) => onChange({ ...formData, minPlayers: parseInt(e.target.value) || 2 })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Players */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Max Jugadores
          </label>
          <input
            type="number"
            min={2}
            value={formData.maxPlayers}
            onChange={(e) => onChange({ ...formData, maxPlayers: parseInt(e.target.value) || 2 })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Puntos de Victoria */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Puntos de Victoria
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={formData.victoryConditions.victoryPoints}
          onChange={(e) =>
            onChange({
              ...formData,
              victoryConditions: {
                victoryPoints: parseInt(e.target.value) || 9,
              },
            })
          }
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Número de ciudades necesarias para ganar en Otoño
        </p>
      </div>

      {/* Separador visual */}
      <div className="border-t border-gray-600 pt-4">
        {/* Panel de Tesoro de Facciones */}
        <div className="mb-4">
          <FactionTreasuryPanel
            factionSetups={factionSetups}
            provinces={provinces}
            factions={factions}
            onChange={onFactionSetupsChange}
          />
        </div>

        <p className="text-xs text-gray-400 text-center mb-3">
          Selecciona una provincia en el mapa para editarla
        </p>

        {/* Province Management Buttons */}
        <div className="space-y-2">
          <button
            onClick={onCloneProvinces}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>📋</span>
            <span>Clonar Provincias desde Escenario</span>
          </button>
          <button
            onClick={onResetProvinces}
            className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>Resetear a Template Base</span>
          </button>

          {/* Separador */}
          <div className="border-t border-gray-600 pt-2 mt-2">
            <p className="text-xs text-gray-400 text-center mb-2">Exportar/Importar Template</p>
          </div>

          <button
            onClick={onExportTemplate}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>📤</span>
            <span>Exportar Template JSON</span>
          </button>

          <label className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <span>📥</span>
            <span>Importar Template JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={onImportTemplate}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
