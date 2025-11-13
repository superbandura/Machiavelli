/**
 * Sistema de Visibilidad (Fog of War)
 *
 * Actualiza el campo `visibleTo` de cada unidad para controlar qué jugadores pueden verla.
 *
 * Reglas de visibilidad:
 * 1. El propietario (owner) siempre puede ver su propia unidad
 * 2. Los jugadores que controlan una provincia (tienen garrison allí) pueden ver todas las unidades en esa provincia
 * 3. Las unidades enemigas fuera del territorio controlado NO son visibles
 */

import * as admin from 'firebase-admin';
import { Unit, Player } from '../types';

/**
 * Actualiza la visibilidad de todas las unidades en un juego
 *
 * @param db - Instancia de Firestore
 * @param gameId - ID del juego
 * @param units - Array de unidades del juego
 * @param players - Array de jugadores del juego
 * @returns Promise<void>
 */
export async function updateUnitVisibility(
  db: admin.firestore.Firestore,
  gameId: string,
  units: Unit[],
  players: Player[]
): Promise<void> {
  console.log(`[Visibility] Updating visibility for ${units.length} units in game ${gameId}`);

  // Mapa de provincia -> userIds que la controlan
  const provinceControllers: Record<string, string[]> = {};

  // Crear mapa de playerId -> userId para conversión
  const playerIdToUserId: Record<string, string> = {};
  players.forEach(player => {
    playerIdToUserId[player.id] = player.userId;
  });

  // Identificar qué jugadores controlan cada provincia (basado en guarniciones)
  units.forEach((unit) => {
    if (unit.type === 'garrison' && unit.owner) {
      const province = unit.currentPosition;
      const userId = playerIdToUserId[unit.owner];

      if (userId) {
        if (!provinceControllers[province]) {
          provinceControllers[province] = [];
        }
        if (!provinceControllers[province].includes(userId)) {
          provinceControllers[province].push(userId);
        }
      }
    }
  });

  console.log(`[Visibility] Province controllers map (userIds):`, provinceControllers);

  // Actualizar cada unidad
  const batch = db.batch();
  let updatedCount = 0;

  for (const unit of units) {
    const visibleTo: string[] = [];

    // Regla 1: El propietario siempre ve su unidad (convertir playerId a userId)
    if (unit.owner) {
      const ownerUserId = playerIdToUserId[unit.owner];
      if (ownerUserId && !visibleTo.includes(ownerUserId)) {
        visibleTo.push(ownerUserId);
      }
    }

    // Regla 2: Jugadores que controlan la provincia pueden ver la unidad (ya son userIds)
    const controllersInProvince = provinceControllers[unit.currentPosition] || [];
    for (const userId of controllersInProvince) {
      if (!visibleTo.includes(userId)) {
        visibleTo.push(userId);
      }
    }

    // Verificar si el campo visibleTo ha cambiado antes de actualizar
    const currentVisibleTo = unit.visibleTo || [];
    const hasChanged =
      visibleTo.length !== currentVisibleTo.length ||
      !visibleTo.every((id) => currentVisibleTo.includes(id));

    if (hasChanged) {
      const unitRef = db.collection('units').doc(unit.id);
      batch.update(unitRef, { visibleTo });
      updatedCount++;
    }
  }

  // Ejecutar batch update
  if (updatedCount > 0) {
    await batch.commit();
    console.log(`[Visibility] Updated visibility for ${updatedCount} units`);
  } else {
    console.log(`[Visibility] No visibility changes needed`);
  }
}

/**
 * Verifica si un jugador puede ver una unidad específica
 *
 * @param unit - La unidad a verificar
 * @param userId - ID del usuario (Firebase Auth UID)
 * @returns boolean - true si el jugador puede ver la unidad
 */
export function canPlayerSeeUnit(unit: Unit, userId: string): boolean {
  // Si la unidad no tiene campo visibleTo, es visible para todos (backwards compatibility)
  if (!unit.visibleTo || unit.visibleTo.length === 0) {
    return true;
  }

  // Verificar si el usuario está en la lista de visibilidad
  return unit.visibleTo.includes(userId);
}

/**
 * Filtra unidades visibles para un jugador específico
 *
 * @param units - Array de todas las unidades
 * @param userId - ID del usuario (Firebase Auth UID)
 * @returns Unit[] - Array de unidades visibles para el jugador
 */
export function filterVisibleUnits(units: Unit[], userId: string): Unit[] {
  return units.filter((unit) => canPlayerSeeUnit(unit, userId));
}

/**
 * Inicializa la visibilidad de unidades recién creadas
 *
 * @param db - Instancia de Firestore
 * @param unit - Unidad recién creada
 * @param gameId - ID del juego
 * @returns Promise<void>
 */
export async function initializeUnitVisibility(
  db: admin.firestore.Firestore,
  unit: Unit,
  gameId: string,
  userId?: string
): Promise<void> {
  // Por defecto, una nueva unidad es visible solo para su propietario (como userId)
  // Si no se proporciona userId, necesitamos buscarlo desde el player
  let visibleTo: string[] = [];

  if (userId) {
    visibleTo = [userId];
  } else if (unit.owner) {
    // Buscar userId desde playerId (requiere consulta adicional)
    const playerDoc = await db.collection('players').doc(unit.owner).get();
    if (playerDoc.exists) {
      const playerData = playerDoc.data();
      if (playerData && playerData.userId) {
        visibleTo = [playerData.userId];
      }
    }
  }

  const unitRef = db.collection('units').doc(unit.id);
  await unitRef.update({ visibleTo });

  console.log(`[Visibility] Initialized visibility for new unit ${unit.id}: [${visibleTo.join(', ')}]`);
}
