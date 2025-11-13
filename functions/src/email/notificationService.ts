/**
 * Servicio de Notificaciones del Juego
 *
 * Funciones de alto nivel para enviar notificaciones específicas
 * a los jugadores según eventos del juego
 */

import * as admin from 'firebase-admin'
import { sendEmail, sendBulkEmails, isValidEmail } from './emailService'
import {
  getPhaseChangeEmail,
  getReminderEmail,
  getInactivityWarningEmail,
  getGameEndedEmail
} from './emailTemplates'

const GAME_URL_BASE = process.env.GAME_URL || 'https://machiavelli.game'

/**
 * Enviar notificación de cambio de fase a todos los jugadores
 */
export async function notifyPhaseChange(
  gameId: string,
  db: admin.firestore.Firestore
): Promise<void> {
  console.log(`Sending phase change notifications for game ${gameId}`)

  try {
    // Cargar datos del juego
    const gameDoc = await db.collection('games').doc(gameId).get()
    if (!gameDoc.exists) {
      console.error(`Game ${gameId} not found`)
      return
    }

    const game = gameDoc.data()!

    // Verificar si las notificaciones están habilitadas
    if (!game.gameSettings?.emailNotifications) {
      console.log('Email notifications disabled for this game')
      return
    }

    // Cargar jugadores
    const playersSnapshot = await db.collection('players')
      .where('gameId', '==', gameId)
      .where('isAlive', '==', true)
      .get()

    if (playersSnapshot.empty) {
      console.log('No active players found')
      return
    }

    // Formatear deadline
    const deadline = game.phaseDeadline?.toDate()
    const deadlineStr = deadline
      ? deadline.toLocaleString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'No establecido'

    // Crear mensajes para cada jugador
    const messages = playersSnapshot.docs
      .map(doc => {
        const player = doc.data()
        if (!player.email || !isValidEmail(player.email)) {
          console.warn(`Invalid email for player ${player.id}`)
          return null
        }

        const emailData = getPhaseChangeEmail({
          playerName: player.displayName || 'Jugador',
          gameName: game.name || 'Partida',
          gameId: gameId,
          gameUrl: `${GAME_URL_BASE}/game/${gameId}`,
          newPhase: game.currentPhase,
          deadline: deadlineStr,
          turnNumber: game.turnNumber || 1,
          year: game.currentYear || 1454,
          season: game.currentSeason || 'Primavera'
        })

        return {
          to: player.email,
          subject: emailData.subject,
          html: emailData.html
        }
      })
      .filter(msg => msg !== null)

    // Enviar todos los emails
    const sent = await sendBulkEmails(messages as any)
    console.log(`Phase change notifications sent: ${sent}/${messages.length}`)

  } catch (error) {
    console.error('Error sending phase change notifications:', error)
  }
}

/**
 * Enviar recordatorio 24h antes del deadline
 */
export async function notifyDeadlineReminder(
  gameId: string,
  db: admin.firestore.Firestore
): Promise<void> {
  console.log(`Sending deadline reminders for game ${gameId}`)

  try {
    const gameDoc = await db.collection('games').doc(gameId).get()
    if (!gameDoc.exists) return

    const game = gameDoc.data()!

    if (!game.gameSettings?.emailNotifications) return

    // Solo enviar recordatorios para fases que requieren acción
    if (game.currentPhase === 'resolution') return

    // Calcular horas restantes
    const deadline = game.phaseDeadline?.toDate()
    if (!deadline) return

    const now = new Date()
    const hoursRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60))

    // Cargar jugadores que NO han enviado órdenes
    const playersSnapshot = await db.collection('players')
      .where('gameId', '==', gameId)
      .where('isAlive', '==', true)
      .where('hasSubmittedOrders', '==', false)
      .get()

    if (playersSnapshot.empty) {
      console.log('All players have submitted orders')
      return
    }

    const deadlineStr = deadline.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const messages = playersSnapshot.docs
      .map(doc => {
        const player = doc.data()
        if (!player.email || !isValidEmail(player.email)) return null

        const emailData = getReminderEmail({
          playerName: player.displayName || 'Jugador',
          gameName: game.name || 'Partida',
          gameId: gameId,
          gameUrl: `${GAME_URL_BASE}/game/${gameId}`,
          currentPhase: game.currentPhase,
          hoursRemaining: hoursRemaining,
          deadline: deadlineStr
        })

        return {
          to: player.email,
          subject: emailData.subject,
          html: emailData.html
        }
      })
      .filter(msg => msg !== null)

    const sent = await sendBulkEmails(messages as any)
    console.log(`Deadline reminders sent: ${sent}/${messages.length}`)

  } catch (error) {
    console.error('Error sending deadline reminders:', error)
  }
}

/**
 * Enviar advertencia de inactividad a un jugador
 */
export async function notifyInactivityWarning(
  playerId: string,
  gameId: string,
  missedTurns: number,
  db: admin.firestore.Firestore
): Promise<void> {
  console.log(`Sending inactivity warning to player ${playerId} (${missedTurns} strikes)`)

  try {
    const playerDoc = await db.collection('players').doc(playerId).get()
    if (!playerDoc.exists) return

    const player = playerDoc.data()!

    const gameDoc = await db.collection('games').doc(gameId).get()
    if (!gameDoc.exists) return

    const game = gameDoc.data()!

    if (!game.gameSettings?.emailNotifications) return

    if (!player.email || !isValidEmail(player.email)) return

    const emailData = getInactivityWarningEmail({
      playerName: player.displayName || 'Jugador',
      gameName: game.name || 'Partida',
      gameId: gameId,
      gameUrl: `${GAME_URL_BASE}/game/${gameId}`,
      missedTurns: missedTurns,
      maxStrikes: 3
    })

    await sendEmail({
      to: player.email,
      subject: emailData.subject,
      html: emailData.html
    })

    console.log(`Inactivity warning sent to ${player.email}`)

  } catch (error) {
    console.error('Error sending inactivity warning:', error)
  }
}

/**
 * Enviar notificación de fin de partida a todos los jugadores
 */
export async function notifyGameEnded(
  gameId: string,
  winnerId: string | null,
  victoryType: string,
  db: admin.firestore.Firestore
): Promise<void> {
  console.log(`Sending game ended notifications for game ${gameId}`)

  try {
    const gameDoc = await db.collection('games').doc(gameId).get()
    if (!gameDoc.exists) return

    const game = gameDoc.data()!

    if (!game.gameSettings?.emailNotifications) return

    // Obtener nombre del ganador
    let winnerName = 'Empate'
    if (winnerId) {
      const winnerDoc = await db.collection('players').doc(winnerId).get()
      if (winnerDoc.exists) {
        winnerName = winnerDoc.data()!.faction || 'Ganador'
      }
    }

    // Cargar todos los jugadores
    const playersSnapshot = await db.collection('players')
      .where('gameId', '==', gameId)
      .get()

    if (playersSnapshot.empty) return

    const messages = playersSnapshot.docs
      .map(doc => {
        const player = doc.data()
        if (!player.email || !isValidEmail(player.email)) return null

        const emailData = getGameEndedEmail({
          playerName: player.displayName || 'Jugador',
          gameName: game.name || 'Partida',
          gameId: gameId,
          gameUrl: `${GAME_URL_BASE}/game/${gameId}`,
          winner: winnerName,
          victoryType: victoryType,
          finalTurn: game.turnNumber || 1
        })

        return {
          to: player.email,
          subject: emailData.subject,
          html: emailData.html
        }
      })
      .filter(msg => msg !== null)

    const sent = await sendBulkEmails(messages as any)
    console.log(`Game ended notifications sent: ${sent}/${messages.length}`)

  } catch (error) {
    console.error('Error sending game ended notifications:', error)
  }
}
