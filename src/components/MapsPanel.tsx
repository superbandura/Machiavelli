export type MapFilter = 'cities' | 'ports' | 'campaign-targets' | 'income-heatmap' | null

interface MapsPanelProps {
  activeFilter: MapFilter
  onFilterChange: (filter: MapFilter) => void
}

export default function MapsPanel({ activeFilter, onFilterChange }: MapsPanelProps) {
  const handleFilterClick = (filter: 'cities' | 'ports' | 'campaign-targets' | 'income-heatmap') => {
    // Si el filtro ya está activo, desactivarlo; si no, activarlo
    onFilterChange(activeFilter === filter ? null : filter)
  }

  return (
    <div className="bg-transparent rounded-lg p-3 border-2 border-[#b4a481] shadow-ornate">
      {/* Grid de botones de filtro 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Filtro de Ciudades */}
        <button
          onClick={() => handleFilterClick('cities')}
          className={`p-3 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            activeFilter === 'cities'
              ? 'bg-green-600 border-green-700 shadow-lg scale-105'
              : 'bg-[#d4c4a1] border-[#b4a481] hover:bg-[#c4b49a] hover:border-[#8b7355]'
          }`}
          title="Ciudades"
        >
          <img
            src="/icons/ciudad_mini.png"
            alt="Ciudades"
            className="w-12 h-12 object-contain"
          />
        </button>

        {/* Filtro de Puertos */}
        <button
          onClick={() => handleFilterClick('ports')}
          className={`p-3 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            activeFilter === 'ports'
              ? 'bg-blue-600 border-blue-700 shadow-lg scale-105'
              : 'bg-[#d4c4a1] border-[#b4a481] hover:bg-[#c4b49a] hover:border-[#8b7355]'
          }`}
          title="Puertos"
        >
          <img
            src="/icons/puerto_mini.png"
            alt="Puertos"
            className="w-12 h-12 object-contain"
          />
        </button>

        {/* Filtro de Campañas Militares */}
        <button
          onClick={() => handleFilterClick('campaign-targets')}
          className={`p-3 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            activeFilter === 'campaign-targets'
              ? 'bg-red-600 border-red-700 shadow-lg scale-105'
              : 'bg-[#d4c4a1] border-[#b4a481] hover:bg-[#c4b49a] hover:border-[#8b7355]'
          }`}
          title="Campañas"
        >
          <img
            src="/icons/campaña_mini.png"
            alt="Campañas"
            className="w-12 h-12 object-contain"
          />
        </button>

        {/* Filtro de Ingresos */}
        <button
          onClick={() => handleFilterClick('income-heatmap')}
          className={`p-3 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            activeFilter === 'income-heatmap'
              ? 'bg-orange-600 border-orange-700 shadow-lg scale-105'
              : 'bg-[#d4c4a1] border-[#b4a481] hover:bg-[#c4b49a] hover:border-[#8b7355]'
          }`}
          title="Ingresos"
        >
          <img
            src="/icons/ingresos_mini.png"
            alt="Ingresos"
            className="w-12 h-12 object-contain"
          />
        </button>
      </div>
    </div>
  )
}
