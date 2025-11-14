/**
 * Check Deadlines Function
 *
 * Ejecutada cada minuto por Cloud Scheduler
 * Verifica si alguna partida ha llegado a su deadline y ejecuta resolveTurn
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { resolveTurn } from './resolveTurn';
import { notifyPhaseChange, notifyInactivityWarning, notifyDeadlineReminder } from './email/notificationService';

export const checkDeadlines = onSchedule('every 1 minutes', async (_event) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // 1. Enviar recordatorios 24h antes del deadline
      await sendDeadlineReminders(db, now);

      // 2. Buscar partidas activas cuyo deadline ha pasado
      const gamesSnapshot = await db.collection('games')
        .where('status', '==', 'active')
        .where('phaseDeadline', '<=', now)
        .get();

      console.log(`Found ${gamesSnapshot.size} games with expired deadlines`);

      // Resolver cada partida
      for (const gameDoc of gamesSnapshot.docs) {
        const gameId = gameDoc.id;
        const gameData = gameDoc.data();

        console.log(`Processing game ${gameId} - Phase: ${gameData.currentPhase}`);

        try {
          // Si la fase actual es 'orders', es momento de resolver el turno
          if (gameData.currentPhase === 'orders') {
            // Antes de resolver, procesar jugadores inactivos
            await handleInactivePlayers(gameId, gameData.turnNumber, db);

            console.log(`Resolving turn for game ${gameId}`);
            await resolveTurn(gameId);
          } else {
            // Si es fase diplomática, simplemente avanzar a órdenes
            console.log(`Advancing phase for game ${gameId} from diplomatic to orders`);
            await advancePhase(gameId, gameData, db);
          }
        } catch (error) {
          console.error(`Error processing game ${gameId}:`, error);
          // Continuar con otras partidas aunque una falle
        }
      }

      return;
    } catch (error) {
      console.error('Error in checkDeadlines:', error);
      throw error;
    }
  });

/**
 * Avanzar de fase diplomática a fase de órdenes
 */
async function advancePhase(gameId: string, gameData: any, db: admin.firestore.Firestore) {
  const gameRef = db.collection('games').doc(gameId);

  // Obtener duraciones configuradas de la partida
  const phaseDurations = gameData.phaseDurations || {
    diplomatic: 48,
    orders: 48,
    resolution: 1
  };

  const durationHours = phaseDurations.orders || 48;
  const newDeadline = admin.firestore.Timestamp.fromMillis(
    Date.now() + durationHours * 60 * 60 * 1000
  );

  await gameRef.update({
    currentPhase: 'orders',
    phaseDeadline: newDeadline,
    phaseStartedAt: new Date()
  });

  // Reiniciar flag de órdenes enviadas para todos los jugadores
  const playersSnapshot = await db.collection('players')
    .where('gameId', '==', gameId)
    .where('isAlive', '==', true)
    .get();

  const batch = db.batch();
  playersSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, { hasSubmittedOrders: false });
  });
  await batch.commit();

  console.log(`Game ${gameId} advanced from diplomatic to orders`);

  // Enviar notificación de cambio de fase
  try {
    await notifyPhaseChange(gameId, db);
  } catch (error) {
    console.error(`Error sending phase change notification for game ${gameId}:`, error);
    // No fallar el proceso si el email falla
  }
}

/**
 * Manejar jugadores inactivos
 * - Detectar jugadores sin órdenes
 * - Crear órdenes "hold" automáticas para todas sus unidades
 * - Incrementar contador de inactividad
 * - Marcar como inactivo si contador >= 3
 * - Enviar notificaciones por email
 */
async function handleInactivePlayers(gameId: string, turnNumber: number, db: admin.firestore.Firestore) {
  console.log(`Checking for inactive players in game ${gameId}`);

  // Cargar documento del juego para obtener unidades embebidas
  const gameDoc = await db.collection('games').doc(gameId).get();
  if (!gameDoc.exists) {
    throw new Error(`Game ${gameId} not found`);
  }
  const gameData = gameDoc.data() as any;

  // Cargar jugadores
  const playersSnapshot = await db.collection('players')
    .where('gameId', '==', gameId)
    .where('isAlive', '==', true)
    .get();

  const players = playersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as any));

  // Unidades embebidas en el documento del juego
  const units = gameData.units || [];

  // Procesar cada jugador
  for (const player of players) {
    const hasSubmitted = player.hasSubmittedOrders || false;

    if (!hasSubmitted) {
      // Jugador no envió órdenes
      const currentStrikes = player.inactivityCounter || 0;
      const newStrikes = currentStrikes + 1;

      console.log(`Player ${player.id} (${player.faction}) inactive - strikes: ${currentStrikes} → ${newStrikes}`);

      // Crear órdenes "hold" automáticas para todas sus unidades
      const playerUnits = units.filter((u: any) => u.owner === player.id);
      const batch = db.batch();

      for (const unit of playerUnits) {
        const holdOrder = {
          gameId,
          unitId: unit.id,
          playerId: player.id,
          turnNumber,
          action: 'hold',
          createdAt: new Date(),
          isAutomatic: true, // Marcar como automática
        };

        const orderRef = db.collection('orders').doc();
        batch.set(orderRef, holdOrder);
      }

      // Actualizar jugador
      const playerRef = db.collection('players').doc(player.id);
      const playerUpdate: any = {
        inactivityCounter: newStrikes,
      };

      // Si llega a 3 strikes, marcar como inactivo
      if (newStrikes >= 3) {
        playerUpdate.status = 'inactive';
        console.log(`Player ${player.id} marked as inactive after 3 strikes`);
      }

      batch.update(playerRef, playerUpdate);

      await batch.commit();

      console.log(`Created ${playerUnits.length} automatic hold orders for inactive player ${player.id}`);

      // Enviar email de advertencia de inactividad
      try {
        await notifyInactivityWarning(player.id, gameId, newStrikes, db);
      } catch (error) {
        console.error(`Error sending inactivity warning to player ${player.id}:`, error);
        // No fallar el proceso si el email falla
      }
    }
  }
}

/**
 * Enviar recordatorios 24h antes del deadline
 */
async function sendDeadlineReminders(db: admin.firestore.Firestore, now: admin.firestore.Timestamp) {
  // Calcular timestamp para dentro de 24h (con margen de ±5 minutos para la ventana de ejecución)
  const twentyFourHoursFromNow = admin.firestore.Timestamp.fromMillis(
    Date.now() + 24 * 60 * 60 * 1000
  );
  const fiveMinutesMargin = 5 * 60 * 1000;
  const reminderWindowStart = admin.firestore.Timestamp.fromMillis(
    twentyFourHoursFromNow.toMillis() - fiveMinutesMargin
  );
  const reminderWindowEnd = admin.firestore.Timestamp.fromMillis(
    twentyFourHoursFromNow.toMillis() + fiveMinutesMargin
  );

  try {
    // Buscar partidas activas cuyo deadline está en ~24h
    const gamesSnapshot = await db.collection('games')
      .where('status', '==', 'active')
      .where('phaseDeadline', '>=', reminderWindowStart)
      .where('phaseDeadline', '<=', reminderWindowEnd)
      .get();

    if (gamesSnapshot.empty) {
      return;
    }

    console.log(`Found ${gamesSnapshot.size} games needing deadline reminders`);

    for (const gameDoc of gamesSnapshot.docs) {
      const gameId = gameDoc.id;
      const gameData = gameDoc.data();

      // Solo enviar recordatorios para fases que requieren acción
      if (gameData.currentPhase === 'resolution') {
        continue;
      }

      // Verificar si ya se envió el recordatorio para esta fase
      const reminderKey = `reminder_${gameData.turnNumber}_${gameData.currentPhase}`;
      if (gameData.remindersSent && gameData.remindersSent[reminderKey]) {
        console.log(`Reminder already sent for game ${gameId} - turn ${gameData.turnNumber} phase ${gameData.currentPhase}`);
        continue;
      }

      // Enviar recordatorio
      try {
        await notifyDeadlineReminder(gameId, db);

        // Marcar como enviado
        const gameRef = db.collection('games').doc(gameId);
        await gameRef.update({
          [`remindersSent.${reminderKey}`]: true
        });

        console.log(`Deadline reminder sent for game ${gameId}`);
      } catch (error) {
        console.error(`Error sending deadline reminder for game ${gameId}:`, error);
        // Continuar con otras partidas aunque una falle
      }
    }
  } catch (error) {
    console.error('Error in sendDeadlineReminders:', error);
    // No lanzar error para no interrumpir el resto del proceso
  }
}
