/**
 * PASO 1: Validación de Órdenes
 *
 * Verificar que todas las órdenes sean legales:
 * - Ejército no puede ir a zona marítima sin convoy
 * - Flota no puede ir a provincia terrestre sin puerto
 * - Unidad solo puede moverse a provincia adyacente
 * - Guarnición no puede moverse nunca
 *
 * Si orden es ilegal → Cambiar a "Mantener" (Hold)
 */

import { ResolutionContext, Order, Unit } from '../types';
import { isAdjacent, isPort, isLand, isSea } from '../data/provinceData';

export async function validateOrders(context: ResolutionContext): Promise<void> {
  console.log('Validating orders...');

  let validCount = 0;
  let invalidCount = 0;

  for (const order of context.orders) {
    const unit = context.units.find(u => u.id === order.unitId);
    if (!unit) {
      console.warn(`Order ${order.id} references non-existent unit ${order.unitId}`);
      continue;
    }

    const validation = validateOrder(order, unit, context.units);

    if (!validation.isValid) {
      // Cambiar orden a "Mantener"
      order.action = 'hold';
      order.targetProvince = undefined;
      order.supportedUnit = undefined;

      // Registrar evento
      context.events.push({
        type: 'invalid_order',
        unitId: unit.id,
        originalAction: order.action,
        reason: validation.error,
        message: `Orden inválida de ${unit.type} en ${unit.currentPosition}: ${validation.error}. Cambiada a Mantener.`
      });

      invalidCount++;
      console.log(`Invalid order: ${unit.type} in ${unit.currentPosition} - ${validation.error}`);
    } else {
      validCount++;
    }
  }

  console.log(`Validation complete: ${validCount} valid, ${invalidCount} invalid (corrected to Hold)`);
}

/**
 * Validar una orden individual
 */
function validateOrder(order: Order, unit: Unit, allUnits: Unit[]): { isValid: boolean; error?: string } {
  switch (order.action) {
    case 'hold':
      return { isValid: true };

    case 'move':
      if (!order.targetProvince) {
        return { isValid: false, error: 'Debe especificar provincia destino' };
      }

      // Guarniciones no pueden moverse
      if (unit.type === 'garrison') {
        return { isValid: false, error: 'Las guarniciones no pueden moverse' };
      }

      // Verificar adyacencia
      if (!isAdjacent(unit.currentPosition, order.targetProvince)) {
        return { isValid: false, error: 'Provincia no es adyacente' };
      }

      // Verificar tipo de terreno
      if (unit.type === 'army') {
        if (!isLand(order.targetProvince)) {
          // Ejército a zona marítima sin convoy → Inválido
          // TODO: Verificar si hay convoy válido en Paso 3.1
          return { isValid: false, error: 'Ejércitos no pueden ir a zona marítima sin convoy' };
        }
      }

      if (unit.type === 'fleet') {
        if (!isSea(order.targetProvince) && !isPort(order.targetProvince)) {
          return { isValid: false, error: 'Flotas solo pueden moverse al mar o puertos' };
        }
      }

      return { isValid: true };

    case 'support':
      if (!order.supportedUnit) {
        return { isValid: false, error: 'Debe especificar unidad a apoyar' };
      }
      const supportedUnit = allUnits.find(u => u.id === order.supportedUnit);
      if (!supportedUnit) {
        return { isValid: false, error: 'Unidad a apoyar no encontrada' };
      }
      if (!isAdjacent(unit.currentPosition, supportedUnit.currentPosition)) {
        return { isValid: false, error: 'No puedes apoyar esa provincia (no es adyacente)' };
      }
      return { isValid: true };

    case 'convoy':
      if (unit.type !== 'fleet') {
        return { isValid: false, error: 'Solo las flotas pueden transportar' };
      }
      if (!isSea(unit.currentPosition)) {
        return { isValid: false, error: 'La flota debe estar en el mar para transportar' };
      }
      if (!order.supportedUnit) {
        return { isValid: false, error: 'Debe especificar ejército a transportar' };
      }
      const armyToConvoy = allUnits.find(u => u.id === order.supportedUnit);
      if (!armyToConvoy) {
        return { isValid: false, error: 'Ejército a transportar no encontrado' };
      }
      if (armyToConvoy.type !== 'army') {
        return { isValid: false, error: 'Solo se pueden transportar ejércitos' };
      }
      return { isValid: true };

    case 'besiege':
      if (unit.type === 'garrison') {
        return { isValid: false, error: 'Las guarniciones no pueden asediar' };
      }
      if (!order.targetProvince) {
        return { isValid: false, error: 'Debe especificar ciudad a asediar' };
      }
      if (unit.currentPosition !== order.targetProvince) {
        return { isValid: false, error: 'Debes estar en la provincia de la ciudad para asediarla' };
      }
      return { isValid: true };

    case 'convert':
      if (!order.targetProvince) {
        return { isValid: false, error: 'Debe especificar tipo de unidad destino' };
      }
      const targetType = order.targetProvince; // Reutilizamos este campo
      if (unit.type === 'fleet') {
        if (targetType !== 'army') {
          return { isValid: false, error: 'Flotas solo pueden convertirse a ejércitos' };
        }
        if (!isPort(unit.currentPosition)) {
          return { isValid: false, error: 'Flotas solo pueden convertirse en puertos' };
        }
      } else if (unit.type === 'army') {
        if (targetType !== 'fleet') {
          return { isValid: false, error: 'Ejércitos solo pueden convertirse a flotas' };
        }
        if (!isPort(unit.currentPosition)) {
          return { isValid: false, error: 'Ejércitos solo pueden convertirse en puertos' };
        }
      } else if (unit.type === 'garrison') {
        if (targetType !== 'army') {
          return { isValid: false, error: 'Guarniciones solo pueden convertirse a ejércitos' };
        }
      }
      return { isValid: true };

    default:
      return { isValid: false, error: 'Tipo de orden desconocido' };
  }
}
