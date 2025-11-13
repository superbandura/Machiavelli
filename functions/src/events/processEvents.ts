/**
 * Procesamiento de Eventos Especiales
 *
 * - Hambre (Famine): Solo Primavera, 33% probabilidad
 * - Peste (Plague): Solo Verano, 33% probabilidad
 *
 * Se ejecuta ANTES de la resolución de turnos
 */

import * as admin from 'firebase-admin';
import { PROVINCE_INFO } from '../data/provinceData';

interface EventsConfig {
  famine: boolean;
  plague: boolean;
  assassination: boolean;
}

interface Game {
  id: string;
  currentSeason: string;
  currentYear: number;
  turnNumber: number;
  eventsConfig?: EventsConfig;
  famineProvinces?: string[]; // Provincias con marcador de hambre
  [key: string]: any;
}

interface TurnEvent {
  type: string;
  [key: string]: any;
}

/**
 * Procesar eventos especiales según la estación
 */
export async function processSpecialEvents(gameId: string, db: admin.firestore.Firestore): Promise<TurnEvent[]> {
  console.log(`=== PROCESSING SPECIAL EVENTS for game ${gameId} ===`);

  const events: TurnEvent[] = [];

  // Cargar datos del juego
  const gameDoc = await db.collection('games').doc(gameId).get();
  if (!gameDoc.exists) {
    console.error(`Game ${gameId} not found`);
    return events;
  }

  const game = { id: gameDoc.id, ...gameDoc.data() } as Game;
  const eventsConfig = game.eventsConfig || { famine: true, plague: false, assassination: true };

  console.log(`Season: ${game.currentSeason}, Events config:`, eventsConfig);

  // Procesar según estación
  if (game.currentSeason === 'Primavera' && eventsConfig.famine) {
    const famineEvents = await processFamine(game, db);
    events.push(...famineEvents);
  }

  if (game.currentSeason === 'Verano') {
    // Retirar marcadores de hambre
    if (game.famineProvinces && game.famineProvinces.length > 0) {
      console.log(`Removing famine markers from: ${game.famineProvinces.join(', ')}`);

      await db.collection('games').doc(gameId).update({
        famineProvinces: []
      });

      events.push({
        type: 'famine_ended',
        provinces: game.famineProvinces,
        message: `🌾 El hambre ha terminado en: ${game.famineProvinces.join(', ')}`
      });
    }

    // Procesar peste
    if (eventsConfig.plague) {
      const plagueEvents = await processPlague(game, db);
      events.push(...plagueEvents);
    }
  }

  return events;
}

/**
 * Procesar Hambre (Primavera)
 */
async function processFamine(game: Game, db: admin.firestore.Firestore): Promise<TurnEvent[]> {
  console.log('Processing FAMINE event...');

  const events: TurnEvent[] = [];

  // Tirada de dados: 1d6
  // 1-2: Sin hambre, 3-4: 1 provincia, 5-6: 2 provincias
  const roll = Math.floor(Math.random() * 6) + 1;

  let affectedCount = 0;
  if (roll >= 3 && roll <= 4) affectedCount = 1;
  if (roll >= 5) affectedCount = 2;

  console.log(`Famine roll: ${roll} → ${affectedCount} province(s) affected`);

  if (affectedCount === 0) {
    events.push({
      type: 'famine_roll',
      roll,
      affected: 0,
      message: `🎲 Sin hambre esta Primavera (dado: ${roll})`
    });
    return events;
  }

  // Obtener provincias terrestres (land o port, no sea)
  const landProvinces = Object.values(PROVINCE_INFO)
    .filter(p => p.type === 'land' || p.type === 'port')
    .map(p => p.id);

  // Verificar mitigaciones pagadas
  // TODO: Obtener provincias donde jugadores pagaron 3d para prevenir
  const mitigatedProvinces: string[] = [];
  // Por ahora, esto vendría de un campo en players o en extraExpenses

  // Seleccionar provincias aleatoriamente
  const availableProvinces = landProvinces.filter(p => !mitigatedProvinces.includes(p));
  const affectedProvinces: string[] = [];

  for (let i = 0; i < affectedCount && availableProvinces.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableProvinces.length);
    const province = availableProvinces[randomIndex];
    affectedProvinces.push(province);
    availableProvinces.splice(randomIndex, 1);
  }

  console.log(`Famine affects: ${affectedProvinces.join(', ')}`);

  // Guardar marcadores de hambre en el juego
  await db.collection('games').doc(game.id).update({
    famineProvinces: affectedProvinces
  });

  // Eliminar todas las unidades en provincias afectadas
  const unitsSnapshot = await db.collection('units')
    .where('gameId', '==', game.id)
    .get();

  const batch = db.batch();
  let unitsDestroyed = 0;

  unitsSnapshot.docs.forEach(doc => {
    const unit = doc.data();
    if (affectedProvinces.includes(unit.currentPosition)) {
      batch.delete(doc.ref);
      unitsDestroyed++;

      events.push({
        type: 'unit_destroyed_famine',
        unitId: doc.id,
        unitType: unit.type,
        province: unit.currentPosition,
        owner: unit.owner,
        message: `💀 ${unit.type} eliminado por hambre en ${unit.currentPosition}`
      });
    }
  });

  await batch.commit();

  console.log(`Famine destroyed ${unitsDestroyed} units`);

  // Evento principal
  events.push({
    type: 'famine',
    roll,
    provinces: affectedProvinces,
    unitsDestroyed,
    message: `🌾 HAMBRE afecta a ${affectedProvinces.length} provincia(s): ${affectedProvinces.join(', ')}`
  });

  return events;
}

/**
 * Procesar Peste (Verano)
 */
async function processPlague(game: Game, db: admin.firestore.Firestore): Promise<TurnEvent[]> {
  console.log('Processing PLAGUE event...');

  const events: TurnEvent[] = [];

  // Tirada de dados: 1d6
  // 1-4: Sin peste, 5-6: Peste aparece
  const roll = Math.floor(Math.random() * 6) + 1;

  console.log(`Plague roll: ${roll}`);

  if (roll < 5) {
    events.push({
      type: 'plague_roll',
      roll,
      occurred: false,
      message: `🎲 Sin peste este Verano (dado: ${roll})`
    });
    return events;
  }

  // Peste aparece - seleccionar provincia aleatoria
  const allProvinces = Object.values(PROVINCE_INFO).map(p => p.id);
  const randomIndex = Math.floor(Math.random() * allProvinces.length);
  const affectedProvince = allProvinces[randomIndex];

  console.log(`Plague affects: ${affectedProvince}`);

  // Eliminar TODAS las unidades en la provincia (instantáneo, sin retiradas)
  const unitsSnapshot = await db.collection('units')
    .where('gameId', '==', game.id)
    .where('currentPosition', '==', affectedProvince)
    .get();

  const batch = db.batch();
  const destroyedUnits: any[] = [];

  unitsSnapshot.docs.forEach(doc => {
    const unit = doc.data();
    batch.delete(doc.ref);
    destroyedUnits.push({
      id: doc.id,
      type: unit.type,
      owner: unit.owner
    });

    events.push({
      type: 'unit_destroyed_plague',
      unitId: doc.id,
      unitType: unit.type,
      province: affectedProvince,
      owner: unit.owner,
      message: `☠️ ${unit.type} eliminado por peste en ${affectedProvince}`
    });
  });

  await batch.commit();

  console.log(`Plague destroyed ${destroyedUnits.length} units in ${affectedProvince}`);

  // Evento principal
  events.push({
    type: 'plague',
    roll,
    province: affectedProvince,
    unitsDestroyed: destroyedUnits.length,
    message: `☠️ PESTE en ${affectedProvince}! ${destroyedUnits.length} unidades eliminadas`
  });

  return events;
}
