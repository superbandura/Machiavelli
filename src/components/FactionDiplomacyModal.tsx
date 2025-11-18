import { useState, useEffect, useRef } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Game, Player, DiplomaticMessage } from '@/types/game'
import { getFactionImageName } from '@/utils/factionHelpers'

interface FactionDiplomacyModalProps {
  isOpen: boolean
  onClose: () => void
  game: Game
  currentPlayer: Player
  targetFaction: string
  players: Player[]
}

export default function FactionDiplomacyModal({
  isOpen,
  onClose,
  game,
  currentPlayer,
  targetFaction,
  players
}: FactionDiplomacyModalProps) {
  const [messages, setMessages] = useState<(DiplomaticMessage & { id: string })[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get players from target faction
  const targetPlayers = players.filter(p => p.faction === targetFaction)
  const targetUserIds = targetPlayers.map(p => p.userId)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time listener for messages
  useEffect(() => {
    if (!isOpen) return

    const messagesQuery = query(
      collection(db, 'diplomatic_messages'),
      where('gameId', '==', game.id)
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (DiplomaticMessage & { id: string })[]

      // Filter messages for current turn and target faction
      const filtered = allMessages.filter(msg => {
        // Only messages from current turn
        if (msg.turnNumber !== game.turnNumber) return false

        // Messages involving target faction players and current player
        const isFromTargetFaction = targetUserIds.includes(msg.from)
        const isToTargetFaction = targetUserIds.includes(msg.to)
        const isFromMe = msg.from === currentPlayer.userId
        const isToMe = msg.to === currentPlayer.userId
        const isPublic = msg.to === 'all'

        // Show if:
        // - Sent by target faction to me
        // - Sent by me to target faction
        // - Public messages from/to target faction
        return (
          (isFromTargetFaction && (isToMe || isPublic)) ||
          (isFromMe && (isToTargetFaction || isPublic))
        )
      })

      // Ordenar mensajes por fecha en el cliente
      filtered.sort((a, b) => {
        const timeA = a.sentAt?.toMillis?.() ?? 0
        const timeB = b.sentAt?.toMillis?.() ?? 0
        return timeA - timeB
      })

      setMessages(filtered)
    })

    return () => unsubscribe()
  }, [isOpen, game.id, game.turnNumber, currentPlayer.userId, targetUserIds])

  // Mark messages as read when modal opens
  useEffect(() => {
    if (!isOpen || messages.length === 0) return

    const markAsRead = async () => {
      const unreadMessages = messages.filter(
        msg =>
          targetUserIds.includes(msg.from) &&
          msg.to === currentPlayer.userId &&
          !msg.isRead
      )

      for (const msg of unreadMessages) {
        try {
          await updateDoc(doc(db, 'diplomatic_messages', msg.id), {
            isRead: true
          })
        } catch (error) {
          console.error('Error marcando mensaje como leído:', error)
        }
      }
    }

    markAsRead()
  }, [isOpen, messages, currentPlayer.userId, targetUserIds])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    // Only allow sending during diplomatic phase
    if (game.currentPhase !== 'diplomatic') {
      alert('Solo puedes enviar mensajes durante la fase diplomática')
      return
    }

    setIsSending(true)

    try {
      // Send to the first player of the target faction
      // (In a real scenario, you might want to send to all players of that faction)
      const recipientId = targetPlayers[0]?.userId

      if (!recipientId) {
        alert('No se encontró un destinatario en esa facción')
        return
      }

      await addDoc(collection(db, 'diplomatic_messages'), {
        gameId: game.id,
        from: currentPlayer.userId,
        to: recipientId,
        content: newMessage.trim(),
        turnNumber: game.turnNumber,
        phase: 'diplomatic',
        sentAt: serverTimestamp(),
        isRead: false
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      alert('Error al enviar el mensaje')
    } finally {
      setIsSending(false)
    }
  }

  const getPlayerByUserId = (userId: string): Player | undefined => {
    return players.find(p => p.userId === userId)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#f4e8d8] border-4 border-[#8b4513] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-[#8b4513] flex items-center justify-between bg-[#d4af37]/20">
          <div className="flex items-center gap-3">
            <img
              src={`/factions/${getFactionImageName(targetFaction)}.png`}
              alt={targetFaction}
              className="w-12 h-12 object-contain"
            />
            <div>
              <h2 className="text-xl font-bold text-[#2c1810]">
                {targetFaction}
              </h2>
              <p className="text-sm text-[#5d4037]">
                Turno {game.turnNumber} - Fase {game.currentPhase === 'diplomatic' ? 'Diplomática' : game.currentPhase}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#2c1810] hover:text-[#8b4513] text-2xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-[#5d4037] py-8">
              <p>No hay mensajes con {targetFaction} en este turno</p>
            </div>
          ) : (
            messages.map((msg) => {
              const sender = getPlayerByUserId(msg.from)
              const isMyMessage = msg.from === currentPlayer.userId
              const isPublic = msg.to === 'all'

              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg border-2 ${
                    isMyMessage
                      ? 'bg-[#5b7c99] border-[#4a6580] text-white ml-8'
                      : isPublic
                      ? 'bg-[#f4e8d8] border-[#d4af37] mr-8'
                      : 'bg-[#e8dcc8] border-[#8b4513] mr-8'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {sender && (
                      <img
                        src={`/factions/${getFactionImageName(sender.faction)}.png`}
                        alt={sender.faction}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-sm ${isMyMessage ? 'text-white' : 'text-[#2c1810]'}`}>
                          {isMyMessage ? 'Tú' : sender?.faction || 'Desconocido'}
                        </span>
                        <span className={`text-xs ${isMyMessage ? 'text-gray-200' : 'text-[#5d4037]'}`}>
                          {msg.sentAt && msg.sentAt.toDate().toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {isPublic && (
                        <span className="text-xs bg-[#d4af37] text-[#2c1810] px-2 py-0.5 rounded-full">
                          Público
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm ${isMyMessage ? 'text-white' : 'text-[#2c1810]'} whitespace-pre-wrap`}>
                    {msg.content}
                  </p>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t-2 border-[#8b4513] bg-[#d4af37]/10">
          {game.currentPhase === 'diplomatic' ? (
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={`Escribe un mensaje a ${targetFaction}...`}
                className="flex-1 px-3 py-2 border-2 border-[#8b4513] rounded bg-white text-[#2c1810] placeholder-[#8b7355] resize-none"
                rows={2}
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className="px-4 py-2 bg-[#d4af37] hover:bg-[#c19b2e] disabled:bg-gray-400 disabled:cursor-not-allowed text-[#2c1810] font-semibold rounded border-2 border-[#8b4513] transition-colors"
              >
                {isSending ? '...' : '📨 Enviar'}
              </button>
            </div>
          ) : (
            <div className="text-center text-[#5d4037] py-2">
              <p className="text-sm">
                Solo puedes enviar mensajes durante la fase diplomática
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
