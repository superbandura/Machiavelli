import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, orderBy, Timestamp, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { Game } from '@/types'
import DeleteGameDialog from './DeleteGameDialog'

interface GamesListProps {
  onJoinGame: (gameId: string, gameName: string, maxPlayers: number) => void
}

export default function GamesList({ onJoinGame }: GamesListProps) {
  const { user } = useAuthStore()
  const isAdmin = useIsAdmin()
  const [games, setGames] = useState<Game[]>([])
  const [myGameIds, setMyGameIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null)

  // Cargar IDs de partidas donde ya estoy jugando
  useEffect(() => {
    if (!user) return

    const loadMyGameIds = async () => {
      const playersQuery = query(
        collection(db, 'players'),
        where('userId', '==', user.uid)
      )
      const snapshot = await getDocs(playersQuery)
      const ids = new Set<string>()
      snapshot.forEach((doc) => {
        ids.add(doc.data().gameId)
      })
      setMyGameIds(ids)
      console.log('[GamesList] Jugando en', ids.size, 'partidas')
    }

    loadMyGameIds()
  }, [user])

  useEffect(() => {
    console.log('[GamesList] Inicializando suscripción a partidas')

    // Consultar partidas en estado 'waiting' (esperando jugadores)
    const q = query(
      collection(db, 'games'),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'desc')
    )

    // Suscripción en tiempo real
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('[GamesList] Snapshot recibido, documentos:', snapshot.size)
        const gamesData: Game[] = []
        snapshot.forEach((doc) => {
          const game = {
            id: doc.id,
            ...doc.data()
          } as Game

          // Excluir partidas donde ya estoy jugando
          if (!myGameIds.has(game.id)) {
            gamesData.push(game)
          }
        })
        console.log('[GamesList] Partidas disponibles (sin las mías):', gamesData.length)
        setGames(gamesData)
        setLoading(false)
      },
      (error) => {
        console.error('[GamesList] Error obteniendo partidas:', error)
        setLoading(false)
      }
    )

    return () => {
      console.log('[GamesList] Limpiando suscripción')
      unsubscribe()
    }
  }, [myGameIds])

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
    console.log('[GamesList] Partida eliminada correctamente')
  }

  const canDeleteGame = (game: Game) => {
    return user?.uid === game.createdBy || isAdmin
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-2xl font-bold mb-4 text-white">Partidas Disponibles</h3>
        <div className="text-center py-8 text-gray-400">
          <div className="animate-pulse">Cargando partidas...</div>
        </div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-2xl font-bold mb-4 text-white">Partidas Disponibles</h3>
        <div className="text-gray-400 text-center py-8">
          No hay partidas disponibles en este momento.
          <br />
          ¡Crea una nueva partida para empezar!
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-2xl font-bold mb-4 text-white">
        Partidas Disponibles ({games.length})
      </h3>

      <div className="space-y-3">
        {games.map((game) => (
          <div
            key={game.id}
            className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-lg font-bold text-white">{game.scenario}</h4>
                <p className="text-sm text-gray-400">
                  Creada {formatDate(game.createdAt as Timestamp)}
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
                  onClick={() => onJoinGame(game.id, game.name || game.scenario, game.maxPlayers)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
                >
                  Unirse
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">Jugadores:</span>
                <span className="ml-2 text-white font-medium">
                  {game.playersCount} / {game.maxPlayers}
                </span>
              </div>

              <div>
                <span className="text-gray-400">Turno:</span>
                <span className="ml-2 text-white font-medium">
                  {game.currentYear} - {game.currentSeason}
                </span>
              </div>

              <div>
                <span className="text-gray-400">Fase diplomática:</span>
                <span className="ml-2 text-white font-medium">
                  {game.phaseDurations.diplomatic}h
                </span>
              </div>

              <div>
                <span className="text-gray-400">Fase de órdenes:</span>
                <span className="ml-2 text-white font-medium">
                  {game.phaseDurations.orders}h
                </span>
              </div>
            </div>

            {/* Opciones de juego */}
            <div className="flex flex-wrap gap-2 mt-3">
              {game.gameSettings.advancedRules && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  Juego Avanzado
                </span>
              )}
              {game.gameSettings.optionalRules.famine && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                  Hambre
                </span>
              )}
              {game.gameSettings.optionalRules.plague && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                  Peste
                </span>
              )}
              {game.gameSettings.optionalRules.assassination && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                  Asesinato
                </span>
              )}
            </div>
          </div>
        ))}
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
