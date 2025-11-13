/**
 * Script de Testing Manual para Sistema de Emails
 *
 * Ejecutar: npx ts-node src/test-emails.ts
 *
 * Este script genera emails de prueba para verificar que todas las
 * plantillas se renderizan correctamente en modo desarrollo
 */

import {
  getPhaseChangeEmail,
  getReminderEmail,
  getInactivityWarningEmail,
  getGameEndedEmail
} from './email/emailTemplates';

console.log('====================================');
console.log('🧪 TESTING SISTEMA DE EMAILS');
console.log('====================================\n');

// Test 1: Email de Cambio de Fase (Diplomática)
console.log('📧 Test 1: Cambio de Fase (Diplomática)');
console.log('----------------------------------------');
const phaseChangeDiplomatic = getPhaseChangeEmail({
  playerName: 'Marco Polo',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  newPhase: 'diplomatic',
  deadline: 'viernes, 11 de octubre de 2025, 14:30',
  turnNumber: 1,
  year: 1454,
  season: 'Primavera'
});
console.log('Subject:', phaseChangeDiplomatic.subject);
console.log('HTML Length:', phaseChangeDiplomatic.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 2: Email de Cambio de Fase (Órdenes)
console.log('📧 Test 2: Cambio de Fase (Órdenes)');
console.log('----------------------------------------');
const phaseChangeOrders = getPhaseChangeEmail({
  playerName: 'Lorenzo de Médici',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  newPhase: 'orders',
  deadline: 'domingo, 13 de octubre de 2025, 14:30',
  turnNumber: 1,
  year: 1454,
  season: 'Primavera'
});
console.log('Subject:', phaseChangeOrders.subject);
console.log('HTML Length:', phaseChangeOrders.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 3: Email de Cambio de Fase (Resolución)
console.log('📧 Test 3: Cambio de Fase (Resolución)');
console.log('----------------------------------------');
const phaseChangeResolution = getPhaseChangeEmail({
  playerName: 'Ludovico Sforza',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  newPhase: 'resolution',
  deadline: 'lunes, 14 de octubre de 2025, 14:30',
  turnNumber: 1,
  year: 1454,
  season: 'Primavera'
});
console.log('Subject:', phaseChangeResolution.subject);
console.log('HTML Length:', phaseChangeResolution.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 4: Email de Recordatorio (24h antes)
console.log('📧 Test 4: Recordatorio de Deadline (24h)');
console.log('----------------------------------------');
const reminder24h = getReminderEmail({
  playerName: 'César Borgia',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  currentPhase: 'orders',
  hoursRemaining: 24,
  deadline: 'martes, 15 de octubre de 2025, 14:30'
});
console.log('Subject:', reminder24h.subject);
console.log('HTML Length:', reminder24h.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 5: Email de Recordatorio (6h antes)
console.log('📧 Test 5: Recordatorio de Deadline (6h)');
console.log('----------------------------------------');
const reminder6h = getReminderEmail({
  playerName: 'Dogaresa de Venecia',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  currentPhase: 'diplomatic',
  hoursRemaining: 6,
  deadline: 'martes, 15 de octubre de 2025, 20:30'
});
console.log('Subject:', reminder6h.subject);
console.log('HTML Length:', reminder6h.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 6: Advertencia de Inactividad (1er strike)
console.log('📧 Test 6: Advertencia de Inactividad (1/3 strikes)');
console.log('----------------------------------------');
const inactivity1 = getInactivityWarningEmail({
  playerName: 'Alfonso V de Nápoles',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  missedTurns: 1,
  maxStrikes: 3
});
console.log('Subject:', inactivity1.subject);
console.log('HTML Length:', inactivity1.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 7: Advertencia de Inactividad (2do strike)
console.log('📧 Test 7: Advertencia de Inactividad (2/3 strikes)');
console.log('----------------------------------------');
const inactivity2 = getInactivityWarningEmail({
  playerName: 'Rey de Francia',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  missedTurns: 2,
  maxStrikes: 3
});
console.log('Subject:', inactivity2.subject);
console.log('HTML Length:', inactivity2.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 8: Advertencia de Inactividad (3er strike - FINAL)
console.log('📧 Test 8: Advertencia de Inactividad (3/3 strikes - FINAL)');
console.log('----------------------------------------');
const inactivity3 = getInactivityWarningEmail({
  playerName: 'Papa Nicolás V',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  missedTurns: 3,
  maxStrikes: 3
});
console.log('Subject:', inactivity3.subject);
console.log('HTML Length:', inactivity3.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 9: Fin de Partida (Victoria Estándar)
console.log('📧 Test 9: Fin de Partida (Victoria Estándar)');
console.log('----------------------------------------');
const gameEndedStandard = getGameEndedEmail({
  playerName: 'Todos los Jugadores',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  winner: 'Venecia',
  victoryType: 'Victoria Estándar (8 ciudades)',
  finalTurn: 7
});
console.log('Subject:', gameEndedStandard.subject);
console.log('HTML Length:', gameEndedStandard.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 10: Fin de Partida (Victoria por Tiempo)
console.log('📧 Test 10: Fin de Partida (Victoria por Tiempo)');
console.log('----------------------------------------');
const gameEndedTimeLimit = getGameEndedEmail({
  playerName: 'Todos los Jugadores',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  winner: 'Milán',
  victoryType: 'Victoria por Límite de Tiempo (12 turnos)',
  finalTurn: 12
});
console.log('Subject:', gameEndedTimeLimit.subject);
console.log('HTML Length:', gameEndedTimeLimit.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Test 11: Fin de Partida (Victoria Compartida)
console.log('📧 Test 11: Fin de Partida (Victoria Compartida)');
console.log('----------------------------------------');
const gameEndedShared = getGameEndedEmail({
  playerName: 'Todos los Jugadores',
  gameName: 'Partida de Prueba Italia 1454',
  gameId: 'test-game-123',
  gameUrl: 'https://machiavelli.game/game/test-game-123',
  winner: 'Empate',
  victoryType: 'Victoria Compartida (Florencia, Venecia)',
  finalTurn: 12
});
console.log('Subject:', gameEndedShared.subject);
console.log('HTML Length:', gameEndedShared.html.length, 'chars');
console.log('✅ Generado correctamente\n');

// Resumen
console.log('====================================');
console.log('✅ TODOS LOS TESTS PASARON');
console.log('====================================');
console.log('Total de plantillas probadas: 11');
console.log('- Cambio de fase: 3 tipos (diplomatic, orders, resolution)');
console.log('- Recordatorios: 2 casos (24h, 6h)');
console.log('- Inactividad: 3 niveles (1/3, 2/3, 3/3)');
console.log('- Fin de partida: 3 tipos (standard, time_limit, shared)');
console.log('\n📝 Nota: Todas las plantillas se generaron sin errores.');
console.log('En desarrollo, los emails se simulan con logs en consola.');
console.log('Para producción, configura SendGrid en emailService.ts\n');
