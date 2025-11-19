/**
 * Modal completo para gestionar unidades:
 * - Reclutar tropas/barcos
 * - Transferir tropas entre unidades
 * - Licenciar tropas
 * - Renombrar unidad
 */

import { useState, useMemo, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Unit, Player, Game } from '@/types/game'
import type { ArmyComposition, FleetComposition, GarrisonComposition } from '@/types/scenario'
import {
  recruitTroops,
  recruitShips,
  transferUnits,
  disbandTroops,
  renameUnit,
  embarkTroops,
  disembarkTroops,
} from '@/utils/unitOperations'
import {
  ARMY_TROOP_COSTS,
  FLEET_SHIP_COSTS,
  GARRISON_TROOP_COSTS,
  TROOP_BATCH_SIZE,
  SHIP_BATCH_SIZE,
  MINIMUM_GARRISON_MILITIA,
} from '@/data/recruitmentCosts'
import { calculateFleetCapacity, calculateEmbarkedTroopsCount } from '@/utils/embarkHelpers'
import type { ArmyTroopType } from '@/types/scenario'

interface UnitManagementModalProps {
  unit: Unit
  game: Game
  currentPlayer: Player
  allUnits: Unit[] // Todas las unidades del juego
  onClose: () => void
}

type TabType = 'recruit' | 'transfer' | 'embark' | 'disband' | 'rename'

const TROOP_LABELS: Record<string, string> = {
  militia: 'Milicia',
  lancers: 'Lanceros',
  pikemen: 'Piqueros',
  archers: 'Arqueros',
  crossbowmen: 'Ballesteros',
  lightCavalry: 'Caballería Ligera',
  heavyCavalry: 'Caballería Pesada',
}

const TROOP_ICONS: Record<string, string> = {
  militia: '/icons/milicia.png',
  lancers: '/icons/lancero.png',
  pikemen: '/icons/piquero.png',
  archers: '/icons/arquero.png',
  crossbowmen: '/icons/ballestero.png',
  lightCavalry: '/icons/caballeria_ligera.png',
  heavyCavalry: '/icons/caballeria_pesada.png',
}

const SHIP_LABELS: Record<string, string> = {
  galley: 'Galera',
  cog: 'Coca',
}

const SHIP_ICONS: Record<string, string> = {
  galley: '/icons/galera.png',
  cog: '/icons/coca.png',
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

  // Estado real-time de la unidad (para actualizar capacidad después de embarcar)
  const [currentUnit, setCurrentUnit] = useState<Unit>(unit)

  // Estado para reclutamiento
  const [recruitQuantities, setRecruitQuantities] = useState<Record<string, number>>({})

  // Estado para transferencias
  const [transferTargetUnitId, setTransferTargetUnitId] = useState<string>('')
  const [transferQuantities, setTransferQuantities] = useState<Record<string, number>>({})

  // Estado para licenciar
  const [disbandQuantities, setDisbandQuantities] = useState<Record<string, number>>({})

  // Estado para embarque
  const [embarkSourceArmyId, setEmbarkSourceArmyId] = useState<string>('')
  const [embarkQuantities, setEmbarkQuantities] = useState<Record<string, number>>({})

  // Estado para desembarque
  const [disembarkTargetArmyId, setDisembarkTargetArmyId] = useState<string>('')
  const [disembarkQuantities, setDisembarkQuantities] = useState<Record<string, number>>({})
  const [newArmyName, setNewArmyName] = useState<string>('')

  // Estado para renombrar
  const [newName, setNewName] = useState(unit.name || '')

  // Listener real-time para actualizar datos de la unidad
  useEffect(() => {
    const gameRef = doc(db, 'games', game.id)

    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const gameData = snapshot.data() as Game
        const updatedUnit = gameData.units.find((u) => u.id === unit.id)

        if (updatedUnit) {
          setCurrentUnit(updatedUnit)
        }
      }
    })

    return () => unsubscribe()
  }, [game.id, unit.id])

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

  // Ejércitos disponibles para embarque (solo para flotas)
  const embarkableArmies = useMemo(() => {
    if (unit.type !== 'fleet') return []

    return allUnits.filter((u) => {
      if (u.type !== 'army') return false
      if (u.owner !== currentPlayer.id) return false
      if (u.currentPosition !== unit.currentPosition) return false
      return true
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

  const handleEmbark = async () => {
    if (!embarkSourceArmyId) {
      alert('Selecciona un ejército origen')
      return
    }

    const totalToEmbark = Object.values(embarkQuantities).reduce((sum, n) => sum + n, 0)
    if (totalToEmbark === 0) {
      alert('Selecciona tropas para embarcar')
      return
    }

    try {
      setLoading(true)

      // Convertir a formato correcto
      const troopsToEmbark: Partial<Record<ArmyTroopType, number>> = {}
      for (const [troopType, quantity] of Object.entries(embarkQuantities)) {
        if (quantity > 0) {
          troopsToEmbark[troopType as ArmyTroopType] = quantity
        }
      }

      await embarkTroops(
        game.id,
        currentPlayer.id,
        unit.id,
        embarkSourceArmyId,
        troopsToEmbark
      )

      setEmbarkQuantities({})
      setEmbarkSourceArmyId('')
      alert('✓ Tropas embarcadas exitosamente')
      onClose()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisembark = async () => {
    const totalToDisembark = Object.values(disembarkQuantities).reduce((sum, n) => sum + n, 0)
    if (totalToDisembark === 0) {
      alert('Selecciona tropas para desembarcar')
      return
    }

    // Si no hay ejército seleccionado y no hay nombre para nuevo ejército
    if (!disembarkTargetArmyId && !newArmyName.trim()) {
      alert('Selecciona un ejército destino o ingresa un nombre para crear uno nuevo')
      return
    }

    try {
      setLoading(true)

      // Convertir a formato correcto
      const troopsToDisembark: Partial<Record<ArmyTroopType, number>> = {}
      for (const [troopType, quantity] of Object.entries(disembarkQuantities)) {
        if (quantity > 0) {
          troopsToDisembark[troopType as ArmyTroopType] = quantity
        }
      }

      await disembarkTroops(
        game.id,
        currentPlayer.id,
        unit.id,
        disembarkTargetArmyId || null,
        troopsToDisembark,
        newArmyName.trim() || undefined
      )

      setDisembarkQuantities({})
      setDisembarkTargetArmyId('')
      setNewArmyName('')
      alert('✓ Tropas desembarcadas exitosamente')
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
                      <div className="flex items-center gap-4 flex-1">
                        <div className="relative group">
                          <img
                            src={SHIP_ICONS[shipType]}
                            alt={label}
                            className="w-16 h-16 object-contain cursor-help"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          {/* Popup de coste */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#2d2416] border-2 border-[#d4af37] rounded-lg shadow-ornate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            <div className="text-xs font-heading text-[#f0d877]">
                              Coste: {cost}d/{shipType === 'galley' ? 'galera' : 'coca'}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                          <div className="font-bold text-base text-[#1d1408]">
                            Actual: {current}
                          </div>
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
                        <span className="w-20 text-center text-xl font-bold text-[#1d1408] font-heading">
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
                      <div className="flex items-center gap-4 flex-1">
                        <div className="relative group">
                          <img
                            src={TROOP_ICONS[troopType]}
                            alt={label}
                            className="w-16 h-16 object-contain cursor-help"
                            onError={(e) => {
                              // Fallback si el icono no existe
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          {/* Popup de coste */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#2d2416] border-2 border-[#d4af37] rounded-lg shadow-ornate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            <div className="text-xs font-heading text-[#f0d877]">
                              Coste: {cost}d/100
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                          <div className="font-bold text-base text-[#1d1408]">
                            Actual: {current}
                          </div>
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
                        <span className="w-20 text-center text-xl font-bold text-[#1d1408] font-heading">
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
                    className="w-full px-3 py-2 bg-[#f4e4c1] border-2 border-[#4a3f2a] rounded text-[#1d1408] font-serif focus:outline-none focus:border-[#d4af37]"
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
                            <div className="flex items-center gap-4 flex-1">
                              <img
                                src={SHIP_ICONS[shipType]}
                                alt={label}
                                className="w-16 h-16 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                                <div className="font-bold text-base text-[#1d1408]">
                                  Disponibles: {current}
                                </div>
                              </div>
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
                              <span className="w-20 text-center text-xl font-bold text-[#1d1408] font-heading">
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

                        // Obtener unidad destino
                        const targetUnit = transferableUnits.find(u => u.id === transferTargetUnitId)

                        // Filtrar caballería si destino es guarnición
                        const isCavalry = troopType === 'lightCavalry' || troopType === 'heavyCavalry'
                        if (targetUnit?.type === 'garrison' && isCavalry) {
                          return (
                            <div key={troopType} className="flex items-center justify-between p-3 bg-gray-300 border-2 border-gray-400 rounded-lg opacity-60">
                              <div className="flex items-center gap-4 flex-1">
                                <img
                                  src={TROOP_ICONS[troopType]}
                                  alt={label}
                                  className="w-16 h-16 object-contain opacity-50"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-600 font-serif">{label}</div>
                                  <div className="text-sm text-red-700 font-semibold">
                                    ⚠️ Las guarniciones no pueden tener caballería
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        // Validación especial para milicias de guarnición
                        const isGarrisonMilitia = unit.type === 'garrison' && troopType === 'militia'
                        const maxTransferable = isGarrisonMilitia
                          ? Math.max(0, current - MINIMUM_GARRISON_MILITIA)
                          : current

                        if (maxTransferable === 0) return null

                        return (
                          <div key={troopType} className="flex items-center justify-between p-3 bg-[#d4c4a1] border-2 border-[#4a3f2a] rounded-lg opacity-100">
                            <div className="flex items-center gap-4 flex-1">
                              <img
                                src={TROOP_ICONS[troopType]}
                                alt={label}
                                className="w-16 h-16 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                                <div className="font-bold text-base text-[#1d1408]">
                                  Disponibles: {maxTransferable}
                                </div>
                                {isGarrisonMilitia && (
                                  <div className="text-xs text-[#6b5d42]">
                                    (min. {MINIMUM_GARRISON_MILITIA} en guarnición)
                                  </div>
                                )}
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
                              <span className="w-20 text-center text-xl font-bold text-[#1d1408] font-heading">
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
                      <div className="flex items-center gap-4 flex-1">
                        <img
                          src={SHIP_ICONS[shipType]}
                          alt={label}
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                          <div className="font-bold text-base text-[#1d1408]">
                            Disponibles: {current}
                          </div>
                        </div>
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
                        <span className="w-20 text-center text-xl font-bold text-burgundy-400 font-heading">
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
                      <div className="flex items-center gap-4 flex-1">
                        <img
                          src={TROOP_ICONS[troopType]}
                          alt={label}
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[#1d1408] font-serif">{label}</div>
                          <div className="font-bold text-base text-[#1d1408]">
                            Disponibles: {maxDisbandable}
                          </div>
                          {isGarrisonMilitia && (
                            <div className="text-xs text-[#6b5d42]">
                              (min. {MINIMUM_GARRISON_MILITIA} en guarnición)
                            </div>
                          )}
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
                        <span className="w-20 text-center text-xl font-bold text-burgundy-400 font-heading">
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

      case 'embark':
        if (unit.type !== 'fleet') return null

        const fleetComp = currentUnit.composition as FleetComposition
        const totalCapacity = calculateFleetCapacity(fleetComp)
        const currentEmbarked = currentUnit.embarkedTroops
          ? calculateEmbarkedTroopsCount(currentUnit.embarkedTroops.troops)
          : 0
        const availableCapacity = totalCapacity - currentEmbarked

        const selectedArmy = embarkableArmies.find(a => a.id === embarkSourceArmyId)
        const selectedArmyComp = selectedArmy?.composition as ArmyComposition | undefined

        const totalToEmbark = Object.values(embarkQuantities).reduce((sum, n) => sum + n, 0)

        return (
          <div className="space-y-4">
            {/* Información de capacidad */}
            <div className="bg-[#4a3f2a] p-3 rounded-lg border-2 border-[#2d2416]">
              <div className="text-sm text-[#f0d877] font-serif space-y-1">
                <div>Capacidad total: <span className="font-bold">{totalCapacity}</span></div>
                <div>Ya embarcadas: <span className="font-bold">{currentEmbarked}</span></div>
                <div>Disponible: <span className="font-bold text-green-400">{availableCapacity}</span></div>
                <div>A embarcar: <span className={`font-bold ${totalToEmbark > availableCapacity ? 'text-red-400' : 'text-yellow-300'}`}>{totalToEmbark}</span></div>
              </div>
            </div>

            {/* Selector de ejército origen */}
            <div>
              <label className="block text-sm font-medium text-[#2c2416] font-serif mb-2">
                Ejército origen:
              </label>
              <select
                value={embarkSourceArmyId}
                onChange={(e) => {
                  setEmbarkSourceArmyId(e.target.value)
                  setEmbarkQuantities({}) // Reset quantities al cambiar ejército
                }}
                className="w-full px-3 py-2 bg-[#f4e4c1] border-2 border-[#4a3f2a] rounded text-[#1d1408] font-serif focus:outline-none focus:border-[#d4af37]"
                disabled={loading}
              >
                <option value="">Selecciona un ejército...</option>
                {embarkableArmies.map((army) => (
                  <option key={army.id} value={army.id}>
                    {army.name || `Ejército ${army.id.substring(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de tropas disponibles */}
            {selectedArmy && selectedArmyComp && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-[#2c2416] font-serif">
                  Tropas disponibles para embarcar:
                </div>

                {(Object.entries(selectedArmyComp.troops) as [ArmyTroopType, number][])
                  .filter(([_, count]) => count > 0)
                  .map(([troopType, available]) => {
                    const toEmbark = embarkQuantities[troopType] || 0

                    return (
                      <div
                        key={troopType}
                        className="flex items-center justify-between p-3 bg-[#d4c4a1] border-2 border-[#4a3f2a] rounded-lg"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <img
                            src={TROOP_ICONS[troopType]}
                            alt={TROOP_LABELS[troopType]}
                            className="w-12 h-12 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-[#1d1408] font-serif">
                              {TROOP_LABELS[troopType]}
                            </div>
                            <div className="text-sm text-[#4a3f2a]">
                              Disponibles: {available}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setEmbarkQuantities((prev) => ({
                                ...prev,
                                [troopType]: Math.max(0, (prev[troopType] || 0) - 10),
                              }))
                            }
                            disabled={loading || toEmbark === 0}
                            className="w-8 h-8 bg-[#6b5d42] hover:bg-[#544a35] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"
                          >
                            −
                          </button>

                          <div className="w-16 text-center font-bold text-[#1d1408]">
                            {toEmbark}
                          </div>

                          <button
                            onClick={() =>
                              setEmbarkQuantities((prev) => ({
                                ...prev,
                                [troopType]: Math.min(available, (prev[troopType] || 0) + 10),
                              }))
                            }
                            disabled={loading || toEmbark >= available}
                            className="w-8 h-8 bg-[#6b5d42] hover:bg-[#544a35] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Validación de capacidad excedida */}
            {totalToEmbark > availableCapacity && (
              <div className="bg-red-100 border-2 border-red-600 rounded-lg p-3 text-sm text-red-800">
                ⚠️ La cantidad de tropas excede la capacidad disponible de la flota
              </div>
            )}

            {/* Botón de confirmar */}
            <button
              onClick={handleEmbark}
              disabled={
                loading ||
                !embarkSourceArmyId ||
                totalToEmbark === 0 ||
                totalToEmbark > availableCapacity
              }
              className="w-full px-4 py-3 bg-[#6b5d42] hover:bg-[#544a35] disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-bold border-2 border-[#1d1408] rounded-lg shadow-ornate transition-all"
            >
              {loading ? 'Embarcando...' : 'Confirmar Embarque'}
            </button>

            {/* Sección de desembarque - solo si hay tropas embarcadas */}
            {currentUnit.embarkedTroops && Object.values(currentUnit.embarkedTroops.troops).some(c => (c || 0) > 0) && (
              <div className="border-t-4 border-[#6b5d42] pt-6 mt-6 space-y-4">
                <div className="text-lg font-heading font-bold text-[#2c2416]">
                  Desembarcar Tropas
                </div>

                {/* Información de tropas embarcadas */}
                <div className="bg-blue-900/20 p-3 rounded-lg border-2 border-blue-600">
                  <div className="text-sm text-[#2c2416] font-serif space-y-1">
                    <div className="font-semibold mb-2">Tropas actualmente embarcadas:</div>
                    {(Object.entries(currentUnit.embarkedTroops.troops) as [ArmyTroopType, number | undefined][])
                      .filter(([_, count]) => (count || 0) > 0)
                      .map(([troopType, count]) => (
                        <div key={troopType} className="flex justify-between">
                          <span>{TROOP_LABELS[troopType]}</span>
                          <span className="font-bold text-blue-700">{count}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Selector de ejército destino */}
                <div>
                  <label className="block text-sm font-medium text-[#2c2416] font-serif mb-2">
                    Ejército destino:
                  </label>
                  <select
                    value={disembarkTargetArmyId}
                    onChange={(e) => {
                      setDisembarkTargetArmyId(e.target.value)
                      setDisembarkQuantities({}) // Reset quantities
                    }}
                    className="w-full px-3 py-2 bg-[#f4e4c1] border-2 border-[#4a3f2a] rounded text-[#1d1408] font-serif focus:outline-none focus:border-[#d4af37]"
                    disabled={loading}
                  >
                    <option value="">Crear nuevo ejército</option>
                    {embarkableArmies.map((army) => (
                      <option key={army.id} value={army.id}>
                        {army.name || `Ejército ${army.id.substring(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Input para nombre de nuevo ejército */}
                {!disembarkTargetArmyId && (
                  <div>
                    <label className="block text-sm font-medium text-[#2c2416] font-serif mb-2">
                      Nombre del nuevo ejército:
                    </label>
                    <input
                      type="text"
                      value={newArmyName}
                      onChange={(e) => setNewArmyName(e.target.value)}
                      placeholder="Ingresa un nombre..."
                      className="w-full px-3 py-2 bg-[#f4e4c1] border-2 border-[#4a3f2a] rounded text-[#1d1408] font-serif focus:outline-none focus:border-[#d4af37]"
                      maxLength={50}
                      disabled={loading}
                    />
                  </div>
                )}

                {/* Lista de tropas embarcadas para desembarcar */}
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-[#2c2416] font-serif">
                    Selecciona tropas para desembarcar:
                  </div>

                  {(Object.entries(currentUnit.embarkedTroops.troops) as [ArmyTroopType, number | undefined][])
                    .filter(([_, count]) => (count || 0) > 0)
                    .map(([troopType, embarked]) => {
                      const toDisembark = disembarkQuantities[troopType] || 0
                      const embarkedCount = embarked || 0

                      return (
                        <div
                          key={troopType}
                          className="flex items-center justify-between p-3 bg-[#d4c4a1] border-2 border-[#4a3f2a] rounded-lg"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <img
                              src={TROOP_ICONS[troopType]}
                              alt={TROOP_LABELS[troopType]}
                              className="w-12 h-12 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-[#1d1408] font-serif">
                                {TROOP_LABELS[troopType]}
                              </div>
                              <div className="text-sm text-[#4a3f2a]">
                                Embarcadas: {embarkedCount}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setDisembarkQuantities((prev) => ({
                                  ...prev,
                                  [troopType]: Math.max(0, (prev[troopType] || 0) - 10),
                                }))
                              }
                              disabled={loading || toDisembark === 0}
                              className="w-8 h-8 bg-[#6b5d42] hover:bg-[#544a35] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"
                            >
                              −
                            </button>

                            <div className="w-16 text-center font-bold text-[#1d1408]">
                              {toDisembark}
                            </div>

                            <button
                              onClick={() =>
                                setDisembarkQuantities((prev) => ({
                                  ...prev,
                                  [troopType]: Math.min(embarkedCount, (prev[troopType] || 0) + 10),
                                }))
                              }
                              disabled={loading || toDisembark >= embarkedCount}
                              className="w-8 h-8 bg-[#6b5d42] hover:bg-[#544a35] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {/* Botón de confirmar desembarque */}
                <button
                  onClick={handleDisembark}
                  disabled={
                    loading ||
                    Object.values(disembarkQuantities).reduce((sum, n) => sum + n, 0) === 0
                  }
                  className="w-full px-4 py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-bold border-2 border-blue-900 rounded-lg shadow-ornate transition-all"
                >
                  {loading ? 'Desembarcando...' : 'Confirmar Desembarque'}
                </button>
              </div>
            )}
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
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'recruit'
                ? 'bg-[#4a3f2a] text-[#e8dcc0] border-b-4 border-renaissance-gold shadow-inner'
                : 'text-[#e8dcc0] hover:bg-[#3d3422]'
            }`}
          >
            <img src="/icons/reclutar.png" alt="" className="w-6 h-6 object-contain" />
            Reclutar
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'transfer'
                ? 'bg-[#4a3f2a] text-[#e09856] border-b-4 border-renaissance-bronze shadow-inner'
                : 'text-[#e8dcc0] hover:bg-[#3d3422]'
            }`}
          >
            <img src="/icons/transferir.png" alt="" className="w-6 h-6 object-contain" />
            Transferir
          </button>
          {unit.type === 'fleet' && embarkableArmies.length > 0 && (
            <button
              onClick={() => setActiveTab('embark')}
              className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'embark'
                  ? 'bg-[#4a3f2a] text-[#60a5fa] border-b-4 border-blue-400 shadow-inner'
                  : 'text-[#e8dcc0] hover:bg-[#3d3422]'
              }`}
            >
              <img src="/icons/embarcar.png" alt="" className="w-6 h-6 object-contain"
                onError={(e) => {
                  // Fallback si no existe el icono
                  e.currentTarget.src = '/icons/reclutar.png'
                }}
              />
              Embarque
            </button>
          )}
          <button
            onClick={() => setActiveTab('disband')}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'disband'
                ? 'bg-[#4a3f2a] text-[#f87171] border-b-4 border-burgundy-400 shadow-inner'
                : 'text-[#e8dcc0] hover:bg-[#3d3422]'
            }`}
          >
            <img src="/icons/licenciar.png" alt="" className="w-6 h-6 object-contain" />
            Licenciar
          </button>
          <button
            onClick={() => setActiveTab('rename')}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'rename'
                ? 'bg-[#4a3f2a] text-[#d4af37] border-b-4 border-[#d4af37] shadow-inner'
                : 'text-[#e8dcc0] hover:bg-[#3d3422]'
            }`}
          >
            <img src="/icons/renombrar.png" alt="" className="w-6 h-6 object-contain" />
            Renombrar
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
