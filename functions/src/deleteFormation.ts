/**
 * Cloud Function para eliminar una formación táctica de una campaña
 *
 * Esta función usa Admin SDK para bypasear Security Rules y permitir
 * que tanto el declarante como los aliados eliminen sus propias formaciones.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { MilitaryCampaign, Game, Player } from './types';

/**
 * Cloud Function callable para eliminar una formación táctica
 */
export const deleteFormation = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  // Verificar autenticación
  if (!context) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { gameId, campaignId, formationId } = data;

  // Validar parámetros requeridos
  if (!gameId || !campaignId || !formationId) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos');
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
          'Solo puedes eliminar formaciones durante la fase de órdenes'
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

      const player = playersSnap.docs[0].data() as Player;
      const playerId = playersSnap.docs[0].id;

      // Verificar que el jugador pertenece a un bando de la campaña
      const isDeclarant = campaign.declaredBy === context.uid;
      const isAlly = campaign.allies?.some(a => a.playerId === playerId);

      if (!isDeclarant && !isAlly) {
        throw new HttpsError(
          'permission-denied',
          'No perteneces a ningún bando de esta campaña'
        );
      }

      // Buscar la formación a eliminar
      const formations = campaign.formations || [];
      const formationToDelete = formations.find(f => f.id === formationId);

      if (!formationToDelete) {
        throw new HttpsError('not-found', 'Formación no encontrada');
      }

      // Verificar que la formación pertenece a la facción del jugador
      if (formationToDelete.faction.toLowerCase() !== player.faction.toLowerCase()) {
        throw new HttpsError(
          'permission-denied',
          'Solo puedes eliminar formaciones de tu propia facción'
        );
      }

      // Filtrar la formación a eliminar
      const updatedFormations = formations.filter(f => f.id !== formationId);

      transaction.update(campaignRef, {
        formations: updatedFormations,
        updatedAt: admin.firestore.Timestamp.now()
      });

      return {
        success: true,
        message: 'Formación eliminada exitosamente'
      };
    });

    return result;
  } catch (error: any) {
    console.error('Error al eliminar formación:', error);

    // Si ya es un HttpsError, relanzarlo
    if (error instanceof HttpsError) {
      throw error;
    }

    // Convertir otros errores a HttpsError
    throw new HttpsError('internal', error.message || 'Error al eliminar formación');
  }
});
