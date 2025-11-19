/**
 * Cloud Function para unirse a una campaña militar como aliado
 *
 * Esta función usa Admin SDK para bypasear Security Rules y permitir
 * actualizar el array de aliados en una campaña durante la fase diplomática.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { MilitaryCampaign, CampaignAlly, Game, Unit } from './types';

/**
 * Cloud Function callable para unirse a una campaña
 */
export const joinCampaign = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  // Verificar autenticación
  if (!context) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { gameId, campaignId, playerId, side, unitIds } = data;

  // Validar parámetros requeridos
  if (!gameId || !campaignId || !playerId || !side || !unitIds || !Array.isArray(unitIds)) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos');
  }

  // Validar side
  if (side !== 'attacker' && side !== 'defender') {
    throw new HttpsError('invalid-argument', 'El bando debe ser "attacker" o "defender"');
  }

  // Verificar que el playerId coincide con el usuario autenticado
  const db = admin.firestore();
  const playerRef = db.collection('players').doc(playerId);
  const playerSnap = await playerRef.get();

  if (!playerSnap.exists) {
    throw new HttpsError('not-found', 'Jugador no encontrado');
  }

  const playerData = playerSnap.data();
  if (playerData?.userId !== context.uid) {
    throw new HttpsError('permission-denied', 'No puedes realizar acciones de otro jugador');
  }

  try {
    // Usar transacción para garantizar consistencia
    await db.runTransaction(async (transaction) => {
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

      // Obtener juego para verificar fase
      const gameRef = db.collection('games').doc(gameId);
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists) {
        throw new HttpsError('not-found', 'Partida no encontrada');
      }

      const game = gameSnap.data() as Game;

      // Verificar que estamos en fase diplomática
      if (game.currentPhase !== 'diplomatic') {
        throw new HttpsError(
          'failed-precondition',
          'Solo puedes unirte a campañas durante la fase diplomática'
        );
      }

      // Verificar que el jugador no sea el declarante
      if (campaign.declaredBy === playerId) {
        throw new HttpsError(
          'failed-precondition',
          'No puedes unirte a tu propia campaña como aliado'
        );
      }

      // Verificar que el jugador no esté ya en un bando
      const currentAllies = campaign.allies || [];
      const alreadyJoined = currentAllies.find(a => a.playerId === playerId);

      if (alreadyJoined) {
        throw new HttpsError(
          'failed-precondition',
          'Ya te has unido a esta campaña'
        );
      }

      // Verificar que las unidades existen y pertenecen al jugador
      // Nota: unit.owner puede ser playerId (después de unirse) o factionId (durante lobby)
      // Validamos ambos casos para mayor robustez
      const units = game.units || [];
      const playerFaction = playerData.faction;

      const invalidUnits = unitIds.filter(unitId => {
        const unit = units.find((u: Unit) => u.id === unitId);
        // Unidad es válida si: existe Y (owner es el playerId O owner es la facción del jugador)
        return !unit || (unit.owner !== playerId && unit.owner !== playerFaction);
      });

      if (invalidUnits.length > 0) {
        // Log detallado para debugging
        console.error('Unit ownership validation failed:', {
          invalidUnits,
          playerId,
          playerFaction,
          unitDetails: invalidUnits.map(id => {
            const u = units.find((unit: Unit) => unit.id === id);
            return { id, owner: u?.owner, exists: !!u };
          })
        });

        throw new HttpsError(
          'failed-precondition',
          `Las siguientes unidades no son válidas o no te pertenecen: ${invalidUnits.join(', ')}`
        );
      }

      // Verificar que hay al menos una unidad
      if (unitIds.length === 0) {
        throw new HttpsError(
          'failed-precondition',
          'Debes seleccionar al menos una unidad'
        );
      }

      // Crear nuevo aliado
      const newAlly: CampaignAlly = {
        id: `ally-${playerId}-${Date.now()}`,
        playerId: playerId,
        faction: playerData.faction,
        side: side,
        unitIds: unitIds,
        joinedAt: admin.firestore.Timestamp.now()
      };

      // Actualizar campaña con nuevo aliado
      const updatedAllies = [...currentAllies, newAlly];

      transaction.update(campaignRef, {
        allies: updatedAllies,
        updatedAt: admin.firestore.Timestamp.now()
      });
    });

    return {
      success: true,
      message: 'Te has unido a la campaña exitosamente'
    };
  } catch (error: any) {
    console.error('Error al unirse a la campaña:', error);

    // Si ya es un HttpsError, relanzarlo
    if (error instanceof HttpsError) {
      throw error;
    }

    // Convertir otros errores a HttpsError
    throw new HttpsError('internal', error.message || 'Error al unirse a la campaña');
  }
});
