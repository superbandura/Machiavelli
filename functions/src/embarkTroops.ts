/**
 * Cloud Function para embarcar tropas en una flota
 *
 * Esta función usa Admin SDK para bypasear Security Rules y permitir
 * modificar el array de unidades, incluyendo la eliminación de ejércitos vacíos.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Game } from './types';

// Tipos de tropas (importados del frontend)
type ArmyTroopType = 'militia' | 'lancers' | 'pikemen' | 'archers' | 'crossbowmen' | 'lightCavalry' | 'heavyCavalry';

interface ArmyComposition {
  name: string;
  troops: Record<ArmyTroopType, number>;
}

interface FleetComposition {
  name: string;
  ships: {
    galley: number;
    cog: number;
    carrack?: number;
  };
}

/**
 * Calcula la capacidad total de transporte de una flota
 */
function calculateFleetCapacity(composition: FleetComposition): number {
  const { galley = 0, cog = 0, carrack = 0 } = composition.ships;
  return (galley * 50) + (cog * 100) + (carrack * 200);
}

/**
 * Calcula el número total de tropas embarcadas
 */
function calculateEmbarkedTroopsCount(troops: Partial<Record<ArmyTroopType, number>>): number {
  return Object.values(troops).reduce((sum, count) => sum + (count || 0), 0);
}

/**
 * Cloud Function callable para embarcar tropas
 */
export const embarkTroops = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  // Verificar autenticación
  if (!context) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { gameId, playerId, fleetId, armyId, troopsToEmbark } = data;

  // Validar parámetros requeridos
  if (!gameId || !playerId || !fleetId || !armyId || !troopsToEmbark) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos');
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
      const gameRef = db.collection('games').doc(gameId);
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists) {
        throw new HttpsError('not-found', 'Partida no encontrada');
      }

      const game = gameSnap.data() as Game;
      const units = game.units || [];

      // Encontrar flota y ejército
      const fleet = units.find(u => u.id === fleetId);
      const army = units.find(u => u.id === armyId);

      if (!fleet || fleet.type !== 'fleet') {
        throw new HttpsError('not-found', 'Flota no encontrada');
      }

      if (!army || army.type !== 'army') {
        throw new HttpsError('not-found', 'Ejército no encontrado');
      }

      // Validar pertenencia
      if (fleet.owner !== playerId || army.owner !== playerId) {
        throw new HttpsError(
          'permission-denied',
          'No puedes embarcar tropas de unidades que no te pertenecen'
        );
      }

      // Validar misma provincia
      if (fleet.currentPosition !== army.currentPosition) {
        throw new HttpsError(
          'failed-precondition',
          'La flota y el ejército deben estar en la misma provincia'
        );
      }

      // Validar composición
      if (!fleet.composition || !army.composition) {
        throw new HttpsError('failed-precondition', 'Unidades sin composición válida');
      }

      const armyComp = army.composition as ArmyComposition;
      const fleetComp = fleet.composition as FleetComposition;

      // Validar tropas disponibles y actualizar ejército
      const updatedArmyTroops = { ...armyComp.troops };
      let totalTroopsToEmbark = 0;

      for (const [troopType, count] of Object.entries(troopsToEmbark)) {
        const available = updatedArmyTroops[troopType as ArmyTroopType] || 0;
        const countValue = count as number || 0;
        if (countValue > available) {
          throw new HttpsError(
            'failed-precondition',
            `Tropas insuficientes de tipo ${troopType}`
          );
        }
        updatedArmyTroops[troopType as ArmyTroopType] -= countValue;
        totalTroopsToEmbark += countValue;
      }

      // Validar capacidad de la flota
      const totalCapacity = calculateFleetCapacity(fleetComp);
      const currentEmbarked = fleet.embarkedTroops
        ? calculateEmbarkedTroopsCount(fleet.embarkedTroops.troops)
        : 0;

      if (currentEmbarked + totalTroopsToEmbark > totalCapacity) {
        throw new HttpsError('failed-precondition', 'Capacidad de la flota excedida');
      }

      // Actualizar tropas embarcadas en la flota
      const currentEmbarkedTroops = fleet.embarkedTroops?.troops || {};
      const updatedEmbarkedTroops: Partial<Record<ArmyTroopType, number>> = { ...currentEmbarkedTroops };

      for (const [troopType, count] of Object.entries(troopsToEmbark)) {
        const current = updatedEmbarkedTroops[troopType as ArmyTroopType] || 0;
        const countValue = count as number || 0;
        updatedEmbarkedTroops[troopType as ArmyTroopType] = current + countValue;
      }

      // Verificar si el ejército queda vacío
      const totalRemainingTroops = Object.values(updatedArmyTroops).reduce((sum, n) => sum + n, 0);
      const shouldDeleteArmy = totalRemainingTroops === 0;

      // Actualizar unidades
      const updatedUnits = units.map(u => {
        if (u.id === fleetId) {
          return {
            ...u,
            embarkedTroops: {
              troops: updatedEmbarkedTroops,
              sourceUnitId: armyId
            }
          };
        }
        if (u.id === armyId) {
          if (shouldDeleteArmy) {
            return null; // Marcar para eliminación
          }
          return {
            ...u,
            composition: {
              ...armyComp,
              troops: updatedArmyTroops
            }
          };
        }
        return u;
      }).filter(u => u !== null); // Eliminar unidades marcadas

      // Guardar cambios usando Admin SDK (bypasea Security Rules)
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: admin.firestore.Timestamp.now()
      });
    });

    return { success: true, message: 'Tropas embarcadas exitosamente' };
  } catch (error: any) {
    console.error('Error al embarcar tropas:', error);

    // Si ya es un HttpsError, relanzarlo
    if (error instanceof HttpsError) {
      throw error;
    }

    // Convertir otros errores a HttpsError
    throw new HttpsError('internal', error.message || 'Error al embarcar tropas');
  }
});
