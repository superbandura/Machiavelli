/**
 * PASO 2: Procesamiento Económico y Gastos Especiales
 *
 * Sub-pasos:
 * 2A: Transferencias entre jugadores (con snapshot)
 * 2B: Asesinatos
 * 2C: Sobornos de unidades
 * 2D: Otros gastos especiales (mitigación hambre, reclutamiento)
 */

import { ResolutionContext, Unit } from '../types';
import { PROVINCE_INFO } from '../data/provinceData';

/**
 * Procesar ingresos y mantenimiento (solo Primavera)
 */
async function processMaintenanceAndIncome(context: ResolutionContext): Promise<void> {
  console.log('=== MAINTENANCE AND INCOME (Spring) ===');

  for (const player of context.players) {
    // PASO 1: Calcular ingresos de ciudades controladas
    const controlledCities = context.units
      .filter(u => u.type === 'garrison' && u.owner === player.id)
      .map(u => u.currentPosition)
      .filter(provinceId => PROVINCE_INFO[provinceId]?.hasCity);

    const income = controlledCities.length * 3; // 3 ducados por ciudad

    player.treasury = (player.treasury || 0) + income;

    console.log(`${player.faction}: ${controlledCities.length} cities = +${income}d`);

    context.events.push({
      type: 'income',
      playerId: player.id,
      faction: player.faction,
      cities: controlledCities.length,
      amount: income,
      message: `💰 ${player.faction} recibe ${income}d de ${controlledCities.length} ciudades`
    });

    // PASO 2: Calcular y cobrar mantenimiento
    const playerUnits = context.units.filter(u => u.owner === player.id);

    let maintenanceCost = 0;
    playerUnits.forEach(unit => {
      if (unit.type === 'army' || unit.type === 'fleet') {
        maintenanceCost += 1;
      } else if (unit.type === 'garrison') {
        maintenanceCost += 0.5;
      }
    });

    maintenanceCost = Math.ceil(maintenanceCost); // Redondear hacia arriba

    console.log(`${player.faction}: ${playerUnits.length} units = -${maintenanceCost}d maintenance`);

    player.treasury -= maintenanceCost;

    context.events.push({
      type: 'maintenance',
      playerId: player.id,
      faction: player.faction,
      units: playerUnits.length,
      cost: maintenanceCost,
      message: `💸 ${player.faction} paga ${maintenanceCost}d de mantenimiento (${playerUnits.length} unidades)`
    });

    // PASO 3: Licenciar tropas si no hay fondos
    if (player.treasury < 0) {
      console.log(`${player.faction} has negative treasury: ${player.treasury}d - disbanding units`);

      const deficit = Math.abs(player.treasury);
      const unitsToDisband = Math.ceil(deficit); // Cada unidad vale ~1d de mantenimiento

      // Prioridad de licenciamiento: ejércitos/flotas primero, guarniciones después
      const armiesAndFleets = playerUnits.filter(u => u.type === 'army' || u.type === 'fleet');
      const garrisons = playerUnits.filter(u => u.type === 'garrison');

      const unitsToRemove: Unit[] = [];

      // Licenciar ejércitos y flotas primero
      let remaining = unitsToDisband;
      for (const unit of armiesAndFleets) {
        if (remaining <= 0) break;
        unitsToRemove.push(unit);
        remaining--;
      }

      // Si aún falta, licenciar guarniciones
      for (const unit of garrisons) {
        if (remaining <= 0) break;
        unitsToRemove.push(unit);
        remaining -= 0.5;
      }

      // Eliminar unidades licenciadas
      for (const unit of unitsToRemove) {
        const index = context.units.findIndex(u => u.id === unit.id);
        if (index >= 0) {
          context.units.splice(index, 1);
          console.log(`Disbanded: ${unit.type} at ${unit.currentPosition}`);

          context.events.push({
            type: 'unit_disbanded',
            unitId: unit.id,
            unitType: unit.type,
            province: unit.currentPosition,
            playerId: player.id,
            faction: player.faction,
            message: `❌ ${player.faction} licencia ${unit.type} en ${unit.currentPosition} (fondos insuficientes)`
          });
        }
      }

      // Ajustar tesorería a 0 (no puede ser negativa)
      player.treasury = 0;

      console.log(`${player.faction}: Disbanded ${unitsToRemove.length} units, treasury set to 0d`);
    }

    console.log(`${player.faction}: Final treasury after maintenance: ${player.treasury}d`);
  }
}

export async function processEconomicActions(context: ResolutionContext): Promise<void> {
  console.log('Processing economic actions...');

  // PASO 0: Ingresos y Mantenimiento (solo Primavera)
  if (context.season === 'Primavera') {
    await processMaintenanceAndIncome(context);
  }

  // IMPORTANTE: Crear snapshot de fondos DESPUÉS del mantenimiento
  const snapshot: Record<string, number> = {};
  for (const player of context.players) {
    snapshot[player.id] = player.treasury || 0;
  }
  context.snapshot = snapshot;

  console.log('Treasury snapshot:', snapshot);

  // PASO 2A: Transferencias
  await processTransfers(context);

  // PASO 2B: Asesinatos
  await processAssassinations(context);

  // PASO 2C: Sobornos
  await processBribes(context);

  // PASO 2D: Otros gastos
  await processOtherExpenses(context);

  console.log('Economic actions complete');
}

async function processTransfers(context: ResolutionContext): Promise<void> {
  console.log('Processing transfers...');

  // TODO: Obtener transferencias de órdenes especiales o campo extraExpenses
  // Por ahora, buscaremos en un campo hipotético en la colección players
  const transfers: Array<{ from: string; to: string; amount: number }> = [];

  // Buscar transferencias en cada jugador (pueden estar en un campo transfers)
  for (const player of context.players) {
    if (player.transfers && Array.isArray(player.transfers)) {
      transfers.push(...player.transfers.map((t: any) => ({
        from: player.id,
        to: t.to,
        amount: t.amount,
      })));
    }
  }

  console.log(`Found ${transfers.length} transfers to process`);

  // Procesar cada transferencia con validación contra snapshot
  for (const transfer of transfers) {
    const fromPlayer = context.players.find(p => p.id === transfer.from);
    const toPlayer = context.players.find(p => p.id === transfer.to);

    if (!fromPlayer || !toPlayer) {
      console.warn(`Transfer references invalid players: ${transfer.from} -> ${transfer.to}`);
      continue;
    }

    // Validar contra snapshot
    const snapshotAmount = context.snapshot![transfer.from];
    if (snapshotAmount >= transfer.amount) {
      // Transferencia válida
      fromPlayer.treasury = (fromPlayer.treasury || 0) - transfer.amount;
      toPlayer.treasury = (toPlayer.treasury || 0) + transfer.amount;

      context.events.push({
        type: 'transfer',
        from: fromPlayer.faction,
        to: toPlayer.faction,
        amount: transfer.amount,
        success: true,
        message: `✅ ${fromPlayer.faction} transfirió ${transfer.amount}d a ${toPlayer.faction}`,
      });

      console.log(`Transfer success: ${fromPlayer.faction} -> ${toPlayer.faction}: ${transfer.amount}d`);
    } else {
      // Transferencia falla (fondos insuficientes en snapshot)
      context.events.push({
        type: 'transfer',
        from: fromPlayer.faction,
        to: toPlayer.faction,
        amount: transfer.amount,
        success: false,
        reason: 'Fondos insuficientes',
        message: `❌ ${fromPlayer.faction} intentó transferir ${transfer.amount}d a ${toPlayer.faction} (fondos insuficientes: ${snapshotAmount}d)`,
      });

      console.log(`Transfer failed: ${fromPlayer.faction} -> ${toPlayer.faction}: ${transfer.amount}d (insufficient: ${snapshotAmount}d)`);
    }
  }
}

async function processAssassinations(context: ResolutionContext): Promise<void> {
  console.log('Processing assassinations...');

  // TODO: Obtener intentos de asesinato de órdenes especiales
  // Por ahora, buscaremos en un campo hipotético assassination en players
  const assassinations: Array<{ attacker: string; target: string; cost: number; numbers: number[] }> = [];

  for (const player of context.players) {
    if (player.assassination) {
      assassinations.push({
        attacker: player.id,
        target: player.assassination.target,
        cost: player.assassination.cost || 12,
        numbers: player.assassination.numbers || [],
      });
    }
  }

  console.log(`Found ${assassinations.length} assassination attempts`);

  for (const attempt of assassinations) {
    const attacker = context.players.find(p => p.id === attempt.attacker);
    const target = context.players.find(p => p.id === attempt.target);

    if (!attacker || !target) {
      console.warn(`Assassination references invalid players`);
      continue;
    }

    // Validar fondos contra snapshot
    const snapshotAmount = context.snapshot![attempt.attacker];
    if (snapshotAmount < attempt.cost) {
      context.events.push({
        type: 'assassination',
        attacker: attacker.faction,
        target: target.faction,
        cost: attempt.cost,
        success: false,
        reason: 'Fondos insuficientes',
        message: `❌ Asesinato de ${target.faction} por ${attacker.faction} falló (fondos insuficientes)`,
      });
      console.log(`Assassination failed: insufficient funds`);
      continue;
    }

    // Consumir ducados y ficha
    attacker.treasury = (attacker.treasury || 0) - attempt.cost;
    // TODO: Marcar ficha como gastada

    // Tirada de dados
    const roll = Math.floor(Math.random() * 6) + 1;
    const success = attempt.numbers.includes(roll);

    if (success) {
      // Asesinato exitoso
      console.log(`Assassination SUCCESS: ${attacker.faction} killed ${target.faction} (roll: ${roll})`);

      // Parálisis militar: todas las unidades a "Mantener"
      for (const unit of context.units.filter(u => u.owner === target.id)) {
        const order = context.orders.find(o => o.unitId === unit.id);
        if (order) {
          order.action = 'hold';
          order.targetProvince = undefined;
          order.supportedUnit = undefined;
        }
      }

      // Eliminar guarniciones asediadas
      // TODO: Implementar eliminación de guarniciones con contador de asedio

      context.events.push({
        type: 'assassination',
        attacker: attacker.faction,
        target: target.faction,
        cost: attempt.cost,
        numbers: attempt.numbers,
        roll,
        success: true,
        message: `☠️ ${target.faction} ha sido asesinado! Todas sus unidades mantienen posición este turno.`,
      });
    } else {
      // Asesinato fallido
      console.log(`Assassination FAILED: ${attacker.faction} vs ${target.faction} (roll: ${roll}, needed: ${attempt.numbers.join(',')})`);

      context.events.push({
        type: 'assassination',
        attacker: attacker.faction,
        target: target.faction,
        cost: attempt.cost,
        numbers: attempt.numbers,
        roll,
        success: false,
        message: `❌ Asesinato de ${target.faction} por ${attacker.faction} falló (dado: ${roll})`,
      });
    }
  }
}

async function processBribes(context: ResolutionContext): Promise<void> {
  console.log('Processing bribes...');

  // TODO: Obtener sobornos de órdenes especiales
  // Por ahora, buscaremos en un campo hipotético bribes en players
  const bribes: Array<{ payer: string; unitId: string; cost: number }> = [];

  for (const player of context.players) {
    if (player.bribes && Array.isArray(player.bribes)) {
      bribes.push(...player.bribes.map((b: any) => ({
        payer: player.id,
        unitId: b.unitId,
        cost: 15, // Coste fijo
      })));
    }
  }

  console.log(`Found ${bribes.length} bribe attempts`);

  for (const bribe of bribes) {
    const payer = context.players.find(p => p.id === bribe.payer);
    const unit = context.units.find(u => u.id === bribe.unitId);

    if (!payer || !unit) {
      console.warn(`Bribe references invalid player or unit`);
      continue;
    }

    // Validar fondos contra snapshot
    const snapshotAmount = context.snapshot![bribe.payer];
    if (snapshotAmount < bribe.cost) {
      context.events.push({
        type: 'bribe',
        payer: payer.faction,
        unitId: bribe.unitId,
        cost: bribe.cost,
        success: false,
        reason: 'Fondos insuficientes',
        message: `❌ Soborno de ${unit.type} falló (fondos insuficientes)`,
      });
      console.log(`Bribe failed: insufficient funds`);
      continue;
    }

    // Ejecutar soborno
    const previousOwner = context.players.find(p => p.id === unit.owner);
    payer.treasury = (payer.treasury || 0) - bribe.cost;
    unit.owner = payer.id;

    // La unidad mantiene posición este turno
    const order = context.orders.find(o => o.unitId === unit.id);
    if (order) {
      order.action = 'hold';
    }

    context.events.push({
      type: 'bribe',
      payer: payer.faction,
      previousOwner: previousOwner?.faction,
      unitType: unit.type,
      province: unit.currentPosition,
      cost: bribe.cost,
      success: true,
      message: `💰 ${payer.faction} sobornó ${unit.type} de ${previousOwner?.faction} en ${unit.currentPosition}`,
    });

    console.log(`Bribe success: ${payer.faction} bribed ${unit.type} from ${previousOwner?.faction}`);
  }
}

async function processOtherExpenses(context: ResolutionContext): Promise<void> {
  console.log('Processing other expenses...');

  // Obtener todos los gastos extra de las órdenes de este turno
  const extraExpenses: Array<{
    playerId: string;
    type: string;
    target?: string;
    cost: number;
    description?: string;
  }> = [];

  // Buscar en los documentos de órdenes
  if (context.ordersData) {
    for (const orderDoc of context.ordersData) {
      if (orderDoc.extraExpenses && Array.isArray(orderDoc.extraExpenses)) {
        for (const expense of orderDoc.extraExpenses) {
          extraExpenses.push({
            playerId: orderDoc.playerId,
            type: expense.type,
            target: expense.target,
            cost: expense.cost,
            description: expense.description,
          });
        }
      }
    }
  }

  console.log(`Found ${extraExpenses.length} extra expenses to process`);

  // Procesar mitigación de hambre
  const famineMitigations = extraExpenses.filter(e => e.type === 'remove_famine');

  for (const mitigation of famineMitigations) {
    const player = context.players.find(p => p.id === mitigation.playerId);
    const provinceId = mitigation.target;

    if (!player || !provinceId) {
      console.warn(`Famine mitigation references invalid player or province`);
      continue;
    }

    // Validar fondos contra snapshot
    const snapshotAmount = context.snapshot![mitigation.playerId];
    if (snapshotAmount < mitigation.cost) {
      context.events.push({
        type: 'famine_mitigation',
        playerId: player.id,
        faction: player.faction,
        province: provinceId,
        cost: mitigation.cost,
        success: false,
        reason: 'Fondos insuficientes',
        message: `❌ ${player.faction} intentó mitigar hambruna en ${provinceId} (fondos insuficientes: ${snapshotAmount}d)`,
      });
      console.log(`Famine mitigation failed: insufficient funds (${snapshotAmount}d < ${mitigation.cost}d)`);
      continue;
    }

    // Verificar que el jugador controla la provincia
    const controlsProvince = context.units.some(
      u => u.type === 'garrison' && u.owner === player.id && u.currentPosition === provinceId
    );

    if (!controlsProvince) {
      context.events.push({
        type: 'famine_mitigation',
        playerId: player.id,
        faction: player.faction,
        province: provinceId,
        cost: mitigation.cost,
        success: false,
        reason: 'No controla la provincia',
        message: `❌ ${player.faction} intentó mitigar hambruna en ${provinceId} (no controla la provincia)`,
      });
      console.log(`Famine mitigation failed: player doesn't control province`);
      continue;
    }

    // Ejecutar mitigación
    player.treasury = (player.treasury || 0) - mitigation.cost;

    // Marcar la provincia para eliminar del array de hambrunas
    if (!context.famineMitigated) {
      context.famineMitigated = [];
    }
    context.famineMitigated.push(provinceId);

    context.events.push({
      type: 'famine_mitigation',
      playerId: player.id,
      faction: player.faction,
      province: provinceId,
      cost: mitigation.cost,
      success: true,
      message: `🌾 ${player.faction} mitigó la hambruna en ${provinceId} pagando ${mitigation.cost}d`,
    });

    console.log(`Famine mitigation success: ${player.faction} paid ${mitigation.cost}d for ${provinceId}`);
  }

  // TODO: Implementar reclutamiento de unidades (6d ejército/flota, 3d guarnición)
  // Esto se implementará en una futura fase

  console.log('Other expenses processing complete');
}
