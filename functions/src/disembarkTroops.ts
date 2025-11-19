/**
 * Cloud Function para desembarcar tropas de una flota
 *
 * Esta función usa Admin SDK para bypasear Security Rules y permitir
 * crear nuevos ejércitos o modificar ejércitos existentes al desembarcar.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Game, Unit } from './types';

// Tipos de tropas (importados del frontend)
type ArmyTroopType = 'militia' | 'lancers' | 'pikemen' | 'archers' | 'crossbowmen' | 'lightCavalry' | 'heavyCavalry';

interface ArmyComposition {
  name: string;
  troops: Record<ArmyTroopType, number>;
}

/**
 * Genera un ID único para una nueva unidad
 */
function generateUnitId(): string {
  // Usar formato UUID v4 simple
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Cloud Function callable para desembarcar tropas
 */
export const disembarkTroops = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  // Verificar autenticación
  if (!context) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { gameId, playerId, fleetId, targetArmyId, troopsToDisembark, newArmyName } = data;

  // Validar parámetros requeridos
  if (!gameId || !playerId || !fleetId || !troopsToDisembark) {
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

      // Encontrar flota
      const fleet = units.find(u => u.id === fleetId);

      if (!fleet || fleet.type !== 'fleet') {
        throw new HttpsError('not-found', 'Flota no encontrada');
      }

      if (fleet.owner !== playerId) {
        throw new HttpsError(
          'permission-denied',
          'No puedes desembarcar de una flota que no te pertenece'
        );
      }

      if (!fleet.embarkedTroops) {
        throw new HttpsError('failed-precondition', 'La flota no tiene tropas embarcadas');
      }

      // Validar tropas embarcadas disponibles
      const embarkedTroops = { ...fleet.embarkedTroops.troops };

      for (const [troopType, count] of Object.entries(troopsToDisembark)) {
        const troopKey = troopType as ArmyTroopType;
        const available = embarkedTroops[troopKey] || 0;
        const countValue = count as number || 0;
        if (countValue > available) {
          throw new HttpsError(
            'failed-precondition',
            `Tropas embarcadas insuficientes de tipo ${troopType}`
          );
        }
        const currentValue = embarkedTroops[troopKey];
        if (currentValue !== undefined) {
          embarkedTroops[troopKey] = currentValue - countValue;
        }
      }

      // Verificar si quedan tropas embarcadas
      const totalRemainingEmbarked = Object.values(embarkedTroops).reduce((sum: number, n) => sum + ((n as number) || 0), 0);

      let updatedUnits: Unit[];

      if (targetArmyId) {
        // Desembarcar a ejército existente
        const targetArmy = units.find(u => u.id === targetArmyId);

        if (!targetArmy || targetArmy.type !== 'army') {
          throw new HttpsError('not-found', 'Ejército destino no encontrado');
        }

        if (targetArmy.owner !== playerId) {
          throw new HttpsError(
            'permission-denied',
            'No puedes desembarcar a un ejército que no te pertenece'
          );
        }

        if (targetArmy.currentPosition !== fleet.currentPosition) {
          throw new HttpsError(
            'failed-precondition',
            'El ejército destino debe estar en la misma provincia que la flota'
          );
        }

        const targetComp = targetArmy.composition as ArmyComposition;
        const updatedTargetTroops = { ...targetComp.troops };

        for (const [troopType, count] of Object.entries(troopsToDisembark)) {
          const current = updatedTargetTroops[troopType as ArmyTroopType] || 0;
          const countValue = count as number || 0;
          updatedTargetTroops[troopType as ArmyTroopType] = current + countValue;
        }

        updatedUnits = units.map(u => {
          if (u.id === fleetId) {
            // Omitir embarkedTroops completamente si no quedan tropas
            const fleetUpdate: any = { ...u };
            if (totalRemainingEmbarked > 0) {
              fleetUpdate.embarkedTroops = {
                troops: embarkedTroops,
                sourceUnitId: fleet.embarkedTroops?.sourceUnitId
              };
            } else {
              delete fleetUpdate.embarkedTroops;
            }
            return fleetUpdate;
          }
          if (u.id === targetArmyId) {
            return {
              ...u,
              composition: {
                ...targetComp,
                troops: updatedTargetTroops
              }
            };
          }
          return u;
        });
      } else {
        // Crear nuevo ejército
        const newArmy: Unit = {
          id: generateUnitId(),
          type: 'army',
          owner: playerId,
          currentPosition: fleet.currentPosition,
          status: 'active',
          siegeTurns: 0,
          createdAt: admin.firestore.Timestamp.now(),
          name: newArmyName || `Ejército desembarcado`,
          composition: {
            name: newArmyName || `Ejército desembarcado`,
            troops: {
              militia: (troopsToDisembark.militia as number) ?? 0,
              lancers: (troopsToDisembark.lancers as number) ?? 0,
              pikemen: (troopsToDisembark.pikemen as number) ?? 0,
              archers: (troopsToDisembark.archers as number) ?? 0,
              crossbowmen: (troopsToDisembark.crossbowmen as number) ?? 0,
              lightCavalry: (troopsToDisembark.lightCavalry as number) ?? 0,
              heavyCavalry: (troopsToDisembark.heavyCavalry as number) ?? 0,
            }
          }
        };

        updatedUnits = [
          ...units.map(u => {
            if (u.id === fleetId) {
              // Omitir embarkedTroops completamente si no quedan tropas
              const fleetUpdate: any = { ...u };
              if (totalRemainingEmbarked > 0) {
                fleetUpdate.embarkedTroops = {
                  troops: embarkedTroops,
                  sourceUnitId: fleet.embarkedTroops?.sourceUnitId
                };
              } else {
                delete fleetUpdate.embarkedTroops;
              }
              return fleetUpdate;
            }
            return u;
          }),
          newArmy
        ];
      }

      // Guardar cambios usando Admin SDK (bypasea Security Rules)
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: admin.firestore.Timestamp.now()
      });
    });

    return { success: true, message: 'Tropas desembarcadas exitosamente' };
  } catch (error: any) {
    console.error('Error al desembarcar tropas:', error);

    // Si ya es un HttpsError, relanzarlo
    if (error instanceof HttpsError) {
      throw error;
    }

    // Convertir otros errores a HttpsError
    throw new HttpsError('internal', error.message || 'Error al desembarcar tropas');
  }
});
