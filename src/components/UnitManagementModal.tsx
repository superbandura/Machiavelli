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
            <div className="text-sm text-gray-400">
              Saldo disponible: <span className="text-yellow-400 font-semibold">{currentPlayer.treasury}d</span>
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
                    <div key={shipType} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-gray-200">{label}</div>
                        <div className="text-xs text-gray-500">
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
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          -1
                        </button>
                        <span className="w-16 text-center font-semibold text-gray-200">
                          +{toRecruit}
                        </span>
                        <button
                          onClick={() =>
                            setRecruitQuantities((prev) => ({
                              ...prev,
                              [shipType]: (prev[shipType] || 0) + SHIP_BATCH_SIZE,
                            }))
                          }
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                        >
                          +1
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
                    <div key={troopType} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-gray-200">{label}</div>
                        <div className="text-xs text-gray-500">
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
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          -100
                        </button>
                        <span className="w-16 text-center font-semibold text-gray-200">
                          +{toRecruit}
                        </span>
                        <button
                          onClick={() =>
                            setRecruitQuantities((prev) => ({
                              ...prev,
                              [troopType]: (prev[troopType] || 0) + TROOP_BATCH_SIZE,
                            }))
                          }
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                        >
                          +100
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {totalRecruitCost > 0 && (
              <div className="p-3 bg-blue-900/30 border border-blue-700 rounded">
                <div className="text-sm font-semibold text-blue-300">
                  Coste total: {totalRecruitCost}d
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Saldo después: {currentPlayer.treasury - totalRecruitCost}d
                </div>
              </div>
            )}

            <button
              onClick={handleRecruit}
              disabled={loading || totalRecruitCost === 0 || currentPlayer.treasury < totalRecruitCost}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
            >
              {loading ? 'Reclutando...' : 'Confirmar Reclutamiento'}
            </button>
          </div>
        )

      case 'transfer':
        return (
          <div className="space-y-4">
            {transferableUnits.length === 0 ? (
              <div className="p-4 text-center text-gray-500 italic">
                No hay unidades disponibles para transferir tropas.
                <div className="text-xs mt-2">
                  Las unidades deben estar en la misma provincia y ser del mismo tipo (o ejército/guarnición).
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Transferir a:
                  </label>
                  <select
                    value={transferTargetUnitId}
                    onChange={(e) => setTransferTargetUnitId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-200"
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
                          <div key={shipType} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                            <div className="flex-1">
                              <div className="font-medium text-gray-200">{label}</div>
                              <div className="text-xs text-gray-500">Disponibles: {current}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setTransferQuantities((prev) => ({
                                    ...prev,
                                    [shipType]: Math.max(0, (prev[shipType] || 0) - SHIP_BATCH_SIZE),
                                  }))
                                }
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                              >
                                -1
                              </button>
                              <span className="w-16 text-center font-semibold text-gray-200">
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
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
                              >
                                +1
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
                          <div key={troopType} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                            <div className="flex-1">
                              <div className="font-medium text-gray-200">{label}</div>
                              <div className="text-xs text-gray-500">
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
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                              >
                                -100
                              </button>
                              <span className="w-16 text-center font-semibold text-gray-200">
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
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
                              >
                                +100
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
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
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
                    <div key={shipType} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-gray-200">{label}</div>
                        <div className="text-xs text-gray-500">Disponibles: {current}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setDisbandQuantities((prev) => ({
                              ...prev,
                              [shipType]: Math.max(0, (prev[shipType] || 0) - SHIP_BATCH_SIZE),
                            }))
                          }
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
                        >
                          -1
                        </button>
                        <span className="w-16 text-center font-semibold text-red-400">
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
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
                        >
                          +1
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
                    <div key={troopType} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-gray-200">{label}</div>
                        <div className="text-xs text-gray-500">
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
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
                        >
                          -100
                        </button>
                        <span className="w-16 text-center font-semibold text-red-400">
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
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
                        >
                          +100
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
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
            >
              {loading ? 'Licenciando...' : 'Confirmar Licenciamiento'}
            </button>
          </div>
        )

      case 'rename':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nuevo nombre de la unidad:
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ingresa un nombre..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500"
                maxLength={50}
                disabled={loading}
              />
              <div className="text-xs text-gray-500 mt-1">
                {newName.length}/50 caracteres
              </div>
            </div>

            <button
              onClick={handleRename}
              disabled={loading || !newName.trim() || newName.trim() === unit.name}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-200">
              {unit.name || `${unit.type === 'army' ? 'Ejército' : unit.type === 'fleet' ? 'Flota' : 'Guarnición'}`}
            </h2>
            <div className="text-sm text-gray-400">
              Ubicación: {unit.currentPosition}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800">
          <button
            onClick={() => setActiveTab('recruit')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'recruit'
                ? 'bg-gray-900 text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            💰 Reclutar
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'transfer'
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🔄 Transferir
          </button>
          <button
            onClick={() => setActiveTab('disband')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'disband'
                ? 'bg-gray-900 text-red-400 border-b-2 border-red-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            ❌ Licenciar
          </button>
          <button
            onClick={() => setActiveTab('rename')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rename'
                ? 'bg-gray-900 text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-200'
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
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
