import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Player } from '@/types'

/**
 * Voto individual de un jugador sobre un jugador inactivo
 */
interface Vote {
  /** ID del jugador que vota */
  voterId: string
  /** Opción votada: IA básica, reemplazo o eliminación */
  option: 'ai_mode' | 'replacement' | 'elimination'
  /** Fecha del voto */
  votedAt: Date
}

/**
 * Props para el componente InactivePlayerVoting
 */
interface InactivePlayerVotingProps {
  /** ID de la partida */
  gameId: string
  /** Jugador actual que puede votar */
  currentPlayer: Player
  /** Lista completa de jugadores (activos e inactivos) */
  players: Player[]
}

/**
 * Sistema de votación para jugadores inactivos
 *
 * Permite a los jugadores activos decidir qué hacer con jugadores que han estado
 * inactivos por 3+ turnos consecutivos. Los jugadores activos pueden votar una de
 * tres opciones por cada jugador inactivo:
 *
 * **Opciones de votación:**
 * 1. **🤖 Modo IA Básica:** Todas las unidades mantienen posición (Hold)
 * 2. **🔄 Permitir Reemplazo:** Abrir slot para nuevo jugador
 * 3. **☠️ Eliminar del Juego:** Destruir todas las unidades, territorios neutrales
 *
 * **Características:**
 * - Real-time voting con Firestore listeners
 * - Cada jugador vota una vez por inactivo
 * - Opción ganadora = más votos (mayoría simple)
 * - Solo jugadores activos (`status !== 'inactive'`) pueden votar
 * - Voto guardado en `/votes/{gameId}_{targetPlayerId}_{voterId}`
 * - Muestra quién ha votado y por qué opción
 * - Auto-ejecuta resultado al final del próximo turno (Cloud Function)
 *
 * @component
 * @example
 * <InactivePlayerVoting
 *   gameId="game-123"
 *   currentPlayer={player}
 *   players={allPlayers}
 * />
 */

export default function InactivePlayerVoting({
  gameId,
  currentPlayer,
  players
}: InactivePlayerVotingProps) {
  const [votes, setVotes] = useState<Record<string, Vote[]>>({}) // inactivePlayerId → votes
  const [myVotes, setMyVotes] = useState<Record<string, 'ai_mode' | 'replacement' | 'elimination'>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  // Filtrar jugadores inactivos
  const inactivePlayers = players.filter(
    p => p.status === 'inactive' && p.id !== currentPlayer.id
  )

  // Jugadores activos que pueden votar
  const activePlayers = players.filter(p => p.isAlive && p.status !== 'inactive')
  const totalVoters = activePlayers.length

  // Suscribirse a votos en tiempo real
  useEffect(() => {
    if (inactivePlayers.length === 0) return

    const unsubscribes: (() => void)[] = []

    inactivePlayers.forEach(inactivePlayer => {
      const votesQuery = query(
        collection(db, 'votes'),
        where('gameId', '==', gameId),
        where('targetPlayerId', '==', inactivePlayer.id)
      )

      const unsubscribe = onSnapshot(votesQuery, (snapshot) => {
        const playerVotes: Vote[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          playerVotes.push({
            voterId: data.voterId,
            option: data.option,
            votedAt: data.votedAt?.toDate() || new Date()
          })
        })

        setVotes(prev => ({
          ...prev,
          [inactivePlayer.id]: playerVotes
        }))

        // Actualizar mi voto si existe
        const myVote = playerVotes.find(v => v.voterId === currentPlayer.id)
        if (myVote) {
          setMyVotes(prev => ({
            ...prev,
            [inactivePlayer.id]: myVote.option
          }))
        }
      })

      unsubscribes.push(unsubscribe)
    })

    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [gameId, inactivePlayers.length, currentPlayer.id])

  const handleVote = async (inactivePlayerId: string, option: 'ai_mode' | 'replacement' | 'elimination') => {
    setSubmitting(inactivePlayerId)

    try {
      // Crear o actualizar voto
      const voteId = `${gameId}_${inactivePlayerId}_${currentPlayer.id}`
      await setDoc(doc(db, 'votes', voteId), {
        gameId,
        targetPlayerId: inactivePlayerId,
        voterId: currentPlayer.id,
        voterFaction: currentPlayer.faction,
        option,
        votedAt: new Date()
      })

      setMyVotes(prev => ({
        ...prev,
        [inactivePlayerId]: option
      }))
    } catch (error) {
      console.error('Error submitting vote:', error)
      alert('Error al enviar voto. Intenta de nuevo.')
    } finally {
      setSubmitting(null)
    }
  }

  // Contar votos por opción
  const countVotes = (inactivePlayerId: string) => {
    const playerVotes = votes[inactivePlayerId] || []
    const counts = {
      ai_mode: 0,
      replacement: 0,
      elimination: 0
    }

    playerVotes.forEach(vote => {
      counts[vote.option]++
    })

    return counts
  }

  // Determinar opción ganadora
  const getWinningOption = (inactivePlayerId: string) => {
    const counts = countVotes(inactivePlayerId)
    const max = Math.max(counts.ai_mode, counts.replacement, counts.elimination)

    if (counts.ai_mode === max) return 'ai_mode'
    if (counts.replacement === max) return 'replacement'
    return 'elimination'
  }

  // Si no hay jugadores inactivos, no mostrar nada
  if (inactivePlayers.length === 0) {
    return null
  }

  return (
    <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">⚠️</span>
        <h3 className="font-bold text-red-400">Jugadores Inactivos - Votación</h3>
      </div>

      <p className="text-sm text-gray-300 mb-4">
        Los siguientes jugadores han estado inactivos por 3 turnos consecutivos.
        Vota qué hacer con ellos:
      </p>

      <div className="space-y-4">
        {inactivePlayers.map(inactivePlayer => {
          const playerVotes = votes[inactivePlayer.id] || []
          const counts = countVotes(inactivePlayer.id)
          const myVote = myVotes[inactivePlayer.id]
          const isSubmitting = submitting === inactivePlayer.id
          const votesReceived = playerVotes.length
          const winningOption = getWinningOption(inactivePlayer.id)

          return (
            <div
              key={inactivePlayer.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-lg text-white">
                    {inactivePlayer.faction}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {inactivePlayer.inactivityCounter || 3} turnos sin órdenes
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    Votos: {votesReceived}/{totalVoters}
                  </div>
                  {myVote && (
                    <div className="text-xs text-green-400">
                      ✓ Ya votaste
                    </div>
                  )}
                </div>
              </div>

              {/* Opciones de votación */}
              <div className="space-y-2 mb-3">
                {/* Opción 1: Modo IA */}
                <button
                  onClick={() => handleVote(inactivePlayer.id, 'ai_mode')}
                  disabled={isSubmitting || !!myVote}
                  className={`w-full text-left p-3 rounded transition-colors ${
                    myVote === 'ai_mode'
                      ? 'bg-blue-900 border-2 border-blue-500'
                      : myVote
                      ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold">🤖 Modo IA Básica</div>
                      <div className="text-xs text-gray-400">
                        Todas las unidades mantienen posición automáticamente
                      </div>
                    </div>
                    <div className="text-lg font-bold">
                      {counts.ai_mode}
                    </div>
                  </div>
                </button>

                {/* Opción 2: Reemplazo */}
                <button
                  onClick={() => handleVote(inactivePlayer.id, 'replacement')}
                  disabled={isSubmitting || !!myVote}
                  className={`w-full text-left p-3 rounded transition-colors ${
                    myVote === 'replacement'
                      ? 'bg-yellow-900 border-2 border-yellow-500'
                      : myVote
                      ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold">🔄 Permitir Reemplazo</div>
                      <div className="text-xs text-gray-400">
                        Nuevo jugador puede unirse y tomar control
                      </div>
                    </div>
                    <div className="text-lg font-bold">
                      {counts.replacement}
                    </div>
                  </div>
                </button>

                {/* Opción 3: Eliminación */}
                <button
                  onClick={() => handleVote(inactivePlayer.id, 'elimination')}
                  disabled={isSubmitting || !!myVote}
                  className={`w-full text-left p-3 rounded transition-colors ${
                    myVote === 'elimination'
                      ? 'bg-red-900 border-2 border-red-500'
                      : myVote
                      ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold">☠️ Eliminar del Juego</div>
                      <div className="text-xs text-gray-400">
                        Todas las unidades destruidas, territorios neutrales
                      </div>
                    </div>
                    <div className="text-lg font-bold">
                      {counts.elimination}
                    </div>
                  </div>
                </button>
              </div>

              {/* Estado de la votación */}
              {votesReceived > 0 && (
                <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
                  {votesReceived === totalVoters ? (
                    <div className="text-green-400 font-bold">
                      ✓ Votación completa - Opción ganadora:{' '}
                      {winningOption === 'ai_mode' && '🤖 Modo IA'}
                      {winningOption === 'replacement' && '🔄 Reemplazo'}
                      {winningOption === 'elimination' && '☠️ Eliminación'}
                    </div>
                  ) : (
                    <div>
                      Esperando {totalVoters - votesReceived} voto(s) más...
                    </div>
                  )}
                </div>
              )}

              {/* Lista de quién ha votado */}
              {playerVotes.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                    Ver votos individuales
                  </summary>
                  <div className="mt-2 space-y-1 text-xs">
                    {playerVotes.map(vote => {
                      const voter = players.find(p => p.id === vote.voterId)
                      return (
                        <div key={vote.voterId} className="flex justify-between text-gray-400">
                          <span>{voter?.faction || 'Desconocido'}</span>
                          <span>
                            {vote.option === 'ai_mode' && '🤖 Modo IA'}
                            {vote.option === 'replacement' && '🔄 Reemplazo'}
                            {vote.option === 'elimination' && '☠️ Eliminación'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </details>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        💡 La opción con más votos se ejecutará al final del próximo turno.
        Si no votas, se usará la opción mayoritaria.
      </div>
    </div>
  )
}
