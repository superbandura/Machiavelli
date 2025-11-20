import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Player, WarCouncilMessage, MilitaryCampaign, Game } from '@/types'
import WaxSeal from './decorative/icons/WaxSeal'

/**
 * Props para el componente WarCouncilChat
 */
interface WarCouncilChatProps {
  /** ID de la partida */
  gameId: string
  /** Campaña militar activa (contiene info de atacantes/defensores) */
  campaign: MilitaryCampaign
  /** Jugador actual que accede al chat */
  currentPlayer: Player
  /** Lista de todos los jugadores de la partida */
  players: Player[]
  /** Información completa del juego (para determinar defensor) */
  game: Game
}

/**
 * Chat privado del Consejo de Guerra para una campaña militar
 *
 * Cada campaña tiene dos salas de chat separadas:
 * - **Chat Atacantes:** Solo visible para facción declarante y aliados atacantes
 * - **Chat Defensores:** Solo visible para facción defensora y aliados defensores
 *
 * **Características:**
 * - Real-time messaging con Firestore listeners
 * - Filtrado automático por bando (`senderFaction: 'attacker' | 'defender'`)
 * - Auto-scroll a nuevos mensajes
 * - Marcado automático como leído con `arrayUnion(userId)` en `readBy`
 * - Emblemas de facciones en cada mensaje
 * - Límite de 1000 caracteres por mensaje
 * - Persistencia en `/war_council_messages` collection
 * - Acceso denegado si jugador no pertenece a ningún bando
 *
 * **Determinación de bando:**
 * 1. ¿Es el declarante? → attacker
 * 2. ¿Controla la provincia objetivo? → defender
 * 3. ¿Es un aliado en `campaign.allies`? → según `ally.side`
 * 4. Si no, → null (sin acceso)
 *
 * **Estructura Firestore:**
 * ```typescript
 * war_council_messages/{id} {
 *   gameId: string
 *   campaignId: string
 *   from: userId
 *   senderFaction: 'attacker' | 'defender'
 *   content: string
 *   sentAt: Timestamp
 *   readBy: string[]
 * }
 * ```
 *
 * @component
 * @example
 * <WarCouncilChat
 *   gameId="game-123"
 *   campaign={activeCampaign}
 *   currentPlayer={player}
 *   players={allPlayers}
 *   game={currentGame}
 * />
 */

export default function WarCouncilChat({
  gameId,
  campaign,
  currentPlayer,
  players,
  game
}: WarCouncilChatProps) {
  const [messages, setMessages] = useState<(WarCouncilMessage & { id: string })[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Determinar facción defensora
  const defenderFaction = game.map?.provinces[campaign.targetProvince]?.controlledBy || ''

  // Determinar bando del jugador actual (incluye aliados)
  const getCurrentPlayerSide = (): 'attacker' | 'defender' | null => {
    // 1. ¿Es el declarante?
    if (currentPlayer.faction === campaign.declaredByFaction) {
      return 'attacker'
    }

    // 2. ¿Es el defensor original?
    if (currentPlayer.faction === defenderFaction) {
      return 'defender'
    }

    // 3. ¿Es un aliado que se unió durante la fase diplomática?
    const playerAlly = campaign.allies?.find(a => a.playerId === currentPlayer.id)
    if (playerAlly) {
      return playerAlly.side
    }

    // 4. No pertenece a ningún bando
    return null
  }

  const currentPlayerSide = getCurrentPlayerSide()

  // Auto-scroll al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Suscripción a mensajes en tiempo real
  useEffect(() => {
    if (!gameId || !campaign.id || !currentPlayerSide) return

    const messagesQuery = query(
      collection(db, 'war_council_messages'),
      where('gameId', '==', gameId),
      where('campaignId', '==', campaign.id)
    )

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesData: (WarCouncilMessage & { id: string })[] = []

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WarCouncilMessage
        // Filtrar solo mensajes del bando actual
        if (data.senderFaction === currentPlayerSide) {
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

      // Marcar como leídos los mensajes que aún no ha leído el jugador actual
      const unreadMessages = snapshot.docs.filter(docSnap => {
        const data = docSnap.data() as WarCouncilMessage
        return !data.readBy?.includes(currentPlayer.userId)
      })

      for (const msgDoc of unreadMessages) {
        await updateDoc(doc(db, 'war_council_messages', msgDoc.id), {
          readBy: arrayUnion(currentPlayer.userId)
        })
      }
    })

    return () => unsubscribe()
  }, [gameId, campaign.id, currentPlayerSide, currentPlayer.userId])

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !currentPlayerSide) return

    setIsSending(true)
    try {
      await addDoc(collection(db, 'war_council_messages'), {
        gameId,
        campaignId: campaign.id,
        from: currentPlayer.userId,
        senderFaction: currentPlayerSide,
        content: newMessage.trim(),
        sentAt: serverTimestamp(),
        readBy: [currentPlayer.userId] // El emisor ya lo ha "leído"
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      alert('Error al enviar el mensaje al Consejo de Guerra')
    } finally {
      setIsSending(false)
    }
  }

  // Obtener nombre del jugador
  const getPlayerName = (userId: string): string => {
    const player = players.find(p => p.userId === userId)
    return player?.displayName || player?.faction || 'Desconocido'
  }

  // Si el jugador no pertenece a ningún bando
  if (!currentPlayerSide) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f4e4c1]/20 rounded-lg border-2 border-[#6b5d42] p-8">
        <div className="text-6xl mb-4">🚫</div>
        <h3 className="font-heading font-bold text-xl text-[#2d1810] mb-2">
          Acceso Denegado
        </h3>
        <p className="text-sm text-[#4a3f2a] text-center">
          No perteneces a ningún bando en esta campaña.
        </p>
      </div>
    )
  }

  const sideName = currentPlayerSide === 'attacker' ? 'Atacantes' : 'Defensores'
  const sideIcon = currentPlayerSide === 'attacker' ? '⚔️' : '🛡️'

  return (
    <div className="flex flex-col h-full bg-transparent rounded-lg border-2 border-[#6b5d42] shadow-lg">
      {/* Header ornamentado */}
      <div className="p-4 border-b-2 border-[#6b5d42]/50 bg-[#d4c4a1]">
        <div className="flex items-center gap-3">
          <WaxSeal variant="burgundy" size="md" />
          <div>
            <h3 className="font-heading font-bold text-lg text-[#2d1810]">
              Consejo de Guerra {sideIcon}
            </h3>
            <p className="text-xs text-[#6b5d42] font-medium">
              Bando: {sideName} · Campaña contra {campaign.targetProvince}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f4e4c1]/20">
        {messages.length === 0 ? (
          <div className="text-center text-[#6b5d42] py-8">
            <div className="text-5xl mb-3">💬</div>
            <div className="font-heading text-lg text-[#2d1810]">Sin mensajes aún</div>
            <div className="text-sm font-serif mt-2 italic text-[#4a3f2a]">
              Inicia la coordinación con tus aliados
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.from === currentPlayer.userId
            const sender = players.find(p => p.userId === msg.from)
            const senderFaction = sender?.faction || ''

            return (
              <div
                key={msg.id}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded-lg p-3 relative bg-[#e8dcc0] border-2 border-[#b4a481]">
                  {/* Sello de cera en la esquina */}
                  <div className="absolute -top-2 -right-2">
                    <WaxSeal
                      variant="burgundy"
                      size="sm"
                    />
                  </div>

                  {/* Cabecera del mensaje con emblema de facción */}
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dotted border-[#6b5d42]">
                    {/* Emblema de facción */}
                    {senderFaction && (
                      <img
                        src={`/factions/${senderFaction.toLowerCase()}.png`}
                        alt={senderFaction}
                        className="w-5 h-5 object-contain flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <span className="font-heading font-semibold text-sm text-[#2d1810]">
                      {isOwnMessage ? 'Tú' : getPlayerName(msg.from)}
                    </span>
                  </div>

                  {/* Contenido del mensaje */}
                  <div className="text-sm text-[#2d1810] whitespace-pre-wrap break-words leading-relaxed mb-2">
                    {msg.content}
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-[#6b5d42] italic">
                    {msg.sentAt?.toDate?.()?.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulario para enviar mensaje */}
      <div className="p-4 border-t-2 border-[#6b5d42] bg-[#d4c4a1]">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Escribe tu mensaje al consejo..."
            className="flex-1 bg-white border-2 border-[#6b5d42] rounded px-3 py-2 text-sm text-[#2d1810] placeholder-[#8b7355] focus:ring-2 focus:ring-renaissance-gold focus:border-renaissance-gold transition-colors"
            disabled={isSending}
            maxLength={1000}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className={`px-4 py-2 rounded font-heading font-semibold text-sm transition-colors ${
              newMessage.trim() && !isSending
                ? 'bg-renaissance-gold hover:bg-[#c9a961] text-[#1d1408]'
                : 'bg-[#8b7355] text-[#d4c4a1] cursor-not-allowed'
            }`}
          >
            {isSending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
        <div className="mt-2 text-xs text-[#6b5d42] text-right">
          {newMessage.length}/1000
        </div>
      </div>
    </div>
  )
}
