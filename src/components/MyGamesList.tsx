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
      const seenGameIds = new Set<string>()

      // Por cada partida donde el usuario es jugador
      for (const playerDoc of snapshot.docs) {
        const playerData = playerDoc.data() as Player
        const gameId = playerData.gameId

        // Evitar duplicados (múltiples documentos de player con mismo gameId)
        if (seenGameIds.has(gameId)) {
          console.warn('[MyGamesList] Documento de player duplicado para gameId:', gameId)
          continue
        }
        seenGameIds.add(gameId)

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
        return { label: 'Esperando jugadores', color: 'text-renaissance-gold-light' }
      case 'active':
        return { label: 'En curso', color: 'text-renaissance-olive-light' }
      case 'finished':
        return { label: 'Finalizada', color: 'text-parchment-300' }
      default:
        return { label: status, color: 'text-parchment-300' }
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
      <div className="bg-[#3d3020] border-4 border-[#6b5d42] rounded-lg p-4 shadow-ornate">
        <h3 className="text-xl font-heading font-bold mb-3 text-renaissance-gold">Mis Partidas</h3>
        <div className="text-center py-6 text-parchment-100 font-serif">
          <div className="animate-pulse">Cargando tus partidas...</div>
        </div>
      </div>
    )
  }

  if (myGames.length === 0) {
    return (
      <div className="bg-[#3d3020] border-4 border-[#6b5d42] rounded-lg p-4 shadow-ornate">
        <h3 className="text-xl font-heading font-bold mb-3 text-renaissance-gold">Mis Partidas</h3>
        <div className="text-parchment-100 font-serif text-center py-6">
          No estás en ninguna partida aún.
          <br />
          ¡Únete a una partida disponible o crea una nueva!
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#3d3020] border-4 border-[#6b5d42] rounded-lg p-4 shadow-ornate">
      <h3 className="text-xl font-heading font-bold mb-3 text-renaissance-gold">
        Mis Partidas ({myGames.length})
      </h3>

      <div className="space-y-2">
        {myGames.map((game) => {
          const statusInfo = getStatusLabel(game.status)

          return (
            <div
              key={game.id}
              className="bg-[#2d2416] rounded-lg p-3 border-2 border-[#8b7355] hover:border-renaissance-gold transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-heading font-bold text-renaissance-gold">{game.name || game.scenario}</h4>
                    <span className={`text-xs font-serif font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-sm font-serif text-parchment-200 mt-1">
                    Jugando como: <span className="font-semibold text-parchment-100">{game.playerFaction}</span>
                  </p>
                  <p className="text-xs font-serif text-parchment-300 mt-0.5">
                    Última actualización: {formatDate(game.updatedAt as Timestamp)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canDeleteGame(game) && (
                    <button
                      onClick={() => handleOpenDeleteDialog(game)}
                      className="px-3 py-1.5 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded font-heading font-medium transition-colors text-sm shadow-ornate"
                      title="Eliminar partida"
                    >
                      Eliminar
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/game/${game.id}`)}
                    className="px-3 py-1.5 bg-renaissance-bronze hover:bg-renaissance-bronze-light text-white rounded font-heading font-medium transition-colors text-sm shadow-ornate"
                  >
                    {game.status === 'finished' ? 'Ver Resultados' : 'Continuar'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                <div className="font-serif">
                  <span className="text-parchment-300">Turno:</span>
                  <span className="ml-2 text-parchment-100 font-semibold">
                    {game.turnNumber} - {game.currentYear} {game.currentSeason}
                  </span>
                </div>

                <div className="font-serif">
                  <span className="text-parchment-300">Fase:</span>
                  <span className="ml-2 text-parchment-100 font-semibold capitalize">
                    {getPhaseLabel(game.currentPhase)}
                  </span>
                </div>

                <div className="font-serif">
                  <span className="text-parchment-300">Jugadores:</span>
                  <span className="ml-2 text-parchment-100 font-semibold">
                    {game.playersCount} / {game.maxPlayers}
                  </span>
                </div>

                {game.phaseDeadline && game.status === 'active' && (
                  <div className="font-serif">
                    <span className="text-parchment-300">Deadline:</span>
                    <span className="ml-2 text-parchment-100 font-semibold text-xs">
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
