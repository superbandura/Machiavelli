import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { Game, Player } from '@/types'
import { useNavigate } from 'react-router-dom'
import DeleteGameDialog from './DeleteGameDialog'

export default function MyGamesList() {
  const { user } = useAuthStore()
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()
  const [myGames, setMyGames] = useState<(Game & { playerFaction: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null)

  useEffect(() => {
    if (!user) return

    // Suscribirse a los registros de jugador del usuario actual
    const playersQuery = query(
      collection(db, 'players'),
      where('userId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(playersQuery, async (snapshot) => {
      console.log('[MyGamesList] Jugador encontrado en', snapshot.size, 'partidas')

      const gamesData: (Game & { playerFaction: string })[] = []

      // Por cada partida donde el usuario es jugador
      for (const playerDoc of snapshot.docs) {
        const playerData = playerDoc.data() as Player
        const gameId = playerData.gameId

        try {
          // Obtener datos de la partida
          const gameDoc = await getDoc(doc(db, 'games', gameId))
          if (gameDoc.exists()) {
            const game = { id: gameDoc.id, ...gameDoc.data() } as Game
            gamesData.push({
              ...game,
              playerFaction: playerData.faction
            })
          }
        } catch (error) {
          console.error('[MyGamesList] Error cargando partida:', gameId, error)
        }
      }

      // Ordenar por última actualización (más recientes primero)
      gamesData.sort((a, b) => {
        const timeA = a.updatedAt ? (a.updatedAt as Timestamp).seconds : 0
        const timeB = b.updatedAt ? (b.updatedAt as Timestamp).seconds : 0
        return timeB - timeA
      })

      setMyGames(gamesData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'Ahora'
    const date = timestamp.toDate()
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes}m`
    if (hours < 24) return `Hace ${hours}h`
    return `Hace ${days}d`
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting':
        return { label: 'Esperando jugadores', color: 'text-yellow-400' }
      case 'active':
        return { label: 'En curso', color: 'text-green-400' }
      case 'finished':
        return { label: 'Finalizada', color: 'text-gray-400' }
      default:
        return { label: status, color: 'text-gray-400' }
    }
  }

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'diplomatic':
        return 'Fase Diplomática'
      case 'orders':
        return 'Fase de Órdenes'
      case 'resolution':
        return 'Resolución'
      default:
        return phase
    }
  }

  const handleOpenDeleteDialog = (game: Game) => {
    setGameToDelete(game)
    setDeleteDialogOpen(true)
  }

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setGameToDelete(null)
  }

  const handleGameDeleted = () => {
    // El listener de onSnapshot se encargará de actualizar la lista automáticamente
    console.log('[MyGamesList] Partida eliminada correctamente')
  }

  const canDeleteGame = (game: Game) => {
    return user?.uid === game.createdBy || isAdmin
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-2xl font-bold mb-4 text-white">Mis Partidas</h3>
        <div className="text-center py-8 text-gray-400">
          <div className="animate-pulse">Cargando tus partidas...</div>
        </div>
      </div>
    )
  }

  if (myGames.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-2xl font-bold mb-4 text-white">Mis Partidas</h3>
        <div className="text-gray-400 text-center py-8">
          No estás en ninguna partida aún.
          <br />
          ¡Únete a una partida disponible o crea una nueva!
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-2xl font-bold mb-4 text-white">
        Mis Partidas ({myGames.length})
      </h3>

      <div className="space-y-3">
        {myGames.map((game) => {
          const statusInfo = getStatusLabel(game.status)

          return (
            <div
              key={game.id}
              className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-bold text-white">{game.name || game.scenario}</h4>
                    <span className={`text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Jugando como: <span className="font-medium text-white">{game.playerFaction}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Última actualización: {formatDate(game.updatedAt as Timestamp)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canDeleteGame(game) && (
                    <button
                      onClick={() => handleOpenDeleteDialog(game)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                      title="Eliminar partida"
                    >
                      Eliminar
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/game/${game.id}`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                  >
                    {game.status === 'finished' ? 'Ver Resultados' : 'Continuar'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <span className="text-gray-400">Turno:</span>
                  <span className="ml-2 text-white font-medium">
                    {game.turnNumber} - {game.currentYear} {game.currentSeason}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400">Fase:</span>
                  <span className="ml-2 text-white font-medium capitalize">
                    {getPhaseLabel(game.currentPhase)}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400">Jugadores:</span>
                  <span className="ml-2 text-white font-medium">
                    {game.playersCount} / {game.maxPlayers}
                  </span>
                </div>

                {game.phaseDeadline && game.status === 'active' && (
                  <div>
                    <span className="text-gray-400">Deadline:</span>
                    <span className="ml-2 text-white font-medium text-xs">
                      {new Date((game.phaseDeadline as Timestamp).seconds * 1000).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog de eliminación */}
      {gameToDelete && (
        <DeleteGameDialog
          isOpen={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          gameId={gameToDelete.id}
          gameName={gameToDelete.name || gameToDelete.scenario}
          gameStatus={gameToDelete.status}
          playerCount={gameToDelete.playersCount}
          onDeleted={handleGameDeleted}
        />
      )}
    </div>
  )
}
