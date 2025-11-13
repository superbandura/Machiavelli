/**
 * VictoryScreen - Pantalla de fin de partida
 *
 * Se muestra cuando el juego está en estado 'finished'
 * Muestra el ganador, tipo de victoria y estadísticas finales
 */

import { Game, Player, Unit } from '@/types'
import { PROVINCE_INFO } from '@/data/provinceData'

interface VictoryScreenProps {
  game: Game
  players: Player[]
  units: Unit[]
  currentPlayer: Player
  onBackToLobby: () => void
}

export default function VictoryScreen({
  game,
  players,
  units,
  currentPlayer,
  onBackToLobby,
}: VictoryScreenProps) {
  // Determinar ganador(es)
  const winnerId = (game as any).winnerId
  const winnerIds = (game as any).winnerIds || []
  const victoryType = (game as any).victoryType || 'unknown'

  const isSharedVictory = winnerIds.length > 1
  const winners = isSharedVictory
    ? players.filter(p => winnerIds.includes(p.id))
    : players.filter(p => p.id === winnerId)

  const isWinner = winners.some(w => w.id === currentPlayer.id)

  // Calcular estadísticas finales
  const playerStats = players.map(player => {
    const playerUnits = units.filter(u => u.owner === player.id)
    const garrisons = playerUnits.filter(u => u.type === 'garrison')
    const cities = garrisons.filter(g => {
      const provinceInfo = PROVINCE_INFO[g.currentPosition]
      return provinceInfo?.hasCity
    })

    let totalValue = 0
    cities.forEach(city => {
      const provinceInfo = PROVINCE_INFO[city.currentPosition]
      totalValue += provinceInfo?.income || 0
    })

    return {
      player,
      citiesControlled: cities.length,
      totalUnits: playerUnits.length,
      totalValue,
      isWinner: winners.some(w => w.id === player.id),
    }
  })

  // Ordenar por ciudades controladas
  playerStats.sort((a, b) => {
    if (b.citiesControlled !== a.citiesControlled) {
      return b.citiesControlled - a.citiesControlled
    }
    return b.totalValue - a.totalValue
  })

  // Texto del tipo de victoria
  const getVictoryTypeText = () => {
    if (victoryType === 'standard') {
      return 'Victoria Estándar (Control de Ciudades)'
    } else if (victoryType === 'time_limit') {
      return 'Victoria por Límite de Tiempo (12 Turnos)'
    } else if (victoryType === 'shared') {
      return 'Victoria Compartida'
    }
    return 'Victoria'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Banner principal */}
        <div className={`rounded-lg p-8 mb-6 text-center ${
          isWinner ? 'bg-gradient-to-br from-yellow-600 to-yellow-800' : 'bg-gray-800'
        }`}>
          {isWinner ? (
            <>
              <h1 className="text-5xl font-bold mb-4">🏆 ¡Victoria! 🏆</h1>
              <p className="text-2xl">¡Has ganado el juego!</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-4">Fin de la Partida</h1>
              <p className="text-xl text-gray-400">La partida ha terminado</p>
            </>
          )}
        </div>

        {/* Información del ganador */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-center">
            {isSharedVictory ? '🤝 Victoria Compartida' : '👑 Ganador'}
          </h2>

          <div className="text-center mb-4">
            {winners.map((winner, index) => (
              <div key={winner.id} className="mb-2">
                <span className="text-3xl font-bold text-yellow-400">
                  {winner.faction}
                </span>
                {index < winners.length - 1 && <span className="text-gray-500 mx-2">&</span>}
              </div>
            ))}
          </div>

          <div className="text-center text-gray-400">
            <p className="mb-2">{getVictoryTypeText()}</p>
            <p className="text-sm">
              Turno {game.turnNumber} • {game.currentYear} - {game.currentSeason}
            </p>
          </div>
        </div>

        {/* Tabla de clasificación */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">📊 Clasificación Final</h2>

          <div className="space-y-2">
            {playerStats.map((stat, index) => (
              <div
                key={stat.player.id}
                className={`p-4 rounded-lg flex items-center justify-between ${
                  stat.isWinner
                    ? 'bg-yellow-900 border-2 border-yellow-500'
                    : stat.player.id === currentPlayer.id
                    ? 'bg-blue-900 border-2 border-blue-500'
                    : 'bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-gray-500 w-8">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-lg flex items-center gap-2">
                      {stat.player.faction}
                      {stat.isWinner && <span className="text-yellow-400">👑</span>}
                      {stat.player.id === currentPlayer.id && (
                        <span className="text-blue-400 text-sm">(Tú)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {stat.player.isAlive ? 'Jugador activo' : 'Eliminado'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 text-right">
                  <div>
                    <div className="text-2xl font-bold">{stat.citiesControlled}</div>
                    <div className="text-xs text-gray-400">Ciudades</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.totalValue}d</div>
                    <div className="text-xs text-gray-400">Valor</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.totalUnits}</div>
                    <div className="text-xs text-gray-400">Unidades</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de la partida */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📝 Resumen de la Partida</h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Escenario:</span>
              <span className="float-right font-bold">{game.scenario}</span>
            </div>
            <div>
              <span className="text-gray-400">Nombre:</span>
              <span className="float-right font-bold">{game.name || 'Sin nombre'}</span>
            </div>
            <div>
              <span className="text-gray-400">Turnos jugados:</span>
              <span className="float-right font-bold">{game.turnNumber}</span>
            </div>
            <div>
              <span className="text-gray-400">Año final:</span>
              <span className="float-right font-bold">{game.currentYear}</span>
            </div>
            <div>
              <span className="text-gray-400">Jugadores:</span>
              <span className="float-right font-bold">{players.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Tipo de victoria:</span>
              <span className="float-right font-bold capitalize">{victoryType}</span>
            </div>
          </div>
        </div>

        {/* Botón volver al lobby */}
        <div className="text-center">
          <button
            onClick={onBackToLobby}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg"
          >
            Volver al Lobby
          </button>
        </div>
      </div>
    </div>
  )
}
