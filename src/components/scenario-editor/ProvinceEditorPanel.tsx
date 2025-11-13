import { useState } from 'react'
import { EditableProvinceData } from '@/types/scenario'
import { FactionDocument } from '@/types/faction'

interface ProvinceEditorPanelProps {
  province: EditableProvinceData | null
  onChange: (province: EditableProvinceData) => void
  factions: FactionDocument[]
  onAdjacencyModeChange?: (enabled: boolean) => void
  allProvinces: EditableProvinceData[]
}

export default function ProvinceEditorPanel({
  province,
  onChange,
  factions,
  onAdjacencyModeChange,
  allProvinces,
}: ProvinceEditorPanelProps) {
  const [isAdjacencyEditMode, setIsAdjacencyEditMode] = useState(false)

  const handleAdjacencyModeToggle = (enabled: boolean) => {
    setIsAdjacencyEditMode(enabled)
    if (onAdjacencyModeChange) {
      onAdjacencyModeChange(enabled)
    }
  }
  if (!province) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center min-h-[200px]">
        <p className="text-gray-400">
          Selecciona una provincia en el mapa para editarla
        </p>
      </div>
    )
  }

  // Crear un mapa de provincias para lookups rápidos
  const provinceMap = new Map(allProvinces.map((p) => [p.id, p]))

  const toggleAdjacency = (adjacentId: string) => {
    const current = province.adjacencies
    const updated = current.includes(adjacentId)
      ? current.filter((id) => id !== adjacentId)
      : [...current, adjacentId]
    onChange({ ...province, adjacencies: updated })
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg space-y-4 overflow-y-auto max-h-[calc(100vh-500px)]">
      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
        <h3 className="text-lg font-bold text-white">{province.name}</h3>
        <span className="text-sm text-gray-400">ID: {province.id}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={province.name}
            onChange={(e) => onChange({ ...province, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tipo
          </label>
          <select
            value={province.type}
            onChange={(e) =>
              onChange({ ...province, type: e.target.value as 'land' | 'sea' | 'port' })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="land">Tierra</option>
            <option value="sea">Mar</option>
            <option value="port">Puerto</option>
          </select>
        </div>
      </div>

      {/* Control - Solo para provincias no marítimas */}
      {province.type !== 'sea' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Controlada Por
          </label>
          <select
            value={province.controlledBy || ''}
            onChange={(e) => onChange({ ...province, controlledBy: e.target.value || null })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Neutral</option>
            {factions.map((faction) => (
              <option key={faction.id} value={faction.id}>
                {faction.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ciudad - Solo para provincias no marítimas */}
      {province.type !== 'sea' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasCity"
              checked={province.hasCity}
              onChange={(e) => onChange({ ...province, hasCity: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded"
            />
            <label htmlFor="hasCity" className="text-sm font-medium text-gray-300">
              Tiene Ciudad
            </label>
          </div>

          {province.hasCity && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre de Ciudad
                </label>
                <input
                  type="text"
                  value={province.cityName}
                  onChange={(e) => onChange({ ...province, cityName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Florencia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Ingresos (Ducados)
                </label>
                <input
                  type="number"
                  min={0}
                  value={province.income}
                  onChange={(e) => onChange({ ...province, income: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Puerto - Solo para provincias no marítimas */}
      {province.type !== 'sea' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPort"
            checked={province.isPort}
            onChange={(e) => onChange({ ...province, isPort: e.target.checked })}
            className="w-4 h-4 bg-gray-700 border-gray-600 rounded"
          />
          <label htmlFor="isPort" className="text-sm font-medium text-gray-300">
            Es Puerto
          </label>
        </div>
      )}

      {/* Unidades Iniciales */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Unidades Iniciales
        </label>
        {province.type === 'sea' ? (
          // Solo flotas para provincias marítimas
          <div>
            <label className="block text-xs text-gray-400 mb-1">Flotas</label>
            <input
              type="number"
              min={0}
              value={province.fleets}
              onChange={(e) => onChange({ ...province, fleets: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          // Todas las unidades para provincias terrestres
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Guarniciones</label>
              <input
                type="number"
                min={0}
                value={province.garrisons}
                onChange={(e) => onChange({ ...province, garrisons: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Ejércitos</label>
              <input
                type="number"
                min={0}
                value={province.armies}
                onChange={(e) => onChange({ ...province, armies: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Flotas</label>
              <input
                type="number"
                min={0}
                value={province.fleets}
                onChange={(e) => onChange({ ...province, fleets: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        {province.type !== 'sea' && province.fleets > 0 && !province.isPort && (
          <p className="text-xs text-red-400 mt-1">
            Advertencia: Las flotas requieren un puerto
          </p>
        )}
      </div>

      {/* Adyacencias */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            Provincias Adyacentes ({province.adjacencies.length})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="adjacencyEditMode"
              checked={isAdjacencyEditMode}
              onChange={(e) => handleAdjacencyModeToggle(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="adjacencyEditMode" className="text-xs text-yellow-400 cursor-pointer">
              🎨 Modo Edición
            </label>
          </div>
        </div>
        {isAdjacencyEditMode && (
          <p className="text-xs text-gray-400 mb-2 italic">
            Mantén Ctrl presionado y haz clic en el mapa para añadir/quitar adyacencias
          </p>
        )}
        <div className="max-h-40 overflow-y-auto bg-gray-700 rounded p-2 space-y-1">
          {province.adjacencies.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">
              Sin provincias adyacentes
            </p>
          ) : (
            province.adjacencies
              .sort()
              .map((provinceId) => {
                const adjacentProvince = provinceMap.get(provinceId)
                const provinceName = adjacentProvince?.name || provinceId
                return (
                  <label
                    key={provinceId}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-600 px-2 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => toggleAdjacency(provinceId)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">
                      {provinceId} - {provinceName}
                    </span>
                  </label>
                )
              })
          )}
        </div>
      </div>
    </div>
  )
}
