/**
 * PASO 6: Conversiones de Unidades
 *
 * Procesar órdenes de conversión:
 * - Flota → Ejército (solo en puerto)
 * - Ejército → Flota (solo en puerto)
 * - Guarnición → Ejército (siempre válido)
 */

import { ResolutionContext } from '../types';

export async function processConversions(context: ResolutionContext): Promise<void> {
  console.log('Processing conversions...');

  const { units, orders } = context;

  // Procesar todas las órdenes de conversión
  const conversionOrders = orders.filter(o => o.action === 'convert');

  for (const order of conversionOrders) {
    const unit = units.find(u => u.id === order.unitId);
    if (!unit) continue;

    // El tipo objetivo está en targetProvince (reutilizamos este campo)
    const targetType = order.targetProvince as 'army' | 'fleet' | 'garrison';

    if (!targetType) {
      console.warn(`Conversion order for unit ${unit.id} has no target type`);
      continue;
    }

    const oldType = unit.type;

    // Realizar la conversión
    unit.type = targetType;

    // Registrar evento
    context.events.push({
      type: 'conversion',
      unitId: unit.id,
      province: unit.currentPosition,
      oldType,
      newType: targetType,
      message: `🔄 Unidad en ${unit.currentPosition} convertida: ${oldType} → ${targetType}`,
    });

    console.log(`Unit ${unit.id} converted from ${oldType} to ${targetType} at ${unit.currentPosition}`);
  }

  console.log(`Conversions processed: ${conversionOrders.length} conversions`);
}
