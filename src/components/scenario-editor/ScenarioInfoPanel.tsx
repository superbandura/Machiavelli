import { useState, useEffect } from 'react'
import { ScenarioFormData, ScenarioListItem } from '@/types/scenario'
import { FACTIONS } from '@/data/factions'

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
}: ScenarioInfoPanelProps) {
  const [citiesConfig, setCitiesConfig] = useState('')

  // Actualizar citiesConfig cuando cambie formData
  useEffect(() => {
    const config = Object.entries(formData.victoryConditions.citiesRequired)
      .map(([players, cities]) => `${players}:${cities}`)
      .join(',')
    setCitiesConfig(config)
  }, [formData.victoryConditions.citiesRequired])

  const handleCitiesConfigChange = (value: string) => {
    setCitiesConfig(value)
    try {
      const citiesRequired: Record<number, number> = {}
      if (value.trim()) {
        const pairs = value.split(',').map((s) => s.trim())
        for (const pair of pairs) {
          const [players, cities] = pair.split(':').map((s) => parseInt(s.trim()))
          if (!isNaN(players) && !isNaN(cities)) {
            citiesRequired[players] = cities
          }
        }
      }
      onChange({
        ...formData,
        victoryConditions: {
          ...formData.victoryConditions,
          citiesRequired,
        },
      })
    } catch (error) {
      // Ignorar errores de parsing
    }
  }

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

      <div className="grid grid-cols-3 gap-4">
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

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Dificultad
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) =>
              onChange({
                ...formData,
                difficulty: e.target.value as 'tutorial' | 'medium' | 'hard',
              })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="tutorial">Tutorial</option>
            <option value="medium">Media</option>
            <option value="hard">Difícil</option>
          </select>
        </div>
      </div>

      {/* Duración estimada */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Duración Estimada
        </label>
        <input
          type="text"
          value={formData.estimatedDuration}
          onChange={(e) => onChange({ ...formData, estimatedDuration: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="8-15 turnos (2-4 años)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Ciudades requeridas */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Ciudades Requeridas (jugadores:ciudades)
          </label>
          <input
            type="text"
            value={citiesConfig}
            onChange={(e) => handleCitiesConfigChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="5:8, 6:9, 7:10"
          />
          <p className="text-xs text-gray-400 mt-1">
            Formato: jugadores:ciudades, separados por comas
          </p>
        </div>

        {/* Límite de tiempo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Límite de Turnos
          </label>
          <input
            type="number"
            min={1}
            value={formData.victoryConditions.timeLimit}
            onChange={(e) =>
              onChange({
                ...formData,
                victoryConditions: {
                  ...formData.victoryConditions,
                  timeLimit: parseInt(e.target.value) || 12,
                },
              })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Facciones disponibles */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Facciones Disponibles
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.values(FACTIONS)
            .filter((f) => f.id !== 'NEUTRAL')
            .map((faction) => (
              <button
                key={faction.id}
                onClick={() => toggleFaction(faction.id)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  formData.availableFactions.includes(faction.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                style={{
                  borderLeft: `4px solid ${faction.color}`,
                }}
              >
                {faction.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
