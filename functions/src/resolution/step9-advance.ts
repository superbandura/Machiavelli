/**
 * PASO 9: Avance al Siguiente Turno
 *
 * Actualizar estado del juego para iniciar nueva fase diplomática:
 * - Incrementar turnNumber
 * - Cambiar currentPhase a 'diplomatic'
 * - Calcular siguiente estación
 * - Establecer nuevo phaseDeadline
 * - Resetear hasSubmittedOrders
 * - Verificar eliminación de jugadores (solo en Primavera)
 */

import * as admin from 'firebase-admin';
import { ResolutionContext } from '../types';
import { checkVictoryConditions } from './checkVictory';
import { processInactivePlayerVotes } from './processInactiveVotes';
import { notifyPhaseChange } from '../email/notificationService';

export async function advanceToNextTurn(context: ResolutionContext): Promise<void> {
  console.log('Advancing to next turn...');

  const { gameId, turnNumber, season, year, db } = context;

  // Calcular siguiente estación
  let nextSeason: string;
  let nextYear = year;

  if (season === 'Primavera') {
    nextSeason = 'Verano';
  } else if (season === 'Verano') {
    nextSeason = 'Otoño';
  } else {
    // Otoño → Primavera del siguiente año
    nextSeason = 'Primavera';
    nextYear++;
  }

  console.log(`Advancing from Turn ${turnNumber} (${season} ${year}) to Turn ${turnNumber + 1} (${nextSeason} ${nextYear})`);

  // Calcular nuevo deadline (48 horas por defecto)
  const diplomaticPhaseDuration = 48;
  const newDeadline = admin.firestore.Timestamp.fromMillis(
    Date.now() + diplomaticPhaseDuration * 60 * 60 * 1000
  );

  // Actualizar juego
  await db.collection('games').doc(gameId).update({
    turnNumber: turnNumber + 1,
    currentSeason: nextSeason,
    currentYear: nextYear,
    currentPhase: 'diplomatic',
    phaseDeadline: newDeadline,
    phaseStartedAt: new Date(),
  });

  // Resetear hasSubmittedOrders y actualizar inactivityCounter
  const batch = db.batch();
  for (const player of context.players) {
    const playerRef = db.collection('players').doc(player.id);
    const updates: any = { hasSubmittedOrders: false };

    // Si el jugador SÍ envió órdenes, resetear contador de inactividad
    if (player.hasSubmittedOrders) {
      updates.inactivityCounter = 0;
      // Si estaba marcado como inactivo, reactivar
      if (player.status === 'inactive') {
        updates.status = 'active';
        console.log(`Player ${player.id} (${player.faction}) reactivated after submitting orders`);
      }
    }

    batch.update(playerRef, updates);
  }
  await batch.commit();

  // Verificar eliminación de jugadores (solo en Primavera después de mantenimiento)
  if (nextSeason === 'Primavera') {
    await checkPlayerElimination(context);
  }

  // Enviar notificación de cambio de fase
  try {
    await notifyPhaseChange(gameId, db);
  } catch (error) {
    console.error(`Error sending phase change notification for game ${gameId}:`, error);
    // No fallar el proceso si el email falla
  }

  // Procesar votaciones de jugadores inactivos
  await processInactivePlayerVotes(context);

  // Verificar condiciones de victoria
  await checkVictoryConditions(context);

  console.log(`Turn advanced to ${turnNumber + 1} - ${nextSeason} ${nextYear}`);
}

/**
 * Verificar y eliminar jugadores que no controlan ninguna ciudad
 */
async function checkPlayerElimination(context: ResolutionContext): Promise<void> {
  const { db, players } = context;

  for (const player of players) {
    // TODO: Contar ciudades controladas por el jugador
    // Por ahora asumimos que si el jugador no tiene unidades, no tiene ciudades
    const playerUnits = context.units.filter(u => u.owner === player.id);

    // Si el jugador no tiene unidades ni ciudades, eliminarlo
    if (playerUnits.length === 0) {
      console.log(`Player ${player.id} (${player.faction}) has no units or cities - eliminating`);

      // Marcar jugador como eliminado
      await db.collection('players').doc(player.id).update({
        isAlive: false,
        eliminatedAt: new Date(),
      });

      // TODO: Invalidar fichas de asesinato de otros jugadores hacia este
      // TODO: Convertir territorios a neutrales

      context.events.push({
        type: 'player_eliminated',
        playerId: player.id,
        faction: player.faction,
        message: `☠️ ${player.faction} ha sido eliminado del juego (0 ciudades controladas)`,
      });
    }
  }
}
