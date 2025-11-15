import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Player, DiplomaticMessage, Game } from '@/types'
import { FACTIONS } from '@/data/factions'
import WaxSeal from './decorative/icons/WaxSeal'
import Separator from './decorative/Separator'

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
      where('gameId', '==', game.id),
      orderBy('sentAt', 'asc')
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData: (DiplomaticMessage & { id: string })[] = []

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DiplomaticMessage
        // Solo mostrar mensajes que involucran al jugador actual
        if (
          data.to === 'all' ||
          data.from === currentPlayer.id ||
          data.to === currentPlayer.id
        ) {
          messagesData.push({ ...data, id: docSnap.id })
        }
      })

      setMessages(messagesData)
    })

    return () => unsubscribe()
  }, [game.id, currentPlayer.id])

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await addDoc(collection(db, 'diplomatic_messages'), {
        gameId: game.id,
        from: currentPlayer.id,
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
  const markMessagesAsRead = async (playerId: string) => {
    const unreadMessages = messages.filter(
      msg =>
        msg.from === playerId &&
        msg.to === currentPlayer.id &&
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
      const playerIds = playersInFaction.map(p => p.id)

      filtered = filtered.filter(
        msg =>
          playerIds.includes(msg.from) ||
          (playerIds.includes(msg.to) && msg.from === currentPlayer.id) ||
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
    const playerIds = playersInFaction.map(p => p.id)

    return messages.filter(
      msg =>
        playerIds.includes(msg.from) &&
        msg.to === currentPlayer.id &&
        !msg.isRead
    ).length
  }

  // Contar total de mensajes no leídos
  const getTotalUnreadCount = (): number => {
    return messages.filter(
      msg =>
        msg.to === currentPlayer.id &&
        msg.from !== currentPlayer.id &&
        !msg.isRead
    ).length
  }

  // Obtener nombre del jugador
  const getPlayerName = (playerId: string): string => {
    if (playerId === 'all') return 'Todos'
    const player = players.find(p => p.id === playerId)
    return player?.faction || 'Desconocido'
  }

  // Obtener facción del jugador
  const getPlayerFaction = (playerId: string): string => {
    const player = players.find(p => p.id === playerId)
    return player?.faction || ''
  }

  // Verificar si es fase diplomática
  const isDiplomaticPhase = game.currentPhase === 'diplomatic'

  // Cambiar tab y marcar como leídos
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab)
    if (tab !== 'all') {
      const playersInFaction = players.filter(p => p.faction === tab)
      playersInFaction.forEach(p => markMessagesAsRead(p.id))
    }
  }

  const filteredMessages = getFilteredMessages()

  // Obtener facciones únicas de los jugadores
  const uniqueFactions = Array.from(new Set(players.map(p => p.faction)))
    .filter(faction => faction !== currentPlayer.faction)

  // Obtener lista de turnos disponibles
  const availableTurns = Array.from(new Set(messages.map(m => m.turnNumber))).sort((a, b) => b - a)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border-3 border-burgundy-500 rounded-lg w-full max-w-5xl h-[85vh] flex flex-col shadow-ornate-lg">
        {/* Header ornamentado */}
        <div className="p-5 border-b-2 border-burgundy-500/50 bg-gray-800 flex justify-between items-center rounded-t-lg">
          <div className="flex items-center gap-3">
            <WaxSeal variant="burgundy" size="lg" />
            <div>
              <h2 className="text-3xl font-heading font-bold text-burgundy-300 flex items-center gap-2">
                Sala de Diplomacia
              </h2>
              {getTotalUnreadCount() > 0 && (
                <div className="text-sm font-serif text-renaissance-gold mt-1">
                  {getTotalUnreadCount()} carta{getTotalUnreadCount() !== 1 ? 's' : ''} sin leer
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Filtro por turno */}
            <select
              className="bg-gray-900 border-2 border-burgundy-400 rounded-lg px-3 py-2 text-sm font-serif text-parchment-200 focus:border-burgundy-300 transition-colors"
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
              className="text-gray-400 hover:text-burgundy-300 text-3xl transition-colors font-bold"
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs por facción */}
        <div className="border-b border-gray-700 bg-gray-800 px-4">
          <div className="flex gap-2 overflow-x-auto">
            {/* Tab "Todos" */}
            <button
              onClick={() => handleTabChange('all')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                selectedTab === 'all'
                  ? 'border-b-2 border-purple-500 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos
              {selectedTab !== 'all' && getTotalUnreadCount() > 0 && (
                <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {getTotalUnreadCount()}
                </span>
              )}
            </button>

            {/* Tabs por facción */}
            {uniqueFactions.map(faction => {
              const unreadCount = getUnreadCountByFaction(faction)
              return (
                <button
                  key={faction}
                  onClick={() => handleTabChange(faction)}
                  className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                    selectedTab === faction
                      ? 'border-b-2 border-purple-500 text-purple-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {faction}
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {!isDiplomaticPhase && (
          <div className="mx-4 mt-4 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700 rounded p-2">
            ⚠️ Los mensajes solo se pueden enviar en la Fase Diplomática
          </div>
        )}

        {/* Lista de mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
          {filteredMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">📭</div>
              <div>No hay mensajes</div>
              <div className="text-xs mt-1">
                {filterTurn !== 'all'
                  ? 'No hay mensajes en este turno'
                  : 'Sé el primero en negociar'}
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isOwnMessage = msg.from === currentPlayer.id
              const isPublic = msg.to === 'all'
              const senderFaction = getPlayerFaction(msg.from)
              const senderColor = Object.values(FACTIONS).find(f => f.name === senderFaction)?.color

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
                      {!isOwnMessage && senderColor && (
                        <div
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: senderColor }}
                        />
                      )}
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
        <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg">
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
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
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
    </div>
  )
}
