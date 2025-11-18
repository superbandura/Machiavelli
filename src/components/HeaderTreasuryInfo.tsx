import { useState, useEffect } from 'react'
import { Player, Game, GameMap } from '@/types'
import { getProvinceIncome } from '@/utils/gameMapHelpers'

interface HeaderTreasuryInfoProps {
  player: Player
  gameMap: GameMap
  provinceFaction: Record<string, string>
  currentSeason: string
  game: Game
  unreadMessagesCount?: number
  onDiplomacyClick?: () => void
  onHistoryClick?: () => void
}

export default function HeaderTreasuryInfo({ player, gameMap, provinceFaction, currentSeason, game, unreadMessagesCount = 0, onDiplomacyClick, onHistoryClick }: HeaderTreasuryInfoProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isUrgent, setIsUrgent] = useState(false)

  // Calcular tiempo restante
  useEffect(() => {
    if (!game.phaseDeadline) {
      setTimeRemaining('')
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const deadline = game.phaseDeadline.seconds * 1000
      const diff = deadline - now

      if (diff <= 0) {
        setTimeRemaining('Fase finalizada')
        setIsUrgent(false)
        return
      }

      // Calcular días, horas, minutos, segundos
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      // Formatear tiempo
      let timeStr = ''
      if (days > 0) {
        timeStr = `${days}d ${hours}h ${minutes}m`
      } else if (hours > 0) {
        timeStr = `${hours}h ${minutes}m ${seconds}s`
      } else if (minutes > 0) {
        timeStr = `${minutes}m ${seconds}s`
      } else {
        timeStr = `${seconds}s`
      }

      setTimeRemaining(timeStr)

      // Marcar como urgente si quedan menos de 6 horas
      const hoursRemaining = diff / (1000 * 60 * 60)
      setIsUrgent(hoursRemaining < 6)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [game.phaseDeadline])

  // Obtener nombre de la fase en español
  const getPhaseNameInSpanish = (phase: string, status: string): string => {
    // Si el juego está en espera (waiting), mostrar eso en lugar de la fase
    if (status === 'waiting') {
      return 'En Espera'
    }

    const phaseNames: Record<string, string> = {
      diplomatic: 'Diplomática',
      orders: 'Órdenes',
      resolution: 'Resolución'
    }
    return phaseNames[phase] || phase
  }

  // Calcular provincias controladas e ingresos (igual que TreasuryPanel)
  const controlledProvinces = Object.entries(gameMap.provinces)
    .filter(([provinceId, _]) => provinceFaction[provinceId] === player.faction)
    .map(([provinceId, province]) => ({
      id: provinceId,
      name: province.cityName || province.name,
      income: getProvinceIncome(gameMap, provinceId)
    }))
    .sort((a, b) => b.income - a.income)

  const totalIncome = controlledProvinces.reduce((sum, p) => sum + p.income, 0)

  // Calcular ingresos previstos en primavera (solo en primavera se cobran impuestos)
  const springIncome = currentSeason === 'spring' ? totalIncome : 0

  return (
    <div className="flex items-center gap-3">
      {/* Fase actual */}
      <div className="px-4 py-2 bg-[#1d1408] rounded-lg border border-[#8b7355]">
        <div className="text-[10px] text-[#c9a961] uppercase tracking-wider">
          {game.status === 'waiting' ? 'Estado' : 'Fase'}
        </div>
        <div className="text-base font-bold text-[#f4e4c1] leading-tight">
          {getPhaseNameInSpanish(game.currentPhase, game.status)}
        </div>
      </div>

      {/* Botón de Diplomacia */}
      <button
        onClick={onDiplomacyClick}
        className="relative flex items-center gap-2 px-4 py-2 bg-[#1d1408] rounded-lg border border-[#8b7355] cursor-pointer hover:border-[#c9a961] hover:bg-[#2d2416] transition-colors"
        title="Abrir Diplomacia"
      >
        <img
          src="/icons/diplo.png"
          alt="Diplomacia"
          className="w-10 h-10 object-contain"
        />
        <div>
          <div className="text-[10px] text-[#c9a961] uppercase tracking-wider">Diplomacia</div>
          <div className="text-sm font-bold text-[#f4e4c1] leading-tight">
            Ver mensajes
          </div>
        </div>

        {/* Badge de mensajes sin leer */}
        {unreadMessagesCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-[#d4af37] text-[#2c1810] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg">
            {unreadMessagesCount}
          </div>
        )}
      </button>

      {/* Botón de Historial */}
      <button
        onClick={onHistoryClick}
        className="flex items-center gap-2 px-4 py-2 bg-[#1d1408] rounded-lg border border-[#8b7355] cursor-pointer hover:border-[#c9a961] hover:bg-[#2d2416] transition-colors"
        title="Abrir Historial de Turnos"
      >
        <img
          src="/icons/historial.png"
          alt="Historial"
          className="w-10 h-10 object-contain"
        />
        <div>
          <div className="text-[10px] text-[#c9a961] uppercase tracking-wider">Historial</div>
          <div className="text-sm font-bold text-[#f4e4c1] leading-tight">
            Ver turnos
          </div>
        </div>
      </button>

      {/* Tiempo restante */}
      {game.status === 'active' && game.phaseDeadline && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
          isUrgent
            ? 'bg-[#4d1d1d] border-[#8b3535] animate-pulse'
            : 'bg-[#1d1408] border-[#8b7355]'
        }`}>
          <img
            src="/icons/reloj.png"
            alt="Reloj"
            className="w-10 h-10 object-contain"
          />
          <div>
            <div className="text-[10px] text-[#c9a961] uppercase tracking-wider">Tiempo</div>
            <div className={`text-base font-bold leading-tight ${
              isUrgent ? 'text-red-400' : 'text-[#f4e4c1]'
            }`}>
              {timeRemaining || 'Calculando...'}
            </div>
          </div>
        </div>
      )}

      {/* Tesoro - con tooltip */}
      <div
        className="relative px-4 py-2 bg-[#1d1408] rounded-lg border border-[#8b7355] cursor-pointer hover:border-[#c9a961] transition-colors min-w-[140px]"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#c9a961] uppercase tracking-wider">Tesoro:</span>
          <span className="text-xl font-bold text-[#f4d03f]">{player.treasury}</span>
          <img
            src="/icons/tesoro.png"
            alt="Tesoro"
            className="w-10 h-10 object-contain"
          />
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute top-full mt-2 right-0 z-50 w-80 bg-[#2d2416] border-2 border-[#8b7355] rounded-lg shadow-2xl p-4 pointer-events-auto">
            {/* Header del tooltip */}
            <div className="border-b border-[#8b7355] pb-2 mb-3">
              <h3 className="text-[#f4e4c1] font-bold text-lg flex items-center gap-2">
                <img src="/icons/tesoro.png" alt="Tesoro" className="w-6 h-6" />
                Estado del Tesoro
              </h3>
            </div>

            {/* Provincias controladas */}
            <div className="mb-3">
              <h4 className="text-[#c9a961] text-sm font-semibold mb-2 uppercase tracking-wider">
                Provincias Controladas ({controlledProvinces.length})
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {controlledProvinces.length > 0 ? (
                  controlledProvinces.map(({ id, name, income }) => (
                    <div key={id} className="flex justify-between items-center text-sm bg-[#1d1408] px-2 py-1 rounded">
                      <span className="text-[#f4e4c1]">{name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[#f4d03f] font-semibold">+{income}</span>
                        <img src="/icons/tesoro.png" alt="Ducados" className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[#c9a961] text-xs text-center py-2">
                    No controlas ninguna provincia
                  </p>
                )}
              </div>
            </div>

            {/* Totales */}
            <div className="border-t border-[#8b7355] pt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#c9a961] text-sm font-semibold">Ingresos Totales:</span>
                <div className="flex items-center gap-1">
                  <span className="text-[#f4d03f] font-bold">+{totalIncome}</span>
                  <img src="/icons/tesoro.png" alt="Ducados" className="w-5 h-5" />
                </div>
              </div>

              {currentSeason === 'Primavera' ? (
                <div className="bg-[#1d5d1d] border border-[#2d8d2d] rounded px-2 py-1">
                  <div className="flex justify-between items-center">
                    <span className="text-green-300 text-sm font-semibold">Cobro en Primavera:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-green-400 font-bold">+{springIncome}</span>
                      <img src="/icons/tesoro.png" alt="Ducados" className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#4d3d2d] border border-[#6d5d4d] rounded px-2 py-1">
                  <p className="text-[#c9a961] text-xs text-center">
                    Los impuestos se cobran en Primavera
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
