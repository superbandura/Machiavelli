/**
 * PASO 7: Actualización del Estado del Juego
 *
 * Guardar todos los cambios en Firestore:
 * - Posiciones de unidades
 * - Control de ciudades
 * - Tesorería de jugadores
 * - Eliminar unidades destruidas
 * - Actualizar visibilidad de unidades (fog of war)
 */

import * as admin from 'firebase-admin';
import { ResolutionContext } from '../types';
import { updateUnitVisibility } from '../visibility/updateVisibility';

export async function updateGameState(context: ResolutionContext): Promise<void> {
  console.log('Updating game state in Firestore...');

  const { db, gameId, gameData, players, units } = context;

  console.log(`Updating ${units.length} units (embebidas en documento de partida)`);

  // Usar batches para operaciones masivas (máximo 500 operaciones por batch)
  const batches: admin.firestore.WriteBatch[] = [db.batch()];
  let currentBatch = 0;
  let operationCount = 0;

  const addOperation = (operation: () => void) => {
    if (operationCount >= 500) {
      batches.push(db.batch());
      currentBatch++;
      operationCount = 0;
    }
    operation();
    operationCount++;
  };

  // 3. Calcular ciudades controladas por cada jugador (basándose en guarniciones)
  const playerCities: Record<string, string[]> = {};

  // Inicializar arrays vacíos para cada jugador
  players.forEach(player => {
    playerCities[player.id] = [];
  });

  // Iterar sobre todas las guarniciones y asignar ciudades
  units
    .filter(unit => unit.type === 'garrison')
    .forEach(garrison => {
      const province = context.map.provinces[garrison.currentPosition];
      // Solo contar provincias con ciudad
      if (province && province.hasCity) {
        if (!playerCities[garrison.owner]) {
          playerCities[garrison.owner] = [];
        }
        playerCities[garrison.owner].push(garrison.currentPosition);
      }
    });

  console.log('Calculated player cities:', playerCities);

  // 4. Actualizar jugadores (tesorería, ciudades y otros campos)
  for (const player of players) {
    const playerRef = db.collection('players').doc(player.id);
    const cities = playerCities[player.id] || [];

    addOperation(() => {
      batches[currentBatch].update(playerRef, {
        treasury: player.treasury || 0,
        cities: cities,
        isAlive: player.isAlive !== false,
        updatedAt: new Date(),
      });
    });
  }

  // 2. Actualizar visibilidad de unidades (fog of war) ANTES de guardar
  console.log('Updating unit visibility (fog of war)...');
  await updateUnitVisibility(db, gameId, units, players);
  console.log('Unit visibility updated');

  // 3. Actualizar estado del juego (incluyendo unidades embebidas, siegeStatus y famine mitigation)
  const gameRef = db.collection('games').doc(gameId);

  // Preparar actualización del juego
  const gameUpdate: any = {
    units: units, // Actualizar unidades embebidas
    siegeStatus: gameData.siegeStatus || {},
    updatedAt: new Date(),
  };

  // Eliminar provincias con hambre mitigadas
  if (context.famineMitigated && context.famineMitigated.length > 0) {
    console.log(`Removing mitigated famine provinces: ${context.famineMitigated.join(', ')}`);

    const currentFamineProvinces = gameData.famineProvinces || [];
    const updatedFamineProvinces = currentFamineProvinces.filter(
      (p: string) => !context.famineMitigated.includes(p)
    );

    gameUpdate.famineProvinces = updatedFamineProvinces;
    console.log(`Famine provinces updated: ${currentFamineProvinces.length} -> ${updatedFamineProvinces.length}`);
  }

  addOperation(() => {
    batches[currentBatch].update(gameRef, gameUpdate);
  });

  // Ejecutar todos los batches
  console.log(`Committing ${batches.length} batch(es) with ${operationCount} operations`);
  await Promise.all(batches.map(batch => batch.commit()));

  console.log('Game state updated in Firestore (unidades embebidas)');
}
