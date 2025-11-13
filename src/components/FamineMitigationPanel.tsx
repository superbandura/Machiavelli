/**
 * FamineMitigationPanel - Panel para mitigar hambruna
 *
 * Permite a los jugadores pagar 3 ducados para eliminar
 * el marcador de hambre de provincias que controlan
 */

import { Player, Unit, Game } from '@/types'
import { getProvinceName } from '@/utils/gameMapHelpers'
import { useState } from 'react'

interface FamineMitigationPanelProps {
  game: Game
  player: Player
  units: Unit[]
  famineProvinces: string[]
  currentPhase: string
  onMitigateFamine: (provinceId: string) => Promise<void>
}

export default function FamineMitigationPanel({
  game,
  player,
  units,
  famineProvinces,
  currentPhase,
  onMitigateFamine
}: FamineMitigationPanelProps) {
  const [mitigating, setMitigating] = useState<string | null>(null)
  const [mitigatedProvinces, setMitigatedProvinces] = useState<Set<string>>(new Set())

  // Solo mostrar durante la fase de órdenes
  if (currentPhase !== 'orders') {
    return null
  }

  // Si no hay hambrunas activas
  if (famineProvinces.length === 0) {
    return null
  }

  // Encontrar provincias con hambre que el jugador controla
  const playerGarrisons = units.filter(
    u => u.type === 'garrison' && u.owner === player.id
  )

  const controlledFamineProvinces = famineProvinces.filter(provinceId =>
    playerGarrisons.some(g => g.currentPosition === provinceId)
  )

  // Si el jugador no controla ninguna provincia con hambre
  if (controlledFamineProvinces.length === 0) {
    return (
      <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🌾</span>
          <h3 className="font-bold text-orange-400">Hambruna Activa</h3>
        </div>
        <p className="text-sm text-gray-400">
          Hay {famineProvinces.length} provincia{famineProvinces.length !== 1 ? 's' : ''} con hambruna,
          pero no controlas ninguna de ellas.
        </p>
        <div className="mt-2 text-xs text-gray-500">
          Provincias afectadas: {famineProvinces.map(p => getProvinceName(game.map, p)).join(', ')}
        </div>
      </div>
    )
  }

  const FAMINE_MITIGATION_COST = 3

  const handleMitigate = async (provinceId: string) => {
    // Verificar que el jugador tenga suficiente dinero
    if (player.treasury < FAMINE_MITIGATION_COST) {
      alert('No tienes suficientes ducados para mitigar esta hambruna (necesitas 3d)')
      return
    }

    // Verificar que no se haya mitigado ya en esta sesión
    if (mitigatedProvinces.has(provinceId)) {
      alert('Ya has pagado para mitigar la hambruna en esta provincia')
      return
    }

    try {
      setMitigating(provinceId)
      await onMitigateFamine(provinceId)

      // Marcar como mitigada en esta sesión
      setMitigatedProvinces(prev => new Set(prev).add(provinceId))

      alert(`Has pagado 3 ducados para mitigar la hambruna en ${getProvinceName(game.map, provinceId)}`)
    } catch (error) {
      console.error('Error mitigating famine:', error)
      alert('Error al procesar el pago. Intenta de nuevo.')
    } finally {
      setMitigating(null)
    }
  }

  return (
    <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🌾</span>
        <h3 className="font-bold text-orange-400">Mitigar Hambruna</h3>
      </div>

      <p className="text-sm text-gray-300 mb-3">
        Puedes pagar <span className="font-bold text-yellow-400">3 ducados</span> para
        eliminar el marcador de hambre de una provincia que controlas.
      </p>

      <div className="mb-3 text-sm">
        <span className="text-gray-400">Tu tesoro:</span>{' '}
        <span className="font-bold text-yellow-400">{player.treasury} ducados</span>
      </div>

      <div className="space-y-2">
        {controlledFamineProvinces.map(provinceId => {
          const isMitigated = mitigatedProvinces.has(provinceId)
          const isProcessing = mitigating === provinceId
          const canAfford = player.treasury >= FAMINE_MITIGATION_COST

          return (
            <div
              key={provinceId}
              className="bg-gray-800 rounded p-3 flex justify-between items-center"
            >
              <div>
                <div className="font-bold text-white">
                  {getProvinceName(game.map, provinceId)}
                </div>
                <div className="text-xs text-orange-400">
                  {isMitigated ? '✓ Pago realizado' : '⚠️ Hambruna activa'}
                </div>
              </div>

              <button
                onClick={() => handleMitigate(provinceId)}
                disabled={isMitigated || isProcessing || !canAfford}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isMitigated
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : !canAfford
                    ? 'bg-red-900 text-red-400 cursor-not-allowed'
                    : isProcessing
                    ? 'bg-yellow-700 text-white cursor-wait'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                {isMitigated
                  ? 'Pagado'
                  : isProcessing
                  ? 'Procesando...'
                  : !canAfford
                  ? 'Sin dinero'
                  : 'Pagar 3d'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        💡 El marcador de hambre se eliminará al inicio del próximo turno si pagas.
        Si no pagas, una unidad aleatoria en la provincia será destruida.
      </div>
    </div>
  )
}
