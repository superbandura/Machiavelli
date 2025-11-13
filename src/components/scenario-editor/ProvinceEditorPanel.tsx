import { EditableProvinceData } from '@/types/scenario'
import { FACTIONS } from '@/data/factions'
import { PROVINCE_INFO } from '@/data/provinceData'

interface ProvinceEditorPanelProps {
  province: EditableProvinceData | null
  onChange: (province: EditableProvinceData) => void
  availableFactions: string[]
}

export default function ProvinceEditorPanel({
  province,
  onChange,
  availableFactions,
}: ProvinceEditorPanelProps) {
  if (!province) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center h-full">
        <p className="text-gray-400">
          Selecciona una provincia en el mapa para editarla
        </p>
      </div>
    )
  }

  const allProvinceIds = Object.keys(PROVINCE_INFO)

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

      {/* Control */}
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
          {availableFactions.map((factionId) => {
            const faction = FACTIONS[factionId as keyof typeof FACTIONS]
            return (
              <option key={factionId} value={factionId}>
                {faction.name}
              </option>
            )
          })}
        </select>
      </div>

      {/* Ciudad */}
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

      {/* Puerto */}
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

      {/* Unidades Iniciales */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Unidades Iniciales
        </label>
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
        {province.fleets > 0 && !province.isPort && (
          <p className="text-xs text-red-400 mt-1">
            Advertencia: Las flotas requieren un puerto
          </p>
        )}
      </div>

      {/* Adyacencias */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Provincias Adyacentes
        </label>
        <div className="max-h-40 overflow-y-auto bg-gray-700 rounded p-2 space-y-1">
          {allProvinceIds
            .filter((id) => id !== province.id)
            .sort()
            .map((provinceId) => {
              const isAdjacent = province.adjacencies.includes(provinceId)
              const provinceInfo = PROVINCE_INFO[provinceId]
              return (
                <label
                  key={provinceId}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-600 px-2 py-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={isAdjacent}
                    onChange={() => toggleAdjacency(provinceId)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-300">
                    {provinceId} - {provinceInfo.name}
                  </span>
                </label>
              )
            })}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {province.adjacencies.length} provincias adyacentes
        </p>
      </div>
    </div>
  )
}
