/**
 * Utilidades para gestionar unidades: creación, reclutamiento, transferencias, etc.
 */

import { doc, Timestamp, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Unit, Game, Player } from '@/types/game'
import type { ArmyComposition, FleetComposition, GarrisonComposition } from '@/types/scenario'
import {
  UNIT_CREATION_COSTS,
  DEFAULT_UNIT_NAMES,
  EMPTY_ARMY_COMPOSITION,
  EMPTY_FLEET_COMPOSITION,
  EMPTY_GARRISON_COMPOSITION,
  ARMY_TROOP_COSTS,
  FLEET_SHIP_COSTS,
  GARRISON_TROOP_COSTS,
  TROOP_BATCH_SIZE,
  MINIMUM_GARRISON_MILITIA,
} from '@/data/recruitmentCosts'
import { calculateFleetCapacity, calculateEmbarkedTroopsCount } from '@/utils/embarkHelpers'

/**
 * Genera un ID único para una nueva unidad
 */
function generateUnitId(): string {
  return `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Valida que el jugador tiene fondos suficientes
 */
function validateFunds(currentTreasury: number, cost: number): void {
  if (currentTreasury < cost) {
    throw new Error(`Fondos insuficientes. Necesitas ${cost} ducados pero solo tienes ${currentTreasury}`)
  }
}

/**
 * Valida que una provincia es controlada por el jugador según el mapa del juego
 */
function validateProvinceOwnership(
  provinceId: string,
  playerFaction: string,
  game: Game
): void {
  const province = game.map.provinces[provinceId]

  if (!province) {
    throw new Error(`Provincia ${provinceId} no existe.`)
  }

  if (province.controlledBy !== playerFaction) {
    throw new Error(`No controlas esta provincia. Solo puedes crear unidades en provincias que controles.`)
  }
}

/**
 * Valida que una provincia es un puerto (para crear flotas)
 */
function validatePort(provinceId: string, gameMap: Record<string, any>): void {
  const province = gameMap[provinceId]
  if (!province || !province.isPort) {
    throw new Error(`Esta provincia no es un puerto. Las flotas solo pueden crearse en puertos.`)
  }
}

/**
 * Crea una nueva unidad vacía (ejército, flota o guarnición)
 */
export async function createUnit(
  gameId: string,
  playerId: string,
  provinceId: string,
  unitType: 'army' | 'fleet' | 'garrison',
  customName?: string
): Promise<void> {
  try {
    const gameRef = doc(db, 'games', gameId)
    const playerRef = doc(db, 'players', playerId)

    await runTransaction(db, async (transaction) => {
      // Leer datos dentro de la transacción
      const gameSnap = await transaction.get(gameRef)
      const playerSnap = await transaction.get(playerRef)

      if (!gameSnap.exists() || !playerSnap.exists()) {
        throw new Error('Partida o jugador no encontrado')
      }

      const gameData = gameSnap.data() as Game
      const player = playerSnap.data() as Player

      // Validaciones
      if (gameData.currentPhase !== 'orders') {
        throw new Error('Solo puedes crear unidades durante la fase de órdenes')
      }

      const cost = UNIT_CREATION_COSTS[unitType]
      validateFunds(player.treasury, cost)
      validateProvinceOwnership(provinceId, player.faction, gameData)

      if (unitType === 'fleet') {
        validatePort(provinceId, gameData.map.provinces)
      }

      // Crear la nueva unidad
      const newUnit: Unit = {
        id: generateUnitId(),
        type: unitType,
        owner: playerId,
        currentPosition: provinceId,
        status: 'active',
        siegeTurns: 0,
        createdAt: Timestamp.now(),
        name: customName || DEFAULT_UNIT_NAMES[unitType],
        composition:
          unitType === 'army'
            ? { name: customName || DEFAULT_UNIT_NAMES[unitType], troops: { ...EMPTY_ARMY_COMPOSITION } }
            : unitType === 'fleet'
            ? { name: customName || DEFAULT_UNIT_NAMES[unitType], ships: { ...EMPTY_FLEET_COMPOSITION } }
            : { name: customName || DEFAULT_UNIT_NAMES[unitType], troops: { ...EMPTY_GARRISON_COMPOSITION } },
      }

      const updatedUnits = [...(gameData.units || []), newUnit]

      // Escribir cambios de forma atómica
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: Timestamp.now(),
      })

      transaction.update(playerRef, {
        treasury: player.treasury - cost,
        lastSeen: Timestamp.now(),
      })
    })

    const unitLabel = unitType === 'army' ? 'Ejército' : unitType === 'fleet' ? 'Flota' : 'Guarnición'
    console.log(`✓ ${unitLabel} creado`)
  } catch (error) {
    console.error('Error al crear unidad:', error)
    throw error
  }
}

/**
 * Recluta tropas para una unidad existente
 */
export async function recruitTroops(
  gameId: string,
  playerId: string,
  unitId: string,
  troopType: string,
  quantity: number // Ya viene en múltiplos de TROOP_BATCH_SIZE (100)
): Promise<void> {
  try {
    const gameRef = doc(db, 'games', gameId)
    const playerRef = doc(db, 'players', playerId)

    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef)
      const playerSnap = await transaction.get(playerRef)

      if (!gameSnap.exists() || !playerSnap.exists()) {
        throw new Error('Partida o jugador no encontrado')
      }

      const game = gameSnap.data() as Game
      const player = playerSnap.data() as Player

      // Validaciones
      if (game.currentPhase !== 'orders') {
        throw new Error('Solo puedes reclutar tropas durante la fase de órdenes')
      }

      // Encontrar la unidad
      const units = game.units || []
      const unitIndex = units.findIndex((u) => u.id === unitId)
      if (unitIndex === -1) {
        throw new Error('Unidad no encontrada')
      }

      const unit = units[unitIndex]

      if (unit.owner !== playerId) {
        throw new Error('No puedes reclutar tropas para una unidad que no te pertenece')
      }

      // Calcular coste
      let costPerBatch = 0
      if (unit.type === 'army' && troopType in ARMY_TROOP_COSTS) {
        costPerBatch = ARMY_TROOP_COSTS[troopType as keyof typeof ARMY_TROOP_COSTS]
      } else if (unit.type === 'garrison' && troopType in GARRISON_TROOP_COSTS) {
        costPerBatch = GARRISON_TROOP_COSTS[troopType as keyof typeof GARRISON_TROOP_COSTS]
      } else {
        throw new Error(`Tipo de tropa inválido: ${troopType}`)
      }

      const batches = quantity / TROOP_BATCH_SIZE
      const totalCost = costPerBatch * batches

      validateFunds(player.treasury, totalCost)

      // Actualizar composición de la unidad
      const updatedUnits = [...units]
      const composition = unit.composition as ArmyComposition | GarrisonComposition

      if (!composition || !composition.troops) {
        throw new Error('La unidad no tiene una composición válida')
      }

      const currentAmount = composition.troops[troopType as keyof typeof composition.troops] || 0
      updatedUnits[unitIndex] = {
        ...unit,
        composition: {
          ...composition,
          troops: {
            ...composition.troops,
            [troopType]: currentAmount + quantity,
          },
        },
      }

      // Escribir cambios de forma atómica
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: Timestamp.now(),
      })

      transaction.update(playerRef, {
        treasury: player.treasury - totalCost,
        lastSeen: Timestamp.now(),
      })
    })

    console.log(`✓ Reclutadas ${quantity} ${troopType}`)
  } catch (error) {
    console.error('Error al reclutar tropas:', error)
    throw error
  }
}

/**
 * Recluta barcos para una flota
 */
export async function recruitShips(
  gameId: string,
  playerId: string,
  unitId: string,
  shipType: string,
  quantity: number // Ya viene en múltiplos de SHIP_BATCH_SIZE (1)
): Promise<void> {
  try {
    const gameRef = doc(db, 'games', gameId)
    const playerRef = doc(db, 'players', playerId)

    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef)
      const playerSnap = await transaction.get(playerRef)

      if (!gameSnap.exists() || !playerSnap.exists()) {
        throw new Error('Partida o jugador no encontrada')
      }

      const game = gameSnap.data() as Game
      const player = playerSnap.data() as Player

      // Validaciones
      if (game.currentPhase !== 'orders') {
        throw new Error('Solo puedes reclutar barcos durante la fase de órdenes')
      }

      // Encontrar la unidad
      const units = game.units || []
      const unitIndex = units.findIndex((u) => u.id === unitId)
      if (unitIndex === -1) {
        throw new Error('Unidad no encontrada')
      }

      const unit = units[unitIndex]

      if (unit.owner !== playerId) {
        throw new Error('No puedes reclutar barcos para una unidad que no te pertenece')
      }

      if (unit.type !== 'fleet') {
        throw new Error('Solo las flotas pueden reclutar barcos')
      }

      // Calcular coste
      if (!(shipType in FLEET_SHIP_COSTS)) {
        throw new Error(`Tipo de barco inválido: ${shipType}`)
      }

      const costPerShip = FLEET_SHIP_COSTS[shipType as keyof typeof FLEET_SHIP_COSTS]
      const totalCost = costPerShip * quantity

      validateFunds(player.treasury, totalCost)

      // Actualizar composición de la flota
      const updatedUnits = [...units]
      const composition = unit.composition as FleetComposition

      if (!composition || !composition.ships) {
        throw new Error('La flota no tiene una composición válida')
      }

      const currentAmount = composition.ships[shipType as keyof typeof composition.ships] || 0
      updatedUnits[unitIndex] = {
        ...unit,
        composition: {
          ...composition,
          ships: {
            ...composition.ships,
            [shipType]: currentAmount + quantity,
          },
        },
      }

      // Escribir cambios de forma atómica
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: Timestamp.now(),
      })

      transaction.update(playerRef, {
        treasury: player.treasury - totalCost,
        lastSeen: Timestamp.now(),
      })
    })

    console.log(`✓ Reclutados ${quantity} ${shipType}`)
  } catch (error) {
    console.error('Error al reclutar barcos:', error)
    throw error
  }
}

/**
 * Transfiere tropas/barcos entre unidades en la misma provincia
 */
export async function transferUnits(
  gameId: string,
  playerId: string,
  fromUnitId: string,
  toUnitId: string,
  transferType: string, // troopType o shipType
  quantity: number
): Promise<void> {
  try {
    const gameRef = doc(db, 'games', gameId)

    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef)

      if (!gameSnap.exists()) {
        throw new Error('Partida no encontrada')
      }

      const game = gameSnap.data() as Game

      // Validaciones
      if (game.currentPhase !== 'orders') {
        throw new Error('Solo puedes transferir tropas durante la fase de órdenes')
      }

      // Encontrar ambas unidades
      const units = game.units || []
      const fromIndex = units.findIndex((u) => u.id === fromUnitId)
      const toIndex = units.findIndex((u) => u.id === toUnitId)

      if (fromIndex === -1 || toIndex === -1) {
        throw new Error('Una o ambas unidades no fueron encontradas')
      }

      const fromUnit = units[fromIndex]
      const toUnit = units[toIndex]

      // Validaciones
      if (fromUnit.owner !== playerId || toUnit.owner !== playerId) {
        throw new Error('Solo puedes transferir entre tus propias unidades')
      }

      if (fromUnit.currentPosition !== toUnit.currentPosition) {
        throw new Error('Las unidades deben estar en la misma provincia para transferir tropas')
      }

      if (fromUnit.type !== toUnit.type && !(
        (fromUnit.type === 'army' && toUnit.type === 'garrison') ||
        (fromUnit.type === 'garrison' && toUnit.type === 'army')
      )) {
        throw new Error('Solo puedes transferir tropas entre unidades del mismo tipo o entre ejército y guarnición')
      }

      // Realizar transferencia
      const updatedUnits = [...units]

      if (fromUnit.type === 'fleet' && toUnit.type === 'fleet') {
        // Transferir barcos
        const fromComp = fromUnit.composition as FleetComposition
        const toComp = toUnit.composition as FleetComposition

        if (!fromComp?.ships || !toComp?.ships) {
          throw new Error('Composición inválida')
        }

        const currentAmount = fromComp.ships[transferType as keyof typeof fromComp.ships] || 0
        if (currentAmount < quantity) {
          throw new Error(`No tienes suficientes ${transferType} para transferir`)
        }

        updatedUnits[fromIndex] = {
          ...fromUnit,
          composition: {
            ...fromComp,
            ships: {
              ...fromComp.ships,
              [transferType]: currentAmount - quantity,
            },
          },
        }

        const toCurrentAmount = toComp.ships[transferType as keyof typeof toComp.ships] || 0
        updatedUnits[toIndex] = {
          ...toUnit,
          composition: {
            ...toComp,
            ships: {
              ...toComp.ships,
              [transferType]: toCurrentAmount + quantity,
            },
          },
        }
      } else {
        // Transferir tropas (entre army/garrison)
        const fromComp = fromUnit.composition as ArmyComposition | GarrisonComposition
        const toComp = toUnit.composition as ArmyComposition | GarrisonComposition

        if (!fromComp?.troops || !toComp?.troops) {
          throw new Error('Composición inválida')
        }

        const currentAmount = fromComp.troops[transferType as keyof typeof fromComp.troops] || 0
        if (currentAmount < quantity) {
          throw new Error(`No tienes suficientes ${transferType} para transferir`)
        }

        // Validación especial: guarnición debe mantener al menos 200 milicias
        if (fromUnit.type === 'garrison' && transferType === 'militia') {
          if (currentAmount - quantity < MINIMUM_GARRISON_MILITIA) {
            throw new Error(`La guarnición debe mantener al menos ${MINIMUM_GARRISON_MILITIA} milicias`)
          }
        }

        // Validación: no transferir caballería a guarnición
        if (toUnit.type === 'garrison' && (transferType === 'lightCavalry' || transferType === 'heavyCavalry')) {
          throw new Error('Las guarniciones no pueden tener caballería')
        }

        updatedUnits[fromIndex] = {
          ...fromUnit,
          composition: {
            ...fromComp,
            troops: {
              ...fromComp.troops,
              [transferType]: currentAmount - quantity,
            },
          },
        }

        const toCurrentAmount = toComp.troops[transferType as keyof typeof toComp.troops] || 0
        updatedUnits[toIndex] = {
          ...toUnit,
          composition: {
            ...toComp,
            troops: {
              ...toComp.troops,
              [transferType]: toCurrentAmount + quantity,
            },
          },
        }
      }

      // Escribir cambios de forma atómica
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: Timestamp.now(),
      })
    })

    console.log(`✓ Transferidos ${quantity} ${transferType}`)
  } catch (error) {
    console.error('Error al transferir unidades:', error)
    throw error
  }
}

/**
 * Licencia/disuelve tropas de una unidad (sin reembolso)
 */
export async function disbandTroops(
  gameId: string,
  playerId: string,
  unitId: string,
  troopOrShipType: string,
  quantity: number
): Promise<void> {
  try {
    const gameRef = doc(db, 'games', gameId)

    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef)

      if (!gameSnap.exists()) {
        throw new Error('Partida no encontrada')
      }

      const game = gameSnap.data() as Game

      // Validaciones
      if (game.currentPhase !== 'orders') {
        throw new Error('Solo puedes licenciar tropas durante la fase de órdenes')
      }

      // Encontrar la unidad
      const units = game.units || []
      const unitIndex = units.findIndex((u) => u.id === unitId)
      if (unitIndex === -1) {
        throw new Error('Unidad no encontrada')
      }

      const unit = units[unitIndex]

      if (unit.owner !== playerId) {
        throw new Error('No puedes licenciar tropas de una unidad que no te pertenece')
      }

      // Actualizar composición
      const updatedUnits = [...units]

      if (unit.type === 'fleet') {
        const composition = unit.composition as FleetComposition
        if (!composition?.ships) {
          throw new Error('Composición inválida')
        }

        const currentAmount = composition.ships[troopOrShipType as keyof typeof composition.ships] || 0
        if (currentAmount < quantity) {
          throw new Error(`No tienes suficientes ${troopOrShipType} para licenciar`)
        }

        updatedUnits[unitIndex] = {
          ...unit,
          composition: {
            ...composition,
            ships: {
              ...composition.ships,
              [troopOrShipType]: currentAmount - quantity,
            },
          },
        }
      } else {
        const composition = unit.composition as ArmyComposition | GarrisonComposition
        if (!composition?.troops) {
          throw new Error('Composición inválida')
        }

        const currentAmount = composition.troops[troopOrShipType as keyof typeof composition.troops] || 0
        if (currentAmount < quantity) {
          throw new Error(`No tienes suficientes ${troopOrShipType} para licenciar`)
        }

        // Validación especial: guarnición debe mantener al menos 200 milicias
        if (unit.type === 'garrison' && troopOrShipType === 'militia') {
          if (currentAmount - quantity < MINIMUM_GARRISON_MILITIA) {
            throw new Error(`La guarnición debe mantener al menos ${MINIMUM_GARRISON_MILITIA} milicias`)
          }
        }

        updatedUnits[unitIndex] = {
          ...unit,
          composition: {
            ...composition,
            troops: {
              ...composition.troops,
              [troopOrShipType]: currentAmount - quantity,
            },
          },
        }
      }

      // Escribir cambios de forma atómica
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: Timestamp.now(),
      })
    })

    console.log(`✓ Licenciados ${quantity} ${troopOrShipType} (sin reembolso)`)
  } catch (error) {
    console.error('Error al licenciar tropas:', error)
    throw error
  }
}

/**
 * Renombra una unidad
 */
export async function renameUnit(
  gameId: string,
  playerId: string,
  unitId: string,
  newName: string
): Promise<void> {
  try {
    if (!newName || newName.trim().length === 0) {
      throw new Error('El nombre no puede estar vacío')
    }

    if (newName.length > 50) {
      throw new Error('El nombre no puede tener más de 50 caracteres')
    }

    const gameRef = doc(db, 'games', gameId)

    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef)

      if (!gameSnap.exists()) {
        throw new Error('Partida no encontrada')
      }

      const game = gameSnap.data() as Game

      // Validaciones
      if (game.currentPhase !== 'orders') {
        throw new Error('Solo puedes renombrar unidades durante la fase de órdenes')
      }

      // Encontrar la unidad
      const units = game.units || []
      const unitIndex = units.findIndex((u) => u.id === unitId)
      if (unitIndex === -1) {
        throw new Error('Unidad no encontrada')
      }

      const unit = units[unitIndex]

      if (unit.owner !== playerId) {
        throw new Error('No puedes renombrar una unidad que no te pertenece')
      }

      // Actualizar nombre
      const updatedUnits = [...units]
      updatedUnits[unitIndex] = {
        ...unit,
        name: newName.trim(),
        composition: unit.composition
          ? { ...unit.composition, name: newName.trim() }
          : undefined,
      }

      // Escribir cambios de forma atómica
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: Timestamp.now(),
      })
    })

    console.log(`✓ Unidad renombrada a: ${newName}`)
  } catch (error) {
    console.error('Error al renombrar unidad:', error)
    throw error
  }
}

/**
 * Embarca tropas de un ejército a una flota
 * @param gameId - ID de la partida
 * @param playerId - ID del jugador
 * @param fleetId - ID de la flota
 * @param armyId - ID del ejército origen
 * @param troopsToEmbark - Tropas a embarcar por tipo
 */
export async function embarkTroops(
  gameId: string,
  playerId: string,
  fleetId: string,
  armyId: string,
  troopsToEmbark: Partial<Record<import('@/types/scenario').ArmyTroopType, number>>
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      // Obtener datos del juego
      const gameRef = doc(db, 'games', gameId)
      const gameSnap = await transaction.get(gameRef)

      if (!gameSnap.exists()) {
        throw new Error('Partida no encontrada')
      }

      const game = gameSnap.data() as Game
      const units = game.units || []

      // Encontrar flota y ejército
      const fleet = units.find(u => u.id === fleetId)
      const army = units.find(u => u.id === armyId)

      if (!fleet || fleet.type !== 'fleet') {
        throw new Error('Flota no encontrada')
      }

      if (!army || army.type !== 'army') {
        throw new Error('Ejército no encontrado')
      }

      // Validar pertenencia
      if (fleet.owner !== playerId || army.owner !== playerId) {
        throw new Error('No puedes embarcar tropas de unidades que no te pertenecen')
      }

      // Validar misma provincia
      if (fleet.currentPosition !== army.currentPosition) {
        throw new Error('La flota y el ejército deben estar en la misma provincia')
      }

      // Validar composición
      if (!fleet.composition || !army.composition) {
        throw new Error('Unidades sin composición válida')
      }

      const armyComp = army.composition as ArmyComposition

      // Validar tropas disponibles y actualizar ejército
      const updatedArmyTroops = { ...armyComp.troops }
      let totalTroopsToEmbark = 0

      for (const [troopType, count] of Object.entries(troopsToEmbark)) {
        const available = updatedArmyTroops[troopType as keyof typeof updatedArmyTroops] || 0
        if ((count || 0) > available) {
          throw new Error(`Tropas insuficientes de tipo ${troopType}`)
        }
        updatedArmyTroops[troopType as keyof typeof updatedArmyTroops] -= (count || 0)
        totalTroopsToEmbark += (count || 0)
      }

      // Validar capacidad de la flota
      const fleetComp = fleet.composition as FleetComposition
      const totalCapacity = calculateFleetCapacity(fleetComp)
      const currentEmbarked = fleet.embarkedTroops
        ? calculateEmbarkedTroopsCount(fleet.embarkedTroops.troops)
        : 0

      if (currentEmbarked + totalTroopsToEmbark > totalCapacity) {
        throw new Error('Capacidad de la flota excedida')
      }

      // Actualizar tropas embarcadas en la flota
      const currentEmbarkedTroops = fleet.embarkedTroops?.troops || {}
      const updatedEmbarkedTroops: Partial<Record<import('@/types/scenario').ArmyTroopType, number>> = { ...currentEmbarkedTroops }

      for (const [troopType, count] of Object.entries(troopsToEmbark)) {
        const current = updatedEmbarkedTroops[troopType as import('@/types/scenario').ArmyTroopType] || 0
        updatedEmbarkedTroops[troopType as import('@/types/scenario').ArmyTroopType] = current + (count || 0)
      }

      // Verificar si el ejército queda vacío
      const totalRemainingTroops = Object.values(updatedArmyTroops).reduce((sum, n) => sum + n, 0)
      const shouldDeleteArmy = totalRemainingTroops === 0

      // Actualizar unidades
      const updatedUnits = units.map(u => {
        if (u.id === fleetId) {
          return {
            ...u,
            embarkedTroops: {
              troops: updatedEmbarkedTroops,
              sourceUnitId: armyId
            }
          }
        }
        if (u.id === armyId) {
          if (shouldDeleteArmy) {
            return null // Marcar para eliminación
          }
          return {
            ...u,
            composition: {
              ...armyComp,
              troops: updatedArmyTroops
            }
          }
        }
        return u
      }).filter(u => u !== null) // Eliminar unidades marcadas

      // Guardar cambios
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: Timestamp.now()
      })
    })

    console.log('✓ Tropas embarcadas exitosamente')
  } catch (error) {
    console.error('Error al embarcar tropas:', error)
    throw error
  }
}

/**
 * Desembarca tropas de una flota
 * @param gameId - ID de la partida
 * @param playerId - ID del jugador
 * @param fleetId - ID de la flota
 * @param targetArmyId - ID del ejército destino (null para crear nuevo)
 * @param troopsToDisembark - Tropas a desembarcar por tipo
 * @param newArmyName - Nombre del nuevo ejército (solo si targetArmyId es null)
 */
export async function disembarkTroops(
  gameId: string,
  playerId: string,
  fleetId: string,
  targetArmyId: string | null,
  troopsToDisembark: Partial<Record<import('@/types/scenario').ArmyTroopType, number>>,
  newArmyName?: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      // Obtener datos del juego
      const gameRef = doc(db, 'games', gameId)
      const gameSnap = await transaction.get(gameRef)

      if (!gameSnap.exists()) {
        throw new Error('Partida no encontrada')
      }

      const game = gameSnap.data() as Game
      const units = game.units || []

      // Encontrar flota
      const fleet = units.find(u => u.id === fleetId)

      if (!fleet || fleet.type !== 'fleet') {
        throw new Error('Flota no encontrada')
      }

      if (fleet.owner !== playerId) {
        throw new Error('No puedes desembarcar de una flota que no te pertenece')
      }

      if (!fleet.embarkedTroops) {
        throw new Error('La flota no tiene tropas embarcadas')
      }

      // Validar tropas embarcadas disponibles
      const embarkedTroops = { ...fleet.embarkedTroops.troops }

      for (const [troopType, count] of Object.entries(troopsToDisembark)) {
        const troopKey = troopType as import('@/types/scenario').ArmyTroopType
        const available = embarkedTroops[troopKey] || 0
        if ((count || 0) > available) {
          throw new Error(`Tropas embarcadas insuficientes de tipo ${troopType}`)
        }
        const currentValue = embarkedTroops[troopKey]
        if (currentValue !== undefined) {
          embarkedTroops[troopKey] = currentValue - (count || 0)
        }
      }

      // Verificar si quedan tropas embarcadas
      const totalRemainingEmbarked = Object.values(embarkedTroops).reduce((sum, n) => sum + (n || 0), 0)

      let updatedUnits: (Unit | null)[]

      if (targetArmyId) {
        // Desembarcar a ejército existente
        const targetArmy = units.find(u => u.id === targetArmyId)

        if (!targetArmy || targetArmy.type !== 'army') {
          throw new Error('Ejército destino no encontrado')
        }

        if (targetArmy.owner !== playerId) {
          throw new Error('No puedes desembarcar a un ejército que no te pertenece')
        }

        if (targetArmy.currentPosition !== fleet.currentPosition) {
          throw new Error('El ejército destino debe estar en la misma provincia que la flota')
        }

        const targetComp = targetArmy.composition as ArmyComposition
        const updatedTargetTroops = { ...targetComp.troops }

        for (const [troopType, count] of Object.entries(troopsToDisembark)) {
          const current = updatedTargetTroops[troopType as import('@/types/scenario').ArmyTroopType] || 0
          updatedTargetTroops[troopType as import('@/types/scenario').ArmyTroopType] = current + (count || 0)
        }

        updatedUnits = units.map(u => {
          if (u.id === fleetId) {
            // Omitir embarkedTroops completamente si no quedan tropas
            const fleetUpdate: any = { ...u }
            if (totalRemainingEmbarked > 0) {
              fleetUpdate.embarkedTroops = {
                troops: embarkedTroops,
                sourceUnitId: fleet.embarkedTroops?.sourceUnitId
              }
            } else {
              delete fleetUpdate.embarkedTroops
            }
            return fleetUpdate
          }
          if (u.id === targetArmyId) {
            return {
              ...u,
              composition: {
                ...targetComp,
                troops: updatedTargetTroops
              }
            }
          }
          return u
        })
      } else {
        // Crear nuevo ejército
        const newArmy: Unit = {
          id: generateUnitId(),
          type: 'army',
          owner: playerId,
          currentPosition: fleet.currentPosition,
          status: 'active',
          siegeTurns: 0,
          createdAt: Timestamp.now(),
          name: newArmyName || `Ejército desembarcado`,
          composition: {
            name: newArmyName || `Ejército desembarcado`,
            troops: {
              militia: troopsToDisembark.militia ?? 0,
              lancers: troopsToDisembark.lancers ?? 0,
              pikemen: troopsToDisembark.pikemen ?? 0,
              archers: troopsToDisembark.archers ?? 0,
              crossbowmen: troopsToDisembark.crossbowmen ?? 0,
              lightCavalry: troopsToDisembark.lightCavalry ?? 0,
              heavyCavalry: troopsToDisembark.heavyCavalry ?? 0,
            }
          }
        }

        updatedUnits = [
          ...units.map(u => {
            if (u.id === fleetId) {
              // Omitir embarkedTroops completamente si no quedan tropas
              const fleetUpdate: any = { ...u }
              if (totalRemainingEmbarked > 0) {
                fleetUpdate.embarkedTroops = {
                  troops: embarkedTroops,
                  sourceUnitId: fleet.embarkedTroops?.sourceUnitId
                }
              } else {
                delete fleetUpdate.embarkedTroops
              }
              return fleetUpdate
            }
            return u
          }),
          newArmy
        ]
      }

      // Guardar cambios
      transaction.update(gameRef, {
        units: updatedUnits,
        updatedAt: Timestamp.now()
      })
    })

    console.log('✓ Tropas desembarcadas exitosamente')
  } catch (error) {
    console.error('Error al desembarcar tropas:', error)
    throw error
  }
}
