/**
 * PASO 5: Asedios
 *
 * Procesar contador de asedio de ciudades
 * - Incrementar contador si mismo asediador
 * - Resetear contador si cambia asediador
 * - Capturar ciudad si contador >= 2
 */

import { ResolutionContext } from '../types';

interface SiegeInfo {
  besiegerId: string | null;
  counter: number;
  controllerId: string;
}

export async function processSieges(context: ResolutionContext): Promise<void> {
  console.log('Processing sieges...');

  const { units, orders, gameData } = context;

  // Obtener o inicializar estado de asedios
  const siegeStatus: Record<string, SiegeInfo> = gameData.siegeStatus || {};

  // Obtener todas las provincias con ciudades
  const cityProvinces = Object.values(context.map.provinces).filter(p => p.hasCity);

  for (const province of cityProvinces) {
    const provinceId = province.id;

    // Buscar unidades en esta provincia
    const unitsInProvince = units.filter(u => u.currentPosition === provinceId);

    // Buscar guarnición defensora
    const garrison = unitsInProvince.find(u => u.type === 'garrison');
    const currentController = garrison?.owner || null;

    // Buscar asediadores (unidades con orden "besiege" en esta provincia)
    const besiegeOrders = orders.filter(
      o => o.action === 'besiege' &&
      units.find(u => u.id === o.unitId)?.currentPosition === provinceId &&
      o.isValid !== false
    );

    // Si hay asediadores
    if (besiegeOrders.length > 0) {
      // Determinar quién está asediando (el primer asediador)
      const besiegerUnit = units.find(u => u.id === besiegeOrders[0].unitId);
      const besiegerId = besiegerUnit?.owner || null;

      if (!besiegerId) continue;

      // Inicializar o actualizar estado de asedio
      if (!siegeStatus[provinceId]) {
        siegeStatus[provinceId] = {
          besiegerId,
          counter: 1,
          controllerId: currentController || ''
        };
        console.log(`New siege started at ${provinceId} by player ${besiegerId}`);
        context.events.push({
          type: 'siege_started',
          province: provinceId,
          cityName: province.cityName,
          besiegerId,
          message: `⚔️ Comienza el asedio de ${province.cityName} (${provinceId})`
        });
      } else {
        // Verificar si es el mismo asediador
        if (siegeStatus[provinceId].besiegerId === besiegerId) {
          // Incrementar contador
          siegeStatus[provinceId].counter++;
          console.log(`Siege continues at ${provinceId}: counter = ${siegeStatus[provinceId].counter}`);
          context.events.push({
            type: 'siege_progress',
            province: provinceId,
            cityName: province.cityName,
            counter: siegeStatus[provinceId].counter,
            message: `⏳ Asedio de ${province.cityName} continúa (turno ${siegeStatus[provinceId].counter})`
          });
        } else {
          // Cambió el asediador, resetear
          siegeStatus[provinceId] = {
            besiegerId,
            counter: 1,
            controllerId: currentController || ''
          };
          console.log(`Siege at ${provinceId} changed to player ${besiegerId}`);
          context.events.push({
            type: 'siege_changed',
            province: provinceId,
            cityName: province.cityName,
            newBesiegerId: besiegerId,
            message: `🔄 El asedio de ${province.cityName} cambia de asediador`
          });
        }
      }

      // Verificar si se completa la captura (contador >= 2)
      if (siegeStatus[provinceId].counter >= 2) {
        console.log(`City ${provinceId} captured by player ${besiegerId}`);

        // Capturar ciudad: destruir guarnición si existe y crear nueva
        if (garrison) {
          const garrisonIndex = units.findIndex(u => u.id === garrison.id);
          if (garrisonIndex >= 0) {
            units.splice(garrisonIndex, 1);
            context.events.push({
              type: 'unit_destroyed',
              unitId: garrison.id,
              province: provinceId,
              message: `💥 Guarnición en ${province.cityName} destruida`
            });
          }
        }

        // Crear nueva guarnición para el conquistador
        const newGarrison = {
          id: `garrison_${provinceId}_${Date.now()}`,
          gameId: context.gameId,
          owner: besiegerId,
          type: 'garrison' as const,
          currentPosition: provinceId
        };
        units.push(newGarrison);

        context.events.push({
          type: 'city_captured',
          province: provinceId,
          cityName: province.cityName,
          newOwnerId: besiegerId,
          message: `🏰 ${province.cityName} ha sido conquistada!`
        });

        // Resetear estado de asedio
        siegeStatus[provinceId] = {
          besiegerId: null,
          counter: 0,
          controllerId: besiegerId
        };
      }
    } else {
      // No hay asediadores: resetear contador si existía
      if (siegeStatus[provinceId]?.counter > 0) {
        console.log(`Siege at ${provinceId} lifted`);
        siegeStatus[provinceId] = {
          besiegerId: null,
          counter: 0,
          controllerId: currentController || ''
        };
        context.events.push({
          type: 'siege_lifted',
          province: provinceId,
          cityName: province.cityName,
          message: `🛡️ El asedio de ${province.cityName} ha sido levantado`
        });
      }
    }

    // CAPTURA AUTOMÁTICA: Si no hay guarnición y hay unidades enemigas
    if (!garrison && unitsInProvince.length > 0) {
      const capturingUnit = unitsInProvince[0];
      const capturerId = capturingUnit.owner;

      console.log(`Auto-capturing ${provinceId} - no garrison defense`);

      // Crear nueva guarnición
      const newGarrison = {
        id: `garrison_${provinceId}_${Date.now()}`,
        gameId: context.gameId,
        owner: capturerId,
        type: 'garrison' as const,
        currentPosition: provinceId
      };
      units.push(newGarrison);

      context.events.push({
        type: 'city_auto_captured',
        province: provinceId,
        cityName: province.cityName,
        capturerId,
        message: `🏴 ${province.cityName} capturada automáticamente (sin defensa)`
      });

      // Resetear estado de asedio
      siegeStatus[provinceId] = {
        besiegerId: null,
        counter: 0,
        controllerId: capturerId
      };
    }
  }

  // Guardar estado de asedios actualizado
  gameData.siegeStatus = siegeStatus;

  console.log('Sieges processed');
}
