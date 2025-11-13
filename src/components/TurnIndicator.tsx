import { useState, useEffect } from 'react'
import { Game } from '@/types'

interface TurnIndicatorProps {
  game: Game
}

export default function TurnIndicator({ game }: TurnIndicatorProps) {
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

  // Obtener color de la fase
  const getPhaseColor = (phase: string): string => {
    const phaseColors: Record<string, string> = {
      diplomatic: 'bg-purple-900/50 text-purple-300 border-purple-700',
      orders: 'bg-blue-900/50 text-blue-300 border-blue-700',
      resolution: 'bg-green-900/50 text-green-300 border-green-700'
    }
    return phaseColors[phase] || 'bg-gray-800 text-gray-300 border-gray-700'
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      {/* Información de turno y año */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">
            Turno {game.turnNumber}
          </h3>
          <div className="text-sm text-gray-400">
            {game.currentYear} - {getSeasonInSpanish(game.currentSeason)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Estado</div>
          <div className={`text-sm font-medium px-2 py-1 rounded capitalize ${
            game.status === 'waiting'
              ? 'bg-yellow-900/50 text-yellow-300'
              : game.status === 'active'
              ? 'bg-green-900/50 text-green-300'
              : 'bg-red-900/50 text-red-300'
          }`}>
            {game.status === 'waiting' && 'En espera'}
            {game.status === 'active' && 'Activa'}
            {game.status === 'finished' && 'Finalizada'}
          </div>
        </div>
      </div>

      {/* Fase actual */}
      <div className={`border rounded-lg p-3 ${getPhaseColor(game.currentPhase)}`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs opacity-75">Fase Actual</div>
            <div className="font-bold text-lg">
              {getPhaseNameInSpanish(game.currentPhase)}
            </div>
          </div>
          {game.currentPhase === 'diplomatic' && (
            <div className="text-2xl">💬</div>
          )}
          {game.currentPhase === 'orders' && (
            <div className="text-2xl">⚔️</div>
          )}
          {game.currentPhase === 'resolution' && (
            <div className="text-2xl">⚙️</div>
          )}
        </div>
      </div>

      {/* Contador regresivo */}
      {game.status === 'active' && game.phaseDeadline && (
        <div className={`border rounded-lg p-3 ${
          isUrgent
            ? 'bg-red-900/20 border-red-700'
            : 'bg-gray-900/50 border-gray-700'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-400">Tiempo Restante</div>
              <div className={`font-mono text-xl font-bold ${
                isUrgent ? 'text-red-400 animate-pulse' : 'text-white'
              }`}>
                {timeRemaining || 'Calculando...'}
              </div>
            </div>
            {isUrgent && (
              <div className="text-2xl animate-bounce">⏰</div>
            )}
          </div>
          {isUrgent && (
            <div className="mt-2 text-xs text-red-400 font-medium">
              ⚠️ ¡Tiempo limitado! Envía tus órdenes pronto
            </div>
          )}
        </div>
      )}

      {/* Información de duraciones configuradas */}
      <div className="border-t border-gray-700 pt-3">
        <div className="text-xs text-gray-400 mb-2">Duración de fases:</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-purple-900/20 border border-purple-800 rounded p-2 text-center">
            <div className="text-purple-400 font-medium">Diplomática</div>
            <div className="text-white">{game.phaseDurations.diplomatic}h</div>
          </div>
          <div className="bg-blue-900/20 border border-blue-800 rounded p-2 text-center">
            <div className="text-blue-400 font-medium">Órdenes</div>
            <div className="text-white">{game.phaseDurations.orders}h</div>
          </div>
          <div className="bg-green-900/20 border border-green-800 rounded p-2 text-center">
            <div className="text-green-400 font-medium">Resolución</div>
            <div className="text-white">{game.phaseDurations.resolution}h</div>
          </div>
        </div>
      </div>

      {/* Descripción de la fase actual */}
      <div className="text-xs text-gray-400 border-t border-gray-700 pt-3">
        {game.currentPhase === 'diplomatic' && (
          <>
            <strong className="text-purple-400">Fase Diplomática:</strong> Negocia con otros jugadores,
            forma alianzas y planifica tu estrategia. No se pueden dar órdenes aún.
          </>
        )}
        {game.currentPhase === 'orders' && (
          <>
            <strong className="text-blue-400">Fase de Órdenes:</strong> Introduce las órdenes para
            todas tus unidades. Puedes modificarlas hasta que expire el tiempo.
          </>
        )}
        {game.currentPhase === 'resolution' && (
          <>
            <strong className="text-green-400">Fase de Resolución:</strong> El sistema está procesando
            todas las órdenes y resolviendo batallas automáticamente.
          </>
        )}
      </div>
    </div>
  )
}
