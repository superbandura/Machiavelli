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
import { getProvinceIncome } from '../utils/gameMapHelpers';

interface TreasuryPanelProps {
  player: Player;
  units: Unit[];
  currentSeason: string;
  gameMap: GameMap;
  provinceFaction: Record<string, string>; // Mapa de control: provinceId -> faction
}

export default function TreasuryPanel({ player, units, currentSeason, gameMap, provinceFaction }: TreasuryPanelProps) {
  // Calcular TODAS las provincias controladas (usando provinceFaction)
  const provincesControlled = useMemo(() => {
    // Validación defensiva: si no hay gameMap, retornar array vacío
    if (!gameMap || !gameMap.provinces) {
      console.warn('[TreasuryPanel] gameMap no disponible');
      return [];
    }

    // Filtrar provincias donde provinceFaction[id] === player.faction
    return Object.entries(gameMap.provinces)
      .filter(([provinceId, _]) => provinceFaction[provinceId] === player.faction)
      .map(([provinceId, province]) => {
        return {
          id: provinceId,
          name: province.cityName || province.name,
          hasCity: province.hasCity || false,
          isPort: province.isPort || province.type === 'port',
          income: getProvinceIncome(gameMap, provinceId)
        };
      })
      .sort((a, b) => {
        // Ordenar: ciudades primero, luego por ingreso descendente
        if (a.hasCity && !b.hasCity) return -1;
        if (!a.hasCity && b.hasCity) return 1;
        return b.income - a.income;
      });
  }, [gameMap, provinceFaction, player.faction]);

  // Calcular ingresos estimados: suma de TODAS las provincias controladas
  const estimatedIncome = useMemo(() => {
    return provincesControlled.reduce((total, province) => total + province.income, 0);
  }, [provincesControlled]);

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
    <div className="bg-transparent rounded-lg p-2 border-2 border-[#b4a481] shadow-ornate">
      {/* Header con icono de bolsa de ducados */}
      <div className="flex items-center gap-2 mb-2">
        <DucatBag className="w-6 h-6" filled={treasury > 10} />
        <h3 className="text-base font-heading font-bold text-renaissance-gold leading-tight">
          Libro de Contabilidad
        </h3>
      </div>

      <Separator variant="gold" className="mb-2" />

      {/* Tesoro actual - estilo ledger */}
      <div className="mb-2 bg-renaissance-ink/30 rounded-lg p-2 border border-[#b4a481]/30">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-serif text-parchment-300 uppercase tracking-wide">Tesoro actual</span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-heading font-bold text-renaissance-gold leading-tight">{treasury}</span>
            <span className="text-xs font-serif text-renaissance-gold-light">ducados</span>
          </div>
        </div>
      </div>

      {/* Provincias controladas */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-serif text-gray-700 uppercase tracking-wide">Provincias controladas</span>
          <span className="text-base font-heading font-bold text-renaissance-bronze leading-tight">{provincesControlled.length}</span>
        </div>

        {provincesControlled.length > 0 && (
          <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
            {provincesControlled.map((province: any) => (
              <div key={province.id} className="font-serif flex items-center justify-between py-1 px-2 bg-[#f4e4c1] rounded border-l-2 border-renaissance-bronze/50">
                <div className="flex items-center gap-1.5">
                  {/* Nombre de provincia PRIMERO - siempre en blanco */}
                  <span className="text-parchment-200 font-semibold text-sm">
                    {province.name}
                  </span>

                  {/* Iconos DESPUÉS */}
                  {province.hasCity && (
                    <img src="/icons/ciudad_mini.png" alt="Ciudad" className="w-4 h-4 object-contain" />
                  )}
                  {province.isPort && (
                    <img src="/icons/puerto_mini.png" alt="Puerto" className="w-4 h-4 object-contain" />
                  )}
                </div>

                {/* Ingreso: Verde oscuro si >0, blanco si =0 */}
                <span className={`font-heading font-semibold text-sm ${
                  province.income > 0
                    ? 'text-green-700'
                    : 'text-black'
                }`}>
                  {province.income} ducados
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator variant="gray" className="my-2" />

      {/* Ingresos estimados - Estilo ledger con líneas punteadas */}
      <div className="mb-2">
        <div className="flex justify-between items-center border-b border-dotted border-gray-600 pb-1">
          <span className="text-[10px] font-serif text-gray-700">Ingresos próxima Primavera</span>
          <span className="text-xs font-heading font-semibold text-renaissance-olive-light leading-tight">+{estimatedIncome}d</span>
        </div>
        <p className="text-[9px] font-serif text-gray-700 italic">
          (según valor de cada ciudad)
        </p>
      </div>

      {/* Gastos de mantenimiento (solo en Primavera) */}
      {isSpring && (
        <>
          <div className="mb-2">
            <div className="flex justify-between items-center border-b border-dotted border-gray-600 pb-1">
              <span className="text-[10px] font-serif text-gray-700">Mantenimiento esta Primavera</span>
              <span className="text-xs font-heading font-semibold text-burgundy-300 leading-tight">-{maintenanceCost}d</span>
            </div>
            <p className="text-[9px] font-serif text-gray-700 italic">
              (1d por ejército/flota, 0.5d por guarnición)
            </p>

            {/* Advertencia si no puede pagar */}
            {treasury < maintenanceCost && (
              <div className="mt-1 bg-burgundy-700/30 border-2 border-burgundy-500 rounded-lg p-1">
                <p className="text-[10px] font-serif text-burgundy-200">
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
          <Separator variant="gray" className="my-2" />

          <div className={`rounded-lg p-2 border-2 ${
            (estimatedIncome - maintenanceCost) >= 0
              ? 'bg-renaissance-olive/20 border-renaissance-olive'
              : 'bg-burgundy-700/30 border-burgundy-500'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-heading font-semibold text-parchment-200 uppercase tracking-wide">
                Balance neto
              </span>
              <div className="flex items-center gap-1">
                <span className={`text-lg font-heading font-bold leading-tight ${
                  (estimatedIncome - maintenanceCost) >= 0 ? 'text-renaissance-olive-light' : 'text-burgundy-300'
                }`}>
                  {estimatedIncome - maintenanceCost > 0 ? '+' : ''}
                  {estimatedIncome - maintenanceCost}
                </span>
                <span className="text-xs font-serif text-parchment-300">ducados</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
