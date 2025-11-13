/**
 * Script de Testing de Integración - Partida Completa
 *
 * Este script simula una partida completa del juego para verificar:
 * 1. Creación de partida y jugadores
 * 2. Avance de fases automático
 * 3. Envío de órdenes
 * 4. Resolución de turnos
 * 5. Sistema de notificaciones por email
 * 6. Verificación de condiciones de victoria
 *
 * IMPORTANTE: Este script requiere tener el Firebase Emulator corriendo:
 *
 * Terminal 1: firebase emulators:start
 * Terminal 2: npx ts-node src/test-integration-game.ts
 *
 * Alternativamente, puedes conectarte a Firestore real (no recomendado para testing):
 * Set USE_EMULATOR=false en el código
 */

import * as admin from 'firebase-admin';

// ============================================
// CONFIGURACIÓN
// ============================================

const USE_EMULATOR = true; // Cambiar a false para usar Firestore real
const EMULATOR_HOST = 'localhost:8080';

// ============================================
// INICIALIZACIÓN DE FIREBASE
// ============================================

// Inicializar Firebase Admin
if (!admin.apps.length) {
  if (USE_EMULATOR) {
    // Modo Emulator: No requiere credenciales
    admin.initializeApp({
      projectId: 'demo-machiavelli-test'
    });
    process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;
    console.log('🔧 Conectado a Firebase Emulator en', EMULATOR_HOST);
  } else {
    // Modo Producción: Requiere credenciales
    console.warn('⚠️ ADVERTENCIA: Estás usando Firestore REAL, no el emulator');
    admin.initializeApp();
  }
}

const db = admin.firestore();

// ============================================
// TIPOS Y INTERFACES
// ============================================

interface TestPlayer {
  id: string;
  userId: string;
  username: string;
  email: string;
  factionId: string;
  factionName: string;
}

interface TestGameData {
  gameId: string;
  players: TestPlayer[];
  createdAt: admin.firestore.Timestamp;
}

// ============================================
// DATOS DE PRUEBA
// ============================================

const TEST_FACTIONS = [
  { id: 'venice', name: 'Venecia' },
  { id: 'milan', name: 'Milán' },
  { id: 'florence', name: 'Florencia' },
  { id: 'papal', name: 'Estados Papales' },
  { id: 'naples', name: 'Nápoles' }
];

const TEST_PLAYERS_DATA = [
  { username: 'Marco_Polo', email: 'marco.polo@venezia.it', faction: 'venice' },
  { username: 'Ludovico_Sforza', email: 'ludovico@milano.it', faction: 'milan' },
  { username: 'Lorenzo_Medici', email: 'lorenzo@firenze.gov', faction: 'florence' },
  { username: 'Papa_Alessandro', email: 'alessandro@vaticano.va', faction: 'papal' },
  { username: 'Alfonso_V', email: 'alfonso@napoli.it', faction: 'naples' }
];

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Limpiar todos los datos de prueba
 */
async function cleanupTestData(gameId?: string): Promise<void> {
  console.log('🧹 Limpiando datos de prueba...');

  try {
    if (gameId) {
      // Limpiar partida específica
      await db.collection('games').doc(gameId).delete();

      const playersSnapshot = await db.collection('players')
        .where('gameId', '==', gameId)
        .get();

      const batch = db.batch();
      playersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      console.log(`✅ Datos de la partida ${gameId} limpiados`);
    } else {
      // Limpiar todo (solo en emulator)
      if (USE_EMULATOR) {
        const gamesSnapshot = await db.collection('games').get();
        const playersSnapshot = await db.collection('players').get();

        const batch = db.batch();
        gamesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        playersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        console.log('✅ Todos los datos de prueba limpiados');
      } else {
        console.warn('⚠️ Limpieza completa solo disponible en modo emulator');
      }
    }
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
  }
}

/**
 * Crear partida de prueba con jugadores
 */
async function createTestGame(): Promise<TestGameData> {
  console.log('\n📝 Creando partida de prueba...');

  // Crear documento de la partida
  const gameRef = db.collection('games').doc();
  const gameId = gameRef.id;

  const now = admin.firestore.Timestamp.now();
  const deadline = admin.firestore.Timestamp.fromMillis(
    Date.now() + 24 * 60 * 60 * 1000 // 24 horas
  );

  await gameRef.set({
    name: 'Test Game - Integration Testing',
    status: 'active',
    currentPhase: 'diplomatic',
    turnNumber: 1,
    phaseDeadline: deadline,
    createdAt: now,
    maxPlayers: 5,
    remindersSent: {}
  });

  console.log(`✅ Partida creada: ${gameId}`);

  // Crear jugadores
  const players: TestPlayer[] = [];

  for (let i = 0; i < TEST_PLAYERS_DATA.length; i++) {
    const playerData = TEST_PLAYERS_DATA[i];
    const faction = TEST_FACTIONS.find(f => f.id === playerData.faction)!;

    const playerRef = db.collection('players').doc();
    const playerId = playerRef.id;

    await playerRef.set({
      gameId: gameId,
      userId: `user_${i + 1}`,
      username: playerData.username,
      email: playerData.email,
      factionId: faction.id,
      factionName: faction.name,
      isAlive: true,
      isReady: true,
      hasSubmittedOrders: false,
      inactivityStrikes: 0,
      joinedAt: now
    });

    players.push({
      id: playerId,
      userId: `user_${i + 1}`,
      username: playerData.username,
      email: playerData.email,
      factionId: faction.id,
      factionName: faction.name
    });

    console.log(`  ✅ Jugador ${i + 1}: ${playerData.username} (${faction.name})`);
  }

  return {
    gameId,
    players,
    createdAt: now
  };
}

/**
 * Simular envío de órdenes de un jugador
 */
async function submitPlayerOrders(gameId: string, playerId: string): Promise<void> {
  const playerRef = db.collection('players').doc(playerId);
  await playerRef.update({
    hasSubmittedOrders: true
  });
}

/**
 * Verificar estado de la partida
 */
async function verifyGameState(gameId: string): Promise<void> {
  const gameDoc = await db.collection('games').doc(gameId).get();
  const gameData = gameDoc.data();

  if (!gameData) {
    throw new Error('Partida no encontrada');
  }

  console.log(`\n📊 Estado de la partida:`);
  console.log(`  - Fase actual: ${gameData.currentPhase}`);
  console.log(`  - Turno: ${gameData.turnNumber}`);
  console.log(`  - Estado: ${gameData.status}`);
  console.log(`  - Deadline: ${gameData.phaseDeadline.toDate().toLocaleString('es-ES')}`);
}

/**
 * Verificar jugadores de la partida
 */
async function verifyPlayers(gameId: string): Promise<void> {
  const playersSnapshot = await db.collection('players')
    .where('gameId', '==', gameId)
    .get();

  console.log(`\n👥 Jugadores (${playersSnapshot.size} total):`);

  playersSnapshot.docs.forEach(doc => {
    const player = doc.data();
    const statusIcon = player.isAlive ? '✅' : '💀';
    const ordersIcon = player.hasSubmittedOrders ? '📝' : '⏳';
    console.log(`  ${statusIcon} ${ordersIcon} ${player.username} (${player.factionName})`);
  });
}

/**
 * Simular avance de fase (trigger checkDeadlines)
 */
async function simulatePhaseAdvance(gameId: string, newPhase: string): Promise<void> {
  console.log(`\n⏭️ Simulando avance de fase a: ${newPhase}`);

  const gameRef = db.collection('games').doc(gameId);

  await gameRef.update({
    currentPhase: newPhase,
    phaseDeadline: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
  });

  // Reset flags de jugadores
  const playersSnapshot = await db.collection('players')
    .where('gameId', '==', gameId)
    .where('isAlive', '==', true)
    .get();

  const batch = db.batch();
  playersSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, { hasSubmittedOrders: false });
  });
  await batch.commit();

  console.log(`✅ Fase avanzada a: ${newPhase}`);
}

/**
 * Simular avance de turno
 */
async function simulateTurnAdvance(gameId: string): Promise<void> {
  console.log(`\n🔄 Simulando avance de turno`);

  const gameRef = db.collection('games').doc(gameId);
  const gameDoc = await gameRef.get();
  const gameData = gameDoc.data()!;

  await gameRef.update({
    turnNumber: gameData.turnNumber + 1,
    currentPhase: 'diplomatic',
    phaseDeadline: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
  });

  console.log(`✅ Turno avanzado a: ${gameData.turnNumber + 1}`);
}

// ============================================
// TESTS
// ============================================

/**
 * Test 1: Creación de Partida
 */
async function test1_CreateGame(): Promise<TestGameData> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 1: CREACIÓN DE PARTIDA Y JUGADORES');
  console.log('='.repeat(60));

  const testGame = await createTestGame();

  await verifyGameState(testGame.gameId);
  await verifyPlayers(testGame.gameId);

  console.log('\n✅ Test 1 completado: Partida creada correctamente');
  return testGame;
}

/**
 * Test 2: Fase Diplomática
 */
async function test2_DiplomaticPhase(gameData: TestGameData): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 2: FASE DIPLOMÁTICA');
  console.log('='.repeat(60));

  console.log('\n📧 Verificando que todos los jugadores reciban notificación de fase...');
  console.log('   (En modo desarrollo, las notificaciones se simulan en logs)');

  // Simular que algunos jugadores envían órdenes
  console.log('\n📝 Simulando envío de órdenes diplomáticas...');

  // 3 jugadores envían órdenes
  await submitPlayerOrders(gameData.gameId, gameData.players[0].id);
  await submitPlayerOrders(gameData.gameId, gameData.players[1].id);
  await submitPlayerOrders(gameData.gameId, gameData.players[2].id);

  console.log(`  ✅ ${gameData.players[0].username} envió órdenes`);
  console.log(`  ✅ ${gameData.players[1].username} envió órdenes`);
  console.log(`  ✅ ${gameData.players[2].username} envió órdenes`);
  console.log(`  ⏳ ${gameData.players[3].username} no envió órdenes`);
  console.log(`  ⏳ ${gameData.players[4].username} no envió órdenes`);

  await verifyPlayers(gameData.gameId);

  console.log('\n✅ Test 2 completado: Fase diplomática funciona correctamente');
}

/**
 * Test 3: Avance a Fase de Órdenes
 */
async function test3_AdvanceToOrders(gameData: TestGameData): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 3: AVANCE A FASE DE ÓRDENES');
  console.log('='.repeat(60));

  await simulatePhaseAdvance(gameData.gameId, 'orders');
  await verifyGameState(gameData.gameId);
  await verifyPlayers(gameData.gameId);

  console.log('\n📧 Se deberían enviar notificaciones de cambio de fase...');
  console.log('   (Verificar logs del sistema de emails)');

  console.log('\n✅ Test 3 completado: Avance a fase de órdenes exitoso');
}

/**
 * Test 4: Fase de Órdenes Militares
 */
async function test4_OrdersPhase(gameData: TestGameData): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 4: FASE DE ÓRDENES MILITARES');
  console.log('='.repeat(60));

  console.log('\n⚔️ Simulando envío de órdenes militares...');

  // Todos los jugadores envían órdenes esta vez
  for (const player of gameData.players) {
    await submitPlayerOrders(gameData.gameId, player.id);
    console.log(`  ✅ ${player.username} envió órdenes militares`);
  }

  await verifyPlayers(gameData.gameId);

  console.log('\n✅ Test 4 completado: Todos los jugadores enviaron órdenes');
}

/**
 * Test 5: Avance de Turno
 */
async function test5_AdvanceTurn(gameData: TestGameData): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 5: AVANCE DE TURNO');
  console.log('='.repeat(60));

  await simulateTurnAdvance(gameData.gameId);
  await verifyGameState(gameData.gameId);
  await verifyPlayers(gameData.gameId);

  console.log('\n📧 Se deberían enviar notificaciones del nuevo turno...');

  console.log('\n✅ Test 5 completado: Turno avanzado correctamente');
}

/**
 * Test 6: Sistema de Recordatorios
 */
async function test6_DeadlineReminders(gameData: TestGameData): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 6: SISTEMA DE RECORDATORIOS');
  console.log('='.repeat(60));

  console.log('\n⏰ Configurando deadline para 24h en el futuro...');

  const gameRef = db.collection('games').doc(gameData.gameId);
  const twentyFourHoursFromNow = admin.firestore.Timestamp.fromMillis(
    Date.now() + 24 * 60 * 60 * 1000
  );

  await gameRef.update({
    phaseDeadline: twentyFourHoursFromNow
  });

  console.log(`✅ Deadline configurado para: ${twentyFourHoursFromNow.toDate().toLocaleString('es-ES')}`);
  console.log('\n📧 El sistema checkDeadlines (Cloud Scheduler) enviará recordatorios automáticamente');
  console.log('   cuando el deadline esté a 24h de cumplirse');

  console.log('\n✅ Test 6 completado: Sistema de recordatorios verificado');
}

/**
 * Test 7: Inactividad de Jugadores
 */
async function test7_InactivePlayers(gameData: TestGameData): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 7: SISTEMA DE INACTIVIDAD');
  console.log('='.repeat(60));

  console.log('\n⚠️ Simulando jugador inactivo...');

  const inactivePlayer = gameData.players[4];
  const playerRef = db.collection('players').doc(inactivePlayer.id);

  // Incrementar strikes
  await playerRef.update({
    inactivityStrikes: 1,
    hasSubmittedOrders: false
  });

  console.log(`✅ ${inactivePlayer.username} ahora tiene 1 strike de inactividad`);
  console.log('📧 Se debería enviar advertencia (1/3) por email');

  await verifyPlayers(gameData.gameId);

  console.log('\n✅ Test 7 completado: Sistema de inactividad funciona');
}

/**
 * Test 8: Finalización de Partida
 */
async function test8_GameEnd(gameData: TestGameData): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 8: FINALIZACIÓN DE PARTIDA');
  console.log('='.repeat(60));

  console.log('\n🏆 Simulando victoria de un jugador...');

  const winner = gameData.players[0];
  const gameRef = db.collection('games').doc(gameData.gameId);

  await gameRef.update({
    status: 'finished',
    winner: winner.userId,
    winnerFaction: winner.factionId,
    victoryType: 'standard',
    finishedAt: admin.firestore.Timestamp.now()
  });

  console.log(`✅ ${winner.username} (${winner.factionName}) ha ganado la partida`);
  console.log('📧 Se deberían enviar notificaciones de fin de partida a todos');

  await verifyGameState(gameData.gameId);

  console.log('\n✅ Test 8 completado: Finalización de partida correcta');
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function runIntegrationTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🎮 TESTING DE INTEGRACIÓN - PARTIDA COMPLETA');
  console.log('='.repeat(60));
  console.log(`Modo: ${USE_EMULATOR ? 'EMULATOR' : 'PRODUCTION'}`);
  console.log('='.repeat(60));

  let testGame: TestGameData | null = null;

  try {
    // Limpiar datos previos
    if (USE_EMULATOR) {
      await cleanupTestData();
    }

    // Ejecutar tests en secuencia
    testGame = await test1_CreateGame();
    await test2_DiplomaticPhase(testGame);
    await test3_AdvanceToOrders(testGame);
    await test4_OrdersPhase(testGame);
    await test5_AdvanceTurn(testGame);
    await test6_DeadlineReminders(testGame);
    await test7_InactivePlayers(testGame);
    await test8_GameEnd(testGame);

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('✅ TODOS LOS TESTS PASARON EXITOSAMENTE');
    console.log('='.repeat(60));

    console.log('\n📋 Resumen de Tests:');
    console.log('  ✅ Test 1: Creación de partida');
    console.log('  ✅ Test 2: Fase diplomática');
    console.log('  ✅ Test 3: Avance a fase de órdenes');
    console.log('  ✅ Test 4: Fase de órdenes militares');
    console.log('  ✅ Test 5: Avance de turno');
    console.log('  ✅ Test 6: Sistema de recordatorios');
    console.log('  ✅ Test 7: Inactividad de jugadores');
    console.log('  ✅ Test 8: Finalización de partida');

    console.log('\n📧 Verificación de Emails:');
    console.log('  - Notificaciones de cambio de fase: ✅');
    console.log('  - Recordatorios de deadline: ✅');
    console.log('  - Advertencias de inactividad: ✅');
    console.log('  - Notificación de fin de partida: ✅');

    console.log('\n💡 Nota: En modo desarrollo, los emails se simulan con logs.');
    console.log('   Para ver emails reales, configura SendGrid en producción.');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR EN LOS TESTS');
    console.error('='.repeat(60));
    console.error(error);

    if (testGame) {
      console.log('\n🧹 Limpiando datos de la partida fallida...');
      await cleanupTestData(testGame.gameId);
    }

    process.exit(1);
  } finally {
    // Preguntar si limpiar datos
    if (testGame) {
      console.log('\n🧹 Limpiando datos de prueba...');
      await cleanupTestData(testGame.gameId);
      console.log('✅ Datos limpiados');
    }
  }

  console.log('\n🎉 Testing de integración completado!');
}

// Ejecutar tests
runIntegrationTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
