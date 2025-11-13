import { Order, Unit } from '@/types'
import {
  isAdjacent,
  isPort,
  isLand,
  isSea,
  getValidDestinations,
  getProvinceInfo
} from '@/data/provinceData'

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Valida una orden dada a una unidad
 */
export const validateOrder = (
  order: Order,
  unit: Unit,
  allUnits: Unit[]
): ValidationResult => {
  // Validar según el tipo de orden
  switch (order.action) {
    case 'hold':
      return validateHoldOrder()

    case 'move':
      return validateMoveOrder(order, unit)

    case 'support':
      return validateSupportOrder(order, unit, allUnits)

    case 'convoy':
      return validateConvoyOrder(order, unit, allUnits)

    case 'besiege':
      return validateBesiegeOrder(order, unit)

    case 'convert':
      return validateConvertOrder(order, unit)

    default:
      return { isValid: false, error: 'Tipo de orden desconocido' }
  }
}

/**
 * Validar orden de Mantener (Hold)
 */
const validateHoldOrder = (): ValidationResult => {
  // Hold siempre es válido
  return { isValid: true }
}

/**
 * Validar orden de Avanzar (Move)
 */
const validateMoveOrder = (order: Order, unit: Unit): ValidationResult => {
  if (!order.targetProvince) {
    return { isValid: false, error: 'Debe especificar provincia destino' }
  }

  // Las guarniciones no pueden moverse
  if (unit.type === 'garrison') {
    return { isValid: false, error: 'Las guarniciones no pueden moverse' }
  }

  // Verificar que el destino sea adyacente
  if (!isAdjacent(unit.currentPosition, order.targetProvince)) {
    return { isValid: false, error: 'Provincia no es adyacente' }
  }

  // Verificar tipo de terreno según unidad
  if (unit.type === 'army') {
    if (!isLand(order.targetProvince)) {
      return { isValid: false, error: 'Ejércitos solo pueden moverse a tierra' }
    }
  }

  if (unit.type === 'fleet') {
    if (!isSea(order.targetProvince) && !isPort(order.targetProvince)) {
      return { isValid: false, error: 'Flotas solo pueden moverse al mar o puertos' }
    }
  }

  return { isValid: true }
}

/**
 * Validar orden de Apoyar (Support)
 */
const validateSupportOrder = (
  order: Order,
  unit: Unit,
  allUnits: Unit[]
): ValidationResult => {
  if (!order.supportedUnit) {
    return { isValid: false, error: 'Debe especificar unidad a apoyar' }
  }

  // Buscar la unidad a apoyar
  const supportedUnit = allUnits.find(u => u.id === order.supportedUnit)
  if (!supportedUnit) {
    return { isValid: false, error: 'Unidad a apoyar no encontrada' }
  }

  // La unidad que apoya debe poder alcanzar la provincia de la unidad apoyada
  if (!isAdjacent(unit.currentPosition, supportedUnit.currentPosition)) {
    return { isValid: false, error: 'No puedes apoyar esa provincia (no es adyacente)' }
  }

  // TODO: Validar según el tipo de apoyo (ofensivo/defensivo)
  // Esto requiere conocer las órdenes de otras unidades

  return { isValid: true }
}

/**
 * Validar orden de Convoy (Transport)
 */
const validateConvoyOrder = (
  order: Order,
  unit: Unit,
  allUnits: Unit[]
): ValidationResult => {
  // Solo flotas pueden hacer convoy
  if (unit.type !== 'fleet') {
    return { isValid: false, error: 'Solo las flotas pueden transportar' }
  }

  // La flota debe estar en zona marítima
  if (!isSea(unit.currentPosition)) {
    return { isValid: false, error: 'La flota debe estar en el mar para transportar' }
  }

  if (!order.supportedUnit) {
    return { isValid: false, error: 'Debe especificar ejército a transportar' }
  }

  // Buscar el ejército a transportar
  const armyToConvoy = allUnits.find(u => u.id === order.supportedUnit)
  if (!armyToConvoy) {
    return { isValid: false, error: 'Ejército a transportar no encontrado' }
  }

  if (armyToConvoy.type !== 'army') {
    return { isValid: false, error: 'Solo se pueden transportar ejércitos' }
  }

  // TODO: Validar ruta de convoy completa
  // Esto requiere conocer las órdenes de otras flotas

  return { isValid: true }
}

/**
 * Validar orden de Asediar (Siege)
 */
const validateBesiegeOrder = (order: Order, unit: Unit): ValidationResult => {
  // Las guarniciones no pueden asediar
  if (unit.type === 'garrison') {
    return { isValid: false, error: 'Las guarniciones no pueden asediar' }
  }

  if (!order.targetProvince) {
    return { isValid: false, error: 'Debe especificar ciudad a asediar' }
  }

  // La unidad debe estar en la provincia de la ciudad
  if (unit.currentPosition !== order.targetProvince) {
    return { isValid: false, error: 'Debes estar en la provincia de la ciudad para asediarla' }
  }

  // Verificar que la provincia tenga una ciudad
  const provinceInfo = getProvinceInfo(order.targetProvince)
  if (!provinceInfo?.hasCity) {
    return { isValid: false, error: 'La provincia no tiene ciudad para asediar' }
  }

  // TODO: Validar que la ciudad no sea del jugador
  // Esto requiere información del propietario de la ciudad

  return { isValid: true }
}

/**
 * Validar orden de Convertirse (Convert)
 */
const validateConvertOrder = (order: Order, unit: Unit): ValidationResult => {
  if (!order.targetProvince) {
    return { isValid: false, error: 'Debe especificar tipo de unidad destino' }
  }

  const targetType = order.targetProvince // Reutilizamos este campo para el tipo destino

  // Validar conversiones permitidas
  if (unit.type === 'fleet') {
    if (targetType !== 'army') {
      return { isValid: false, error: 'Flotas solo pueden convertirse a ejércitos' }
    }
    // Debe estar en un puerto
    if (!isPort(unit.currentPosition)) {
      return { isValid: false, error: 'Flotas solo pueden convertirse en puertos' }
    }
  }

  if (unit.type === 'army') {
    if (targetType !== 'fleet') {
      return { isValid: false, error: 'Ejércitos solo pueden convertirse a flotas' }
    }
    // Debe estar en un puerto
    if (!isPort(unit.currentPosition)) {
      return { isValid: false, error: 'Ejércitos solo pueden convertirse en puertos' }
    }
  }

  if (unit.type === 'garrison') {
    if (targetType !== 'army') {
      return { isValid: false, error: 'Guarniciones solo pueden convertirse a ejércitos' }
    }
    // Las guarniciones pueden convertirse en cualquier ciudad
  }

  return { isValid: true }
}

/**
 * Obtener provincias válidas como destino para una orden de movimiento
 */
export const getValidMoveDestinations = (unit: Unit): string[] => {
  return getValidDestinations(unit.currentPosition, unit.type)
}

/**
 * Obtener unidades válidas para apoyar
 */
export const getValidSupportTargets = (
  unit: Unit,
  allUnits: Unit[]
): Unit[] => {
  return allUnits.filter(u => {
    // No puede apoyarse a sí mismo
    if (u.id === unit.id) return false

    // Debe poder alcanzar la provincia de la unidad
    return isAdjacent(unit.currentPosition, u.currentPosition)
  })
}
