/**
 * Cloud Function para crear una formación táctica en una campaña
 *
 * Esta función usa Admin SDK para bypasear Security Rules y permitir
 * que tanto el declarante como los aliados creen formaciones con sus propias tropas.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { MilitaryCampaign, Game, Player, TacticalFormation } from './types';

/**
 * Cloud Function callable para crear una formación táctica
 */
export const createFormation = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  // Verificar autenticación
  if (!context) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { gameId, campaignId, formation } = data;

  // Validar parámetros requeridos
  if (!gameId || !campaignId || !formation) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos');
  }

  // Validar estructura de formación
  if (!formation.name || !formation.troopType || !formation.faction || !formation.quantity ||
      !formation.deploymentZone || !formation.strategicOrder || !formation.tacticalOrder) {
    throw new HttpsError('invalid-argument', 'Formación incompleta o inválida');
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
          'Solo puedes crear formaciones durante la fase de órdenes'
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

      // Verificar que la formación pertenece a la facción del jugador
      if (formation.faction.toLowerCase() !== player.faction.toLowerCase()) {
        throw new HttpsError(
          'permission-denied',
          'Solo puedes crear formaciones con tropas de tu propia facción'
        );
      }

      // Crear la formación con timestamps
      const newFormation: TacticalFormation = {
        id: formation.id || `formation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: formation.name,
        troopType: formation.troopType,
        faction: formation.faction,
        quantity: formation.quantity,
        deploymentZone: formation.deploymentZone,
        strategicOrder: formation.strategicOrder,
        tacticalOrder: formation.tacticalOrder,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };

      // Actualizar campaña con nueva formación
      const updatedFormations = [...(campaign.formations || []), newFormation];

      transaction.update(campaignRef, {
        formations: updatedFormations,
        updatedAt: admin.firestore.Timestamp.now()
      });

      return {
        success: true,
        formationId: newFormation.id,
        message: 'Formación creada exitosamente'
      };
    });

    return result;
  } catch (error: any) {
    console.error('Error al crear formación:', error);

    // Si ya es un HttpsError, relanzarlo
    if (error instanceof HttpsError) {
      throw error;
    }

    // Convertir otros errores a HttpsError
    throw new HttpsError('internal', error.message || 'Error al crear formación');
  }
});
