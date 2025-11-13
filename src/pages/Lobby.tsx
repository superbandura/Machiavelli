import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import CreateGameModal from '@/components/CreateGameModal'
import GamesList from '@/components/GamesList'
import MyGamesList from '@/components/MyGamesList'
import JoinGameDialog from '@/components/JoinGameDialog'

export default function Lobby() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()

  // State para modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [joinGameData, setJoinGameData] = useState<{
    gameId: string
    gameName: string
    maxPlayers: number
  } | null>(null)

  // Handlers
  const handleGameCreated = (gameId: string) => {
    console.log('[Lobby] Partida creada:', gameId)
    // Navegar a la partida (el creador debe unirse también)
    // Por ahora solo mostramos mensaje, en el futuro navegaremos
  }

  const handleJoinGame = (gameId: string, gameName: string, maxPlayers: number) => {
    setJoinGameData({
      gameId,
      gameName,
      maxPlayers
    })
  }

  const handleJoined = (gameId: string) => {
    console.log('[Lobby] Unido a partida correctamente:', gameId)
    // Navegar a la partida
    navigate(`/game/${gameId}`)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Machiavelli</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">Bienvenido, {user?.displayName || user?.email}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header con acciones */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-3xl font-bold mb-4">Lobby de Partidas</h2>
            <p className="text-gray-400 mb-6">
              Gestiona tus partidas activas o únete a nuevas partidas de Machiavelli.
            </p>

            <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
              >
                + Crear Nueva Partida
              </button>
              <button
                onClick={() => {
                  const gamesListElement = document.getElementById('available-games-section')
                  gamesListElement?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
              >
                Ver Partidas Disponibles
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate('/scenario-editor')}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
                >
                  🎨 Editor de Escenarios
                </button>
              )}
            </div>
          </div>

          {/* Mis Partidas */}
          <div className="mb-6">
            <MyGamesList />
          </div>

          {/* Partidas Disponibles */}
          <div id="available-games-section">
            <GamesList onJoinGame={handleJoinGame} />
          </div>
        </div>
      </main>

      {/* Modales */}
      <CreateGameModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGameCreated={handleGameCreated}
      />

      {joinGameData && (
        <JoinGameDialog
          isOpen={!!joinGameData}
          onClose={() => setJoinGameData(null)}
          gameId={joinGameData.gameId}
          gameName={joinGameData.gameName}
          maxPlayers={joinGameData.maxPlayers}
          onJoined={() => handleJoined(joinGameData.gameId)}
        />
      )}
    </div>
  )
}
