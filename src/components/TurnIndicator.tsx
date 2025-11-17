import { useState, useEffect } from 'react'
import { Game } from '@/types'
import Hourglass from './decorative/icons/Hourglass'
import Separator from './decorative/Separator'

interface TurnIndicatorProps {
  game: Game
  onDiplomacyClick?: () => void
}

export default function TurnIndicator({ game, onDiplomacyClick }: TurnIndicatorProps) {
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
  const getPhaseNameInSpanish = (phase: string): string => {
    const phaseNames: Record<string, string> = {
      diplomatic: 'Diplomática',
      orders: 'Órdenes',
      resolution: 'Resolución'
    }
    return phaseNames[phase] || phase
  }

  // Obtener color de la fase (Renaissance style)
  const getPhaseColor = (phase: string): string => {
    const phaseColors: Record<string, string> = {
      diplomatic: 'bg-burgundy-700/30 text-black border-burgundy-500',
      orders: 'bg-renaissance-bronze/20 text-renaissance-bronze-light border-renaissance-bronze',
      resolution: 'bg-renaissance-gold/20 text-renaissance-gold-light border-[#b4a481]'
    }
    return phaseColors[phase] || 'bg-transparent text-gray-800 border-gray-700'
  }

  // Obtener icono de la fase
  const getPhaseIcon = (phase: string): string => {
    const icons: Record<string, string> = {
      diplomatic: '📜', // Pergamino
      orders: '⚔️',    // Espadas
      resolution: '⚙️'  // Engranajes
    }
    return icons[phase] || '•'
  }

  // Obtener nombre de la temporada en español
  const getSeasonInSpanish = (season: string): string => {
    const seasonNames: Record<string, string> = {
      spring: 'Primavera',
      summer: 'Verano',
      fall: 'Otoño'
    }
    return seasonNames[season] || season
  }

  return (
    <div className="bg-transparent border-2 border-[#b4a481] rounded-lg p-5 space-y-4 shadow-ornate">
      {/* Header ornamentado */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-heading font-bold text-renaissance-gold">
            Turno {game.turnNumber}
          </h3>
          <div className="text-base font-serif text-gray-800 mt-1">
            Anno Domini {game.currentYear} · {getSeasonInSpanish(game.currentSeason)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-serif text-gray-700 uppercase tracking-wider">Estado</div>
          <div className={`text-sm font-heading font-medium px-3 py-1.5 rounded border-2 capitalize mt-1 ${
            game.status === 'waiting'
              ? 'bg-renaissance-bronze/20 border-renaissance-bronze text-renaissance-bronze-light'
              : game.status === 'active'
              ? 'bg-renaissance-gold/20 border-[#b4a481] text-renaissance-gold-light'
              : 'bg-burgundy-700/30 border-burgundy-500 text-burgundy-300'
          }`}>
            {game.status === 'waiting' && 'En espera'}
            {game.status === 'active' && 'Activa'}
            {game.status === 'finished' && 'Finalizada'}
          </div>
        </div>
      </div>

      <Separator variant="gold" />

      {/* Fase actual */}
      <div
        className={`border-2 rounded-lg p-4 ${getPhaseColor(game.currentPhase)} transition-all duration-300 ${
          onDiplomacyClick ? 'cursor-pointer hover:shadow-glow-gold hover:border-[#b4a481]' : ''
        }`}
        onClick={onDiplomacyClick}
        title={onDiplomacyClick ? 'Click para abrir mensajes diplomáticos' : ''}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-serif opacity-75 uppercase tracking-wider">Fase Actual</div>
            <div className="font-heading font-bold text-2xl mt-1">
              {getPhaseNameInSpanish(game.currentPhase)}
            </div>
            {onDiplomacyClick && (
              <div className="text-xs font-serif opacity-75 mt-2 italic">
                Click para ver diplomacia →
              </div>
            )}
          </div>
          <div className="text-4xl opacity-80">
            {getPhaseIcon(game.currentPhase)}
          </div>
        </div>
      </div>

      {/* Contador regresivo con reloj de arena */}
      {game.status === 'active' && game.phaseDeadline && (
        <div className={`border-2 rounded-lg p-4 transition-all ${
          isUrgent
            ? 'bg-burgundy-700/20 border-burgundy-400 shadow-glow-burgundy'
            : 'bg-[#f4e4c1] border-renaissance-bronze'
        }`}>
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <div className="text-xs font-serif text-gray-700 uppercase tracking-wider">Tiempo Restante</div>
              <div className={`font-heading text-2xl font-bold mt-1 ${
                isUrgent ? 'text-burgundy-300 animate-pulse' : 'text-renaissance-gold'
              }`}>
                {timeRemaining || 'Calculando...'}
              </div>
            </div>
            <Hourglass className="w-12 h-12 flex-shrink-0" animated={isUrgent} />
          </div>
          {isUrgent && (
            <div className="mt-3 text-sm font-serif text-burgundy-300 font-medium border-t border-burgundy-600 pt-3">
              ⚠️ Tempus fugit! Envía tus órdenes pronto
            </div>
          )}
        </div>
      )}

      <Separator variant="gray" />

      {/* Información de duraciones configuradas */}
      <div>
        <div className="text-xs font-serif text-gray-700 uppercase tracking-wider mb-3">Duración de fases</div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-burgundy-700/20 border-2 border-burgundy-600 rounded-lg p-2.5 text-center hover:border-burgundy-500 transition-colors">
            <div className="text-burgundy-300 font-heading font-semibold">Diplomática</div>
            <div className="text-black font-serif text-base mt-1">{game.phaseDurations.diplomatic}h</div>
          </div>
          <div className="bg-renaissance-bronze/20 border-2 border-renaissance-bronze rounded-lg p-2.5 text-center hover:border-renaissance-bronze-light transition-colors">
            <div className="text-renaissance-bronze-light font-heading font-semibold">Órdenes</div>
            <div className="text-black font-serif text-base mt-1">{game.phaseDurations.orders}h</div>
          </div>
          <div className="bg-renaissance-gold/20 border-2 border-[#b4a481]-dark rounded-lg p-2.5 text-center hover:border-[#b4a481] transition-colors">
            <div className="text-renaissance-gold-light font-heading font-semibold">Resolución</div>
            <div className="text-black font-serif text-base mt-1">{game.phaseDurations.resolution}h</div>
          </div>
        </div>
      </div>

      <Separator variant="gray" />

      {/* Descripción de la fase actual */}
      <div className="text-sm font-serif text-gray-800 leading-relaxed">
        {game.currentPhase === 'diplomatic' && (
          <>
            <strong className="text-burgundy-300 font-heading">Fase Diplomática:</strong> Negocia con otros jugadores,
            forma alianzas y planifica tu estrategia. No se pueden dar órdenes aún.
          </>
        )}
        {game.currentPhase === 'orders' && (
          <>
            <strong className="text-renaissance-bronze-light font-heading">Fase de Órdenes:</strong> Introduce las órdenes para
            todas tus unidades. Puedes modificarlas hasta que expire el tiempo.
          </>
        )}
        {game.currentPhase === 'resolution' && (
          <>
            <strong className="text-renaissance-gold-light font-heading">Fase de Resolución:</strong> El sistema está procesando
            todas las órdenes y resolviendo batallas automáticamente.
          </>
        )}
      </div>
    </div>
  )
}
