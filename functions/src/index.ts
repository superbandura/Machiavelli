/**
 * Cloud Functions para Machiavelli
 *
 * Funciones principales:
 * - checkDeadlines: Verificar deadlines cada minuto (Cloud Scheduler)
 * - resolveTurn: Resolver un turno completo (callable desde checkDeadlines)
 */

import * as admin from 'firebase-admin';

// Inicializar Firebase Admin
admin.initializeApp();

// Exportar funciones
export { checkDeadlines } from './checkDeadlines';
export { resolveTurn } from './resolveTurn';
export { forcePhaseAdvance } from './forcePhaseAdvance';
export { setAdminRole } from './setAdminRole';
