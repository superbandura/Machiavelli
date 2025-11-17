import { useState, useEffect, useMemo } from 'react'
import { Unit, Order, Player, Game } from '@/types'
import { validateOrder, getValidMoveDestinations, getValidSupportTargets } from '@/utils/orderValidation'
import { getProvinceInfo } from '@/utils/gameMapHelpers'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Separator from './decorative/Separator'

interface OrdersPanelProps {
  game: Game
  player: Player
  units: Unit[]
  selectedUnit: Unit | null
  onUnitSelect: (unit: Unit) => void
  currentPhase: string
  turnNumber: number
}

export default function OrdersPanel({
  game,
  player,
  units,
  selectedUnit,
  onUnitSelect,
  currentPhase,
  turnNumber
}: OrdersPanelProps) {
  const gameId = game.id
  // Estado local de órdenes (antes de guardar en Firestore)
  const [orders, setOrders] = useState<Record<string, Order>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Filtrar unidades del jugador
  const myUnits = units.filter(u => u.owner === player.id)

  // Verificar si es fase de órdenes
  const canGiveOrders = currentPhase === 'orders'

  // Cargar órdenes existentes desde Firestore
  useEffect(() => {
    if (!canGiveOrders || !gameId || !player.id) return

    const loadExistingOrders = async () => {
      try {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('gameId', '==', gameId),
          where('playerId', '==', player.userId),
          where('turnNumber', '==', turnNumber)
        )
        const snapshot = await getDocs(ordersQuery)

        if (!snapshot.empty) {
          const loadedOrders: Record<string, Order> = {}
          snapshot.docs[0].data().orders.forEach((order: Order) => {
            loadedOrders[order.unitId] = order
          })
          setOrders(loadedOrders)
          console.log('[OrdersPanel] Órdenes cargadas:', loadedOrders)
        }
      } catch (error) {
        console.error('[OrdersPanel] Error cargando órdenes:', error)
      }
    }

    loadExistingOrders()
  }, [canGiveOrders, gameId, player.id, turnNumber])

  // Handler para cambiar el tipo de orden
  const handleOrderChange = (unitId: string, field: keyof Order, value: any) => {
    const unit = units.find(u => u.id === unitId)
    if (!unit) return

    const newOrder: Order = {
      ...orders[unitId],
      unitId,
      [field]: value,
      isValid: false
    }

    // Si cambia el tipo de acción, limpiar campos opcionales
    if (field === 'action') {
      delete newOrder.targetProvince
      delete newOrder.supportedUnit
      delete newOrder.convoyRoute
    }

    // Validar la orden inmediatamente
    const validation = validateOrder(game.map, newOrder, unit, units)
    newOrder.isValid = validation.isValid
    if (validation.error) {
      newOrder.validationError = validation.error
    }

    setOrders(prev => ({
      ...prev,
      [unitId]: newOrder
    }))
  }

  // Handler para guardar órdenes
  const handleSaveOrders = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Validar todas las órdenes antes de guardar
      const ordersList = Object.values(orders)
      const invalidOrders = ordersList.filter(o => !o.isValid)

      if (invalidOrders.length > 0) {
        setSaveMessage(`Hay ${invalidOrders.length} orden(es) inválida(s)`)
        setIsSaving(false)
        return
      }

      // Primero, eliminar órdenes anteriores de este jugador en este turno
      const existingOrdersQuery = query(
        collection(db, 'orders'),
        where('gameId', '==', gameId),
        where('playerId', '==', player.userId),
        where('turnNumber', '==', turnNumber)
      )
      const existingSnapshot = await getDocs(existingOrdersQuery)
      const deletePromises = existingSnapshot.docs.map(d => deleteDoc(doc(db, 'orders', d.id)))
      await Promise.all(deletePromises)

      // Guardar nuevas órdenes
      await addDoc(collection(db, 'orders'), {
        gameId,
        playerId: player.userId,
        turnNumber,
        phase: 'orders',
        orders: ordersList,
        submittedAt: serverTimestamp()
      })

      setSaveMessage('✓ Órdenes guardadas correctamente')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Error guardando órdenes:', error)
      setSaveMessage('Error al guardar órdenes')
    } finally {
      setIsSaving(false)
    }
  }

  // Obtener destinos válidos para una unidad
  const getValidDestinationsForUnit = useMemo(() => {
    return (unit: Unit) => getValidMoveDestinations(game.map, unit)
  }, [game.map])

  // Obtener unidades válidas para apoyo
  const getValidSupportTargetsForUnit = useMemo(() => {
    return (unit: Unit) => getValidSupportTargets(game.map, unit, units)
  }, [game.map, units])

  // Agrupar unidades por provincia
  const unitsByProvince = useMemo(() => {
    const grouped: Record<string, Unit[]> = {}
    myUnits.forEach(unit => {
      if (!grouped[unit.currentPosition]) {
        grouped[unit.currentPosition] = []
      }
      grouped[unit.currentPosition].push(unit)
    })
    return grouped
  }, [myUnits])

  // Función para obtener el label del tipo de unidad
  const getUnitTypeLabel = (type: Unit['type']) => {
    switch(type) {
      case 'army': return 'Ejército'
      case 'fleet': return 'Flota'
      case 'garrison': return 'Guarnición'
      default: return type
    }
  }

  // Función para renderizar la composición de una unidad
  const renderComposition = (unit: Unit) => {
    if (!unit.composition) return null

    if (unit.type === 'fleet') {
      const comp = unit.composition as any
      return (
        <div className="text-xs font-serif text-gray-700 flex gap-2 mt-1">
          {comp.galleys > 0 && <span>⛵ {comp.galleys} Galeras</span>}
          {comp.roundships > 0 && <span>🚢 {comp.roundships} Naos</span>}
        </div>
      )
    } else {
      const comp = unit.composition as any
      return (
        <div className="text-xs font-serif text-gray-700 flex gap-2 mt-1">
          {comp.infantry > 0 && <span>🗡️ {comp.infantry} Infantería</span>}
          {comp.cavalry > 0 && <span>🐎 {comp.cavalry} Caballería</span>}
          {comp.artillery > 0 && <span>💣 {comp.artillery} Artillería</span>}
        </div>
      )
    }
  }

  // Renderizar mensaje si no es fase de órdenes
  if (!canGiveOrders) {
    return (
      <div className="p-5 bg-gray-800 rounded-lg border-2 border-renaissance-bronze shadow-ornate">
        <h3 className="font-heading font-bold text-xl text-renaissance-bronze mb-3">⚔️ Órdenes Militares</h3>
        <Separator variant="burgundy" className="mb-4" />
        <div className="text-gray-800 font-serif text-sm bg-[#f4e4c1]/40 rounded-lg p-4 border border-[#b4a481]">
          {currentPhase === 'diplomatic' && '📜 Fase Diplomática - Las órdenes militares deben aguardar'}
          {currentPhase === 'resolution' && '⚙️ Fase de Resolución - Las órdenes están siendo ejecutadas'}
          {currentPhase === 'finished' && '🏁 Partida finalizada'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#d4c4a1]">
      {/* Header ornamentado */}
      <div className="p-3 border-b border-[#1d1408] bg-[#2d2416]">
        <h3 className="font-heading font-bold text-lg text-white mb-1 flex items-center gap-2">
          <img src="/icons/ordenes.png" alt="Órdenes Militares" className="w-6 h-6" />
          Órdenes Militares
        </h3>
        <div className="text-xs font-serif text-gray-200">
          {myUnits.length} {myUnits.length === 1 ? 'unidad' : 'unidades'} bajo tu mando
        </div>
      </div>

      {myUnits.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-gray-700 font-serif text-sm text-center italic bg-[#f4e4c1]/40 rounded-lg p-6 border-2 border-[#b4a481]">
            No dispones de unidades en el mapa
          </div>
        </div>
      ) : (
        <>
          {/* Desplegable de selección de unidad */}
          <div className="p-3 border-b border-renaissance-bronze/30 bg-[#f4e4c1]/40">
            <label className="block text-xs font-heading font-semibold text-gray-800 mb-1.5 uppercase tracking-wide">
              Seleccionar Unidad
            </label>
            <select
              className="w-full bg-[#f4e4c1] border border-renaissance-bronze rounded px-2.5 py-2 text-xs font-serif text-black focus:border-renaissance-gold transition-colors"
              value={selectedUnit?.id || ''}
              onChange={(e) => {
                const unit = myUnits.find(u => u.id === e.target.value)
                if (unit) onUnitSelect(unit)
              }}
            >
              <option value="">-- Elegir una unidad --</option>
              {myUnits
                .sort((a, b) => a.currentPosition.localeCompare(b.currentPosition))
                .map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name || `${getUnitTypeLabel(unit.type)} sin nombre`} • {getUnitTypeLabel(unit.type)} • {unit.currentPosition}
                  </option>
                ))}
            </select>
          </div>

          {/* Tarjeta de la unidad seleccionada */}
          <div className="flex-1 overflow-y-auto p-3">
            {selectedUnit && myUnits.some(u => u.id === selectedUnit.id) ? (
              <div className="border rounded border-renaissance-gold bg-renaissance-gold/10 p-3">
                {/* Información de la unidad */}
                <div className="mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-heading font-bold text-sm text-renaissance-gold mb-0.5">
                        {selectedUnit.name || `${getUnitTypeLabel(selectedUnit.type)} sin nombre`}
                      </h4>
                      <div className="text-xs font-serif text-gray-800 capitalize mb-0.5">
                        {getUnitTypeLabel(selectedUnit.type)} • {selectedUnit.currentPosition}
                      </div>
                      {renderComposition(selectedUnit)}
                    </div>
                    <div className={`text-[10px] font-serif px-2 py-1 rounded border whitespace-nowrap ml-2 ${
                      orders[selectedUnit.id]
                        ? orders[selectedUnit.id].isValid
                          ? 'bg-renaissance-olive/20 text-renaissance-olive-light border-renaissance-olive'
                          : 'bg-burgundy-700/30 text-burgundy-300 border-burgundy-500'
                        : 'bg-gray-700/50 text-gray-700 border-gray-600'
                    }`}>
                      {orders[selectedUnit.id]
                        ? orders[selectedUnit.id].isValid
                          ? '✓ Válida'
                          : '✗ Inválida'
                        : 'Sin orden'}
                    </div>
                  </div>

                  <Separator variant="gold" />
                </div>

                {/* Error de validación */}
                {orders[selectedUnit.id] && !orders[selectedUnit.id].isValid && orders[selectedUnit.id].validationError && (
                  <div className="text-xs font-serif text-burgundy-200 bg-burgundy-700/30 border border-burgundy-500 rounded p-2 mb-3">
                    ⚠️ {orders[selectedUnit.id].validationError}
                  </div>
                )}

                {/* Selector de orden */}
                <div>
                  <label className="block text-xs font-heading font-semibold text-gray-800 mb-1.5 uppercase tracking-wide">
                    Tipo de Orden
                  </label>
                  <select
                    className="w-full bg-[#f4e4c1] border border-renaissance-bronze rounded px-2.5 py-2 text-xs font-serif text-black focus:border-renaissance-gold transition-colors"
                    value={orders[selectedUnit.id]?.action || ''}
                    onChange={(e) => handleOrderChange(selectedUnit.id, 'action', e.target.value)}
                  >
                    <option value="">Seleccionar orden...</option>
                    <option value="hold">⚓ Mantener Posición (Hold)</option>
                    <option value="move">➡️ Avanzar (Move)</option>
                    <option value="support">🤝 Apoyar (Support)</option>
                    {selectedUnit.type === 'fleet' && (
                      <option value="convoy">⛵ Convoy (Transport)</option>
                    )}
                    {selectedUnit.type !== 'garrison' && (
                      <option value="besiege">🏰 Asediar (Siege)</option>
                    )}
                    <option value="convert">🔄 Convertirse (Convert)</option>
                  </select>

                  {/* Opciones adicionales según el tipo de orden */}
                  {orders[selectedUnit.id]?.action === 'move' && (
                    <div className="mt-2">
                      <label className="block text-xs font-heading font-semibold text-gray-800 mb-1.5 uppercase tracking-wide">
                        Destino
                      </label>
                      <select
                        className="w-full bg-[#f4e4c1] border border-renaissance-bronze rounded px-2.5 py-2 text-xs font-serif text-black focus:border-renaissance-gold transition-colors"
                        value={orders[selectedUnit.id]?.targetProvince || ''}
                        onChange={(e) => handleOrderChange(selectedUnit.id, 'targetProvince', e.target.value)}
                      >
                        <option value="">Seleccionar provincia...</option>
                        {getValidDestinationsForUnit(selectedUnit).map(provinceId => {
                          const provinceInfo = getProvinceInfo(game.map, provinceId)
                          return (
                            <option key={provinceId} value={provinceId}>
                              📍 {provinceInfo?.name || provinceId}
                            </option>
                          )
                        })}
                      </select>
                      {getValidDestinationsForUnit(selectedUnit).length === 0 && (
                        <div className="text-xs font-serif text-gray-700 mt-2 italic">
                          {selectedUnit.type === 'garrison' ? 'Las guarniciones no pueden moverse' : 'No hay destinos válidos'}
                        </div>
                      )}
                    </div>
                  )}

                  {orders[selectedUnit.id]?.action === 'support' && (
                    <div className="mt-2">
                      <label className="block text-xs font-heading font-semibold text-gray-800 mb-1.5 uppercase tracking-wide">
                        Unidad a apoyar
                      </label>
                      <select
                        className="w-full bg-[#f4e4c1] border border-renaissance-bronze rounded px-2.5 py-2 text-xs font-serif text-black focus:border-renaissance-gold transition-colors"
                        value={orders[selectedUnit.id]?.supportedUnit || ''}
                        onChange={(e) => handleOrderChange(selectedUnit.id, 'supportedUnit', e.target.value)}
                      >
                        <option value="">Seleccionar unidad...</option>
                        {getValidSupportTargetsForUnit(selectedUnit).map(u => (
                          <option key={u.id} value={u.id}>
                            🤝 {u.type} en {u.currentPosition}
                          </option>
                        ))}
                      </select>
                      {getValidSupportTargetsForUnit(selectedUnit).length === 0 && (
                        <div className="text-xs font-serif text-gray-700 mt-2 italic">
                          No hay unidades adyacentes para apoyar
                        </div>
                      )}
                    </div>
                  )}

                  {orders[selectedUnit.id]?.action === 'convoy' && (
                    <div className="mt-2">
                      <label className="block text-xs font-heading font-semibold text-gray-800 mb-1.5 uppercase tracking-wide">
                        Ejército a transportar
                      </label>
                      <select
                        className="w-full bg-[#f4e4c1] border border-renaissance-bronze rounded px-2.5 py-2 text-xs font-serif text-black focus:border-renaissance-gold transition-colors"
                        value={orders[selectedUnit.id]?.supportedUnit || ''}
                        onChange={(e) => handleOrderChange(selectedUnit.id, 'supportedUnit', e.target.value)}
                      >
                        <option value="">Seleccionar ejército...</option>
                        {units.filter(u => u.type === 'army').map(u => (
                          <option key={u.id} value={u.id}>
                            Ejército en {u.currentPosition}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {orders[selectedUnit.id]?.action === 'besiege' && (
                    <div className="mt-2">
                      <label className="block text-xs font-heading font-semibold text-gray-800 mb-1.5 uppercase tracking-wide">
                        Ciudad a asediar
                      </label>
                      <select
                        className="w-full bg-[#f4e4c1] border border-renaissance-bronze rounded px-2.5 py-2 text-xs font-serif text-black focus:border-renaissance-gold transition-colors"
                        value={orders[selectedUnit.id]?.targetProvince || ''}
                        onChange={(e) => handleOrderChange(selectedUnit.id, 'targetProvince', e.target.value)}
                      >
                        <option value="">Seleccionar ciudad...</option>
                        <option value={selectedUnit.currentPosition}>
                          🏰 {getProvinceInfo(game.map, selectedUnit.currentPosition)?.cityName || selectedUnit.currentPosition}
                        </option>
                      </select>
                      <div className="text-xs font-serif text-gray-700 mt-2 italic">
                        Solo puedes asediar la ciudad de tu provincia actual
                      </div>
                    </div>
                  )}

                  {orders[selectedUnit.id]?.action === 'convert' && (
                    <div className="mt-2">
                      <label className="block text-xs font-heading font-semibold text-gray-800 mb-1.5 uppercase tracking-wide">
                        Convertir a
                      </label>
                      <select
                        className="w-full bg-[#f4e4c1] border border-renaissance-bronze rounded px-2.5 py-2 text-xs font-serif text-black focus:border-renaissance-gold transition-colors"
                        value={orders[selectedUnit.id]?.targetProvince || ''}
                        onChange={(e) => handleOrderChange(selectedUnit.id, 'targetProvince', e.target.value)}
                      >
                        <option value="">Seleccionar tipo...</option>
                        {selectedUnit.type === 'fleet' && <option value="army">🗡️ Ejército (Army)</option>}
                        {selectedUnit.type === 'army' && <option value="fleet">⛵ Flota (Fleet)</option>}
                        {selectedUnit.type === 'garrison' && <option value="army">🗡️ Ejército (Army)</option>}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-gray-700 font-serif text-sm text-center italic bg-[#f4e4c1]/40 rounded-lg p-6 border-2 border-[#b4a481]">
                  Selecciona una unidad del desplegable superior para dar órdenes
                </div>
              </div>
            )}
          </div>

          {/* Footer con botón de guardar ornamentado */}
          <div className="p-3 border-t border-renaissance-bronze/50 bg-[#f4e4c1]/40">
            {saveMessage && (
              <div className={`text-xs font-serif mb-2 p-2 rounded border ${
                saveMessage.includes('Error')
                  ? 'bg-burgundy-700/30 text-burgundy-200 border-burgundy-500'
                  : 'bg-renaissance-olive/20 text-renaissance-olive-light border-renaissance-olive'
              }`}>
                {saveMessage}
              </div>
            )}
            <button
              onClick={handleSaveOrders}
              disabled={isSaving || Object.keys(orders).length === 0}
              className={`w-full py-2 rounded font-heading font-bold text-sm transition-all duration-200 border ${
                isSaving || Object.keys(orders).length === 0
                  ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'
                  : 'bg-renaissance-gold/20 hover:bg-renaissance-gold/30 text-renaissance-gold border-renaissance-gold hover:shadow-glow-gold'
              }`}
            >
              {isSaving ? '📜 Guardando...' : '📜 Guardar Órdenes'}
            </button>
            <div className="text-[10px] font-serif text-gray-700 mt-2 text-center italic">
              Puedes modificar tus órdenes hasta el final de la fase
            </div>
          </div>
        </>
      )}
    </div>
  )
}
