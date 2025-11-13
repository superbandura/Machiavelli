import { useState, useEffect } from 'react'
import { ScenarioFormData, ScenarioListItem } from '@/types/scenario'
import { FactionDocument } from '@/types/faction'
import { getAllFactions } from '@/lib/factionService'

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
  const [factions, setFactions] = useState<FactionDocument[]>([])
  const [loadingFactions, setLoadingFactions] = useState(true)

  // Load factions from Firestore
  useEffect(() => {
    loadFactions()
  }, [])

  const loadFactions = async () => {
    try {
      setLoadingFactions(true)
      const loadedFactions = await getAllFactions()
      setFactions(loadedFactions.filter((f) => f.id !== 'NEUTRAL'))
    } catch (error) {
      console.error('Error loading factions:', error)
      // Keep empty array if error
    } finally {
      setLoadingFactions(false)
    }
  }

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

      {/* Límite de turnos */}
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

      {/* Separador visual */}
      <div className="border-t border-gray-600 pt-4">
        <p className="text-xs text-gray-400 text-center">
          Selecciona una provincia en el mapa para editarla
        </p>
      </div>
    </div>
  )
}
