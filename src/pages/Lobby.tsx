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
    <div className="min-h-screen bg-[#f4e4c1]">
      <nav className="bg-[#2d2416] border-b-4 border-[#6b5d42] shadow-ornate">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-display text-renaissance-gold drop-shadow-lg">Machiavelli</h1>
          <div className="flex items-center gap-4">
            <span className="text-parchment-100 font-serif">Bienvenido, {user?.displayName || user?.email}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-burgundy-400 hover:bg-burgundy-500 text-white font-heading rounded-lg transition-colors shadow-ornate"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header con acciones */}
          <div className="bg-parchment-100 border-4 border-[#6b5d42] rounded-lg p-8 mb-6 shadow-ornate">
            <h2 className="text-4xl font-heading text-[#1d1408] mb-4">Lobby de Partidas</h2>
            <p className="text-[#2c2416] font-serif mb-6 text-lg">
              Gestiona tus partidas activas o únete a nuevas partidas de Machiavelli.
            </p>

            <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-renaissance-gold hover:bg-renaissance-gold-dark text-[#1d1408] font-heading font-bold py-4 px-6 rounded-lg transition-all shadow-ornate hover:shadow-glow-gold border-2 border-[#6b5d42]"
              >
                + Crear Nueva Partida
              </button>
              <button
                onClick={() => {
                  const gamesListElement = document.getElementById('available-games-section')
                  gamesListElement?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="bg-renaissance-bronze hover:bg-renaissance-bronze-light text-white font-heading font-bold py-4 px-6 rounded-lg transition-all shadow-ornate border-2 border-[#6b5d42]"
              >
                Ver Partidas Disponibles
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate('/scenario-editor')}
                  className="bg-[#6b5d42] hover:bg-[#544a35] text-white font-heading font-bold py-4 px-6 rounded-lg transition-all shadow-ornate border-2 border-[#1d1408]"
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
