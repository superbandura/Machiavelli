import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Player, DiplomaticMessage, Game } from '@/types'
import { getFactionImageName } from '@/utils/factionHelpers'
import WaxSeal from './decorative/icons/WaxSeal'

interface DiplomacyModalProps {
  game: Game
  currentPlayer: Player
  players: Player[]
  onClose: () => void
}

export default function DiplomacyModal({
  game,
  currentPlayer,
  players,
  onClose
}: DiplomacyModalProps) {
  const [messages, setMessages] = useState<(DiplomaticMessage & { id: string })[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedTab, setSelectedTab] = useState<string>('all')
  const [selectedRecipient, setSelectedRecipient] = useState<string>('all')
  const [filterTurn, setFilterTurn] = useState<number | 'all'>('all')
  const [isSending, setIsSending] = useState(false)
  const [hoveredFaction, setHoveredFaction] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, selectedTab])

  // Suscripción a mensajes en tiempo real
  useEffect(() => {
    if (!game.id || !currentPlayer.id) return

    const messagesQuery = query(
      collection(db, 'diplomatic_messages'),
      where('gameId', '==', game.id)
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData: (DiplomaticMessage & { id: string })[] = []

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DiplomaticMessage
        // Solo mostrar mensajes que involucran al jugador actual
        if (
          data.to === 'all' ||
          data.from === currentPlayer.userId ||
          data.to === currentPlayer.userId
        ) {
          messagesData.push({ ...data, id: docSnap.id })
        }
      })

      // Ordenar mensajes por fecha en el cliente
      messagesData.sort((a, b) => {
        const timeA = a.sentAt?.toMillis?.() ?? 0
        const timeB = b.sentAt?.toMillis?.() ?? 0
        return timeA - timeB
      })

      setMessages(messagesData)
    })

    return () => unsubscribe()
  }, [game.id, currentPlayer.userId])

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await addDoc(collection(db, 'diplomatic_messages'), {
        gameId: game.id,
        from: currentPlayer.userId,
        to: selectedRecipient,
        content: newMessage.trim(),
        turnNumber: game.turnNumber,
        phase: 'diplomatic',
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

  // Marcar mensajes como leídos cuando se abre una conversación
  const markMessagesAsRead = async (userId: string) => {
    const unreadMessages = messages.filter(
      msg =>
        msg.from === userId &&
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

  // Obtener mensajes filtrados por tab y turno
  const getFilteredMessages = () => {
    let filtered = messages

    // Filtrar por tab (facción)
    if (selectedTab !== 'all') {
      const playersInFaction = players.filter(p => p.faction === selectedTab)
      const userIds = playersInFaction.map(p => p.userId)

      filtered = filtered.filter(
        msg =>
          userIds.includes(msg.from) ||
          (userIds.includes(msg.to) && msg.from === currentPlayer.userId) ||
          msg.to === 'all'
      )
    }

    // Filtrar por turno
    if (filterTurn !== 'all') {
      filtered = filtered.filter(msg => msg.turnNumber === filterTurn)
    }

    return filtered
  }

  // Contar mensajes no leídos por facción
  const getUnreadCountByFaction = (faction: string): number => {
    const playersInFaction = players.filter(p => p.faction === faction)
    const userIds = playersInFaction.map(p => p.userId)

    return messages.filter(
      msg =>
        userIds.includes(msg.from) &&
        msg.to === currentPlayer.userId &&
        !msg.isRead
    ).length
  }

  // Contar total de mensajes no leídos
  const getTotalUnreadCount = (): number => {
    return messages.filter(
      msg =>
        msg.to === currentPlayer.userId &&
        msg.from !== currentPlayer.userId &&
        !msg.isRead
    ).length
  }

  // Obtener nombre del jugador
  const getPlayerName = (userId: string): string => {
    if (userId === 'all') return 'Todos'
    const player = players.find(p => p.userId === userId)
    return player?.faction || 'Desconocido'
  }

  // Obtener facción del jugador
  const getPlayerFaction = (userId: string): string => {
    const player = players.find(p => p.userId === userId)
    return player?.faction || ''
  }

  // Verificar si es fase diplomática
  const isDiplomaticPhase = game.currentPhase === 'diplomatic'

  // Cambiar tab y marcar como leídos, además seleccionar destinatario automáticamente
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab)

    // Seleccionar destinatario automáticamente según la pestaña
    if (tab === 'all') {
      setSelectedRecipient('all')
    } else {
      // Encontrar el primer jugador de esa facción
      const playerInFaction = players.find(p => p.faction === tab && p.userId !== currentPlayer.userId)
      if (playerInFaction) {
        setSelectedRecipient(playerInFaction.userId)
      }
    }

    if (tab !== 'all') {
      const playersInFaction = players.filter(p => p.faction === tab)
      playersInFaction.forEach(p => markMessagesAsRead(p.userId))
    }
  }

  const filteredMessages = getFilteredMessages()

  // Obtener facciones únicas de los jugadores
  const uniqueFactions = Array.from(new Set(players.map(p => p.faction)))
    .filter(faction => faction !== currentPlayer.faction)

  // Obtener lista de turnos disponibles
  const availableTurns = Array.from(new Set(messages.map(m => m.turnNumber))).sort((a, b) => b - a)

  return (
    <div className="fixed inset-0 bg-[#2d1810]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#d4c4a1] border-4 border-[#8b4513] rounded-lg w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
        {/* Header ornamentado */}
        <div className="p-5 border-b-4 border-[#8b4513] bg-gradient-to-r from-[#c4b49a] to-[#d4c4a1] flex justify-between items-center rounded-t-lg">
          <div className="flex items-center gap-3">
            <WaxSeal variant="burgundy" size="lg" />
            <div>
              <h2 className="text-3xl font-heading font-bold text-[#8b4513] flex items-center gap-2">
                Sala de Diplomacia
              </h2>
              {getTotalUnreadCount() > 0 && (
                <div className="text-sm font-serif text-[#d4af37] mt-1 font-semibold">
                  {getTotalUnreadCount()} carta{getTotalUnreadCount() !== 1 ? 's' : ''} sin leer
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Filtro por turno */}
            <select
              className="bg-[#f4e4c1] border-2 border-[#8b7355] rounded-lg px-3 py-2 text-sm font-serif text-[#2d1810] focus:border-[#d4af37] focus:outline-none transition-colors"
              value={filterTurn}
              onChange={(e) => setFilterTurn(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            >
              <option value="all">Todos los turnos</option>
              {availableTurns.map(turn => (
                <option key={turn} value={turn}>Turno {turn}</option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="text-[#2d1810] hover:text-[#8b4513] text-3xl transition-colors font-bold"
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs por facción con emblemas */}
        <div className="border-b-2 border-[#8b4513] bg-[#c4b49a] px-4 relative">
          <div className="flex gap-2 overflow-x-auto py-3 pt-16">
            {/* Tab "Todos" */}
            <button
              onClick={() => handleTabChange('all')}
              onMouseEnter={() => setHoveredFaction('all')}
              onMouseLeave={() => setHoveredFaction(null)}
              className={`relative flex items-center justify-center p-4 transition-all rounded-t-lg ${
                selectedTab === 'all'
                  ? 'bg-[#d4c4a1] border-b-3 border-[#8b4513] shadow-sm'
                  : 'hover:bg-[#b4a48a]'
              }`}
            >
              <span className="text-3xl">📜</span>
              {selectedTab !== 'all' && getTotalUnreadCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#d4af37] text-[#2d1810] text-xs font-bold px-1.5 py-0.5 rounded-full shadow-sm min-w-[20px] text-center z-10">
                  {getTotalUnreadCount()}
                </span>
              )}

              {/* Tooltip */}
              {hoveredFaction === 'all' && (
                <div className="fixed px-4 py-2 bg-[#2d1810] border-2 border-[#d4af37] rounded-lg shadow-2xl whitespace-nowrap z-[100]" style={{ top: 'calc(100% - 50px)', left: '50%', transform: 'translateX(-50%)' }}>
                  <div className="text-sm font-serif text-[#f4e4c1] font-semibold">Todos</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#d4af37]"></div>
                </div>
              )}
            </button>

            {/* Tabs por facción - solo emblemas */}
            {uniqueFactions.map((faction) => {
              const unreadCount = getUnreadCountByFaction(faction)
              return (
                <button
                  key={faction}
                  onClick={() => handleTabChange(faction)}
                  onMouseEnter={() => setHoveredFaction(faction)}
                  onMouseLeave={() => setHoveredFaction(null)}
                  className={`relative flex items-center justify-center p-4 transition-all rounded-t-lg ${
                    selectedTab === faction
                      ? 'bg-[#d4c4a1] border-b-3 border-[#8b4513] shadow-sm'
                      : 'hover:bg-[#b4a48a]'
                  }`}
                >
                  <img
                    src={`/factions/${getFactionImageName(faction)}.png`}
                    alt={faction}
                    className="w-14 h-14 object-contain pointer-events-none"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#d4af37] text-[#2d1810] text-xs font-bold px-1.5 py-0.5 rounded-full shadow-sm min-w-[20px] text-center z-10">
                      {unreadCount}
                    </span>
                  )}

                  {/* Tooltip renacentista */}
                  {hoveredFaction === faction && (
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-[#2d1810] border-2 border-[#d4af37] rounded-lg shadow-2xl whitespace-nowrap z-[100]"
                    >
                      <div className="text-sm font-serif text-[#f4e4c1] font-semibold">{faction}</div>
                      {/* Flecha del tooltip */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#d4af37]"></div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {!isDiplomaticPhase && (
          <div className="mx-4 mt-4 text-sm font-serif text-[#8b4513] bg-[#f4d03f]/20 border-2 border-[#d4af37] rounded-lg p-3">
            ⚠️ Los mensajes solo se pueden enviar en la Fase Diplomática
          </div>
        )}

        {/* Lista de mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#d4c4a1]">
          {filteredMessages.length === 0 ? (
            <div className="text-center text-[#4d3830] py-8">
              <div className="text-4xl mb-2">📭</div>
              <div className="font-serif text-lg">No hay mensajes</div>
              <div className="text-sm font-serif mt-1 text-[#6d5d4d]">
                {filterTurn !== 'all'
                  ? 'No hay mensajes en este turno'
                  : 'Sé el primero en negociar'}
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isOwnMessage = msg.from === currentPlayer.userId
              const isPublic = msg.to === 'all'
              const senderFaction = getPlayerFaction(msg.from)

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 font-serif shadow-md ${
                      isOwnMessage
                        ? 'bg-[#5b7c99] text-white border-2 border-[#4d6a84]'
                        : isPublic
                        ? 'bg-[#f4e4c1] border-2 border-[#d4af37] text-[#2d1810]'
                        : 'bg-[#c4b49a] border-2 border-[#8b7355] text-[#2d1810]'
                    }`}
                  >
                    {/* Cabecera del mensaje */}
                    <div className="flex items-center gap-2 mb-2">
                      {!isOwnMessage && (
                        <img
                          src={`/factions/${getFactionImageName(senderFaction)}.png`}
                          alt={senderFaction}
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <span className={`font-bold text-sm ${isOwnMessage ? 'text-white' : 'text-[#2d1810]'}`}>
                        {isOwnMessage ? 'Tú' : getPlayerName(msg.from)}
                      </span>
                      {isPublic && (
                        <span className="text-xs bg-[#d4af37] text-[#2d1810] px-2 py-0.5 rounded font-bold">
                          Público
                        </span>
                      )}
                      {!isPublic && !isOwnMessage && (
                        <span className="text-xs bg-[#8b7355] text-[#f4e4c1] px-2 py-0.5 rounded">
                          Privado
                        </span>
                      )}
                    </div>

                    {/* Contenido del mensaje */}
                    <div className={`text-sm whitespace-pre-wrap break-words ${isOwnMessage ? 'text-white' : 'text-[#2d1810]'}`}>
                      {msg.content}
                    </div>

                    {/* Metadata */}
                    <div className={`flex items-center justify-between mt-2 text-xs ${isOwnMessage ? 'text-white/75' : 'text-[#4d3830]'}`}>
                      <span>
                        Turno {msg.turnNumber} - {msg.sentAt ? new Date((msg.sentAt as Timestamp).toMillis()).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Enviando...'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input de nuevo mensaje */}
        <div className="p-4 border-t-4 border-[#8b4513] bg-gradient-to-r from-[#c4b49a] to-[#d4c4a1] rounded-b-lg">
          {isDiplomaticPhase ? (
            <>
              <div className="mb-3">
                <label className="block text-xs font-serif font-semibold mb-1 text-[#2d1810]">
                  Destinatario
                </label>
                <select
                  className="w-full bg-[#f4e4c1] border-2 border-[#8b7355] rounded-lg px-3 py-2 text-sm font-serif text-[#2d1810] focus:border-[#d4af37] focus:outline-none transition-colors"
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                >
                  <option value="all">📢 Mensaje público (todos)</option>
                  {players
                    .filter(p => p.userId !== currentPlayer.userId)
                    .map(player => (
                      <option key={player.id} value={player.userId}>
                        🔒 {player.faction} (privado)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2">
                <textarea
                  className="flex-1 bg-[#f4e4c1] border-2 border-[#8b7355] rounded-lg px-3 py-2 text-sm font-serif text-[#2d1810] resize-none focus:border-[#d4af37] focus:outline-none transition-colors placeholder:text-[#8b7355] placeholder:italic"
                  placeholder="Redacta tu misiva diplomática..."
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
                  className={`px-4 py-2 rounded-lg font-serif font-bold transition-all ${
                    !newMessage.trim() || isSending
                      ? 'bg-[#a49471] text-[#6d5d4d] cursor-not-allowed'
                      : 'bg-[#d4af37] hover:bg-[#b8941f] text-[#2d1810] shadow-md hover:shadow-lg'
                  }`}
                >
                  {isSending ? '⏳' : '✉️'}
                </button>
              </div>

              <div className="text-xs font-serif text-[#4d3830] mt-2 italic">
                Presiona Enter para enviar, Shift+Enter para nueva línea
              </div>
            </>
          ) : (
            <div className="text-center text-[#4d3830] font-serif text-sm py-3">
              Solo puedes enviar mensajes durante la Fase Diplomática
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
