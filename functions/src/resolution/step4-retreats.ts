/**
 * PASO 4: Retiradas
 *
 * Procesar retiradas de unidades derrotadas según lista de preferencia
 */

import { ResolutionContext } from '../types';
import { getValidDestinations } from '../utils/mapHelpers';

export async function processRetreats(context: ResolutionContext): Promise<void> {
  console.log('Processing retreats...');

  const { units, orders } = context;
  const retreatingUnits = context.retreatingUnits || [];

  console.log(`${retreatingUnits.length} units need to retreat`);

  for (const { unit, fromProvince } of retreatingUnits) {
    console.log(`Processing retreat for unit ${unit.id} from ${fromProvince}`);

    // Buscar la orden de esta unidad para obtener la lista de retirada
    const order = orders.find(o => o.unitId === unit.id);
    const retreatList = order?.retreatList || [];

    if (retreatList.length === 0) {
      console.log(`Unit ${unit.id} has no retreat list - will be destroyed`);
    }

    // Obtener destinos válidos según el tipo de unidad
    const validDestinations = getValidDestinations(context.map, fromProvince, unit.type);

    // Intentar cada opción de retirada en orden de preferencia
    let retreatSuccessful = false;
    for (const destination of retreatList) {
      // Verificar si el destino es válido
      if (!validDestinations.includes(destination)) {
        console.log(`Retreat destination ${destination} is not valid for unit type ${unit.type}`);
        continue;
      }

      // Verificar si hay otras unidades en el destino
      const unitsInDestination = units.filter(u =>
        u.currentPosition === destination && u.id !== unit.id
      );

      // Permitir retirada solo si:
      // - No hay unidades
      // - O solo hay unidades del mismo jugador
      const hasEnemyUnits = unitsInDestination.some(u => u.owner !== unit.owner);

      if (hasEnemyUnits) {
        console.log(`Retreat destination ${destination} has enemy units`);
        continue;
      }

      // Retirada exitosa
      console.log(`Unit ${unit.id} retreats from ${fromProvince} to ${destination}`);
      unit.currentPosition = destination;

      context.events.push({
        type: 'retreat',
        unitId: unit.id,
        from: fromProvince,
        to: destination,
        message: `🏃 Unidad se retira de ${fromProvince} a ${destination}`
      });

      retreatSuccessful = true;
      break;
    }

    // Si no se pudo retirar, eliminar la unidad
    if (!retreatSuccessful) {
      console.log(`Unit ${unit.id} has no valid retreat - destroyed`);

      const unitIndex = units.findIndex(u => u.id === unit.id);
      if (unitIndex >= 0) {
        units.splice(unitIndex, 1);
      }

      context.events.push({
        type: 'unit_destroyed',
        unitId: unit.id,
        province: fromProvince,
        reason: 'no_retreat',
        message: `💀 Unidad en ${fromProvince} eliminada (sin retirada válida)`
      });
    }
  }

  // Limpiar lista de unidades en retirada
  context.retreatingUnits = [];

  console.log('Retreats processed');
}
