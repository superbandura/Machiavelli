/**
 * Cloud Function para actualizar el fleetPool de una campaña
 *
 * Esta función usa Admin SDK para bypasear Security Rules y permitir
 * que los jugadores actualicen el fleetPool durante la fase de órdenes.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { MilitaryCampaign, Game } from './types';

interface FleetPool {
  galleys: number;
  cogs: number;
}

interface UpdateFleetPoolData {
  gameId: string;
  campaignId: string;
  fleetPool: FleetPool;
}

/**
 * Cloud Function callable para actualizar el fleetPool de una campaña
 */
export const updateCampaignFleetPool = onCall(async (request) => {
  const context = request.auth;
  const data = request.data as UpdateFleetPoolData;

  // Verificar autenticación
  if (!context) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { gameId, campaignId, fleetPool } = data;

  // Validar parámetros requeridos
  if (!gameId || !campaignId || !fleetPool) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos');
  }

  // Validar estructura de fleetPool
  if (typeof fleetPool.galleys !== 'number' || typeof fleetPool.cogs !== 'number') {
    throw new HttpsError('invalid-argument', 'fleetPool debe contener galleys y cogs como números');
  }

  // Validar valores positivos
  if (fleetPool.galleys < 0 || fleetPool.cogs < 0) {
    throw new HttpsError('invalid-argument', 'Los valores de galleys y cogs deben ser ≥ 0');
  }

  const db = admin.firestore();

  try {
    // Usar transacción para garantizar consistencia
    const result = await db.runTransaction(async (transaction) => {
      // Obtener campaña
      const campaignRef = db.collection('campaigns').doc(campaignId);
      const campaignSnap = await transaction.get(campaignRef);

      if (!campaignSnap.exists) {
        throw new HttpsError('not-found', 'Campaña no encontrada');
      }

      const campaign = campaignSnap.data() as MilitaryCampaign;

      // Verificar que la campaña pertenece al juego correcto
      if (campaign.gameId !== gameId) {
        throw new HttpsError('failed-precondition', 'La campaña no pertenece a este juego');
      }

      // Obtener juego
      const gameRef = db.collection('games').doc(gameId);
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists) {
        throw new HttpsError('not-found', 'Partida no encontrada');
      }

      const game = gameSnap.data() as Game;

      // Verificar que estamos en fase de órdenes
      if (game.currentPhase !== 'orders') {
        throw new HttpsError(
          'failed-precondition',
          'Solo puedes actualizar el fleetPool durante la fase de órdenes'
        );
      }

      // Obtener el player del usuario autenticado en este juego
      const playersSnap = await db.collection('players')
        .where('gameId', '==', gameId)
        .where('userId', '==', context.uid)
        .limit(1)
        .get();

      if (playersSnap.empty) {
        throw new HttpsError('not-found', 'No eres jugador de esta partida');
      }

      const playerId = playersSnap.docs[0].id;

      // Verificar que el jugador participa en la campaña
      const isDeclarant = campaign.declaredBy === context.uid;
      const isAlly = campaign.allies?.some(a => a.playerId === playerId);
      const hasReinforcements = campaign.reinforcements?.some(r => r.playerId === playerId);

      if (!isDeclarant && !isAlly && !hasReinforcements) {
        throw new HttpsError(
          'permission-denied',
          'No participas en esta campaña'
        );
      }

      // Actualizar fleetPool
      transaction.update(campaignRef, {
        fleetPool: fleetPool,
        updatedAt: admin.firestore.Timestamp.now()
      });

      return {
        success: true,
        fleetPool: fleetPool,
        message: 'fleetPool actualizado exitosamente'
      };
    });

    return result;
  } catch (error: any) {
    console.error('Error al actualizar fleetPool:', error);

    // Si ya es un HttpsError, relanzarlo
    if (error instanceof HttpsError) {
      throw error;
    }

    // Convertir otros errores a HttpsError
    throw new HttpsError('internal', error.message || 'Error al actualizar fleetPool');
  }
});
