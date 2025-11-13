import { useState, useEffect, useMemo } from 'react'
import { Unit, Order, Player } from '@/types'
import { validateOrder, getValidMoveDestinations, getValidSupportTargets } from '@/utils/orderValidation'
import { getProvinceInfo } from '@/data/provinceData'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface OrdersPanelProps {
  gameId: string
  player: Player
  units: Unit[]
  selectedUnit: Unit | null
  onUnitSelect: (unit: Unit) => void
  currentPhase: string
  turnNumber: number
}

export default function OrdersPanel({
  gameId,
  player,
  units,
  selectedUnit,
  onUnitSelect,
  currentPhase,
  turnNumber
}: OrdersPanelProps) {
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
          where('playerId', '==', player.id),
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
    const validation = validateOrder(newOrder, unit, units)
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
        where('playerId', '==', player.id),
        where('turnNumber', '==', turnNumber)
      )
      const existingSnapshot = await getDocs(existingOrdersQuery)
      const deletePromises = existingSnapshot.docs.map(d => deleteDoc(doc(db, 'orders', d.id)))
      await Promise.all(deletePromises)

      // Guardar nuevas órdenes
      await addDoc(collection(db, 'orders'), {
        gameId,
        playerId: player.id,
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
    return (unit: Unit) => getValidMoveDestinations(unit)
  }, [])

  // Obtener unidades válidas para apoyo
  const getValidSupportTargetsForUnit = useMemo(() => {
    return (unit: Unit) => getValidSupportTargets(unit, units)
  }, [units])

  // Renderizar mensaje si no es fase de órdenes
  if (!canGiveOrders) {
    return (
      <div className="p-4">
        <h3 className="font-bold mb-2">Panel de Órdenes</h3>
        <div className="text-gray-400 text-sm">
          {currentPhase === 'diplomatic' && 'Fase Diplomática - No se pueden dar órdenes aún'}
          {currentPhase === 'resolution' && 'Fase de Resolución - Las órdenes están siendo procesadas'}
          {currentPhase === 'finished' && 'Partida finalizada'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-bold mb-2">Panel de Órdenes</h3>
        <div className="text-sm text-gray-400">
          {myUnits.length} unidades bajo tu control
        </div>
      </div>

      {/* Lista de unidades */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {myUnits.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-8">
            No tienes unidades en el mapa
          </div>
        ) : (
          myUnits.map((unit) => (
            <div
              key={unit.id}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedUnit?.id === unit.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => onUnitSelect(unit)}
            >
              {/* Información de la unidad */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium capitalize">{unit.type}</div>
                  <div className="text-xs text-gray-400">{unit.currentPosition}</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  orders[unit.id]
                    ? orders[unit.id].isValid
                      ? 'bg-green-900/50 text-green-400 border border-green-700'
                      : 'bg-red-900/50 text-red-400 border border-red-700'
                    : 'bg-gray-700 text-gray-400'
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
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded p-2 mb-2">
                  ⚠️ {orders[unit.id].validationError}
                </div>
              )}

              {/* Selector de orden */}
              {selectedUnit?.id === unit.id && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <label className="block text-sm font-medium mb-2">
                    Tipo de Orden
                  </label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    value={orders[unit.id]?.action || ''}
                    onChange={(e) => handleOrderChange(unit.id, 'action', e.target.value)}
                  >
                    <option value="">Seleccionar orden...</option>
                    <option value="hold">Mantener (Hold)</option>
                    <option value="move">Avanzar (Move)</option>
                    <option value="support">Apoyar (Support)</option>
                    {unit.type === 'fleet' && (
                      <option value="convoy">Convoy (Transport)</option>
                    )}
                    {unit.type !== 'garrison' && (
                      <option value="besiege">Asediar (Siege)</option>
                    )}
                    <option value="convert">Convertirse (Convert)</option>
                  </select>

                  {/* Opciones adicionales según el tipo de orden */}
                  {orders[unit.id]?.action === 'move' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-1">
                        Destino (provincias adyacentes)
                      </label>
                      <select
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                        value={orders[unit.id]?.targetProvince || ''}
                        onChange={(e) => handleOrderChange(unit.id, 'targetProvince', e.target.value)}
                      >
                        <option value="">Seleccionar provincia...</option>
                        {getValidDestinationsForUnit(unit).map(provinceId => {
                          const provinceInfo = getProvinceInfo(provinceId)
                          return (
                            <option key={provinceId} value={provinceId}>
                              {provinceInfo?.name || provinceId}
                            </option>
                          )
                        })}
                      </select>
                      {getValidDestinationsForUnit(unit).length === 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {unit.type === 'garrison' ? 'Las guarniciones no pueden moverse' : 'No hay destinos válidos'}
                        </div>
                      )}
                    </div>
                  )}

                  {orders[unit.id]?.action === 'support' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-1">
                        Unidad a apoyar (adyacente)
                      </label>
                      <select
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                        value={orders[unit.id]?.supportedUnit || ''}
                        onChange={(e) => handleOrderChange(unit.id, 'supportedUnit', e.target.value)}
                      >
                        <option value="">Seleccionar unidad...</option>
                        {getValidSupportTargetsForUnit(unit).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.type} en {u.currentPosition}
                          </option>
                        ))}
                      </select>
                      {getValidSupportTargetsForUnit(unit).length === 0 && (
                        <div className="text-xs text-gray-400 mt-1">
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
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-1">
                        Ciudad a asediar
                      </label>
                      <select
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                        value={orders[unit.id]?.targetProvince || ''}
                        onChange={(e) => handleOrderChange(unit.id, 'targetProvince', e.target.value)}
                      >
                        <option value="">Seleccionar ciudad...</option>
                        <option value={unit.currentPosition}>
                          {getProvinceInfo(unit.currentPosition)?.cityName || unit.currentPosition}
                        </option>
                      </select>
                      <div className="text-xs text-gray-400 mt-1">
                        Solo puedes asediar la ciudad de tu provincia actual
                      </div>
                    </div>
                  )}

                  {orders[unit.id]?.action === 'convert' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-1">
                        Convertir a
                      </label>
                      <select
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                        value={orders[unit.id]?.targetProvince || ''}
                        onChange={(e) => handleOrderChange(unit.id, 'targetProvince', e.target.value)}
                      >
                        <option value="">Seleccionar tipo...</option>
                        {unit.type === 'fleet' && <option value="army">Ejército (Army)</option>}
                        {unit.type === 'army' && <option value="fleet">Flota (Fleet)</option>}
                        {unit.type === 'garrison' && <option value="army">Ejército (Army)</option>}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer con botón de guardar */}
      <div className="p-4 border-t border-gray-700">
        {saveMessage && (
          <div className={`text-sm mb-2 p-2 rounded ${
            saveMessage.includes('Error')
              ? 'bg-red-900/20 text-red-400'
              : 'bg-green-900/20 text-green-400'
          }`}>
            {saveMessage}
          </div>
        )}
        <button
          onClick={handleSaveOrders}
          disabled={isSaving || Object.keys(orders).length === 0}
          className={`w-full py-2 rounded font-medium transition-colors ${
            isSaving || Object.keys(orders).length === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSaving ? 'Guardando...' : 'Guardar Órdenes'}
        </button>
        <div className="text-xs text-gray-400 mt-2 text-center">
          Puedes modificar tus órdenes hasta el final de la fase
        </div>
      </div>
    </div>
  )
}
