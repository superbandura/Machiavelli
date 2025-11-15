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
import DucatBag from './decorative/icons/DucatBag';
import Separator from './decorative/Separator';

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
    <div className="bg-gray-800 rounded-lg p-5 border-2 border-renaissance-gold shadow-ornate">
      {/* Header con icono de bolsa de ducados */}
      <div className="flex items-center gap-3 mb-4">
        <DucatBag className="w-10 h-10" filled={treasury > 10} />
        <h3 className="text-xl font-heading font-bold text-renaissance-gold">
          Libro de Contabilidad
        </h3>
      </div>

      <Separator variant="gold" className="mb-4" />

      {/* Tesoro actual - estilo ledger */}
      <div className="mb-4 bg-renaissance-ink/30 rounded-lg p-4 border border-renaissance-gold/30">
        <div className="flex justify-between items-center">
          <span className="text-sm font-serif text-parchment-300 uppercase tracking-wide">Tesoro actual</span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-heading font-bold text-renaissance-gold">{treasury}</span>
            <span className="text-lg font-serif text-renaissance-gold-light">ducados</span>
          </div>
        </div>
      </div>

      {/* Ciudades controladas */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-serif text-gray-400 uppercase tracking-wide">Ciudades controladas</span>
          <span className="text-2xl font-heading font-bold text-renaissance-bronze">{citiesControlled.length}</span>
        </div>

        {citiesControlled.length > 0 && (
          <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
            {citiesControlled.map((city: any) => (
              <div key={city.id} className="text-sm font-serif text-parchment-300 flex items-center gap-2 py-1 px-2 bg-gray-900/40 rounded border-l-2 border-renaissance-bronze/50">
                <span className="text-base">🏰</span>
                <span>{city.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator variant="gray" className="my-4" />

      {/* Ingresos estimados - Estilo ledger con líneas punteadas */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1 border-b border-dotted border-gray-600 pb-2">
          <span className="text-sm font-serif text-gray-400">Ingresos próxima Primavera</span>
          <span className="text-lg font-heading font-semibold text-renaissance-olive-light">+{estimatedIncome}d</span>
        </div>
        <p className="text-xs font-serif text-gray-500 mt-1 italic">
          (3 ducados por ciudad)
        </p>
      </div>

      {/* Gastos de mantenimiento (solo en Primavera) */}
      {isSpring && (
        <>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1 border-b border-dotted border-gray-600 pb-2">
              <span className="text-sm font-serif text-gray-400">Mantenimiento esta Primavera</span>
              <span className="text-lg font-heading font-semibold text-burgundy-300">-{maintenanceCost}d</span>
            </div>
            <p className="text-xs font-serif text-gray-500 mt-1 italic">
              (1d por ejército/flota, 0.5d por guarnición)
            </p>

            {/* Advertencia si no puede pagar */}
            {treasury < maintenanceCost && (
              <div className="mt-3 bg-burgundy-700/30 border-2 border-burgundy-500 rounded-lg p-3">
                <p className="text-sm font-serif text-burgundy-200">
                  ⚠️ Fondos insuficientes! Deberás licenciar tropas.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Balance neto (solo en Primavera) - Destacado */}
      {isSpring && (
        <>
          <Separator variant="gray" className="my-4" />

          <div className={`rounded-lg p-4 border-2 ${
            (estimatedIncome - maintenanceCost) >= 0
              ? 'bg-renaissance-olive/20 border-renaissance-olive'
              : 'bg-burgundy-700/30 border-burgundy-500'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-base font-heading font-semibold text-parchment-200 uppercase tracking-wide">
                Balance neto
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-heading font-bold ${
                  (estimatedIncome - maintenanceCost) >= 0 ? 'text-renaissance-olive-light' : 'text-burgundy-300'
                }`}>
                  {estimatedIncome - maintenanceCost > 0 ? '+' : ''}
                  {estimatedIncome - maintenanceCost}
                </span>
                <span className="text-lg font-serif text-parchment-300">ducados</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
