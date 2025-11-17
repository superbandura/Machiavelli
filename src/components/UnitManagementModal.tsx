/**
 * Modal completo para gestionar unidades:
 * - Reclutar tropas/barcos
 * - Transferir tropas entre unidades
 * - Licenciar tropas
 * - Renombrar unidad
 */

import { useState, useMemo } from 'react'
import type { Unit, Player, Game } from '@/types/game'
import type { ArmyComposition, FleetComposition, GarrisonComposition } from '@/types/scenario'
import {
  recruitTroops,
  recruitShips,
  transferUnits,
  disbandTroops,
  renameUnit,
} from '@/utils/unitOperations'
import {
  ARMY_TROOP_COSTS,
  FLEET_SHIP_COSTS,
  GARRISON_TROOP_COSTS,
  TROOP_BATCH_SIZE,
  SHIP_BATCH_SIZE,
  MINIMUM_GARRISON_MILITIA,
} from '@/data/recruitmentCosts'

interface UnitManagementModalProps {
  unit: Unit
  game: Game
  currentPlayer: Player
  allUnits: Unit[] // Todas las unidades del juego
  onClose: () => void
}

type TabType = 'recruit' | 'transfer' | 'disband' | 'rename'

const TROOP_LABELS: Record<string, string> = {
  militia: 'Milicia',
  lancers: 'Lanceros',
  pikemen: 'Piqueros',
  archers: 'Arqueros',
  crossbowmen: 'Ballesteros',
  lightCavalry: 'Caballería Ligera',
  heavyCavalry: 'Caballería Pesada',
}

const SHIP_LABELS: Record<string, string> = {
  galley: 'Galera ⛵',
  cog: 'Coca 🚢',
}

export default function UnitManagementModal({
  unit,
  game,
  currentPlayer,
  allUnits,
  onClose,
}: UnitManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('recruit')
  const [loading, setLoading] = useState(false)

  // Estado para reclutamiento
  const [recruitQuantities, setRecruitQuantities] = useState<Record<string, number>>({})

  // Estado para transferencias
  const [transferTargetUnitId, setTransferTargetUnitId] = useState<string>('')
  const [transferQuantities, setTransferQuantities] = useState<Record<string, number>>({})

  // Estado para licenciar
  const [disbandQuantities, setDisbandQuantities] = useState<Record<string, number>>({})

  // Estado para renombrar
  const [newName, setNewName] = useState(unit.name || '')

  // Unidades disponibles para transferencia (mismo tipo o compatible, misma provincia)
  const transferableUnits = useMemo(() => {
    return allUnits.filter((u) => {
      if (u.id === unit.id) return false
      if (u.owner !== currentPlayer.id) return false
      if (u.currentPosition !== unit.currentPosition) return false

      // Flotas solo con flotas
      if (unit.type === 'fleet' && u.type === 'fleet') return true

      // Ejércitos y guarniciones pueden transferir entre sí
      if (
        (unit.type === 'army' || unit.type === 'garrison') &&
        (u.type === 'army' || u.type === 'garrison')
      ) {
        return true
      }

      return false
    })
  }, [allUnits, unit, currentPlayer])

  // Calcular coste total de reclutamiento
  const totalRecruitCost = useMemo(() => {
    let total = 0
    if (unit.type === 'fleet') {
      Object.entries(recruitQuantities).forEach(([shipType, quantity]) => {
        const cost = FLEET_SHIP_COSTS[shipType as keyof typeof FLEET_SHIP_COSTS]
        total += cost * quantity
      })
    } else {
      const costs = unit.type === 'army' ? ARMY_TROOP_COSTS : GARRISON_TROOP_COSTS
      Object.entries(recruitQuantities).forEach(([troopType, quantity]) => {
        const cost = costs[troopType as keyof typeof costs]
        const batches = quantity / TROOP_BATCH_SIZE
        total += cost * batches
      })
    }
    return total
  }, [recruitQuantities, unit.type])

  const handleRecruit = async () => {
    try {
      setLoading(true)

      // Validar fondos
      if (currentPlayer.treasury < totalRecruitCost) {
        alert(`Fondos insuficientes. Necesitas ${totalRecruitCost}d pero solo tienes ${currentPlayer.treasury}d`)
        return
      }

      // Reclutar cada tipo
      for (const [type, quantity] of Object.entries(recruitQuantities)) {
        if (quantity > 0) {
          if (unit.type === 'fleet') {
            await recruitShips(game.id, currentPlayer.id, unit.id, type, quantity)
          } else {
            await recruitTroops(game.id, currentPlayer.id, unit.id, type, quantity)
          }
        }
      }

      setRecruitQuantities({})
      alert('✓ Tropas reclutadas exitosamente')
      onClose()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferTargetUnitId) {
      alert('Selecciona una unidad destino')
      return
    }

    try {
      setLoading(true)

      // Transferir cada tipo
      for (const [type, quantity] of Object.entries(transferQuantities)) {
        if (quantity > 0) {
          await transferUnits(game.id, currentPlayer.id, unit.id, transferTargetUnitId, type, quantity)
        }
      }

      setTransferQuantities({})
      setTransferTargetUnitId('')
      alert('✓ Tropas transferidas exitosamente')
      onClose()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisband = async () => {
    const totalToDisband = Object.values(disbandQuantities).reduce((sum, q) => sum + q, 0)
    if (totalToDisband === 0) {
      alert('Selecciona tropas para licenciar')
      return
    }

    const confirmed = confirm(
      `¿Estás seguro de licenciar ${totalToDisband} tropas/barcos? No habrá reembolso.`
    )
    if (!confirmed) return

    try {
      setLoading(true)

      // Licenciar cada tipo
      for (const [type, quantity] of Object.entries(disbandQuantities)) {
        if (quantity > 0) {
          await disbandTroops(game.id, currentPlayer.id, unit.id, type, quantity)
        }
      }

      setDisbandQuantities({})
      alert('✓ Tropas licenciadas')
      onClose()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRename = async () => {
    if (!newName.trim()) {
      alert('El nombre no puede estar vacío')
      return
    }

    try {
      setLoading(true)
      await renameUnit(game.id, currentPlayer.id, unit.id, newName.trim())
      alert('✓ Unidad renombrada')
      onClose()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Renderizar contenido según pestaña activa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'recruit':
        return (
          <div className="space-y-4">
            <div className="text-base text-[#1d1408] font-serif font-semibold">
              Saldo disponible: <span className="text-renaissance-gold font-bold">{currentPlayer.treasury}d</span>
            </div>

            {unit.type === 'fleet' ? (
              // Reclutamiento de barcos
              <div className="space-y-3">
                {Object.entries(SHIP_LABELS).map(([shipType, label]) => {
                  const cost = FLEET_SHIP_COSTS[shipType as keyof typeof FLEET_SHIP_COSTS]
                  const composition = unit.composition as FleetComposition
                  const current = composition?.ships?.[shipType as keyof typeof composition.ships] || 0
                  const toRecruit = recruitQuantities[shipType] || 0

                  return (
                    <div key={shipType} className="flex items-center justify-between p-3 bg-[#d4c4a1] border-2 border-[#4a3f2a] rounded-lg opacity-100">
                      <div className="flex-1">
                        <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                        <div className="text-xs text-[#6b5d42]">
                          Actual: {current} | Coste: {cost}d/barco
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setRecruitQuantities((prev) => ({
                              ...prev,
                              [shipType]: Math.max(0, (prev[shipType] || 0) - SHIP_BATCH_SIZE),
                            }))
                          }
                          className="p-2 bg-burgundy-400 hover:bg-burgundy-500 border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
                        >
                          <img src="/icons/decremento.png" alt="Decrementar" className="w-6 h-6" />
                        </button>
                        <span className="w-16 text-center font-semibold text-[#1d1408] font-heading">
                          +{toRecruit}
                        </span>
                        <button
                          onClick={() =>
                            setRecruitQuantities((prev) => ({
                              ...prev,
                              [shipType]: (prev[shipType] || 0) + SHIP_BATCH_SIZE,
                            }))
                          }
                          className="p-2 bg-renaissance-gold hover:bg-renaissance-gold-dark border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
                        >
                          <img src="/icons/incremento.png" alt="Incrementar" className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              // Reclutamiento de tropas
              <div className="space-y-3">
                {Object.entries(TROOP_LABELS).map(([troopType, label]) => {
                  // Filtrar caballería para guarniciones
                  if (
                    unit.type === 'garrison' &&
                    (troopType === 'lightCavalry' || troopType === 'heavyCavalry')
                  ) {
                    return null
                  }

                  const costs = unit.type === 'army' ? ARMY_TROOP_COSTS : GARRISON_TROOP_COSTS
                  const cost = costs[troopType as keyof typeof costs]
                  const composition = unit.composition as ArmyComposition | GarrisonComposition
                  const current = composition?.troops?.[troopType as keyof typeof composition.troops] || 0
                  const toRecruit = recruitQuantities[troopType] || 0

                  return (
                    <div key={troopType} className="flex items-center justify-between p-3 bg-[#d4c4a1] border-2 border-[#4a3f2a] rounded-lg opacity-100">
                      <div className="flex-1">
                        <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                        <div className="text-xs text-[#6b5d42]">
                          Actual: {current} | Coste: {cost}d/100
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setRecruitQuantities((prev) => ({
                              ...prev,
                              [troopType]: Math.max(0, (prev[troopType] || 0) - TROOP_BATCH_SIZE),
                            }))
                          }
                          className="p-2 bg-burgundy-400 hover:bg-burgundy-500 border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
                        >
                          <img src="/icons/decremento.png" alt="Decrementar" className="w-6 h-6" />
                        </button>
                        <span className="w-16 text-center font-semibold text-[#1d1408] font-heading">
                          +{toRecruit}
                        </span>
                        <button
                          onClick={() =>
                            setRecruitQuantities((prev) => ({
                              ...prev,
                              [troopType]: (prev[troopType] || 0) + TROOP_BATCH_SIZE,
                            }))
                          }
                          className="p-2 bg-renaissance-gold hover:bg-renaissance-gold-dark border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
                        >
                          <img src="/icons/incremento.png" alt="Incrementar" className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {totalRecruitCost > 0 && (
              <div className="p-3 bg-[#f5ebcf] border-2 border-[#8a7556] rounded-lg">
                <div className="text-sm font-semibold text-[#1d1408] font-heading">
                  Coste total: {totalRecruitCost}d
                </div>
                <div className="text-xs text-[#6b5d42] font-serif mt-1">
                  Saldo después: {currentPlayer.treasury - totalRecruitCost}d
                </div>
              </div>
            )}

            <button
              onClick={handleRecruit}
              disabled={loading || totalRecruitCost === 0 || currentPlayer.treasury < totalRecruitCost}
              className="w-full px-4 py-3 bg-renaissance-gold hover:bg-renaissance-gold-dark disabled:opacity-50 disabled:cursor-not-allowed text-[#1d1408] font-heading font-bold border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
            >
              {loading ? 'Reclutando...' : 'Confirmar Reclutamiento'}
            </button>
          </div>
        )

      case 'transfer':
        return (
          <div className="space-y-4">
            {transferableUnits.length === 0 ? (
              <div className="p-4 text-center text-[#6b5d42] italic">
                No hay unidades disponibles para transferir tropas.
                <div className="text-xs mt-2">
                  Las unidades deben estar en la misma provincia y ser del mismo tipo (o ejército/guarnición).
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#2c2416] font-serif mb-2">
                    Transferir a:
                  </label>
                  <select
                    value={transferTargetUnitId}
                    onChange={(e) => setTransferTargetUnitId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-[#1d1408] font-serif"
                  >
                    <option value="">Selecciona una unidad...</option>
                    {transferableUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || `${u.type} sin nombre`} ({u.currentPosition})
                      </option>
                    ))}
                  </select>
                </div>

                {transferTargetUnitId && (
                  <div className="space-y-3">
                    {unit.type === 'fleet' ? (
                      // Transferir barcos
                      Object.entries(SHIP_LABELS).map(([shipType, label]) => {
                        const composition = unit.composition as FleetComposition
                        const current = composition?.ships?.[shipType as keyof typeof composition.ships] || 0
                        const toTransfer = transferQuantities[shipType] || 0

                        if (current === 0) return null

                        return (
                          <div key={shipType} className="flex items-center justify-between p-3 bg-[#d4c4a1] border-2 border-[#4a3f2a] rounded-lg opacity-100">
                            <div className="flex-1">
                              <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                              <div className="text-xs text-[#6b5d42]">Disponibles: {current}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setTransferQuantities((prev) => ({
                                    ...prev,
                                    [shipType]: Math.max(0, (prev[shipType] || 0) - SHIP_BATCH_SIZE),
                                  }))
                                }
                                className="p-2 bg-burgundy-400 hover:bg-burgundy-500 border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
                              >
                                <img src="/icons/decremento.png" alt="Decrementar" className="w-6 h-6" />
                              </button>
                              <span className="w-16 text-center font-semibold text-[#1d1408] font-heading">
                                {toTransfer}
                              </span>
                              <button
                                onClick={() =>
                                  setTransferQuantities((prev) => ({
                                    ...prev,
                                    [shipType]: Math.min(current, (prev[shipType] || 0) + SHIP_BATCH_SIZE),
                                  }))
                                }
                                disabled={toTransfer >= current}
                                className="p-2 bg-renaissance-gold hover:bg-renaissance-gold-dark border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <img src="/icons/incremento.png" alt="Incrementar" className="w-6 h-6" />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      // Transferir tropas
                      Object.entries(TROOP_LABELS).map(([troopType, label]) => {
                        const composition = unit.composition as ArmyComposition | GarrisonComposition
                        const current = composition?.troops?.[troopType as keyof typeof composition.troops] || 0
                        const toTransfer = transferQuantities[troopType] || 0

                        if (current === 0) return null

                        // Validación especial para milicias de guarnición
                        const isGarrisonMilitia = unit.type === 'garrison' && troopType === 'militia'
                        const maxTransferable = isGarrisonMilitia
                          ? Math.max(0, current - MINIMUM_GARRISON_MILITIA)
                          : current

                        if (maxTransferable === 0) return null

                        return (
                          <div key={troopType} className="flex items-center justify-between p-3 bg-[#d4c4a1] border-2 border-[#4a3f2a] rounded-lg opacity-100">
                            <div className="flex-1">
                              <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                              <div className="text-xs text-[#6b5d42]">
                                Disponibles: {maxTransferable}
                                {isGarrisonMilitia && ` (min. ${MINIMUM_GARRISON_MILITIA} en guarnición)`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setTransferQuantities((prev) => ({
                                    ...prev,
                                    [troopType]: Math.max(0, (prev[troopType] || 0) - TROOP_BATCH_SIZE),
                                  }))
                                }
                                className="p-2 bg-burgundy-400 hover:bg-burgundy-500 border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
                              >
                                <img src="/icons/decremento.png" alt="Decrementar" className="w-6 h-6" />
                              </button>
                              <span className="w-16 text-center font-semibold text-[#1d1408] font-heading">
                                {toTransfer}
                              </span>
                              <button
                                onClick={() =>
                                  setTransferQuantities((prev) => ({
                                    ...prev,
                                    [troopType]: Math.min(maxTransferable, (prev[troopType] || 0) + TROOP_BATCH_SIZE),
                                  }))
                                }
                                disabled={toTransfer >= maxTransferable}
                                className="p-2 bg-renaissance-gold hover:bg-renaissance-gold-dark border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <img src="/icons/incremento.png" alt="Incrementar" className="w-6 h-6" />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                <button
                  onClick={handleTransfer}
                  disabled={loading || !transferTargetUnitId || Object.values(transferQuantities).every((q) => q === 0)}
                  className="w-full px-4 py-3 bg-renaissance-bronze hover:bg-renaissance-bronze-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-bold border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
                >
                  {loading ? 'Transfiriendo...' : 'Confirmar Transferencia'}
                </button>
              </>
            )}
          </div>
        )

      case 'disband':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
              ⚠️ Las tropas licenciadas se eliminan permanentemente sin reembolso.
            </div>

            <div className="space-y-3">
              {unit.type === 'fleet' ? (
                // Licenciar barcos
                Object.entries(SHIP_LABELS).map(([shipType, label]) => {
                  const composition = unit.composition as FleetComposition
                  const current = composition?.ships?.[shipType as keyof typeof composition.ships] || 0
                  const toDisband = disbandQuantities[shipType] || 0

                  if (current === 0) return null

                  return (
                    <div key={shipType} className="flex items-center justify-between p-3 bg-[#d4c4a1] border-2 border-[#4a3f2a] rounded-lg opacity-100">
                      <div className="flex-1">
                        <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                        <div className="text-xs text-[#6b5d42]">Disponibles: {current}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setDisbandQuantities((prev) => ({
                              ...prev,
                              [shipType]: Math.max(0, (prev[shipType] || 0) - SHIP_BATCH_SIZE),
                            }))
                          }
                          className="p-2 bg-burgundy-400 hover:bg-burgundy-500 border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
                        >
                          <img src="/icons/decremento.png" alt="Decrementar" className="w-6 h-6" />
                        </button>
                        <span className="w-16 text-center font-semibold text-burgundy-400 font-heading">
                          -{toDisband}
                        </span>
                        <button
                          onClick={() =>
                            setDisbandQuantities((prev) => ({
                              ...prev,
                              [shipType]: Math.min(current, (prev[shipType] || 0) + SHIP_BATCH_SIZE),
                            }))
                          }
                          disabled={toDisband >= current}
                          className="p-2 bg-burgundy-500 hover:bg-burgundy-600 border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <img src="/icons/incremento.png" alt="Incrementar" className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                // Licenciar tropas
                Object.entries(TROOP_LABELS).map(([troopType, label]) => {
                  const composition = unit.composition as ArmyComposition | GarrisonComposition
                  const current = composition?.troops?.[troopType as keyof typeof composition.troops] || 0
                  const toDisband = disbandQuantities[troopType] || 0

                  if (current === 0) return null

                  // Validación especial para milicias de guarnición
                  const isGarrisonMilitia = unit.type === 'garrison' && troopType === 'militia'
                  const maxDisbandable = isGarrisonMilitia
                    ? Math.max(0, current - MINIMUM_GARRISON_MILITIA)
                    : current

                  if (maxDisbandable === 0) return null

                  return (
                    <div key={troopType} className="flex items-center justify-between p-3 bg-[#d4c4a1] border-2 border-[#4a3f2a] rounded-lg opacity-100">
                      <div className="flex-1">
                        <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                        <div className="text-xs text-[#6b5d42]">
                          Disponibles: {maxDisbandable}
                          {isGarrisonMilitia && ` (min. ${MINIMUM_GARRISON_MILITIA} en guarnición)`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setDisbandQuantities((prev) => ({
                              ...prev,
                              [troopType]: Math.max(0, (prev[troopType] || 0) - TROOP_BATCH_SIZE),
                            }))
                          }
                          className="p-2 bg-burgundy-400 hover:bg-burgundy-500 border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
                        >
                          <img src="/icons/decremento.png" alt="Decrementar" className="w-6 h-6" />
                        </button>
                        <span className="w-16 text-center font-semibold text-burgundy-400 font-heading">
                          -{toDisband}
                        </span>
                        <button
                          onClick={() =>
                            setDisbandQuantities((prev) => ({
                              ...prev,
                              [troopType]: Math.min(maxDisbandable, (prev[troopType] || 0) + TROOP_BATCH_SIZE),
                            }))
                          }
                          disabled={toDisband >= maxDisbandable}
                          className="p-2 bg-burgundy-500 hover:bg-burgundy-600 border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <img src="/icons/incremento.png" alt="Incrementar" className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <button
              onClick={handleDisband}
              disabled={loading || Object.values(disbandQuantities).every((q) => q === 0)}
              className="w-full px-4 py-3 bg-burgundy-500 hover:bg-burgundy-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-bold border-2 border-[#6b5d42] rounded-lg shadow-ornate transition-all"
            >
              {loading ? 'Licenciando...' : 'Confirmar Licenciamiento'}
            </button>
          </div>
        )

      case 'rename':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2c2416] font-serif mb-2">
                Nuevo nombre de la unidad:
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ingresa un nombre..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-[#1d1408] font-serif focus:outline-none focus:border-blue-500"
                maxLength={50}
                disabled={loading}
              />
              <div className="text-xs text-[#6b5d42] mt-1">
                {newName.length}/50 caracteres
              </div>
            </div>

            <button
              onClick={handleRename}
              disabled={loading || !newName.trim() || newName.trim() === unit.name}
              className="w-full px-4 py-3 bg-[#6b5d42] hover:bg-[#544a35] disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-bold border-2 border-[#1d1408] rounded-lg shadow-ornate transition-all"
            >
              {loading ? 'Renombrando...' : 'Confirmar Cambio de Nombre'}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#e8dcc0] border-4 border-[#4a3f2a] rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="p-4 bg-[#2d2416] border-b-4 border-[#6b5d42] flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-heading text-[#f0d877]">
              {unit.name || `${unit.type === 'army' ? 'Ejército' : unit.type === 'fleet' ? 'Flota' : 'Guarnición'}`}
            </h2>
            <div className="text-sm font-serif text-[#e8dcc0]">
              Ubicación: {game.map?.provinces?.[unit.currentPosition]?.name || unit.currentPosition}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-[#e8dcc0] hover:text-[#f0d877] transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-[#6b5d42] bg-[#2d2416]">
          <button
            onClick={() => setActiveTab('recruit')}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors ${
              activeTab === 'recruit'
                ? 'bg-parchment-100 text-[#2d2416] border-b-4 border-renaissance-gold'
                : 'text-[#e8dcc0] hover:bg-[#3d3422]'
            }`}
          >
            💰 Reclutar
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors ${
              activeTab === 'transfer'
                ? 'bg-parchment-100 text-[#2d2416] border-b-4 border-renaissance-bronze'
                : 'text-[#e8dcc0] hover:bg-[#3d3422]'
            }`}
          >
            🔄 Transferir
          </button>
          <button
            onClick={() => setActiveTab('disband')}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors ${
              activeTab === 'disband'
                ? 'bg-parchment-100 text-[#2d2416] border-b-4 border-burgundy-400'
                : 'text-[#e8dcc0] hover:bg-[#3d3422]'
            }`}
          >
            ❌ Licenciar
          </button>
          <button
            onClick={() => setActiveTab('rename')}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors ${
              activeTab === 'rename'
                ? 'bg-parchment-100 text-[#2d2416] border-b-4 border-[#6b5d42]'
                : 'text-[#e8dcc0] hover:bg-[#3d3422]'
            }`}
          >
            ✏️ Renombrar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-[#6b5d42] bg-[#2d2416]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#6b5d42] hover:bg-[#544a35] text-white font-heading rounded-lg transition-colors shadow-ornate"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
