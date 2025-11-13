/**
 * TreasuryPanel - Muestra información económica del jugador
 *
 * - Tesoro actual (ducados)
 * - Ciudades controladas
 * - Ingresos esperados
 * - Gastos de mantenimiento (Primavera)
 */

import { useMemo } from 'react';
import type { Player, Unit, GameMap } from '../types';

interface TreasuryPanelProps {
  player: Player;
  units: Unit[];
  currentSeason: string;
  gameMap: GameMap;
}

export default function TreasuryPanel({ player, units, currentSeason, gameMap }: TreasuryPanelProps) {
  // Calcular ciudades controladas (provincias con guarnición del jugador)
  const citiesControlled = useMemo(() => {
    // Validación defensiva: si no hay gameMap, retornar array vacío
    if (!gameMap || !gameMap.provinces) {
      console.warn('[TreasuryPanel] gameMap no disponible');
      return [];
    }

    const garrisonProvinces = units
      .filter(u => u.type === 'garrison' && u.owner === player.id)
      .map(u => u.currentPosition);

    return garrisonProvinces
      .map(provinceId => {
        const province = gameMap.provinces[provinceId];
        return province?.hasCity ? { id: provinceId, name: province.cityName || province.name } : null;
      })
      .filter(Boolean);
  }, [units, player.id, gameMap]);

  // Calcular ingresos estimados (3 ducados por ciudad)
  const estimatedIncome = citiesControlled.length * 3;

  // Calcular gastos de mantenimiento (solo en Primavera)
  const maintenanceCost = useMemo(() => {
    if (currentSeason !== 'Primavera') return 0;

    const playerUnits = units.filter(u => u.owner === player.id);

    // Coste de mantenimiento: 1d por ejército/flota, 0.5d por guarnición
    let cost = 0;
    playerUnits.forEach(unit => {
      if (unit.type === 'army' || unit.type === 'fleet') {
        cost += 1;
      } else if (unit.type === 'garrison') {
        cost += 0.5;
      }
    });

    return cost;
  }, [units, player.id, currentSeason]);

  const treasury = player.treasury || 0;
  const isSpring = currentSeason === 'Primavera';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-4">💰 Tesorería</h3>

      {/* Tesoro actual */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Tesoro actual:</span>
          <span className="text-2xl font-bold text-yellow-400">{treasury}d</span>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-3 mb-3"></div>

      {/* Ciudades controladas */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Ciudades controladas:</span>
          <span className="text-xl font-semibold text-green-400">{citiesControlled.length}</span>
        </div>

        {citiesControlled.length > 0 && (
          <div className="mt-2 space-y-1">
            {citiesControlled.map((city: any) => (
              <div key={city.id} className="text-sm text-gray-500 flex items-center gap-2">
                <span className="text-yellow-600">🏰</span>
                <span>{city.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 pt-3 mb-3"></div>

      {/* Ingresos estimados */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-400">Ingresos próxima Primavera:</span>
          <span className="text-lg font-semibold text-green-400">+{estimatedIncome}d</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          (3 ducados por ciudad)
        </p>
      </div>

      {/* Gastos de mantenimiento (solo en Primavera) */}
      {isSpring && (
        <>
          <div className="border-t border-gray-700 pt-3 mb-3"></div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400">Mantenimiento esta Primavera:</span>
              <span className="text-lg font-semibold text-red-400">-{maintenanceCost}d</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              (1d por ejército/flota, 0.5d por guarnición)
            </p>

            {/* Advertencia si no puede pagar */}
            {treasury < maintenanceCost && (
              <div className="mt-3 bg-red-900/30 border border-red-700 rounded p-2">
                <p className="text-xs text-red-300">
                  ⚠️ Fondos insuficientes! Deberás licenciar tropas.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Balance neto (solo en Primavera) */}
      {isSpring && (
        <>
          <div className="border-t border-gray-700 pt-3"></div>

          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-semibold">Balance neto:</span>
            <span className={`text-xl font-bold ${
              (estimatedIncome - maintenanceCost) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {estimatedIncome - maintenanceCost > 0 ? '+' : ''}
              {estimatedIncome - maintenanceCost}d
            </span>
          </div>
        </>
      )}
    </div>
  );
}
