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

  // Renderizar mensaje si no es fase de órdenes
  if (!canGiveOrders) {
    return (
      <div className="p-5 bg-gray-800 rounded-lg border-2 border-renaissance-bronze shadow-ornate">
        <h3 className="font-heading font-bold text-xl text-renaissance-bronze mb-3">⚔️ Órdenes Militares</h3>
        <Separator variant="burgundy" className="mb-4" />
        <div className="text-parchment-300 font-serif text-sm bg-gray-900/40 rounded-lg p-4 border border-gray-700">
          {currentPhase === 'diplomatic' && '📜 Fase Diplomática - Las órdenes militares deben aguardar'}
          {currentPhase === 'resolution' && '⚙️ Fase de Resolución - Las órdenes están siendo ejecutadas'}
          {currentPhase === 'finished' && '🏁 Partida finalizada'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg border-2 border-renaissance-bronze shadow-ornate">
      {/* Header ornamentado */}
      <div className="p-5 border-b-2 border-renaissance-bronze/50">
        <h3 className="font-heading font-bold text-xl text-renaissance-bronze mb-2">⚔️ Órdenes Militares</h3>
        <div className="text-sm font-serif text-parchment-300">
          {myUnits.length} {myUnits.length === 1 ? 'unidad' : 'unidades'} bajo tu mando
        </div>
      </div>

      {/* Lista de unidades */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {myUnits.length === 0 ? (
          <div className="text-parchment-400 font-serif text-sm text-center py-8 italic">
            No dispones de unidades en el mapa
          </div>
        ) : (
          myUnits.map((unit) => (
            <div
              key={unit.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                selectedUnit?.id === unit.id
                  ? 'border-renaissance-gold bg-renaissance-gold/10 shadow-glow-gold'
                  : 'border-gray-700 hover:border-renaissance-bronze hover:bg-gray-900/40'
              }`}
              onClick={() => onUnitSelect(unit)}
            >
              {/* Información de la unidad */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-heading font-semibold text-base capitalize text-parchment-200">{unit.type}</div>
                  <div className="text-sm font-serif text-gray-400 mt-0.5">{unit.currentPosition}</div>
                </div>
                <div className={`text-xs font-serif px-3 py-1.5 rounded-lg border-2 ${
                  orders[unit.id]
                    ? orders[unit.id].isValid
                      ? 'bg-renaissance-olive/20 text-renaissance-olive-light border-renaissance-olive'
                      : 'bg-burgundy-700/30 text-burgundy-300 border-burgundy-500'
                    : 'bg-gray-700/50 text-gray-400 border-gray-600'
                }`}>
                  {orders[unit.id]
                    ? orders[unit.id].isValid
                      ? '✓ Válida'
                      : '✗ Inválida'
                    : 'Sin orden'}
                </div>
              </div>

              {/* Error de validación */}
              {orders[unit.id] && !orders[unit.id].isValid && orders[unit.id].validationError && (
                <div className="text-sm font-serif text-burgundy-200 bg-burgundy-700/30 border-2 border-burgundy-500 rounded-lg p-3 mb-3">
                  ⚠️ {orders[unit.id].validationError}
                </div>
              )}

              {/* Selector de orden */}
              {selectedUnit?.id === unit.id && (
                <div className="mt-3 pt-3 border-t-2 border-renaissance-bronze/30">
                  <label className="block text-sm font-heading font-semibold text-parchment-300 mb-2 uppercase tracking-wide">
                    Tipo de Orden
                  </label>
                  <select
                    className="w-full bg-gray-900 border-2 border-renaissance-bronze rounded-lg px-3 py-2.5 text-sm font-serif text-parchment-200 focus:border-renaissance-gold transition-colors"
                    value={orders[unit.id]?.action || ''}
                    onChange={(e) => handleOrderChange(unit.id, 'action', e.target.value)}
                  >
                    <option value="">Seleccionar orden...</option>
                    <option value="hold">⚓ Mantener Posición (Hold)</option>
                    <option value="move">➡️ Avanzar (Move)</option>
                    <option value="support">🤝 Apoyar (Support)</option>
                    {unit.type === 'fleet' && (
                      <option value="convoy">⛵ Convoy (Transport)</option>
                    )}
                    {unit.type !== 'garrison' && (
                      <option value="besiege">🏰 Asediar (Siege)</option>
                    )}
                    <option value="convert">🔄 Convertirse (Convert)</option>
                  </select>

                  {/* Opciones adicionales según el tipo de orden */}
                  {orders[unit.id]?.action === 'move' && (
                    <div className="mt-3">
                      <label className="block text-sm font-heading font-semibold text-parchment-300 mb-2 uppercase tracking-wide">
                        Destino
                      </label>
                      <select
                        className="w-full bg-gray-900 border-2 border-renaissance-bronze rounded-lg px-3 py-2.5 text-sm font-serif text-parchment-200 focus:border-renaissance-gold transition-colors"
                        value={orders[unit.id]?.targetProvince || ''}
                        onChange={(e) => handleOrderChange(unit.id, 'targetProvince', e.target.value)}
                      >
                        <option value="">Seleccionar provincia...</option>
                        {getValidDestinationsForUnit(unit).map(provinceId => {
                          const provinceInfo = getProvinceInfo(game.map, provinceId)
                          return (
                            <option key={provinceId} value={provinceId}>
                              📍 {provinceInfo?.name || provinceId}
                            </option>
                          )
                        })}
                      </select>
                      {getValidDestinationsForUnit(unit).length === 0 && (
                        <div className="text-xs font-serif text-gray-400 mt-2 italic">
                          {unit.type === 'garrison' ? 'Las guarniciones no pueden moverse' : 'No hay destinos válidos'}
                        </div>
                      )}
                    </div>
                  )}

                  {orders[unit.id]?.action === 'support' && (
                    <div className="mt-3">
                      <label className="block text-sm font-heading font-semibold text-parchment-300 mb-2 uppercase tracking-wide">
                        Unidad a apoyar
                      </label>
                      <select
                        className="w-full bg-gray-900 border-2 border-renaissance-bronze rounded-lg px-3 py-2.5 text-sm font-serif text-parchment-200 focus:border-renaissance-gold transition-colors"
                        value={orders[unit.id]?.supportedUnit || ''}
                        onChange={(e) => handleOrderChange(unit.id, 'supportedUnit', e.target.value)}
                      >
                        <option value="">Seleccionar unidad...</option>
                        {getValidSupportTargetsForUnit(unit).map(u => (
                          <option key={u.id} value={u.id}>
                            🤝 {u.type} en {u.currentPosition}
                          </option>
                        ))}
                      </select>
                      {getValidSupportTargetsForUnit(unit).length === 0 && (
                        <div className="text-xs font-serif text-gray-400 mt-2 italic">
                          No hay unidades adyacentes para apoyar
                        </div>
                      )}
                    </div>
                  )}

                  {orders[unit.id]?.action === 'convoy' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-1">
                        Ejército a transportar
                      </label>
                      <select
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                        value={orders[unit.id]?.supportedUnit || ''}
                        onChange={(e) => handleOrderChange(unit.id, 'supportedUnit', e.target.value)}
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

                  {orders[unit.id]?.action === 'besiege' && (
                    <div className="mt-3">
                      <label className="block text-sm font-heading font-semibold text-parchment-300 mb-2 uppercase tracking-wide">
                        Ciudad a asediar
                      </label>
                      <select
                        className="w-full bg-gray-900 border-2 border-renaissance-bronze rounded-lg px-3 py-2.5 text-sm font-serif text-parchment-200 focus:border-renaissance-gold transition-colors"
                        value={orders[unit.id]?.targetProvince || ''}
                        onChange={(e) => handleOrderChange(unit.id, 'targetProvince', e.target.value)}
                      >
                        <option value="">Seleccionar ciudad...</option>
                        <option value={unit.currentPosition}>
                          🏰 {getProvinceInfo(game.map, unit.currentPosition)?.cityName || unit.currentPosition}
                        </option>
                      </select>
                      <div className="text-xs font-serif text-gray-400 mt-2 italic">
                        Solo puedes asediar la ciudad de tu provincia actual
                      </div>
                    </div>
                  )}

                  {orders[unit.id]?.action === 'convert' && (
                    <div className="mt-3">
                      <label className="block text-sm font-heading font-semibold text-parchment-300 mb-2 uppercase tracking-wide">
                        Convertir a
                      </label>
                      <select
                        className="w-full bg-gray-900 border-2 border-renaissance-bronze rounded-lg px-3 py-2.5 text-sm font-serif text-parchment-200 focus:border-renaissance-gold transition-colors"
                        value={orders[unit.id]?.targetProvince || ''}
                        onChange={(e) => handleOrderChange(unit.id, 'targetProvince', e.target.value)}
                      >
                        <option value="">Seleccionar tipo...</option>
                        {unit.type === 'fleet' && <option value="army">🗡️ Ejército (Army)</option>}
                        {unit.type === 'army' && <option value="fleet">⛵ Flota (Fleet)</option>}
                        {unit.type === 'garrison' && <option value="army">🗡️ Ejército (Army)</option>}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer con botón de guardar ornamentado */}
      <div className="p-5 border-t-2 border-renaissance-bronze/50 bg-gray-900/40">
        {saveMessage && (
          <div className={`text-sm font-serif mb-3 p-3 rounded-lg border-2 ${
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
          className={`w-full py-3 rounded-lg font-heading font-bold text-base transition-all duration-200 border-2 ${
            isSaving || Object.keys(orders).length === 0
              ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'
              : 'bg-renaissance-gold/20 hover:bg-renaissance-gold/30 text-renaissance-gold border-renaissance-gold hover:shadow-glow-gold'
          }`}
        >
          {isSaving ? '📜 Guardando...' : '📜 Guardar Órdenes'}
        </button>
        <div className="text-xs font-serif text-gray-400 mt-3 text-center italic">
          Puedes modificar tus órdenes hasta el final de la fase
        </div>
      </div>
    </div>
  )
}
