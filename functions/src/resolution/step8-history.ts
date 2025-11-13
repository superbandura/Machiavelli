/**
 * PASO 8: Registro del Turno (Historial)
 *
 * Crear documento en colección 'history' con todos los eventos del turno
 */

import { ResolutionContext } from '../types';

export async function recordTurnHistory(context: ResolutionContext): Promise<void> {
  console.log('Recording turn history...');

  const { db, gameId, turnNumber, season, year, events } = context;

  // Extraer resumen de eventos por tipo
  const conquests = events.filter(e => e.type === 'city_captured' || e.type === 'city_auto_captured');
  const retreats = events.filter(e => e.type === 'retreat');
  const eliminations = events.filter(e => e.type === 'player_eliminated');
  const siegesCompleted = events.filter(e => e.type === 'city_captured');
  const standoffs = events.filter(e => e.type === 'standoff');
  const movements = events.filter(e => e.type === 'move_success');
  const battles = events.filter(e => e.type === 'battle');
  const conversions = events.filter(e => e.type === 'conversion');

  const historyEntry = {
    gameId,
    turnNumber,
    season,
    year,
    timestamp: new Date(),
    events: events,
    summary: {
      totalEvents: events.length,
      conquests: conquests.length,
      retreats: retreats.length,
      eliminations: eliminations.length,
      siegesCompleted: siegesCompleted.length,
      standoffs: standoffs.length,
      movements: movements.length,
      battles: battles.length,
      conversions: conversions.length,
    },
    // Guardar eventos importantes para visualización rápida
    majorEvents: events.filter(e =>
      ['city_captured', 'city_auto_captured', 'player_eliminated', 'battle'].includes(e.type)
    ),
  };

  // Guardar en Firestore colección 'history'
  await db.collection('history').add(historyEntry);

  console.log(`Turn history recorded: ${events.length} events (${conquests.length} conquests, ${battles.length} battles)`);
}
