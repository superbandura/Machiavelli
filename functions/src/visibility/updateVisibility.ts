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

  // Mapa de provincia -> jugadores que la controlan
  const provinceControllers: Record<string, string[]> = {};

  // Identificar qué jugadores controlan cada provincia (basado en guarniciones)
  units.forEach((unit) => {
    if (unit.type === 'garrison' && unit.owner) {
      const province = unit.currentPosition;
      if (!provinceControllers[province]) {
        provinceControllers[province] = [];
      }
      if (!provinceControllers[province].includes(unit.owner)) {
        provinceControllers[province].push(unit.owner);
      }
    }
  });

  console.log(`[Visibility] Province controllers map:`, provinceControllers);

  // Actualizar cada unidad
  const batch = db.batch();
  let updatedCount = 0;

  for (const unit of units) {
    const visibleTo: string[] = [];

    // Regla 1: El propietario siempre ve su unidad
    if (unit.owner && !visibleTo.includes(unit.owner)) {
      visibleTo.push(unit.owner);
    }

    // Regla 2: Jugadores que controlan la provincia pueden ver la unidad
    const controllersInProvince = provinceControllers[unit.currentPosition] || [];
    for (const controllerId of controllersInProvince) {
      if (!visibleTo.includes(controllerId)) {
        visibleTo.push(controllerId);
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
 * @param playerId - ID del jugador
 * @returns boolean - true si el jugador puede ver la unidad
 */
export function canPlayerSeeUnit(unit: Unit, playerId: string): boolean {
  // Si la unidad no tiene campo visibleTo, es visible para todos (backwards compatibility)
  if (!unit.visibleTo || unit.visibleTo.length === 0) {
    return true;
  }

  // Verificar si el jugador está en la lista de visibilidad
  return unit.visibleTo.includes(playerId);
}

/**
 * Filtra unidades visibles para un jugador específico
 *
 * @param units - Array de todas las unidades
 * @param playerId - ID del jugador
 * @returns Unit[] - Array de unidades visibles para el jugador
 */
export function filterVisibleUnits(units: Unit[], playerId: string): Unit[] {
  return units.filter((unit) => canPlayerSeeUnit(unit, playerId));
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
  gameId: string
): Promise<void> {
  // Por defecto, una nueva unidad es visible solo para su propietario
  const visibleTo = unit.owner ? [unit.owner] : [];

  const unitRef = db.collection('units').doc(unit.id);
  await unitRef.update({ visibleTo });

  console.log(`[Visibility] Initialized visibility for new unit ${unit.id}: [${visibleTo.join(', ')}]`);
}
