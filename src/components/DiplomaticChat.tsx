import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Player, DiplomaticMessage } from '@/types'
import WaxSeal from './decorative/icons/WaxSeal'

/**
 * Props para el componente DiplomaticChat
 */
interface DiplomaticChatProps {
  /** ID de la partida */
  gameId: string
  /** Jugador actual que envía/recibe mensajes */
  currentPlayer: Player
  /** Lista de todos los jugadores de la partida */
  players: Player[]
  /** Fase actual del juego (para bloquear envío fuera de fase diplomática) */
  currentPhase: string
  /** Número de turno actual */
  turnNumber: number
}

/**
 * Componente de chat diplomático entre jugadores
 *
 * Permite comunicación privada (1-a-1) o pública (todos) durante la fase diplomática.
 * Los mensajes se sincronizan en tiempo real via Firestore onSnapshot.
 *
 * Características:
 * - Real-time messaging con Firestore listeners
 * - Mensajes privados y públicos
 * - Auto-scroll a nuevos mensajes
 * - Marcado automático de mensajes como leídos
 * - Filtro de conversaciones por destinatario
 * - Estilo temático renacentista con WaxSeal decorativo
 *
 * @component
 * @example
 * <DiplomaticChat
 *   gameId="game-123"
 *   currentPlayer={player}
 *   players={allPlayers}
 *   currentPhase="diplomatic"
 *   turnNumber={5}
 * />
 */
export default function DiplomaticChat({
  gameId,
  currentPlayer,
  players,
  currentPhase,
  turnNumber
}: DiplomaticChatProps) {
  const [messages, setMessages] = useState<(DiplomaticMessage & { id: string })[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState<string>('all')
  const [selectedConversation, setSelectedConversation] = useState<string>('all')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Suscripción a mensajes en tiempo real
  useEffect(() => {
    if (!gameId || !currentPlayer.id) return

    const messagesQuery = query(
      collection(db, 'diplomatic_messages'),
      where('gameId', '==', gameId)
    )

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesData: (DiplomaticMessage & { id: string })[] = []

      snapshot.forEach((doc) => {
        const data = doc.data() as DiplomaticMessage
        // Solo mostrar mensajes que involucran al jugador actual
        if (
          data.to === 'all' ||
          data.from === currentPlayer.userId ||
          data.to === currentPlayer.userId
        ) {
          messagesData.push({ ...data, id: doc.id })
        }
      })

      // Ordenar mensajes por fecha en el cliente
      messagesData.sort((a, b) => {
        const timeA = a.sentAt?.toMillis?.() ?? 0
        const timeB = b.sentAt?.toMillis?.() ?? 0
        return timeA - timeB
      })

      setMessages(messagesData)

      // Marcar como leídos los mensajes del jugador actual
      const unreadMessages = snapshot.docs.filter(doc => {
        const data = doc.data()
        return (
          data.to === currentPlayer.userId &&
          data.from !== currentPlayer.userId &&
          !data.isRead
        )
      })

      for (const msgDoc of unreadMessages) {
        await updateDoc(doc(db, 'diplomatic_messages', msgDoc.id), {
          isRead: true
        })
      }
    })

    return () => unsubscribe()
  }, [gameId, currentPlayer.userId])

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await addDoc(collection(db, 'diplomatic_messages'), {
        gameId,
        from: currentPlayer.userId,
        to: selectedRecipient,
        content: newMessage.trim(),
        turnNumber,
        phase: currentPhase,
        sentAt: serverTimestamp(),
        isRead: false
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error enviando mensaje:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Obtener mensajes filtrados por conversación
  const getFilteredMessages = () => {
    if (selectedConversation === 'all') {
      return messages
    }
    return messages.filter(
      msg =>
        (msg.from === selectedConversation && msg.to === currentPlayer.userId) ||
        (msg.from === currentPlayer.userId && msg.to === selectedConversation) ||
        (msg.to === 'all')
    )
  }

  // Obtener nombre del jugador
  const getPlayerName = (userId: string): string => {
    if (userId === 'all') return 'Todos'
    const player = players.find(p => p.userId === userId)
    return player?.faction || 'Desconocido'
  }

  // Contar mensajes no leídos por jugador
  const getUnreadCount = (userId: string): number => {
    return messages.filter(
      msg =>
        msg.from === userId &&
        msg.to === currentPlayer.userId &&
        !msg.isRead
    ).length
  }

  // Verificar si es fase diplomática
  const isDiplomaticPhase = currentPhase === 'diplomatic'

  const filteredMessages = getFilteredMessages()

  return (
    <div className="flex flex-col h-full bg-transparent rounded-lg border-2 border-burgundy-500 shadow-ornate">
      {/* Header ornamentado */}
      <div className="p-5 border-b-2 border-burgundy-500/50">
        <div className="flex items-center gap-3 mb-2">
          <WaxSeal variant="burgundy" size="md" />
          <h3 className="font-heading font-bold text-xl text-burgundy-300">Cartas Diplomáticas</h3>
        </div>
        {!isDiplomaticPhase && (
          <div className="text-sm font-serif text-renaissance-bronze-light bg-renaissance-bronze/20 border-2 border-renaissance-bronze rounded-lg p-3 mt-3">
            ⚠️ Los mensajes solo se pueden enviar en la Fase Diplomática
          </div>
        )}
      </div>

      {/* Selector de conversación */}
      <div className="p-4 border-b-2 border-burgundy-500/30 bg-[#f4e4c1]/40">
        <label className="block text-sm font-heading font-semibold text-parchment-300 mb-2 uppercase tracking-wide">
          Correspondencia
        </label>
        <select
          className="w-full bg-[#f4e4c1] border-2 border-burgundy-400 rounded-lg px-3 py-2.5 text-sm font-serif text-parchment-200 focus:border-burgundy-300 transition-colors"
          value={selectedConversation}
          onChange={(e) => setSelectedConversation(e.target.value)}
        >
          <option value="all">📜 Todas las cartas</option>
          {players
            .filter(p => p.id !== currentPlayer.id)
            .map(player => {
              const unreadCount = getUnreadCount(player.id)
              return (
                <option key={player.id} value={player.id}>
                  📨 {player.faction} {unreadCount > 0 ? `(${unreadCount} nuevas)` : ''}
                </option>
              )
            })}
        </select>
      </div>

      {/* Lista de cartas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-parchment-400 py-8">
            <div className="text-5xl mb-3">📭</div>
            <div className="font-heading text-lg">No hay cartas aún</div>
            <div className="text-sm font-serif mt-2 italic">Sé el primero en negociar</div>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isOwnMessage = msg.from === currentPlayer.userId
            const isPublic = msg.to === 'all'

            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-4 relative ${
                    isOwnMessage
                      ? 'bg-renaissance-bronze/20 border-2 border-renaissance-bronze shadow-ornate'
                      : isPublic
                      ? 'bg-burgundy-700/20 border-2 border-burgundy-400'
                      : 'bg-[#f4e4c1]/60 border-2 border-gray-600'
                  }`}
                >
                  {/* Sello de cera en la esquina */}
                  <div className="absolute -top-3 -right-3">
                    <WaxSeal
                      variant={isOwnMessage ? 'bronze' : isPublic ? 'burgundy' : 'silver'}
                      size="sm"
                    />
                  </div>

                  {/* Cabecera de la carta */}
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dotted border-gray-600">
                    <span className="font-heading font-bold text-base text-parchment-200">
                      {isOwnMessage ? 'Tu carta' : `De ${getPlayerName(msg.from)}`}
                    </span>
                    {isPublic && (
                      <span className="text-xs font-serif bg-burgundy-600 px-2 py-1 rounded border border-burgundy-400">
                        Pública
                      </span>
                    )}
                    {!isPublic && !isOwnMessage && (
                      <span className="text-xs font-serif bg-gray-700 px-2 py-1 rounded border border-gray-500">
                        Privada
                      </span>
                    )}
                  </div>

                  {/* Contenido de la carta */}
                  <div className="text-sm font-serif text-parchment-200 whitespace-pre-wrap break-words leading-relaxed mb-3">
                    {msg.content}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs font-serif text-gray-400 border-t border-dotted border-gray-600 pt-2">
                    <span className="italic">
                      {msg.sentAt ? new Date((msg.sentAt as Timestamp).toMillis()).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Enviando...'}
                    </span>
                    {!isOwnMessage && !isPublic && (
                      <span className="font-heading">→ {getPlayerName(msg.to)}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input para escribir nuevas cartas */}
      <div className="p-5 border-t-2 border-burgundy-500/50 bg-[#f4e4c1]/40">
        {isDiplomaticPhase ? (
          <>
            <div className="mb-3">
              <label className="block text-sm font-heading font-semibold text-parchment-300 mb-2 uppercase tracking-wide">
                Destinatario
              </label>
              <select
                className="w-full bg-[#f4e4c1] border-2 border-burgundy-400 rounded-lg px-3 py-2.5 text-sm font-serif text-parchment-200 focus:border-burgundy-300 transition-colors"
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
              >
                <option value="all">📢 Carta pública (todos)</option>
                {players
                  .filter(p => p.id !== currentPlayer.id)
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      🔒 {player.faction} (privada)
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-3">
              <textarea
                className="flex-1 bg-[#f4e4c1] border-2 border-burgundy-400 rounded-lg px-4 py-3 text-sm font-serif text-parchment-200 resize-none focus:border-burgundy-300 transition-colors placeholder:text-gray-500 placeholder:italic"
                placeholder="Escribe tu carta diplomática..."
                rows={3}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className={`px-5 py-3 rounded-lg font-heading font-bold transition-all duration-200 border-2 flex items-center gap-2 ${
                  !newMessage.trim() || isSending
                    ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'
                    : 'bg-burgundy-600/20 hover:bg-burgundy-600/30 text-burgundy-300 border-burgundy-400 hover:shadow-glow-burgundy'
                }`}
              >
                {isSending ? '...' : '📤'}
              </button>
            </div>

            <div className="text-xs font-serif text-gray-400 mt-2 italic">
              Enter para enviar, Shift+Enter para nueva línea
            </div>
          </>
        ) : (
          <div className="text-center text-parchment-400 font-serif text-sm py-4 italic">
            Solo puedes enviar cartas durante la Fase Diplomática
          </div>
        )}
      </div>
    </div>
  )
}
