import type { MilitaryCampaign, Player, Game } from '@/types/game'
import { FACTIONS } from '@/data/factions'
import { getProvinceInfo } from '@/utils/gameMapHelpers'

/**
 * Props para el componente CampaignsPanel
 */
interface CampaignsPanelProps {
  /** Lista de todas las campañas militares activas del juego */
  campaigns: MilitaryCampaign[]
  /** Información del juego (mapa, turno, estado) */
  game: Game
  /** Jugador actual */
  player: Player
  /** Callback cuando se selecciona una campaña para ver detalles */
  onSelectCampaign: (campaign: MilitaryCampaign) => void
}

/**
 * Panel de lista de campañas militares activas
 *
 * Muestra todas las campañas del año actual con información visual compacta:
 * - **Emblemas de facciones:** Atacantes vs Defensores
 * - **Aliados:** Muestra emblemas de todos los aliados de cada bando
 * - **Objetivo:** Nombre de la provincia atacada
 * - **Indicadores:** Icono de campaña anfibia (⚓), estrella si es propia (★)
 * - **Click:** Abre modal de gestión de campaña
 *
 * **Características:**
 * - Vista compacta con emblemas (~5px cada uno)
 * - Fallback a círculos de color si faltan imágenes
 * - Hover con shadow para indicar interactividad
 * - Destacado visual para campañas propias (border gold)
 * - Mensaje de "No hay campañas activas" si lista vacía
 *
 * **Flujo:**
 * 1. Carga campañas de `game.campaigns` o prop
 * 2. Por cada campaña, renderiza atacantes → defensor
 * 3. Click → `onSelectCampaign(campaign)` → abre modal
 *
 * @component
 * @example
 * <CampaignsPanel
 *   campaigns={activeCampaigns}
 *   game={currentGame}
 *   player={currentPlayer}
 *   onSelectCampaign={(camp) => openModal(camp)}
 * />
 */

export default function CampaignsPanel({
  campaigns,
  game,
  player,
  onSelectCampaign
}: CampaignsPanelProps) {
  if (campaigns.length === 0) {
    return (
      <div className="p-4 text-center">
        <img
          src="/icons/campañas.png"
          alt=""
          className="w-12 h-12 object-contain mx-auto mb-3 opacity-30"
        />
        <p className="text-sm text-[#6b5d42] italic">No hay campañas activas</p>
      </div>
    )
  }

  return (
    <div className="p-2 space-y-2">
      {campaigns.map(campaign => {
        const targetProvinceInfo = game.map
          ? getProvinceInfo(game.map, campaign.targetProvince)
          : null
        const attackerFaction = FACTIONS[campaign.declaredByFaction]
        const isOwn = campaign.declaredBy === player.userId

        // Obtener facción defensora de la provincia objetivo
        const defenderFactionName = game.map?.provinces[campaign.targetProvince]?.controlledBy || 'neutral'
        const defenderFaction = FACTIONS[defenderFactionName]

        return (
          <div
            key={campaign.id}
            onClick={() => onSelectCampaign(campaign)}
            className={`bg-[#d4c4a1] border rounded p-2 cursor-pointer transition-all hover:shadow-md
              ${
                isOwn
                  ? 'border-renaissance-gold hover:bg-[#c4b49a]'
                  : 'border-[#b4a481] hover:border-[#8b7355]'
              }`}
          >
            {/* Header compacto con emblemas y objetivo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {/* EQUIPO ATACANTE */}
                <div className="flex items-center gap-0.5">
                  {/* Emblema del atacante principal */}
                  <img
                    src={`/factions/${campaign.declaredByFaction.toLowerCase()}.png`}
                    alt={attackerFaction?.name || campaign.declaredByFaction}
                    title={`Atacante: ${attackerFaction?.name || campaign.declaredByFaction}`}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent && !parent.querySelector('.fallback-emblem-attacker')) {
                        const fallback = document.createElement('div')
                        fallback.className = 'fallback-emblem-attacker w-4 h-4 rounded-full border border-[#4a3f2a]'
                        fallback.style.backgroundColor = attackerFaction?.color || '#9ca3af'
                        fallback.title = attackerFaction?.name || 'Desconocido'
                        parent.insertBefore(fallback, e.currentTarget)
                      }
                    }}
                  />

                  {/* Aliados atacantes */}
                  {campaign.allies?.filter(a => a.side === 'attacker').map(ally => (
                    <img
                      key={ally.id}
                      src={`/factions/${ally.faction.toLowerCase()}.png`}
                      alt={ally.faction}
                      title={`Aliado atacante: ${ally.faction}`}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                      }}
                    />
                  ))}
                </div>

                {/* FLECHA SEPARADORA */}
                <span className="text-red-600 text-sm font-bold mx-1">→</span>

                {/* EQUIPO DEFENSOR */}
                <div className="flex items-center gap-0.5">
                  {/* Emblema del defensor principal */}
                  <img
                    src={`/factions/${defenderFactionName.toLowerCase()}.png`}
                    alt={defenderFaction?.name || defenderFactionName}
                    title={`Defensor: ${defenderFaction?.name || defenderFactionName}`}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent && !parent.querySelector('.fallback-emblem-defender')) {
                        const fallback = document.createElement('div')
                        fallback.className = 'fallback-emblem-defender w-4 h-4 rounded-full border border-[#4a3f2a]'
                        fallback.style.backgroundColor = defenderFaction?.color || '#9ca3af'
                        fallback.title = defenderFaction?.name || 'Desconocido'
                        parent.insertBefore(fallback, e.currentTarget)
                      }
                    }}
                  />

                  {/* Aliados defensores */}
                  {campaign.allies?.filter(a => a.side === 'defender').map(ally => (
                    <img
                      key={ally.id}
                      src={`/factions/${ally.faction.toLowerCase()}.png`}
                      alt={ally.faction}
                      title={`Aliado defensor: ${ally.faction}`}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                      }}
                    />
                  ))}
                </div>

                <span className="text-xs font-heading font-semibold text-[#2d1810] truncate">
                  {targetProvinceInfo?.name || campaign.targetProvince}
                </span>
              </div>

              {/* Indicadores */}
              <div className="flex items-center gap-1">
                {campaign.route && (
                  <img src="/icons/puerto_mini.png" alt="Anfibia" className="w-3 h-3 object-contain" title="Campaña Anfibia" />
                )}
                {isOwn && (
                  <span className="text-xs text-renaissance-gold">★</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
