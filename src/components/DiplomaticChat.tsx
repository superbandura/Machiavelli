import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Player, DiplomaticMessage } from '@/types'

interface DiplomaticChatProps {
  gameId: string
  currentPlayer: Player
  players: Player[]
  currentPhase: string
  turnNumber: number
}

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
      collection(db, 'messages'),
      where('gameId', '==', gameId),
      orderBy('sentAt', 'asc')
    )

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesData: (DiplomaticMessage & { id: string })[] = []

      snapshot.forEach((doc) => {
        const data = doc.data() as DiplomaticMessage
        // Solo mostrar mensajes que involucran al jugador actual
        if (
          data.to === 'all' ||
          data.from === currentPlayer.id ||
          data.to === currentPlayer.id
        ) {
          messagesData.push({ ...data, id: doc.id })
        }
      })

      setMessages(messagesData)

      // Marcar como leídos los mensajes del jugador actual
      const unreadMessages = snapshot.docs.filter(doc => {
        const data = doc.data()
        return (
          data.to === currentPlayer.id &&
          data.from !== currentPlayer.id &&
          !data.isRead
        )
      })

      for (const msgDoc of unreadMessages) {
        await updateDoc(doc(db, 'messages', msgDoc.id), {
          isRead: true
        })
      }
    })

    return () => unsubscribe()
  }, [gameId, currentPlayer.id])

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await addDoc(collection(db, 'messages'), {
        gameId,
        from: currentPlayer.id,
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
        (msg.from === selectedConversation && msg.to === currentPlayer.id) ||
        (msg.from === currentPlayer.id && msg.to === selectedConversation) ||
        (msg.to === 'all')
    )
  }

  // Obtener nombre del jugador
  const getPlayerName = (playerId: string): string => {
    if (playerId === 'all') return 'Todos'
    const player = players.find(p => p.id === playerId)
    return player?.faction || 'Desconocido'
  }

  // Contar mensajes no leídos por jugador
  const getUnreadCount = (playerId: string): number => {
    return messages.filter(
      msg =>
        msg.from === playerId &&
        msg.to === currentPlayer.id &&
        !msg.isRead
    ).length
  }

  // Verificar si es fase diplomática
  const isDiplomaticPhase = currentPhase === 'diplomatic'

  const filteredMessages = getFilteredMessages()

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-bold text-lg mb-2">💬 Chat Diplomático</h3>
        {!isDiplomaticPhase && (
          <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700 rounded p-2">
            ⚠️ Los mensajes solo se pueden enviar en la Fase Diplomática
          </div>
        )}
      </div>

      {/* Selector de conversación */}
      <div className="p-3 border-b border-gray-700 bg-gray-900">
        <label className="block text-xs font-medium mb-2 text-gray-400">
          Conversación
        </label>
        <select
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
          value={selectedConversation}
          onChange={(e) => setSelectedConversation(e.target.value)}
        >
          <option value="all">Todos los mensajes</option>
          {players
            .filter(p => p.id !== currentPlayer.id)
            .map(player => {
              const unreadCount = getUnreadCount(player.id)
              return (
                <option key={player.id} value={player.id}>
                  {player.faction} {unreadCount > 0 ? `(${unreadCount} nuevos)` : ''}
                </option>
              )
            })}
        </select>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">📭</div>
            <div>No hay mensajes aún</div>
            <div className="text-xs mt-1">Sé el primero en negociar</div>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isOwnMessage = msg.from === currentPlayer.id
            const isPublic = msg.to === 'all'

            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : isPublic
                      ? 'bg-purple-900/50 border border-purple-700'
                      : 'bg-gray-700'
                  }`}
                >
                  {/* Cabecera del mensaje */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">
                      {isOwnMessage ? 'Tú' : getPlayerName(msg.from)}
                    </span>
                    {isPublic && (
                      <span className="text-xs bg-purple-700 px-2 py-0.5 rounded">
                        Público
                      </span>
                    )}
                    {!isPublic && !isOwnMessage && (
                      <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                        Privado
                      </span>
                    )}
                  </div>

                  {/* Contenido del mensaje */}
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                    <span>
                      {msg.sentAt ? new Date((msg.sentAt as Timestamp).toMillis()).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Enviando...'}
                    </span>
                    {!isOwnMessage && !isPublic && (
                      <span>→ {getPlayerName(msg.to)}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de nuevo mensaje */}
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        {isDiplomaticPhase ? (
          <>
            <div className="mb-2">
              <label className="block text-xs font-medium mb-1 text-gray-400">
                Destinatario
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
              >
                <option value="all">📢 Mensaje público (todos)</option>
                {players
                  .filter(p => p.id !== currentPlayer.id)
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      🔒 {player.faction} (privado)
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <textarea
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm resize-none"
                placeholder="Escribe tu mensaje diplomático..."
                rows={2}
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
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  !newMessage.trim() || isSending
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSending ? '...' : '📤'}
              </button>
            </div>

            <div className="text-xs text-gray-400 mt-2">
              Presiona Enter para enviar, Shift+Enter para nueva línea
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 text-sm py-3">
            Solo puedes enviar mensajes durante la Fase Diplomática
          </div>
        )}
      </div>
    </div>
  )
}
