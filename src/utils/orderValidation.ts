import { Order, Unit } from '@/types'
import { GameMap } from '@/types/game'
import {
  areAdjacentProvinces,
  isPort,
  isLand,
  isSea,
  getValidAdjacentProvinces,
  getProvinceInfo
} from '@/utils/gameMapHelpers'

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Valida una orden militar dada a una unidad
 *
 * Esta función verifica la legalidad de una orden según el tipo de acción,
 * la unidad que la ejecuta, y el contexto del juego. Es utilizada tanto
 * en el cliente (para feedback instantáneo) como en el servidor (validación definitiva).
 *
 * @param map - Mapa del juego con provincias y adyacencias
 * @param order - Orden a validar
 * @param unit - Unidad que ejecuta la orden
 * @param allUnits - Todas las unidades del juego (para apoyos y convoys)
 * @returns Resultado de validación con isValid y error opcional
 *
 * @example
 * ```typescript
 * const result = validateOrder(game.map, order, unit, allUnits)
 * if (!result.isValid) {
 *   console.error(`Orden inválida: ${result.error}`)
 * }
 * ```
 */
export const validateOrder = (
  map: GameMap,
  order: Order,
  unit: Unit,
  allUnits: Unit[]
): ValidationResult => {
  // Validar según el tipo de orden
  switch (order.action) {
    case 'hold':
      return validateHoldOrder()

    case 'move':
      return validateMoveOrder(map, order, unit)

    case 'support':
      return validateSupportOrder(map, order, unit, allUnits)

    case 'convoy':
      return validateConvoyOrder(map, order, unit, allUnits)

    case 'besiege':
      return validateBesiegeOrder(map, order, unit)

    case 'convert':
      return validateConvertOrder(map, order, unit)

    default:
      return { isValid: false, error: 'Tipo de orden desconocido' }
  }
}

/**
 * Valida orden de Mantener (Hold)
 *
 * La orden "Mantener" siempre es válida - la unidad permanece en su posición
 * defendiendo con fuerza 1 + apoyos recibidos.
 *
 * @returns Siempre retorna { isValid: true }
 */
const validateHoldOrder = (): ValidationResult => {
  // Hold siempre es válido
  return { isValid: true }
}

/**
 * Valida orden de Avanzar (Move)
 *
 * Verifica que:
 * - La unidad no sea una guarnición (garrisons no pueden moverse)
 * - La provincia destino sea adyacente
 * - El tipo de terreno sea compatible (armies → tierra/puertos, fleets → mar/puertos)
 *
 * @param map - Mapa del juego
 * @param order - Orden con targetProvince especificada
 * @param unit - Unidad que se moverá
 * @returns Resultado de validación
 */
const validateMoveOrder = (map: GameMap, order: Order, unit: Unit): ValidationResult => {
  if (!order.targetProvince) {
    return { isValid: false, error: 'Debe especificar provincia destino' }
  }

  // Las guarniciones no pueden moverse
  if (unit.type === 'garrison') {
    return { isValid: false, error: 'Las guarniciones no pueden moverse' }
  }

  // Verificar que el destino sea adyacente
  if (!areAdjacentProvinces(map, unit.currentPosition, order.targetProvince)) {
    return { isValid: false, error: 'Provincia no es adyacente' }
  }

  // Verificar tipo de terreno según unidad
  if (unit.type === 'army') {
    if (!isLand(map, order.targetProvince) && !isPort(map, order.targetProvince)) {
      return { isValid: false, error: 'Ejércitos solo pueden moverse a tierra o puertos' }
    }
  }

  if (unit.type === 'fleet') {
    if (!isSea(map, order.targetProvince) && !isPort(map, order.targetProvince)) {
      return { isValid: false, error: 'Flotas solo pueden moverse al mar o puertos' }
    }
  }

  return { isValid: true }
}

/**
 * Valida orden de Apoyar (Support)
 *
 * Verifica que:
 * - Se haya especificado una unidad a apoyar
 * - La unidad a apoyar exista
 * - La provincia de la unidad apoyada sea adyacente a la unidad que apoya
 *
 * Nota: No valida si el apoyo es ofensivo/defensivo (requiere conocer órdenes de otras unidades)
 *
 * @param map - Mapa del juego
 * @param order - Orden con supportedUnit especificada
 * @param unit - Unidad que apoya
 * @param allUnits - Todas las unidades del juego
 * @returns Resultado de validación
 */
const validateSupportOrder = (
  map: GameMap,
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
  if (!areAdjacentProvinces(map, unit.currentPosition, supportedUnit.currentPosition)) {
    return { isValid: false, error: 'No puedes apoyar esa provincia (no es adyacente)' }
  }

  // TODO: Validar según el tipo de apoyo (ofensivo/defensivo)
  // Esto requiere conocer las órdenes de otras unidades

  return { isValid: true }
}

/**
 * Valida orden de Convoy (Transport)
 *
 * Verifica que:
 * - Solo flotas pueden transportar
 * - La flota esté en zona marítima
 * - Se haya especificado un ejército a transportar
 * - El ejército exista y sea de tipo 'army'
 *
 * Nota: No valida la ruta completa del convoy (requiere órdenes de otras flotas)
 *
 * @param map - Mapa del juego
 * @param order - Orden con supportedUnit especificada (unitId del ejército)
 * @param unit - Flota que transporta
 * @param allUnits - Todas las unidades del juego
 * @returns Resultado de validación
 */
const validateConvoyOrder = (
  map: GameMap,
  order: Order,
  unit: Unit,
  allUnits: Unit[]
): ValidationResult => {
  // Solo flotas pueden hacer convoy
  if (unit.type !== 'fleet') {
    return { isValid: false, error: 'Solo las flotas pueden transportar' }
  }

  // La flota debe estar en zona marítima
  if (!isSea(map, unit.currentPosition)) {
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
 * Valida orden de Asediar (Siege)
 *
 * Verifica que:
 * - La unidad no sea una guarnición (garrisons no pueden asediar)
 * - Se haya especificado una ciudad objetivo
 * - La unidad esté en la provincia de la ciudad
 * - La provincia tenga una ciudad
 *
 * Nota: No valida ownership de la ciudad (requiere información del servidor)
 *
 * @param map - Mapa del juego
 * @param order - Orden con targetProvince especificada
 * @param unit - Unidad que asedia
 * @returns Resultado de validación
 */
const validateBesiegeOrder = (map: GameMap, order: Order, unit: Unit): ValidationResult => {
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
  const provinceInfo = getProvinceInfo(map, order.targetProvince)
  if (!provinceInfo?.hasCity) {
    return { isValid: false, error: 'La provincia no tiene ciudad para asediar' }
  }

  // TODO: Validar que la ciudad no sea del jugador
  // Esto requiere información del propietario de la ciudad

  return { isValid: true }
}

/**
 * Valida orden de Convertirse (Convert)
 *
 * Verifica que:
 * - Fleet ↔ Army: Solo en puertos
 * - Garrison → Army: En cualquier ciudad
 *
 * Conversiones permitidas:
 * - Fleet → Army (en puerto)
 * - Army → Fleet (en puerto)
 * - Garrison → Army (en cualquier ciudad)
 *
 * @param map - Mapa del juego
 * @param order - Orden con targetProvince reutilizada para tipo destino
 * @param unit - Unidad que se convierte
 * @returns Resultado de validación
 */
const validateConvertOrder = (map: GameMap, order: Order, unit: Unit): ValidationResult => {
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
    if (!isPort(map, unit.currentPosition)) {
      return { isValid: false, error: 'Flotas solo pueden convertirse en puertos' }
    }
  }

  if (unit.type === 'army') {
    if (targetType !== 'fleet') {
      return { isValid: false, error: 'Ejércitos solo pueden convertirse a flotas' }
    }
    // Debe estar en un puerto
    if (!isPort(map, unit.currentPosition)) {
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
 * Obtiene provincias válidas como destino para una orden de movimiento
 *
 * Filtra provincias adyacentes según el tipo de unidad:
 * - Army: Solo tierra y puertos
 * - Fleet: Solo mar y puertos
 * - Garrison: Vacío (no se mueven)
 *
 * @param map - Mapa del juego
 * @param unit - Unidad a mover
 * @returns Array de IDs de provincias válidas como destino
 */
export const getValidMoveDestinations = (map: GameMap, unit: Unit): string[] => {
  return getValidAdjacentProvinces(map, unit.currentPosition, unit.type)
}

/**
 * Obtiene unidades válidas para apoyar
 *
 * Filtra unidades que:
 * - No sean la unidad misma
 * - Estén en provincia adyacente a la unidad que apoya
 *
 * @param map - Mapa del juego
 * @param unit - Unidad que apoyará
 * @param allUnits - Todas las unidades del juego
 * @returns Array de unidades que pueden ser apoyadas
 */
export const getValidSupportTargets = (
  map: GameMap,
  unit: Unit,
  allUnits: Unit[]
): Unit[] => {
  return allUnits.filter(u => {
    // No puede apoyarse a sí mismo
    if (u.id === unit.id) return false

    // Debe poder alcanzar la provincia de la unidad
    return areAdjacentProvinces(map, unit.currentPosition, u.currentPosition)
  })
}
