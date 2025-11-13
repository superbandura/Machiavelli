/**
 * Verificar Condiciones de Victoria
 *
 * Se verifica al final de cada turno:
 * - Victoria Estándar: X ciudades en Otoño
 * - Victoria por Tiempo: 12 turnos completados
 */

import * as admin from 'firebase-admin';
import { ResolutionContext, Player, GameMap } from '../types';
import { notifyGameEnded } from '../email/notificationService';

/**
 * Verificar condiciones de victoria después de avanzar el turno
 */
export async function checkVictoryConditions(context: ResolutionContext): Promise<void> {
  const { gameData, players, units, db, gameId } = context;
  const { currentSeason, turnNumber } = gameData;

  console.log('Checking victory conditions...');

  // Contar ciudades controladas por cada jugador
  const cityCounts = countCitiesPerPlayer(players, units, context.map);

  // 1. VICTORIA ESTÁNDAR: X ciudades al final de Otoño
  if (currentSeason === 'Otoño') {
    const requiredCities = getRequiredCitiesForVictory(players.length);

    for (const player of players) {
      const citiesControlled = cityCounts[player.id] || 0;

      if (citiesControlled >= requiredCities) {
        console.log(`🏆 Victory! ${player.faction} controls ${citiesControlled} cities`);
        await declareWinner(gameId, player, 'standard', db, context);
        return;
      }
    }
  }

  // 2. VICTORIA POR TIEMPO: 12 turnos completados
  if (turnNumber >= 12) {
    console.log(`Time limit reached (12 turns). Determining winner...`);
    await declareWinnerByTimeLimit(gameId, players, units, db, context, context.map);
    return;
  }

  console.log('No victory conditions met. Game continues.');
}

/**
 * Contar ciudades controladas por cada jugador
 */
function countCitiesPerPlayer(players: Player[], units: any[], map: GameMap): Record<string, number> {
  const cityCounts: Record<string, number> = {};

  // Inicializar contadores
  for (const player of players) {
    cityCounts[player.id] = 0;
  }

  // Contar guarniciones en ciudades
  for (const unit of units) {
    if (unit.type === 'garrison') {
      const provinceId = unit.currentPosition;
      const provinceInfo = map.provinces[provinceId];

      // Verificar que la provincia tenga ciudad
      if (provinceInfo?.hasCity) {
        cityCounts[unit.owner] = (cityCounts[unit.owner] || 0) + 1;
      }
    }
  }

  return cityCounts;
}

/**
 * Determinar número de ciudades requeridas según número de jugadores
 */
function getRequiredCitiesForVictory(playerCount: number): number {
  const victoryMap: Record<number, number> = {
    5: 8,
    6: 9,  // Estándar
    7: 10,
    8: 11,
  };

  return victoryMap[playerCount] || 9; // Default a 9 si no se especifica
}

/**
 * Declarar ganador
 */
async function declareWinner(
  gameId: string,
  winner: Player,
  victoryType: 'standard' | 'time_limit' | 'shared',
  db: admin.firestore.Firestore,
  context: ResolutionContext
): Promise<void> {
  // Actualizar estado del juego
  await db.collection('games').doc(gameId).update({
    status: 'finished',
    winnerId: winner.id,
    winnerFaction: winner.faction,
    victoryType,
    finishedAt: new Date(),
  });

  // Registrar evento de victoria
  context.events.push({
    type: 'game_victory',
    winnerId: winner.id,
    winnerFaction: winner.faction,
    victoryType,
    message: `🏆 ¡${winner.faction} ha ganado el juego!`,
  });

  console.log(`Game ${gameId} finished. Winner: ${winner.faction} (${victoryType})`);

  // Enviar notificaciones de fin de partida
  try {
    await notifyGameEnded(gameId, winner.id, victoryType, db);
  } catch (error) {
    console.error(`Error sending game ended notification for game ${gameId}:`, error);
    // No fallar el proceso si el email falla
  }
}

/**
 * Declarar ganador por límite de tiempo
 */
async function declareWinnerByTimeLimit(
  gameId: string,
  players: Player[],
  units: any[],
  db: admin.firestore.Firestore,
  context: ResolutionContext,
  map: GameMap
): Promise<void> {
  const cityCounts = countCitiesPerPlayer(players, units, map);

  // Encontrar el jugador con más ciudades
  let maxCities = 0;
  let potentialWinners: Player[] = [];

  for (const player of players) {
    const cities = cityCounts[player.id] || 0;
    if (cities > maxCities) {
      maxCities = cities;
      potentialWinners = [player];
    } else if (cities === maxCities && cities > 0) {
      potentialWinners.push(player);
    }
  }

  // Si hay empate, desempatar por valor total de ciudades
  if (potentialWinners.length > 1) {
    potentialWinners = resolveTieByValue(potentialWinners, units, map);
  }

  // Si hay un único ganador
  if (potentialWinners.length === 1) {
    await declareWinner(gameId, potentialWinners[0], 'time_limit', db, context);
  } else {
    // Victoria compartida
    console.log(`Shared victory between ${potentialWinners.map(p => p.faction).join(', ')}`);

    await db.collection('games').doc(gameId).update({
      status: 'finished',
      winnerIds: potentialWinners.map(p => p.id),
      winnerFactions: potentialWinners.map(p => p.faction),
      victoryType: 'shared',
      finishedAt: new Date(),
    });

    context.events.push({
      type: 'game_victory_shared',
      winnerFactions: potentialWinners.map(p => p.faction),
      message: `🏆 Victoria compartida: ${potentialWinners.map(p => p.faction).join(', ')}`,
    });

    // Enviar notificaciones de fin de partida (victoria compartida)
    try {
      await notifyGameEnded(gameId, null, 'shared', db);
    } catch (error) {
      console.error(`Error sending game ended notification for game ${gameId}:`, error);
      // No fallar el proceso si el email falla
    }
  }
}

/**
 * Desempatar por valor total de ciudades (ducados)
 */
function resolveTieByValue(players: Player[], units: any[], map: GameMap): Player[] {
  const cityValues: Record<string, number> = {};

  // Calcular valor total de ciudades por jugador
  for (const player of players) {
    let totalValue = 0;

    for (const unit of units) {
      if (unit.type === 'garrison' && unit.owner === player.id) {
        const provinceId = unit.currentPosition;
        const provinceInfo = map.provinces[provinceId];

        if (provinceInfo?.hasCity) {
          totalValue += provinceInfo.income || 0;
        }
      }
    }

    cityValues[player.id] = totalValue;
  }

  // Encontrar el máximo valor
  const maxValue = Math.max(...players.map(p => cityValues[p.id] || 0));

  // Retornar jugadores con el máximo valor
  return players.filter(p => cityValues[p.id] === maxValue);
}
