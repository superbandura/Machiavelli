/**
 * PASO 3: Resolución de Movimientos Simultáneos
 *
 * Sub-pasos:
 * 3.1: Calcular rutas de convoy
 * 3.2: Identificar ataques a unidades de apoyo (cut support)
 * 3.3: Calcular fuerzas de combate
 * 3.4: Resolver batallas
 * 3.5: Movimientos a territorio propio
 */

import { ResolutionContext } from '../types';
import { isAdjacent, isSea } from '../data/provinceData';

interface ProvinceForces {
  province: string;
  attacks: Array<{ unitId: string; playerId: string; force: number }>;
  defenseForce: number;
  defenderId: string | null;
  standoff: boolean;
}

export async function resolveMovements(context: ResolutionContext): Promise<void> {
  console.log('Resolving movements...');

  // PASO 3.1: Calcular rutas de convoy
  calculateConvoyRoutes(context);

  // PASO 3.2: Identificar cut support
  identifyCutSupport(context);

  // PASO 3.3: Calcular fuerzas
  const forces = calculateForces(context);

  // PASO 3.4: Resolver batallas
  resolveBattles(context, forces);

  // PASO 3.5: Movimientos sin combate
  resolveNonCombatMovements(context);

  console.log('Movements resolved');
}

/**
 * 3.1: Calcular rutas de convoy válidas
 */
function calculateConvoyRoutes(context: ResolutionContext): void {
  console.log('Calculating convoy routes...');

  const { units, orders } = context;

  // Buscar órdenes de convoy
  const convoyOrders = orders.filter(o => o.action === 'convoy' && o.isValid !== false);

  // Para cada ejército que intenta moverse por convoy
  const armyMoveOrders = orders.filter(
    o => o.action === 'move' &&
    units.find(u => u.id === o.unitId && u.type === 'army')
  );

  for (const moveOrder of armyMoveOrders) {
    const unit = units.find(u => u.id === moveOrder.unitId);
    if (!unit || !moveOrder.targetProvince) continue;

    const from = unit.currentPosition;
    const to = moveOrder.targetProvince;

    // Si el destino es adyacente por tierra, no necesita convoy
    if (isAdjacent(from, to) && !isSea(to)) {
      continue;
    }

    // Verificar si hay una cadena de convoy válida
    const hasValidConvoy = convoyOrders.some(convoyOrder => {
      const fleet = units.find(u => u.id === convoyOrder.unitId);
      if (!fleet) return false;

      // Simplificación: aceptar convoy si hay una flota en zona marítima adyacente
      const fleetPosition = fleet.currentPosition;
      return isSea(fleetPosition) &&
             (isAdjacent(from, fleetPosition) && isAdjacent(fleetPosition, to));
    });

    if (!hasValidConvoy) {
      // No hay convoy válido, marcar orden como inválida
      moveOrder.isValid = false;
      moveOrder.validationError = 'No valid convoy route';
      console.log(`Army at ${from} cannot move to ${to} - no valid convoy`);
    }
  }

  console.log('Convoy routes calculated');
}

/**
 * 3.2: Identificar ataques que cancelan apoyos (cut support)
 */
function identifyCutSupport(context: ResolutionContext): void {
  console.log('Identifying cut support...');

  const { units, orders } = context;

  // Para cada orden de apoyo
  const supportOrders = orders.filter(o => o.action === 'support' && o.isValid !== false);

  for (const supportOrder of supportOrders) {
    const supportingUnit = units.find(u => u.id === supportOrder.unitId);
    if (!supportingUnit) continue;

    const supportPosition = supportingUnit.currentPosition;

    // Buscar ataques a la posición del apoyo
    const attacksOnSupporter = orders.filter(o =>
      o.action === 'move' &&
      o.targetProvince === supportPosition &&
      o.unitId !== supportOrder.supportedUnit && // No contar el movimiento apoyado
      o.isValid !== false
    );

    // Si hay algún ataque, el apoyo se cancela
    if (attacksOnSupporter.length > 0) {
      supportOrder.isValid = false;
      supportOrder.validationError = 'Support cut by attack';
      console.log(`Support at ${supportPosition} cut by attack`);

      context.events.push({
        type: 'support_cut',
        province: supportPosition,
        unitId: supportOrder.unitId,
        message: `❌ Apoyo en ${supportPosition} cancelado por ataque`
      });
    }
  }

  console.log('Cut support identified');
}

/**
 * 3.3: Calcular fuerzas de ataque y defensa para cada provincia
 */
function calculateForces(context: ResolutionContext): Map<string, ProvinceForces> {
  console.log('Calculating forces...');

  const { units, orders } = context;
  const forcesMap = new Map<string, ProvinceForces>();

  // Obtener todas las órdenes de movimiento válidas
  const moveOrders = orders.filter(o => o.action === 'move' && o.isValid !== false);

  // Para cada orden de movimiento, calcular fuerza de ataque
  for (const moveOrder of moveOrders) {
    const attackingUnit = units.find(u => u.id === moveOrder.unitId);
    if (!attackingUnit || !moveOrder.targetProvince) continue;

    const targetProvince = moveOrder.targetProvince;

    // Inicializar fuerzas de la provincia si no existen
    if (!forcesMap.has(targetProvince)) {
      const defender = units.find(u => u.currentPosition === targetProvince);
      forcesMap.set(targetProvince, {
        province: targetProvince,
        attacks: [],
        defenseForce: 0,
        defenderId: defender?.owner || null,
        standoff: false
      });
    }

    const provinceForces = forcesMap.get(targetProvince)!;

    // Calcular fuerza de ataque: 1 (base) + apoyos
    let attackForce = 1;

    // Contar apoyos válidos para este ataque
    const supports = orders.filter(o =>
      o.action === 'support' &&
      o.supportedUnit === moveOrder.unitId &&
      o.isValid !== false
    );

    attackForce += supports.length;

    provinceForces.attacks.push({
      unitId: moveOrder.unitId,
      playerId: attackingUnit.owner,
      force: attackForce
    });

    console.log(`Attack on ${targetProvince}: unit ${moveOrder.unitId} with force ${attackForce}`);
  }

  // Calcular fuerza defensiva para cada provincia atacada
  for (const [province, forces] of forcesMap.entries()) {
    const defender = units.find(u => u.currentPosition === province);

    if (defender) {
      // Fuerza base de defensa: 1
      let defenseForce = 1;

      // Añadir apoyos a la defensa (hold)
      const defenseSupports = orders.filter(o =>
        o.action === 'support' &&
        o.targetProvince === province &&
        o.isValid !== false
      );

      defenseForce += defenseSupports.length;
      forces.defenseForce = defenseForce;

      console.log(`Defense at ${province}: force ${defenseForce}`);
    } else {
      forces.defenseForce = 0;
    }
  }

  console.log(`Forces calculated for ${forcesMap.size} provinces`);
  return forcesMap;
}

/**
 * 3.4: Resolver batallas y determinar ganadores
 */
function resolveBattles(context: ResolutionContext, forces: Map<string, ProvinceForces>): void {
  console.log('Resolving battles...');

  const { units } = context;

  for (const [province, provinceForces] of forces.entries()) {
    // Si solo hay un atacante y no hay defensor
    if (provinceForces.attacks.length === 1 && provinceForces.defenseForce === 0) {
      const attacker = provinceForces.attacks[0];
      const attackingUnit = units.find(u => u.id === attacker.unitId)!;

      console.log(`Province ${province} captured by unit ${attacker.unitId} (no defense)`);

      // Movimiento exitoso
      attackingUnit.currentPosition = province;

      context.events.push({
        type: 'move_success',
        unitId: attacker.unitId,
        from: attackingUnit.currentPosition,
        to: province,
        message: `➡️ Unidad se mueve a ${province}`
      });

      continue;
    }

    // Encontrar el ataque más fuerte
    const strongestAttack = provinceForces.attacks.reduce((max, attack) =>
      attack.force > max.force ? attack : max
    , provinceForces.attacks[0]);

    // Verificar si hay empate entre atacantes
    const tiedAttacks = provinceForces.attacks.filter(a => a.force === strongestAttack.force);

    if (tiedAttacks.length > 1) {
      // Standoff entre atacantes
      console.log(`Standoff at ${province}: ${tiedAttacks.length} attackers with equal force`);

      provinceForces.standoff = true;

      context.events.push({
        type: 'standoff',
        province,
        attackers: tiedAttacks.map(a => a.unitId),
        message: `⚔️ Combate empatado en ${province}`
      });

      // Ninguna unidad se mueve
      continue;
    }

    // Comparar el ataque más fuerte con la defensa
    if (strongestAttack.force > provinceForces.defenseForce) {
      // Ataque exitoso
      const attacker = units.find(u => u.id === strongestAttack.unitId)!;
      const defender = units.find(u => u.currentPosition === province);

      console.log(`Battle at ${province}: attacker wins (${strongestAttack.force} vs ${provinceForces.defenseForce})`);

      context.events.push({
        type: 'battle',
        province,
        winnerId: strongestAttack.unitId,
        loserId: defender?.id,
        attackForce: strongestAttack.force,
        defenseForce: provinceForces.defenseForce,
        message: `⚔️ Batalla en ${province}: ataque victorioso (${strongestAttack.force} vs ${provinceForces.defenseForce})`
      });

      // Mover atacante
      attacker.currentPosition = province;

      // Desalojar defensor
      if (defender) {
        // Añadir a lista de retiradas
        if (!context.retreatingUnits) {
          context.retreatingUnits = [];
        }
        context.retreatingUnits.push({
          unit: defender,
          fromProvince: province
        });

        console.log(`Unit ${defender.id} dislodged from ${province}`);
      }
    } else if (strongestAttack.force === provinceForces.defenseForce) {
      // Standoff: defensa iguala al ataque
      console.log(`Standoff at ${province}: defense holds (${provinceForces.defenseForce} vs ${strongestAttack.force})`);

      provinceForces.standoff = true;

      context.events.push({
        type: 'standoff',
        province,
        attackForce: strongestAttack.force,
        defenseForce: provinceForces.defenseForce,
        message: `🛡️ Defensa exitosa en ${province} (empate ${provinceForces.defenseForce} vs ${strongestAttack.force})`
      });
    } else {
      // Defensa exitosa
      console.log(`Battle at ${province}: defense wins (${provinceForces.defenseForce} vs ${strongestAttack.force})`);

      context.events.push({
        type: 'defense_success',
        province,
        defenseForce: provinceForces.defenseForce,
        attackForce: strongestAttack.force,
        message: `🛡️ Defensa exitosa en ${province} (${provinceForces.defenseForce} vs ${strongestAttack.force})`
      });
    }
  }

  console.log('Battles resolved');
}

/**
 * 3.5: Procesar movimientos sin combate (a territorio propio o vacío)
 */
function resolveNonCombatMovements(context: ResolutionContext): void {
  console.log('Resolving non-combat movements...');

  const { units, orders } = context;

  // Obtener movimientos que no fueron procesados en batallas
  const moveOrders = orders.filter(o => o.action === 'move' && o.isValid !== false);

  for (const moveOrder of moveOrders) {
    const unit = units.find(u => u.id === moveOrder.unitId);
    if (!unit || !moveOrder.targetProvince) continue;

    // Si la unidad ya se movió (su posición cambió), skip
    if (unit.currentPosition === moveOrder.targetProvince) {
      continue;
    }

    const targetProvince = moveOrder.targetProvince;

    // Verificar si el destino está vacío o solo tiene unidades del mismo jugador
    const unitsInTarget = units.filter(u => u.currentPosition === targetProvince);
    const hasEnemyUnits = unitsInTarget.some(u => u.owner !== unit.owner);

    if (!hasEnemyUnits) {
      // Movimiento sin oposición
      console.log(`Non-combat movement: unit ${unit.id} moves to ${targetProvince}`);

      unit.currentPosition = targetProvince;

      context.events.push({
        type: 'move_success',
        unitId: unit.id,
        to: targetProvince,
        message: `➡️ Unidad se mueve a ${targetProvince} (sin combate)`
      });
    }
  }

  console.log('Non-combat movements resolved');
}
