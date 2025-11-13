/**
 * Resolve Turn Function
 *
 * Ejecuta los 9 pasos de resolución de turno:
 * 1. Validación de órdenes
 * 2. Procesamiento económico
 * 3. Resolución de movimientos
 * 4. Retiradas
 * 5. Asedios
 * 6. Conversiones
 * 7. Actualización del estado
 * 8. Registro del historial
 * 9. Avance al siguiente turno
 */

import * as admin from 'firebase-admin';
import { validateOrders } from './resolution/step1-validate';
import { processEconomicActions } from './resolution/step2-economy';
import { resolveMovements } from './resolution/step3-movements';
import { processRetreats } from './resolution/step4-retreats';
import { processSieges } from './resolution/step5-sieges';
import { processConversions } from './resolution/step6-conversions';
import { updateGameState } from './resolution/step7-update';
import { recordTurnHistory } from './resolution/step8-history';
import { advanceToNextTurn } from './resolution/step9-advance';
import { processSpecialEvents } from './events/processEvents';

/**
 * Resolver un turno completo
 */
export async function resolveTurn(gameId: string): Promise<void> {
  const db = admin.firestore();

  console.log(`=== Starting turn resolution for game ${gameId} ===`);
  const startTime = Date.now();

  try {
    // Cargar datos de la partida
    const gameDoc = await db.collection('games').doc(gameId).get();
    if (!gameDoc.exists) {
      throw new Error(`Game ${gameId} not found`);
    }

    const gameData = { id: gameDoc.id, ...gameDoc.data() } as any;
    const turnNumber = gameData.turnNumber;
    const season = gameData.currentSeason;
    const year = gameData.currentYear;

    console.log(`Game: ${gameData.name || gameId}`);
    console.log(`Turn: ${turnNumber} - ${season} ${year}`);

    // Cargar jugadores
    const playersSnapshot = await db.collection('players')
      .where('gameId', '==', gameId)
      .get();
    const players = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    // Cargar unidades
    const unitsSnapshot = await db.collection('units')
      .where('gameId', '==', gameId)
      .get();
    const units = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    // Cargar órdenes
    const ordersSnapshot = await db.collection('orders')
      .where('gameId', '==', gameId)
      .where('turnNumber', '==', turnNumber)
      .get();
    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    console.log(`Loaded: ${players.length} players, ${units.length} units, ${orders.length} orders`);

    // Contexto de resolución
    const context = {
      gameId,
      gameData,
      players,
      units,
      orders,
      ordersData: ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)), // Full order documents with extraExpenses
      turnNumber,
      season,
      year,
      events: [] as any[], // Historial de eventos del turno
      db
    };

    // ========== PASO 0: Eventos Especiales (Hambre, Peste) ==========
    console.log('\n--- STEP 0: Process Special Events ---');
    const specialEvents = await processSpecialEvents(gameId, db);
    context.events.push(...specialEvents);

    console.log(`Special events: ${specialEvents.length} events generated`);

    // Recargar unidades después de eventos (pueden haber sido eliminadas por Hambre/Peste)
    if (specialEvents.length > 0) {
      const updatedUnitsSnapshot = await db.collection('units')
        .where('gameId', '==', gameId)
        .get();
      context.units = updatedUnitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      console.log(`Reloaded units after events: ${context.units.length} units remaining`);
    }

    // ========== PASO 1: Validación de Órdenes ==========
    console.log('\n--- STEP 1: Validate Orders ---');
    await validateOrders(context);

    // ========== PASO 2: Procesamiento Económico ==========
    console.log('\n--- STEP 2: Process Economic Actions ---');
    await processEconomicActions(context);

    // ========== PASO 3: Resolución de Movimientos ==========
    console.log('\n--- STEP 3: Resolve Movements ---');
    await resolveMovements(context);

    // ========== PASO 4: Retiradas ==========
    console.log('\n--- STEP 4: Process Retreats ---');
    await processRetreats(context);

    // ========== PASO 5: Asedios ==========
    console.log('\n--- STEP 5: Process Sieges ---');
    await processSieges(context);

    // ========== PASO 6: Conversiones ==========
    console.log('\n--- STEP 6: Process Conversions ---');
    await processConversions(context);

    // ========== PASO 7: Actualización del Estado ==========
    console.log('\n--- STEP 7: Update Game State ---');
    await updateGameState(context);

    // ========== PASO 8: Registro del Historial ==========
    console.log('\n--- STEP 8: Record Turn History ---');
    await recordTurnHistory(context);

    // ========== PASO 9: Avance al Siguiente Turno ==========
    console.log('\n--- STEP 9: Advance to Next Turn ---');
    await advanceToNextTurn(context);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n=== Turn resolution completed in ${duration}s ===`);

  } catch (error) {
    console.error(`Error resolving turn for game ${gameId}:`, error);
    throw error;
  }
}
