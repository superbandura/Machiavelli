import { FactionSetup, EditableProvinceData } from '@/types/scenario'
import { FactionDocument } from '@/types/faction'

interface FactionTreasuryPanelProps {
  factionSetups: FactionSetup[]
  provinces: EditableProvinceData[]
  factions: FactionDocument[]
  onChange: (setups: FactionSetup[]) => void
}

export default function FactionTreasuryPanel({
  factionSetups,
  provinces,
  factions,
  onChange,
}: FactionTreasuryPanelProps) {
  // Calcular estadísticas de cada facción
  const getFactionStats = (factionId: string) => {
    const factionProvinces = provinces.filter(p => p.controlledBy === factionId)
    const numProvinces = factionProvinces.length
    const numCities = factionProvinces.filter(p => p.hasCity).length
    const totalIncome = factionProvinces
      .filter(p => p.hasCity)
      .reduce((sum, p) => sum + p.income, 0)

    return { numProvinces, numCities, totalIncome }
  }

  // Actualizar tesoro de una facción
  const handleTreasuryChange = (factionId: string, value: number) => {
    const updatedSetups = factionSetups.map(setup =>
      setup.factionId === factionId
        ? { ...setup, treasury: Math.max(0, Math.min(99999, value)) }
        : setup
    )
    onChange(updatedSetups)
  }

  // Obtener facción por ID
  const getFaction = (factionId: string) => {
    return factions.find(f => f.id === factionId)
  }

  // Filtrar solo facciones que tienen provincias
  const factionsWithProvinces = factionSetups.filter(setup => {
    const stats = getFactionStats(setup.factionId)
    return stats.numProvinces > 0
  })

  if (factionsWithProvinces.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <span>💰</span>
          <span>Tesoro Inicial de Facciones</span>
        </h3>
        <p className="text-sm text-gray-400 text-center py-4">
          No hay facciones asignadas a provincias aún
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>💰</span>
        <span>Tesoro Inicial de Facciones</span>
      </h3>

      <div className="space-y-3">
        {factionsWithProvinces.map(setup => {
          const faction = getFaction(setup.factionId)
          const stats = getFactionStats(setup.factionId)

          if (!faction) return null

          return (
            <div
              key={setup.factionId}
              className="bg-gray-700 rounded-lg p-3 border border-gray-600"
            >
              {/* Header con nombre y emblema */}
              <div className="flex items-center gap-2 mb-2">
                {faction.emblemUrl && (
                  <img
                    src={faction.emblemUrl}
                    alt={faction.name}
                    className="w-6 h-6 object-contain"
                  />
                )}
                <span className="font-semibold text-white">{faction.name}</span>
              </div>

              {/* Input de tesoro */}
              <div className="mb-2">
                <label className="block text-xs text-gray-400 mb-1">
                  Tesoro Inicial
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={99999}
                    value={setup.treasury}
                    onChange={(e) => handleTreasuryChange(setup.factionId, parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-400">ducados</span>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span>📍</span>
                  <span>{stats.numProvinces} {stats.numProvinces === 1 ? 'provincia' : 'provincias'}</span>
                </span>
                <span className="text-gray-600">|</span>
                <span className="flex items-center gap-1">
                  <span>🏛️</span>
                  <span>{stats.numCities} {stats.numCities === 1 ? 'ciudad' : 'ciudades'}</span>
                </span>
                <span className="text-gray-600">|</span>
                <span className="flex items-center gap-1">
                  <span>💵</span>
                  <span>+{stats.totalIncome} ducados/turno</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
