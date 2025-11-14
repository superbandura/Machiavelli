import { useState } from 'react'
import { EditableProvinceData } from '@/types/scenario'
import { FactionDocument } from '@/types/faction'
import UnitBuilderModal from './UnitBuilderModal'

interface ProvinceEditorPanelProps {
  province: EditableProvinceData | null
  onChange: (province: EditableProvinceData) => void
  factions: FactionDocument[]
  onAdjacencyModeChange?: (enabled: boolean) => void
  allProvinces: EditableProvinceData[]
  onAutoCorrectBidirectionality?: () => void
}

/**
 * Detecta errores de bidireccionalidad en las adyacencias
 */
function detectBidirectionalityErrors(provinces: EditableProvinceData[]): string[] {
  const errors: string[] = []
  const provinceMap = new Map(provinces.map((p) => [p.id, p]))

  for (const province of provinces) {
    for (const adjId of province.adjacencies) {
      const adjacent = provinceMap.get(adjId)
      if (!adjacent) {
        errors.push(`${province.id}: Adyacencia a provincia inexistente "${adjId}"`)
        continue
      }

      // Verificar bidireccionalidad
      if (!adjacent.adjacencies.includes(province.id)) {
        errors.push(`${province.id} → ${adjId}, pero ${adjId} NO → ${province.id}`)
      }
    }
  }

  return errors
}

export default function ProvinceEditorPanel({
  province,
  onChange,
  factions,
  onAdjacencyModeChange,
  allProvinces,
  onAutoCorrectBidirectionality,
}: ProvinceEditorPanelProps) {
  const [isAdjacencyEditMode, setIsAdjacencyEditMode] = useState(false)
  const [modalOpen, setModalOpen] = useState<'army' | 'garrison' | 'fleet' | null>(null)

  const handleAdjacencyModeToggle = (enabled: boolean) => {
    setIsAdjacencyEditMode(enabled)
    if (onAdjacencyModeChange) {
      onAdjacencyModeChange(enabled)
    }
  }

  // Detectar errores de bidireccionalidad
  const bidirectionalityErrors = detectBidirectionalityErrors(allProvinces)
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
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Unidades Iniciales
        </label>

        {/* Ejércitos - Solo provincias terrestres */}
        {province.type !== 'sea' && (
          <div className="space-y-2">
            <button
              onClick={() => setModalOpen('army')}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center justify-center gap-2"
            >
              <span>⚔️</span>
              <span>Gestionar Ejércitos</span>
            </button>
            {/* Lista compacta de ejércitos */}
            {province.units.filter(u => 'troops' in u && 'lightCavalry' in u.troops).length > 0 && (
              <div className="bg-gray-700/50 rounded p-2 space-y-1">
                {province.units
                  .filter(u => 'troops' in u && 'lightCavalry' in u.troops)
                  .map((unit, idx) => {
                    const count = 'troops' in unit ? Object.values(unit.troops).reduce((s, n) => s + n, 0) : 0
                    return (
                      <div key={idx} className="text-sm text-gray-300">
                        • {unit.name} - {count} tropas
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* Guarniciones - Solo si tiene ciudad */}
        {province.hasCity && (
          <div className="space-y-2">
            <button
              onClick={() => setModalOpen('garrison')}
              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium flex items-center justify-center gap-2"
            >
              <span>🏰</span>
              <span>Gestionar Guarnición</span>
            </button>
            {/* Lista compacta de guarniciones */}
            {province.units.filter(u => 'troops' in u && !('lightCavalry' in u.troops)).length > 0 && (
              <div className="bg-gray-700/50 rounded p-2 space-y-1">
                {province.units
                  .filter(u => 'troops' in u && !('lightCavalry' in u.troops))
                  .map((unit, idx) => {
                    const count = 'troops' in unit ? Object.values(unit.troops).reduce((s, n) => s + n, 0) : 0
                    return (
                      <div key={idx} className="text-sm text-gray-300">
                        • {unit.name} - {count} tropas
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* Flotas - Solo si es puerto */}
        {province.isPort && (
          <div className="space-y-2">
            <button
              onClick={() => setModalOpen('fleet')}
              className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-medium flex items-center justify-center gap-2"
            >
              <span>⛵</span>
              <span>Gestionar Flotas</span>
            </button>
            {/* Lista compacta de flotas */}
            {province.units.filter(u => 'ships' in u).length > 0 && (
              <div className="bg-gray-700/50 rounded p-2 space-y-1">
                {province.units
                  .filter(u => 'ships' in u)
                  .map((unit, idx) => {
                    const count = 'ships' in unit ? Object.values(unit.ships).reduce((s, n) => s + n, 0) : 0
                    return (
                      <div key={idx} className="text-sm text-gray-300">
                        • {unit.name} - {count} naves
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales para gestionar unidades */}
      {modalOpen === 'army' && province && (
        <UnitBuilderModal
          isOpen={true}
          onClose={() => setModalOpen(null)}
          unitType="army"
          existingUnits={province.units.filter(u => 'troops' in u && 'lightCavalry' in u.troops)}
          onSave={(units) => {
            const otherUnits = province.units.filter(u => !('troops' in u && 'lightCavalry' in u.troops))
            onChange({ ...province, units: [...otherUnits, ...units] })
          }}
        />
      )}

      {modalOpen === 'garrison' && province && (
        <UnitBuilderModal
          isOpen={true}
          onClose={() => setModalOpen(null)}
          unitType="garrison"
          existingUnits={province.units.filter(u => 'troops' in u && !('lightCavalry' in u.troops))}
          onSave={(units) => {
            const otherUnits = province.units.filter(u => !('troops' in u && !('lightCavalry' in u.troops)))
            onChange({ ...province, units: [...otherUnits, ...units] })
          }}
          cityName={province.cityName}
        />
      )}

      {modalOpen === 'fleet' && province && (
        <UnitBuilderModal
          isOpen={true}
          onClose={() => setModalOpen(null)}
          unitType="fleet"
          existingUnits={province.units.filter(u => 'ships' in u)}
          onSave={(units) => {
            const otherUnits = province.units.filter(u => !('ships' in u))
            onChange({ ...province, units: [...otherUnits, ...units] })
          }}
        />
      )}

      {/* Panel de Validación de Bidireccionalidad */}
      {bidirectionalityErrors.length > 0 && (
        <div className="bg-red-900/20 border border-red-500 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-red-400">
              ⚠️ {bidirectionalityErrors.length} errores de bidireccionalidad
            </p>
            {onAutoCorrectBidirectionality && (
              <button
                onClick={onAutoCorrectBidirectionality}
                className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
              >
                Auto-Corregir
              </button>
            )}
          </div>
          <div className="max-h-32 overflow-y-auto text-xs text-red-300 space-y-1">
            {bidirectionalityErrors.slice(0, 5).map((error, idx) => (
              <div key={idx} className="font-mono">
                • {error}
              </div>
            ))}
            {bidirectionalityErrors.length > 5 && (
              <div className="text-red-400 italic">
                ... y {bidirectionalityErrors.length - 5} errores más
              </div>
            )}
          </div>
        </div>
      )}

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

        {isAdjacencyEditMode ? (
          // MODO EDICIÓN: Lista completa de provincias
          <>
            <p className="text-xs text-gray-400 mb-2 italic">
              Haz clic en el mapa o en las provincias de la lista para añadir/quitar adyacencias
            </p>
            <div className="max-h-96 overflow-y-auto bg-gray-700 rounded p-2 space-y-1">
              {allProvinces
                .sort((a, b) => a.id.localeCompare(b.id))
                .filter((p) => p.id !== province.id) // Excluir la provincia actual
                .map((targetProvince) => {
                  const isAdjacent = province.adjacencies.includes(targetProvince.id)
                  return (
                    <label
                      key={targetProvince.id}
                      className={`flex items-center gap-2 cursor-pointer hover:bg-gray-600 px-2 py-1 rounded ${
                        isAdjacent ? 'bg-green-900/30' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAdjacent}
                        onChange={() => toggleAdjacency(targetProvince.id)}
                        className="w-4 h-4"
                      />
                      <span className={`text-sm ${isAdjacent ? 'text-green-300 font-medium' : 'text-gray-300'}`}>
                        {targetProvince.id} - {targetProvince.name}
                      </span>
                    </label>
                  )
                })}
            </div>
          </>
        ) : (
          // MODO NORMAL: Solo adyacencias actuales
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
        )}
      </div>
    </div>
  )
}
