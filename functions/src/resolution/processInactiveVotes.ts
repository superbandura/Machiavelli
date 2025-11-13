/**
 * Procesamiento de Votaciones para Jugadores Inactivos
 *
 * Se ejecuta al final de cada turno para:
 * 1. Recopilar votos de jugadores activos
 * 2. Determinar opción ganadora por mayoría
 * 3. Ejecutar la decisión (IA, Reemplazo o Eliminación)
 */

import * as admin from 'firebase-admin';
import { ResolutionContext } from '../types';

interface Vote {
  voterId: string;
  voterFaction: string;
  option: 'ai_mode' | 'replacement' | 'elimination';
  votedAt: admin.firestore.Timestamp;
}

/**
 * Procesar votaciones para jugadores inactivos
 */
export async function processInactivePlayerVotes(context: ResolutionContext): Promise<void> {
  console.log('Processing inactive player votes...');

  const { db, gameId, players } = context;

  // Encontrar jugadores inactivos
  const inactivePlayers = players.filter(p => p.status === 'inactive');

  if (inactivePlayers.length === 0) {
    console.log('No inactive players to process');
    return;
  }

  console.log(`Found ${inactivePlayers.length} inactive player(s) to process`);

  for (const inactivePlayer of inactivePlayers) {
    console.log(`Processing votes for ${inactivePlayer.faction}...`);

    // Recopilar votos para este jugador
    const votesSnapshot = await db.collection('votes')
      .where('gameId', '==', gameId)
      .where('targetPlayerId', '==', inactivePlayer.id)
      .get();

    const votes: Vote[] = [];
    votesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      votes.push({
        voterId: data.voterId,
        voterFaction: data.voterFaction,
        option: data.option,
        votedAt: data.votedAt
      });
    });

    console.log(`Collected ${votes.length} votes for ${inactivePlayer.faction}`);

    // Si no hay votos, aplicar modo IA por defecto
    if (votes.length === 0) {
      console.log(`No votes received, applying AI mode by default`);
      await applyAIMode(inactivePlayer, context);
      continue;
    }

    // Contar votos por opción
    const voteCounts = {
      ai_mode: 0,
      replacement: 0,
      elimination: 0
    };

    votes.forEach(vote => {
      voteCounts[vote.option]++;
    });

    console.log(`Vote counts: AI=${voteCounts.ai_mode}, Replacement=${voteCounts.replacement}, Elimination=${voteCounts.elimination}`);

    // Determinar opción ganadora (mayoría simple)
    let winningOption: 'ai_mode' | 'replacement' | 'elimination' = 'ai_mode';
    let maxVotes = voteCounts.ai_mode;

    if (voteCounts.replacement > maxVotes) {
      winningOption = 'replacement';
      maxVotes = voteCounts.replacement;
    }

    if (voteCounts.elimination > maxVotes) {
      winningOption = 'elimination';
      maxVotes = voteCounts.elimination;
    }

    console.log(`Winning option: ${winningOption} with ${maxVotes} votes`);

    // Ejecutar decisión
    if (winningOption === 'ai_mode') {
      await applyAIMode(inactivePlayer, context);
    } else if (winningOption === 'replacement') {
      await applyReplacement(inactivePlayer, context);
    } else if (winningOption === 'elimination') {
      await eliminatePlayer(inactivePlayer, context);
    }

    // Limpiar votos después de procesarlos
    const voteDeletionBatch = db.batch();
    votesSnapshot.docs.forEach(doc => {
      voteDeletionBatch.delete(doc.ref);
    });
    await voteDeletionBatch.commit();
    console.log(`Cleaned up ${votesSnapshot.docs.length} votes`);
  }

  console.log('Inactive player votes processing complete');
}

/**
 * Aplicar modo IA: Jugador continúa pero todas sus unidades mantienen
 */
async function applyAIMode(player: any, context: ResolutionContext): Promise<void> {
  console.log(`Applying AI mode to ${player.faction}`);

  // Marcar jugador con modo IA
  await context.db.collection('players').doc(player.id).update({
    aiMode: true,
    status: 'inactive'
  });

  context.events.push({
    type: 'inactive_ai_mode',
    playerId: player.id,
    faction: player.faction,
    message: `🤖 ${player.faction} entra en modo IA. Todas sus unidades mantendrán posición.`
  });

  console.log(`${player.faction} is now in AI mode`);
}

/**
 * Permitir reemplazo: Jugador queda disponible para nuevo jugador
 */
async function applyReplacement(player: any, context: ResolutionContext): Promise<void> {
  console.log(`Allowing replacement for ${player.faction}`);

  // Marcar jugador como disponible para reemplazo
  await context.db.collection('players').doc(player.id).update({
    status: 'awaiting_replacement',
    replacementAvailableSince: new Date()
  });

  context.events.push({
    type: 'inactive_replacement',
    playerId: player.id,
    faction: player.faction,
    message: `🔄 ${player.faction} está disponible para reemplazo por un nuevo jugador.`
  });

  console.log(`${player.faction} is now available for replacement`);
}

/**
 * Eliminar jugador: Todas sus unidades destruidas, territorios neutrales
 */
async function eliminatePlayer(player: any, context: ResolutionContext): Promise<void> {
  console.log(`Eliminating player: ${player.faction}`);

  // 1. Eliminar todas las unidades del jugador
  const playerUnits = context.units.filter(u => u.owner === player.id);

  playerUnits.forEach(unit => {
    // Eliminar del contexto
    const index = context.units.findIndex(u => u.id === unit.id);
    if (index >= 0) {
      context.units.splice(index, 1);
    }

    context.events.push({
      type: 'unit_destroyed_elimination',
      unitId: unit.id,
      unitType: unit.type,
      province: unit.currentPosition,
      playerId: player.id,
      faction: player.faction,
      message: `❌ ${unit.type} de ${player.faction} eliminado en ${unit.currentPosition}`
    });
  });

  console.log(`Destroyed ${playerUnits.length} units from ${player.faction}`);

  // 2. Marcar jugador como eliminado
  player.status = 'eliminated';
  player.isAlive = false;
  player.isEliminated = true;

  await context.db.collection('players').doc(player.id).update({
    status: 'eliminated',
    isAlive: false,
    isEliminated: true,
    eliminatedAt: new Date(),
    eliminationReason: 'inactivity_vote'
  });

  // 3. Invalidar fichas de asesinato de/hacia este jugador
  for (const otherPlayer of context.players) {
    if (otherPlayer.id === player.id) continue;

    // Remover ficha que otros tienen contra este jugador
    if (otherPlayer.assassinTokens && otherPlayer.assassinTokens[player.id]) {
      delete otherPlayer.assassinTokens[player.id];
    }

    // Remover ficha que este jugador tenía contra otros
    if (player.assassinTokens && player.assassinTokens[otherPlayer.id]) {
      delete player.assassinTokens[otherPlayer.id];
    }
  }

  context.events.push({
    type: 'player_eliminated',
    playerId: player.id,
    faction: player.faction,
    reason: 'inactivity_vote',
    unitsDestroyed: playerUnits.length,
    message: `☠️ ${player.faction} ha sido eliminado por votación (inactividad). Todas sus unidades destruidas.`
  });

  console.log(`${player.faction} has been eliminated`);
}
