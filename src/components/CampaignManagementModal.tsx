/**
 * CampaignManagementModal - Modal para gestionar campañas militares
 *
 * Dos tabs según la fase del juego:
 * - Tab "Planificar" (diplomatic phase): Seleccionar unidades y declarar campaña
 * - Tab "Gestión Táctica" (orders phase): Gestionar fuerzas y órdenes (placeholder)
 */

import { useState, useEffect, useMemo } from 'react'
import type { Unit, Player, Game, MilitaryCampaign, MaritimeRoute } from '@/types/game'
import type { FleetComposition, ArmyComposition } from '@/types/scenario'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  validateCampaignUnits,
  calculateCampaignStrength,
  formatUnitName,
  getUnitCompositionSummary
} from '@/utils/campaignHelpers'
import { findAmphibiousRoute, getProvinceInfo, isCoastalProvince, getProvinceName } from '@/utils/gameMapHelpers'

interface CampaignManagementModalProps {
  targetProvince: string
  existingCampaign?: MilitaryCampaign
  game: Game
  player: Player
  units: Unit[]
  provinceFaction: Record<string, string>
  campaigns: MilitaryCampaign[]
  onClose: () => void
}

export default function CampaignManagementModal({
  targetProvince,
  existingCampaign,
  game,
  player,
  units,
  provinceFaction,
  campaigns,
  onClose
}: CampaignManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'plan' | 'tactics'>('plan')
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Determinar tab inicial según fase
  useEffect(() => {
    if (existingCampaign) {
      // Si hay campaña existente y estamos en phase orders, mostrar tab táctico
      if (game.currentPhase === 'orders') {
        setActiveTab('tactics')
      } else {
        setActiveTab('plan')
      }
    } else {
      setActiveTab('plan')
    }
  }, [existingCampaign, game.currentPhase])

  // Cargar unidades ya seleccionadas si es campaña existente
  useEffect(() => {
    if (existingCampaign && existingCampaign.participatingUnits) {
      setSelectedUnits(new Set(existingCampaign.participatingUnits))
    }
  }, [existingCampaign])

  // Filtrar unidades disponibles según posición geográfica
  const availableUnits = useMemo(() => {
    if (!game.map) return []

    // Filtro base: solo unidades del jugador, Army/Fleet, activas
    const playerUnits = units.filter(
      u =>
        u.owner === player.id &&
        (u.type === 'army' || u.type === 'fleet') &&
        u.status === 'active'
    )

    // Obtener unitIds ya asignados a campañas activas (excepto la campaña actual si existe)
    const assignedUnitIds = new Set(
      campaigns
        .filter(c =>
          c.gameId === game.id &&
          (c.status === 'planning' || c.status === 'active') &&
          c.id !== existingCampaign?.id  // Excluir la campaña actual al editar
        )
        .flatMap(c => c.participatingUnits)
    )

    // ===== DEBUGGING DETALLADO =====
    console.group(`🔍 CampaignModal Debug: Target=${targetProvince}`)
    console.log('📊 Total unidades del jugador (Army/Fleet activas):', playerUnits.length)
    console.log('🚫 Unidades ya asignadas a campañas:', assignedUnitIds.size, Array.from(assignedUnitIds))

    // Obtener provincias adyacentes al objetivo
    const targetProvinceData = game.map.provinces[targetProvince]
    const adjacentProvinces = targetProvinceData?.adjacencies || []
    console.log('🗺️  Provincias adyacentes al objetivo:', adjacentProvinces)

    // Verificar si el objetivo es costero (para campañas anfibias)
    const isTargetCoastal = isCoastalProvince(game.map, targetProvince)
    console.log('🌊 Objetivo es costero:', isTargetCoastal)

    // Debug cada unidad individualmente
    playerUnits.forEach((unit, idx) => {
      console.group(`  [${idx + 1}] ${unit.type.toUpperCase()} en ${unit.currentPosition}`)
      console.log('    ID:', unit.id)
      console.log('    Name:', unit.name || 'Sin nombre')
      console.log('    Has composition:', !!unit.composition)

      if (unit.composition) {
        console.log('    Composition:', unit.composition)

        if (unit.type === 'army') {
          const armyComp = unit.composition as ArmyComposition
          console.log('    Troops object:', armyComp.troops)
          const totalTroops = Object.values(armyComp.troops || {}).reduce((sum, n) => sum + n, 0)
          console.log('    ⚔️  Total tropas:', totalTroops)
        }

        if (unit.type === 'fleet') {
          const fleetComp = unit.composition as FleetComposition
          console.log('    Ships object:', fleetComp.ships)
          const totalShips = Object.values(fleetComp.ships || {}).reduce((sum, n) => sum + n, 0)
          console.log('    🚢 Total naves:', totalShips)
          console.log('    Has embarkedTroops:', !!unit.embarkedTroops)
          if (unit.embarkedTroops) {
            console.log('    Embarked troops:', unit.embarkedTroops.troops)
            const embarkedCount = Object.values(unit.embarkedTroops.troops || {})
              .reduce((sum, n) => sum + (n || 0), 0)
            console.log('    👥 Total embarcadas:', embarkedCount)
          }
        }
      } else {
        console.warn('    ⚠️  NO TIENE COMPOSITION')
      }

      // Verificar adyacencia
      const isAdjacent = adjacentProvinces.includes(unit.currentPosition)
      console.log('    📍 Está en provincia adyacente:', isAdjacent)

      console.groupEnd()
    })

    const result = playerUnits.filter(unit => {
      // Validar que la unidad no esté ya asignada a otra campaña
      if (assignedUnitIds.has(unit.id)) {
        console.log(`❌ ${unit.type} ${unit.id}: RECHAZADO (ya asignado a otra campaña)`)
        return false
      }

      // Validar que la unidad tenga composición válida
      if (!unit.composition) {
        console.log(`❌ ${unit.type} ${unit.id}: RECHAZADO (sin composition)`)
        return false
      }

      // CASO 1: FLOTAS
      if (unit.type === 'fleet') {
        // Validar que tenga naves
        const fleetComp = unit.composition as FleetComposition
        const totalShips = Object.values(fleetComp.ships || {}).reduce((sum, n) => sum + n, 0)
        if (totalShips === 0) {
          console.log(`❌ Fleet ${unit.id}: RECHAZADO (sin naves)`)
          return false
        }

        // CASO 1A: Flotas con tropas embarcadas (campañas anfibias)
        if (unit.embarkedTroops) {
          const embarkedCount = Object.values(unit.embarkedTroops.troops || {})
            .reduce((sum, n) => sum + (n || 0), 0)

          // Pueden atacar CUALQUIER costa desde CUALQUIER posición
          if (embarkedCount > 0 && isTargetCoastal) {
            console.log(`✅ Fleet ${unit.id}: ACEPTADO (anfibia, ${embarkedCount} tropas)`)
            return true
          } else if (embarkedCount > 0 && !isTargetCoastal) {
            console.log(`❌ Fleet ${unit.id}: RECHAZADO (tiene tropas pero objetivo no costero)`)
          } else if (embarkedCount === 0) {
            console.log(`⚠️  Fleet ${unit.id}: Sin tropas embarcadas, intentando como flota normal...`)
          }
        }

        // CASO 1B: Flotas sin tropas embarcadas
        // Solo pueden atacar provincias adyacentes navegables
        if (!adjacentProvinces.includes(unit.currentPosition)) {
          console.log(`❌ Fleet ${unit.id}: RECHAZADO (no adyacente)`)
          return false
        }

        const targetInfo = game.map.provinces[targetProvince]
        const isNavigable = targetInfo?.type === 'sea' || targetInfo?.type === 'port'
        if (isNavigable) {
          console.log(`✅ Fleet ${unit.id}: ACEPTADO (flota normal adyacente a ${targetInfo.type})`)
        } else {
          console.log(`❌ Fleet ${unit.id}: RECHAZADO (objetivo no navegable: ${targetInfo?.type})`)
        }
        return isNavigable
      }

      // CASO 2: EJÉRCITOS
      if (unit.type === 'army') {
        // Validar que el ejército tenga tropas
        const armyComp = unit.composition as ArmyComposition
        const totalTroops = Object.values(armyComp.troops || {}).reduce((sum, n) => sum + n, 0)
        if (totalTroops === 0) {
          console.log(`❌ Army ${unit.id}: RECHAZADO (sin tropas)`)
          return false
        }

        // Deben estar en provincia adyacente al objetivo
        if (!adjacentProvinces.includes(unit.currentPosition)) {
          console.log(`❌ Army ${unit.id}: RECHAZADO (no adyacente, está en ${unit.currentPosition})`)
          return false
        }

        // El objetivo debe ser terrestre (land o port)
        const targetInfo = game.map.provinces[targetProvince]
        const isTerrestrial = targetInfo?.type === 'land' || targetInfo?.type === 'port'
        if (isTerrestrial) {
          console.log(`✅ Army ${unit.id}: ACEPTADO (${totalTroops} tropas, adyacente a ${targetInfo.type})`)
        } else {
          console.log(`❌ Army ${unit.id}: RECHAZADO (objetivo no terrestre: ${targetInfo?.type})`)
        }
        return isTerrestrial
      }

      console.log(`❌ ${unit.type} ${unit.id}: RECHAZADO (tipo desconocido)`)
      return false
    })

    console.log('📋 RESULTADO FINAL: Unidades disponibles:', result.length)
    console.groupEnd()
    return result
    // ===== FIN DEBUGGING =====
  }, [units, player.id, game.map, targetProvince, campaigns])

  // Calcular ruta anfibia si hay flotas seleccionadas
  const maritimeRoute = useMemo<MaritimeRoute | null>(() => {
    if (!game.map) return null

    const selectedUnitObjs = availableUnits.filter(u => selectedUnits.has(u.id))
    const hasFleets = selectedUnitObjs.some(u => u.type === 'fleet')

    if (!hasFleets) return null

    // Buscar flota con posición para calcular ruta
    const fleet = selectedUnitObjs.find(u => u.type === 'fleet')
    if (!fleet) return null

    return findAmphibiousRoute(game.map, fleet.currentPosition, targetProvince)
  }, [game.map, selectedUnits, availableUnits, targetProvince])

  // Toggle selección de unidad
  const toggleUnitSelection = (unitId: string) => {
    const newSelection = new Set(selectedUnits)
    if (newSelection.has(unitId)) {
      newSelection.delete(unitId)
    } else {
      newSelection.add(unitId)
    }
    setSelectedUnits(newSelection)
  }

  // Calcular fuerza total
  const totalStrength = useMemo(() => {
    const selectedUnitObjs = availableUnits.filter(u => selectedUnits.has(u.id))
    return calculateCampaignStrength(selectedUnitObjs)
  }, [selectedUnits, availableUnits])

  // Validar selección
  const validation = useMemo(() => {
    const selectedUnitObjs = availableUnits.filter(u => selectedUnits.has(u.id))
    return validateCampaignUnits(selectedUnitObjs, targetProvince, !!maritimeRoute)
  }, [selectedUnits, availableUnits, targetProvince, maritimeRoute])

  // Handler para declarar campaña
  const handleDeclareCampaign = async () => {
    if (!validation.isValid) {
      setSaveMessage(validation.error || 'Selección inválida')
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const campaignData: any = {
        gameId: game.id,
        targetProvince,
        declaredBy: player.userId,
        declaredByFaction: player.faction,
        turnDeclared: game.turnNumber,
        year: game.currentYear,
        status: 'planning',
        participatingUnits: Array.from(selectedUnits),
        createdAt: Timestamp.now()
      }

      // Solo añadir route si existe (Firestore no acepta undefined)
      if (maritimeRoute) {
        campaignData.route = maritimeRoute
      }

      await addDoc(collection(db, 'campaigns'), campaignData)

      setSaveMessage('¡Campaña declarada con éxito!')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error al declarar campaña:', error)
      setSaveMessage('Error al guardar la campaña')
    } finally {
      setIsSaving(false)
    }
  }

  // Información de la provincia objetivo
  const targetProvinceInfo = game.map ? getProvinceInfo(game.map, targetProvince) : null
  const targetFaction = provinceFaction[targetProvince]

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#e8dcc0] border-4 border-[#4a3f2a] rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#2d2416] border-b-4 border-[#6b5d42] flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <img src="/icons/campañas.png" alt="" className="w-8 h-8 object-contain" />
            <div>
              <h2 className="text-2xl font-heading text-[#f0d877]">Campaña Militar</h2>
              {targetProvinceInfo && (
                <p className="text-sm text-[#e8dcc0]">
                  Objetivo: {targetProvinceInfo.name} ({targetFaction})
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-[#e8dcc0] hover:text-[#f0d877] text-2xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-[#6b5d42] bg-[#2d2416]">
          <button
            onClick={() => setActiveTab('plan')}
            disabled={game.currentPhase !== 'diplomatic'}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2
              ${
                activeTab === 'plan'
                  ? 'bg-[#4a3f2a] text-[#e8dcc0] border-b-4 border-renaissance-gold shadow-inner'
                  : game.currentPhase !== 'diplomatic'
                  ? 'text-[#8b7355] cursor-not-allowed'
                  : 'text-[#e8dcc0] hover:bg-[#3d3422]'
              }`}
          >
            <img src="/icons/reclutar.png" alt="" className="w-6 h-6 object-contain" />
            Planificar Campaña
          </button>

          <button
            onClick={() => setActiveTab('tactics')}
            disabled={!existingCampaign || game.currentPhase !== 'orders'}
            className={`flex-1 px-4 py-3 text-sm font-heading font-semibold transition-colors flex items-center justify-center gap-2
              ${
                activeTab === 'tactics'
                  ? 'bg-[#4a3f2a] text-[#e8dcc0] border-b-4 border-renaissance-gold shadow-inner'
                  : !existingCampaign || game.currentPhase !== 'orders'
                  ? 'text-[#8b7355] cursor-not-allowed'
                  : 'text-[#e8dcc0] hover:bg-[#3d3422]'
              }`}
          >
            <img src="/icons/mapa.png" alt="" className="w-6 h-6 object-contain" />
            Gestión Táctica
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'plan' && (
            <div className="space-y-6">
              {/* Información de la campaña */}
              <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-4">
                <h3 className="text-lg font-heading font-semibold text-[#2d1810] mb-2">
                  Información de la Campaña
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-[#4a3f2a]">Turno:</span>{' '}
                    <span className="text-[#2d1810]">
                      {game.currentSeason === 'spring' ? 'Primavera' : 'Otoño'} {game.currentYear}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#4a3f2a]">Fase:</span>{' '}
                    <span className="text-[#2d1810]">Diplomática</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#4a3f2a]">Fuerza Total:</span>{' '}
                    <span className="text-[#2d1810] font-bold">{totalStrength} puntos</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#4a3f2a]">Unidades:</span>{' '}
                    <span className="text-[#2d1810]">{selectedUnits.size} seleccionadas</span>
                  </div>
                </div>

                {/* Ruta anfibia */}
                {maritimeRoute && (
                  <div className="mt-4 p-3 bg-[#4a7c9e]/20 border border-[#4a7c9e] rounded">
                    <div className="flex items-center gap-2 text-sm text-[#2d1810]">
                      <img
                        src="/icons/puerto_mini.png"
                        alt=""
                        className="w-5 h-5 object-contain"
                      />
                      <span className="font-semibold">Ruta Anfibia Detectada:</span>
                      <span>
                        {maritimeRoute.path.join(' → ')} ({maritimeRoute.estimatedDays} días de
                        navegación)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de unidades */}
              <div>
                <h3 className="text-lg font-heading font-semibold text-[#2d1810] mb-3">
                  Seleccionar Fuerzas Participantes
                </h3>

                {availableUnits.length === 0 ? (
                  <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-6 text-center">
                    <p className="text-[#4a3f2a]">
                      No tienes unidades disponibles para esta campaña
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableUnits.map(unit => (
                      <div
                        key={unit.id}
                        onClick={() => !existingCampaign && toggleUnitSelection(unit.id)}
                        className={`bg-[#d4c4a1] border-2 rounded-lg p-4 transition-all
                          ${!existingCampaign ? 'cursor-pointer' : 'cursor-default'}
                          ${
                            selectedUnits.has(unit.id)
                              ? 'border-renaissance-gold shadow-md bg-[#c4b49a]'
                              : existingCampaign
                              ? 'border-[#b4a481]'
                              : 'border-[#b4a481] hover:border-[#8b7355]'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Checkbox - Solo visible si NO es campaña existente */}
                          {!existingCampaign && (
                            <input
                              type="checkbox"
                              checked={selectedUnits.has(unit.id)}
                              onChange={() => toggleUnitSelection(unit.id)}
                              className="w-5 h-5 accent-renaissance-gold cursor-pointer"
                            />
                          )}

                          {/* Icono tipo */}
                          <img
                            src={
                              unit.type === 'army' ? '/icons/reclutar.png' : '/icons/puerto_mini.png'
                            }
                            alt={unit.type}
                            className="w-8 h-8 object-contain"
                          />

                          {/* Info */}
                          <div className="flex-1">
                            <h4 className="font-heading font-semibold text-[#2d1810]">
                              {formatUnitName(unit)}
                            </h4>
                            <p className="text-sm text-[#4a3f2a]">
                              {getUnitCompositionSummary(unit)}
                            </p>
                          </div>

                          {/* Ubicación */}
                          <div className="text-right">
                            <p className="text-xs text-[#6b5d42]">Origen</p>
                            <p className="text-sm font-semibold text-[#2d1810]">
                              {getProvinceName(game.map, unit.currentPosition)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mensaje de error */}
              {!validation.isValid && selectedUnits.size > 0 && (
                <div className="bg-red-100 border-2 border-red-600 rounded-lg p-3">
                  <p className="text-red-800 text-sm font-semibold">{validation.error}</p>
                </div>
              )}

              {/* Mensaje de guardado */}
              {saveMessage && (
                <div
                  className={`border-2 rounded-lg p-3 ${
                    saveMessage.includes('éxito')
                      ? 'bg-green-100 border-green-600 text-green-800'
                      : 'bg-red-100 border-red-600 text-red-800'
                  }`}
                >
                  <p className="text-sm font-semibold">{saveMessage}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tactics' && (
            <div className="space-y-6">
              {/* Placeholder para gestión táctica */}
              <div className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-6 text-center">
                <img
                  src="/icons/mapa.png"
                  alt=""
                  className="w-16 h-16 object-contain mx-auto mb-4 opacity-50"
                />
                <h3 className="text-xl font-heading font-semibold text-[#2d1810] mb-2">
                  Gestión Táctica
                </h3>
                <p className="text-[#4a3f2a] mb-4">
                  Aquí podrás gestionar tus fuerzas durante la fase de órdenes
                </p>
                <div className="bg-[#f4e4c1] border border-[#b4a481] rounded p-4 text-left">
                  <p className="text-sm text-[#6b5d42] italic">
                    Funcionalidad en desarrollo. Próximamente podrás:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[#4a3f2a]">
                    <li>• Dar órdenes a unidades de la campaña</li>
                    <li>• Reasignar fuerzas entre campañas</li>
                    <li>• Ver el progreso de la campaña</li>
                    <li>• Coordinar movimientos tácticos</li>
                  </ul>
                </div>
              </div>

              {/* Mostrar unidades participantes */}
              {existingCampaign && (
                <div>
                  <h3 className="text-lg font-heading font-semibold text-[#2d1810] mb-3">
                    Fuerzas Asignadas
                  </h3>
                  <div className="space-y-2">
                    {existingCampaign.participatingUnits.map(unitId => {
                      const unit = units.find(u => u.id === unitId)
                      if (!unit) return null

                      return (
                        <div
                          key={unitId}
                          className="bg-[#d4c4a1] border-2 border-[#b4a481] rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                unit.type === 'army'
                                  ? '/icons/reclutar.png'
                                  : '/icons/puerto_mini.png'
                              }
                              alt={unit.type}
                              className="w-6 h-6 object-contain"
                            />
                            <div className="flex-1">
                              <h4 className="font-heading font-semibold text-[#2d1810] text-sm">
                                {formatUnitName(unit)}
                              </h4>
                              <p className="text-xs text-[#4a3f2a]">
                                {getUnitCompositionSummary(unit)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-[#6b5d42] bg-[#2d2416] flex justify-between items-center rounded-b-lg">
          {activeTab === 'plan' && (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#6b5d42] hover:bg-[#8b7355] text-[#e8dcc0] rounded font-heading font-semibold transition-colors"
              >
                Cancelar
              </button>
              {!existingCampaign && (
                <button
                  onClick={handleDeclareCampaign}
                  disabled={!validation.isValid || isSaving}
                  className={`px-6 py-2 rounded font-heading font-semibold transition-colors
                    ${
                      validation.isValid && !isSaving
                        ? 'bg-renaissance-gold hover:bg-[#c9a961] text-[#1d1408]'
                        : 'bg-[#4a3f2a] text-[#8b7355] cursor-not-allowed'
                    }`}
                >
                  {isSaving ? 'Declarando...' : 'Declarar Campaña'}
                </button>
              )}
            </>
          )}

          {activeTab === 'tactics' && (
            <button
              onClick={onClose}
              className="w-full px-6 py-2 bg-[#6b5d42] hover:bg-[#8b7355] text-[#e8dcc0] rounded font-heading font-semibold transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
