/**
 * Cloud Function callable para forzar el avance de fase
 * Útil para testing y desarrollo
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { resolveTurn } from './resolveTurn';

const db = admin.firestore();

/**
 * Fuerza el avance de fase de un juego
 * Solo puede ser llamado por el creador del juego
 */
export const forcePhaseAdvance = onCall(async (request) => {
  // Verificar autenticación
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Usuario debe estar autenticado'
    );
  }

  const { gameId } = request.data;
  const userId = request.auth.uid;

  if (!gameId) {
    throw new HttpsError(
      'invalid-argument',
      'gameId es requerido'
    );
  }

  try {
    // Obtener el juego
    const gameRef = db.collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      throw new HttpsError(
        'not-found',
        'Juego no encontrado'
      );
    }

    const gameData = gameDoc.data();

    // Verificar que el usuario sea el creador del juego
    if (gameData?.createdBy !== userId) {
      throw new HttpsError(
        'permission-denied',
        'Solo el creador del juego puede forzar el avance de fase'
      );
    }

    // Si el juego está esperando jugadores, activarlo primero
    if (gameData?.status === 'waiting') {
      console.log(`[forcePhaseAdvance] Juego en estado 'waiting', activando...`);

      // Configurar deadline para la primera fase (diplomática)
      const phaseDurations = gameData.phaseDurations || {
        diplomatic: 48,
        orders: 48,
        resolution: 1
      };

      const durationHours = phaseDurations.diplomatic || 48;
      const phaseDeadline = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      await gameRef.update({
        status: 'active',
        phaseDeadline: phaseDeadline,
        phaseStartedAt: new Date(),
        currentPhase: 'diplomatic',
        turnNumber: 1,
        currentYear: gameData.currentYear || 1454,
        currentSeason: gameData.currentSeason || 'Spring'
      });

      console.log(`[forcePhaseAdvance] Juego activado exitosamente - ahora en fase diplomática`);

      return {
        success: true,
        message: 'Juego activado - Turno 1 Fase Diplomática',
        gameId: gameId
      };
    } else if (gameData?.status !== 'active') {
      throw new HttpsError(
        'failed-precondition',
        `El juego debe estar en estado 'waiting' o 'active' (estado actual: ${gameData?.status})`
      );
    }

    // Si llegamos aquí, el juego está activo - avanzar fase por fase
    console.log(`[forcePhaseAdvance] Forzando avance de fase para juego ${gameId}`);
    console.log(`[forcePhaseAdvance] Fase actual: ${gameData?.currentPhase}`);
    console.log(`[forcePhaseAdvance] Turno actual: ${gameData?.currentSeason} ${gameData?.currentYear}`);

    const currentPhase = gameData?.currentPhase;

    // Fase diplomática → Fase de órdenes
    if (currentPhase === 'diplomatic') {
      const phaseDurations = gameData.phaseDurations || {
        diplomatic: 48,
        orders: 48,
        resolution: 1
      };

      const durationHours = phaseDurations.orders || 48;
      const phaseDeadline = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      await gameRef.update({
        currentPhase: 'orders',
        phaseDeadline: phaseDeadline,
        phaseStartedAt: new Date(),
      });

      console.log(`[forcePhaseAdvance] Avanzado de fase diplomática a órdenes`);

      return {
        success: true,
        message: 'Avanzado a Fase de Órdenes',
        gameId: gameId
      };
    }

    // Fase de órdenes → Resolución (procesar turno completo)
    if (currentPhase === 'orders') {
      console.log(`[forcePhaseAdvance] Procesando órdenes y avanzando turno...`);

      await resolveTurn(gameId);

      console.log(`[forcePhaseAdvance] Turno resuelto exitosamente`);

      return {
        success: true,
        message: 'Turno resuelto - Avanzado a siguiente turno',
        gameId: gameId
      };
    }

    // Si está en otra fase, intentar procesar de todos modos
    console.log(`[forcePhaseAdvance] Fase desconocida '${currentPhase}', procesando turno...`);
    await resolveTurn(gameId);

    return {
      success: true,
      message: 'Fase avanzada exitosamente',
      gameId: gameId
    };
  } catch (error: any) {
    console.error(`[forcePhaseAdvance] Error al forzar avance de fase:`, error);

    // Si es un error de Cloud Functions, re-lanzarlo
    if (error instanceof HttpsError) {
      throw error;
    }

    // Si es otro tipo de error, envolverlo
    throw new HttpsError(
      'internal',
      `Error al forzar avance de fase: ${error.message}`
    );
  }
});
