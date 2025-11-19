import { useEffect, useState } from 'react'
import { Game, Player, Unit, MaritimeRoute } from '@/types'
import { getProvinceInfo, isCampaignTarget, isCoastalProvince, findAmphibiousRoute } from '@/utils/gameMapHelpers'
import { FleetComposition } from '@/types/scenario'

interface MilitaryCampaignPanelProps {
  game: Game
  provinceId: string
  currentPlayer: Player
  units: Unit[]
  provinceFaction: Record<string, string>
  onOpenCampaignModal: (provinceId: string) => void
}

export default function MilitaryCampaignPanel({
  game,
  provinceId,
  currentPlayer,
  units,
  provinceFaction,
  onOpenCampaignModal
}: MilitaryCampaignPanelProps) {
  // Estado para campañas anfibias (simplificado)
  const [maritimeRoute, setMaritimeRoute] = useState<MaritimeRoute | null>(null)
  const [fleetOrigin, setFleetOrigin] = useState<string | null>(null)

  const provinceInfo = getProvinceInfo(game.map, provinceId)

  // Verificar si esta provincia puede ser objetivo de campaña
  const campaignCheck = isCampaignTarget(
    game.map,
    provinceId,
    currentPlayer.id,
    units,
    provinceFaction,
    currentPlayer.faction
  )

  // Detectar y calcular ruta para campañas anfibias
  useEffect(() => {
    // Reset
    setMaritimeRoute(null)
    setFleetOrigin(null)

    // Verificar si la provincia objetivo es costera
    const isTargetCoastal = isCoastalProvince(game.map, provinceId)
    if (!isTargetCoastal || !campaignCheck.isValid) {
      return
    }

    // Buscar flotas con tropas embarcadas del jugador
    const fleetsWithTroops = units.filter(unit => {
      if (unit.owner !== currentPlayer.id) return false
      if (unit.type !== 'fleet') return false
      if (!unit.composition || !unit.embarkedTroops) return false

      const fleetComp = unit.composition as FleetComposition
      const totalShips = Object.values(fleetComp.ships).reduce((sum, n) => sum + n, 0)
      const embarkedCount = Object.values(unit.embarkedTroops.troops)
        .reduce((sum, n) => sum + (n || 0), 0)

      return totalShips > 0 && embarkedCount > 0
    })

    if (fleetsWithTroops.length === 0) {
      return
    }

    // Usar la primera flota encontrada (o la más cercana)
    const fleet = fleetsWithTroops[0]

    // Calcular ruta anfibia (incluye desembarco en costas terrestres)
    const route = findAmphibiousRoute(game.map, fleet.currentPosition, provinceId)

    if (route) {
      setMaritimeRoute(route)
      setFleetOrigin(fleet.currentPosition)
    }
  }, [game.map, provinceId, units, currentPlayer.id, campaignCheck.isValid])

  const handleOpenCampaignModal = () => {
    if (!campaignCheck.isValid) return
    onOpenCampaignModal(provinceId)
  }

  // Helper para convertir nombre de facción a nombre de archivo
  const getFactionImageName = (factionName: string): string => {
    const normalized = factionName.toLowerCase()
    if (normalized.includes('venecia')) return 'venecia'
    if (normalized.includes('milán') || normalized.includes('milan')) return 'milan'
    if (normalized.includes('florencia')) return 'florencia'
    if (normalized.includes('génova') || normalized.includes('genova')) return 'genova'
    if (normalized.includes('pontificios') || normalized.includes('papado')) return 'papado'
    return normalized.replace(/^república de |^ducado de |^reino de |^corona de /i, '').trim()
  }

  const controller = provinceFaction[provinceId]

  // Early return: No mostrar panel si la provincia es propia
  // (Esta es una capa de seguridad adicional, Game.tsx ya debería filtrar esto)
  if (controller === currentPlayer.faction) {
    return null
  }

  return (
    <div className="p-4 border-b border-[#b4a481] bg-[#e4d4b1] overflow-visible">
      <h3 className="font-bold mb-3 text-gray-800">
        Campaña Militar
      </h3>

      {/* Información del objetivo */}
      <div className="space-y-3 mb-4 overflow-visible">
        <div className="overflow-visible">
          {controller && (
            <div className="mb-2 flex justify-center">
              <img
                src={`/factions/${getFactionImageName(controller)}.png`}
                alt={controller}
                title={controller}
                className="w-24 h-24 opacity-90"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}
          <div className="font-bold text-red-800 text-center mb-2 flex items-center justify-center gap-2">
            {provinceInfo?.name || provinceId}
            {/* Icono de campaña anfibia */}
            {maritimeRoute && fleetOrigin && (
              <div className="group relative inline-block">
                {/* Solo el icono */}
                <img
                  src="/icons/puerto_mini.png"
                  alt="Campaña Anfibia"
                  className="w-6 h-6 cursor-help hover:opacity-80 transition-opacity"
                />

                {/* Tooltip con información detallada */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[100]
                              opacity-0 invisible
                              group-hover:opacity-100 group-hover:visible
                              transition-all duration-200
                              pointer-events-none
                              w-[220px]">
                  <div className="bg-[#2d2416] border-2 border-[#d4af37] rounded-lg shadow-ornate p-3">
                    {/* Título */}
                    <div className="font-heading font-semibold text-sm text-[#f0d877] mb-3 text-center border-b border-[#b4a481] pb-2 flex items-center justify-center gap-2">
                      <img
                        src="/icons/puerto_mini.png"
                        alt="Puerto"
                        className="w-5 h-5"
                      />
                      Ruta Marítima
                    </div>

                    {/* Ruta completa - vertical */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-[#f0d877] mb-2">
                        Ruta:
                      </div>
                      <div className="space-y-1">
                        {maritimeRoute.path.map((provinceId, idx) => (
                          <div key={`step-${idx}`} className="flex items-center gap-2">
                            <span className="text-[#d4af37] text-xs">→</span>
                            <span className="text-xs text-[#c4b491] font-serif">
                              {getProvinceInfo(game.map, provinceId)?.name || provinceId}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Desglose de travesía */}
                    {maritimeRoute.seaZones.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-[#f0d877] mb-2">
                          Duración:
                        </div>
                        <div className="text-xs text-[#c4b491] space-y-1 font-serif">
                          {maritimeRoute.seaZones.map((seaZone, idx) => (
                            <div key={`sea-${idx}`} className="flex justify-between">
                              <span className="truncate mr-2">
                                {getProvinceInfo(game.map, seaZone)?.name || seaZone}
                              </span>
                              <span className="text-[#f0d877] shrink-0">1 día</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="pt-2 border-t border-[#b4a481] text-xs font-serif text-center">
                      <span className="text-[#c4b491]">Total: </span>
                      <span className="text-[#f0d877] font-semibold">
                        {maritimeRoute.estimatedDays} día{maritimeRoute.estimatedDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {controller && (
            <div className="text-center text-sm text-gray-700 mb-2">
              Controlada por <span className="font-semibold">{controller}</span>
            </div>
          )}
        </div>

        {/* Estado de validación - Solo mostrar error */}
        {!campaignCheck.isValid && (
          <div className="bg-amber-100 border border-amber-400 rounded px-3 py-2 text-xs text-amber-900">
            <div className="font-semibold mb-1">⚠️ Campaña no disponible</div>
            <div>
              Necesitas unidades (Army o Fleet) en provincias adyacentes a este objetivo.
            </div>
          </div>
        )}

      </div>

      {/* Botón de acción */}
      <div className="space-y-2">
        <button
          onClick={handleOpenCampaignModal}
          disabled={!campaignCheck.isValid}
          className={`
            w-full flex justify-center items-center
            transition-opacity duration-200
            ${
              campaignCheck.isValid
                ? 'cursor-pointer opacity-100 hover:opacity-80'
                : 'cursor-not-allowed opacity-50'
            }
          `}
        >
          <img
            src="/icons/reclutar.png"
            alt="Planificar Campaña Militar"
            title="Planificar Campaña Militar"
            className="w-16 h-16"
          />
        </button>
      </div>

      {/* Información adicional */}
      <div className="mt-4 pt-3 border-t border-[#b4a481]">
        <div className="text-xs text-gray-600 italic">
          Las campañas militares se declaran durante la fase diplomática de primavera
          para planificar las operaciones del año.
        </div>
      </div>
    </div>
  )
}
