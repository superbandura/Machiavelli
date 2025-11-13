import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

interface DeleteGameDialogProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  gameName: string
  gameStatus: string
  playerCount: number
  onDeleted?: () => void
}

export default function DeleteGameDialog({
  isOpen,
  onClose,
  gameId,
  gameName,
  gameStatus,
  playerCount,
  onDeleted
}: DeleteGameDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'En Espera'
      case 'active':
        return 'Activa'
      case 'finished':
        return 'Finalizada'
      default:
        return status
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log(`[DeleteGameDialog] Eliminando partida ${gameId}`)

      const deleteGameFn = httpsCallable(functions, 'deleteGame')
      const result = await deleteGameFn({ gameId })

      console.log('[DeleteGameDialog] Partida eliminada:', result.data)

      // Cerrar diálogo
      onClose()

      // Callback para refrescar la lista
      if (onDeleted) {
        onDeleted()
      }
    } catch (err: any) {
      console.error('[DeleteGameDialog] Error eliminando partida:', err)

      // Mostrar mensaje de error específico
      if (err.code === 'permission-denied') {
        setError('No tienes permisos para eliminar esta partida')
      } else if (err.code === 'not-found') {
        setError('Partida no encontrada')
      } else {
        setError(err.message || 'Error al eliminar la partida. Por favor intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">¿Eliminar Partida?</h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-white text-2xl disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Advertencia */}
            <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-500 text-2xl flex-shrink-0">⚠️</div>
                <div>
                  <div className="text-red-400 font-bold mb-1">
                    Esta acción no se puede deshacer
                  </div>
                  <div className="text-red-300 text-sm">
                    Se eliminarán permanentemente todos los datos de la partida, incluyendo
                    jugadores, unidades, órdenes y mensajes diplomáticos.
                  </div>
                </div>
              </div>
            </div>

            {/* Información de la partida */}
            <div className="bg-gray-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Nombre:</span>
                <span className="text-white font-medium">{gameName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Estado:</span>
                <span className="text-white font-medium">{getStatusText(gameStatus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Jugadores:</span>
                <span className="text-white font-medium">{playerCount}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Eliminando...' : 'Eliminar Partida'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
