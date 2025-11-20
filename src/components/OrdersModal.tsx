import { useState, useEffect, useMemo } from 'react'
import type { Unit, Order, Player, Game } from '@/types/game'
import { validateOrder, getValidMoveDestinations, getValidSupportTargets } from '@/utils/orderValidation'
import { getProvinceInfo } from '@/utils/gameMapHelpers'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Props para el componente OrdersModal
 */
interface OrdersModalProps {
  /** Unidad a la que se le dará la orden */
  unit: Unit
  /** Información del juego (mapa, turno, fase) */
  game: Game
  /** Jugador que da la orden */
  currentPlayer: Player
  /** Todas las unidades del juego (para validación de Support/Convoy) */
  allUnits: Unit[]
  /** Callback para cerrar el modal */
  onClose: () => void
}

/**
 * Modal para asignar órdenes militares a unidades
 *
 * Permite al jugador dar órdenes a sus unidades durante la fase de órdenes:
 * - **Hold:** Mantener posición
 * - **Move:** Mover a provincia adyacente
 * - **Support:** Apoyar a otra unidad (aliada o enemiga)
 * - **Convoy:** Transportar ejército (solo Fleet)
 * - **Besiege:** Asediar ciudad (no Garrison)
 * - **Convert:** Convertir tipo de unidad (Army ↔ Fleet ↔ Garrison)
 *
 * **Características:**
 * - Validación en tiempo real con `orderValidation.ts`
 * - Carga órdenes existentes desde `/orders` collection
 * - Guarda todas las órdenes del jugador en un único documento
 * - Grid visual de iconos para selección de tipo de orden
 * - Selectores dinámicos según tipo de orden (destino, unidad apoyada, etc.)
 * - Estado visual (válida/inválida con mensaje de error)
 * - Composición de unidad visible (tropas, naves)
 * - Auto-cierre tras guardado exitoso
 *
 * **Flujo:**
 * 1. Carga orden existente si hay
 * 2. Usuario selecciona tipo de orden (grid de iconos)
 * 3. Campos adicionales aparecen según tipo (Move → destino, Support → unidad)
 * 4. Validación en tiempo real
 * 5. Guardar → actualiza documento `/orders/{gameId}_{playerId}_{turn}`
 *
 * @component
 * @example
 * <OrdersModal
 *   unit={selectedUnit}
 *   game={currentGame}
 *   currentPlayer={player}
 *   allUnits={allUnits}
 *   onClose={() => setShowOrders(false)}
 * />
 */

export default function OrdersModal({
  unit,
  game,
  currentPlayer,
  allUnits,
  onClose,
}: OrdersModalProps) {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Cargar orden existente desde Firestore
  useEffect(() => {
    const loadExistingOrder = async () => {
      try {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('gameId', '==', game.id),
          where('playerId', '==', currentPlayer.userId),
          where('turnNumber', '==', game.turnNumber)
        )
        const snapshot = await getDocs(ordersQuery)

        if (!snapshot.empty) {
          const orders = snapshot.docs[0].data().orders as Order[]
          const existingOrder = orders.find(o => o.unitId === unit.id)
          if (existingOrder) {
            setCurrentOrder(existingOrder)
            console.log('[OrdersModal] Orden cargada:', existingOrder)
          }
        }
      } catch (error) {
        console.error('[OrdersModal] Error cargando orden:', error)
      }
    }

    loadExistingOrder()
  }, [game.id, currentPlayer.userId, game.turnNumber, unit.id])

  // Handler para cambiar la orden
  const handleOrderChange = (field: keyof Order, value: any) => {
    const newOrder: Order = {
      ...currentOrder,
      unitId: unit.id,
      [field]: value,
      isValid: false
    } as Order

    // Si cambia el tipo de acción, limpiar campos opcionales
    if (field === 'action') {
      delete newOrder.targetProvince
      delete newOrder.supportedUnit
      delete newOrder.convoyRoute
    }

    // Validar la orden inmediatamente
    const validation = validateOrder(game.map, newOrder, unit, allUnits)
    newOrder.isValid = validation.isValid
    if (validation.error) {
      newOrder.validationError = validation.error
    }

    setCurrentOrder(newOrder)
  }

  // Handler para guardar orden
  const handleSaveOrder = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Validar antes de guardar
      if (currentOrder && !currentOrder.isValid) {
        setSaveMessage('La orden no es válida')
        setIsSaving(false)
        return
      }

      // Cargar órdenes existentes
      const existingOrdersQuery = query(
        collection(db, 'orders'),
        where('gameId', '==', game.id),
        where('playerId', '==', currentPlayer.userId),
        where('turnNumber', '==', game.turnNumber)
      )
      const existingSnapshot = await getDocs(existingOrdersQuery)

      let allOrders: Order[] = []

      // Si ya hay órdenes guardadas, cargarlas
      if (!existingSnapshot.empty) {
        allOrders = existingSnapshot.docs[0].data().orders as Order[]
        // Eliminar orden anterior de esta unidad
        allOrders = allOrders.filter(o => o.unitId !== unit.id)
      }

      // Añadir nueva orden (si existe)
      if (currentOrder) {
        allOrders.push(currentOrder)
      }

      // Eliminar documento anterior
      const deletePromises = existingSnapshot.docs.map(d => deleteDoc(doc(db, 'orders', d.id)))
      await Promise.all(deletePromises)

      // Guardar todas las órdenes actualizadas
      if (allOrders.length > 0) {
        await addDoc(collection(db, 'orders'), {
          gameId: game.id,
          playerId: currentPlayer.userId,
          turnNumber: game.turnNumber,
          phase: 'orders',
          orders: allOrders,
          submittedAt: serverTimestamp()
        })
      }

      setSaveMessage('✓ Orden guardada correctamente')
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Error guardando orden:', error)
      setSaveMessage('Error al guardar orden')
    } finally {
      setIsSaving(false)
    }
  }

  // Obtener destinos válidos
  const validDestinations = useMemo(() => {
    return getValidMoveDestinations(game.map, unit)
  }, [game.map, unit])

  // Obtener unidades válidas para apoyo
  const validSupportTargets = useMemo(() => {
    return getValidSupportTargets(game.map, unit, allUnits)
  }, [game.map, unit, allUnits])

  // Función para obtener el label del tipo de unidad
  const getUnitTypeLabel = (type: Unit['type']) => {
    switch(type) {
      case 'army': return 'Ejército'
      case 'fleet': return 'Flota'
      case 'garrison': return 'Guarnición'
      default: return type
    }
  }

  // Renderizar composición
  const renderComposition = () => {
    if (!unit.composition) return null

    if (unit.type === 'fleet') {
      const comp = unit.composition as any
      return (
        <div className="text-xs font-serif text-[#6b5d42] flex gap-2">
          {comp.ships?.galley > 0 && <span>⛵ {comp.ships.galley} Galeras</span>}
          {comp.ships?.cog > 0 && <span>🚢 {comp.ships.cog} Cocas</span>}
        </div>
      )
    } else {
      const comp = unit.composition as any
      const troops = comp.troops || {}
      return (
        <div className="text-xs font-serif text-[#6b5d42] flex flex-wrap gap-2">
          {troops.militia > 0 && <span>🗡️ {troops.militia} Milicia</span>}
          {troops.lancers > 0 && <span>🗡️ {troops.lancers} Lanceros</span>}
          {troops.pikemen > 0 && <span>🗡️ {troops.pikemen} Piqueros</span>}
          {troops.archers > 0 && <span>🏹 {troops.archers} Arqueros</span>}
          {troops.crossbowmen > 0 && <span>🏹 {troops.crossbowmen} Ballesteros</span>}
          {troops.lightCavalry > 0 && <span>🐎 {troops.lightCavalry} Cab. Ligera</span>}
          {troops.heavyCavalry > 0 && <span>🐎 {troops.heavyCavalry} Cab. Pesada</span>}
        </div>
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#e8dcc0] border-4 border-[#4a3f2a] rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="p-4 bg-[#2d2416] border-b-4 border-[#6b5d42] flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-heading text-[#f0d877] flex items-center gap-2">
              <img src="/icons/ordenes.png" alt="Órdenes" className="w-6 h-6" />
              {unit.name || `${getUnitTypeLabel(unit.type)}`}
            </h2>
            <div className="text-sm font-serif text-[#e8dcc0]">
              {getUnitTypeLabel(unit.type)} • {game.map?.provinces?.[unit.currentPosition]?.name || unit.currentPosition}
            </div>
            {renderComposition()}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-[#e8dcc0] hover:text-[#f0d877] transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Estado de validación */}
          <div className={`text-sm font-serif mb-4 p-3 rounded border ${
            currentOrder
              ? currentOrder.isValid
                ? 'bg-green-900/20 text-green-300 border-green-700'
                : 'bg-red-900/30 text-red-300 border-red-700'
              : 'bg-gray-700/50 text-gray-400 border-gray-600'
          }`}>
            {currentOrder
              ? currentOrder.isValid
                ? '✓ Orden válida'
                : `✗ ${currentOrder.validationError || 'Orden inválida'}`
              : 'Sin orden asignada'}
          </div>

          {/* Panel de selección de órdenes con iconos */}
          <div className="mb-4">
            <label className="block text-sm font-heading font-semibold text-[#2c2416] mb-3">
              Tipo de Orden
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Hold */}
              <button
                onClick={() => handleOrderChange('action', 'hold')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  currentOrder?.action === 'hold'
                    ? 'bg-[#d4af37] border-[#b4a481] shadow-lg'
                    : 'bg-[#f4e4c1] border-[#6b5d42] hover:bg-[#e8dcc0] hover:border-[#b4a481]'
                }`}
              >
                <span className="text-4xl mb-2">⚓</span>
                <span className="text-xs font-heading font-semibold text-[#2c2416]">Hold</span>
              </button>

              {/* Move */}
              <button
                onClick={() => handleOrderChange('action', 'move')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  currentOrder?.action === 'move'
                    ? 'bg-[#d4af37] border-[#b4a481] shadow-lg'
                    : 'bg-[#f4e4c1] border-[#6b5d42] hover:bg-[#e8dcc0] hover:border-[#b4a481]'
                }`}
              >
                <span className="text-4xl mb-2">➡️</span>
                <span className="text-xs font-heading font-semibold text-[#2c2416]">Move</span>
              </button>

              {/* Support */}
              <button
                onClick={() => handleOrderChange('action', 'support')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  currentOrder?.action === 'support'
                    ? 'bg-[#d4af37] border-[#b4a481] shadow-lg'
                    : 'bg-[#f4e4c1] border-[#6b5d42] hover:bg-[#e8dcc0] hover:border-[#b4a481]'
                }`}
              >
                <span className="text-4xl mb-2">🤝</span>
                <span className="text-xs font-heading font-semibold text-[#2c2416]">Support</span>
              </button>

              {/* Convoy - solo para flotas */}
              {unit.type === 'fleet' && (
                <button
                  onClick={() => handleOrderChange('action', 'convoy')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    currentOrder?.action === 'convoy'
                      ? 'bg-[#d4af37] border-[#b4a481] shadow-lg'
                      : 'bg-[#f4e4c1] border-[#6b5d42] hover:bg-[#e8dcc0] hover:border-[#b4a481]'
                  }`}
                >
                  <span className="text-4xl mb-2">⛵</span>
                  <span className="text-xs font-heading font-semibold text-[#2c2416]">Convoy</span>
                </button>
              )}

              {/* Besiege - no para guarniciones */}
              {unit.type !== 'garrison' && (
                <button
                  onClick={() => handleOrderChange('action', 'besiege')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    currentOrder?.action === 'besiege'
                      ? 'bg-[#d4af37] border-[#b4a481] shadow-lg'
                      : 'bg-[#f4e4c1] border-[#6b5d42] hover:bg-[#e8dcc0] hover:border-[#b4a481]'
                  }`}
                >
                  <span className="text-4xl mb-2">🏰</span>
                  <span className="text-xs font-heading font-semibold text-[#2c2416]">Siege</span>
                </button>
              )}

              {/* Convert */}
              <button
                onClick={() => handleOrderChange('action', 'convert')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  currentOrder?.action === 'convert'
                    ? 'bg-[#d4af37] border-[#b4a481] shadow-lg'
                    : 'bg-[#f4e4c1] border-[#6b5d42] hover:bg-[#e8dcc0] hover:border-[#b4a481]'
                }`}
              >
                <span className="text-4xl mb-2">🔄</span>
                <span className="text-xs font-heading font-semibold text-[#2c2416]">Convert</span>
              </button>
            </div>
          </div>

          {/* Campos adicionales según tipo de orden */}
          {currentOrder?.action === 'move' && (
            <div className="mb-4">
              <label className="block text-sm font-heading font-semibold text-[#2c2416] mb-2">
                Provincia Destino
              </label>
              <select
                className="w-full px-3 py-2 bg-[#f4e4c1] border-2 border-[#6b5d42] rounded-lg text-[#1d1408] font-serif focus:outline-none focus:ring-2 focus:ring-[#6b5d42]"
                value={currentOrder.targetProvince || ''}
                onChange={(e) => handleOrderChange('targetProvince', e.target.value)}
              >
                <option value="">Seleccionar provincia...</option>
                {validDestinations.map(provinceId => {
                  const provinceInfo = getProvinceInfo(game.map, provinceId)
                  return (
                    <option key={provinceId} value={provinceId}>
                      📍 {provinceInfo?.name || provinceId}
                    </option>
                  )
                })}
              </select>
              {validDestinations.length === 0 && (
                <div className="text-xs font-serif text-[#6b5d42] mt-2 italic">
                  {unit.type === 'garrison' ? 'Las guarniciones no pueden moverse' : 'No hay destinos válidos'}
                </div>
              )}
            </div>
          )}

          {currentOrder?.action === 'support' && (
            <div className="mb-4">
              <label className="block text-sm font-heading font-semibold text-[#2c2416] mb-2">
                Unidad a Apoyar
              </label>
              <select
                className="w-full px-3 py-2 bg-[#f4e4c1] border-2 border-[#6b5d42] rounded-lg text-[#1d1408] font-serif focus:outline-none focus:ring-2 focus:ring-[#6b5d42]"
                value={currentOrder.supportedUnit || ''}
                onChange={(e) => handleOrderChange('supportedUnit', e.target.value)}
              >
                <option value="">Seleccionar unidad...</option>
                {validSupportTargets.map(u => (
                  <option key={u.id} value={u.id}>
                    🤝 {getUnitTypeLabel(u.type)} en {game.map?.provinces?.[u.currentPosition]?.name || u.currentPosition}
                  </option>
                ))}
              </select>
              {validSupportTargets.length === 0 && (
                <div className="text-xs font-serif text-[#6b5d42] mt-2 italic">
                  No hay unidades adyacentes para apoyar
                </div>
              )}
            </div>
          )}

          {currentOrder?.action === 'convoy' && (
            <div className="mb-4">
              <label className="block text-sm font-heading font-semibold text-[#2c2416] mb-2">
                Ejército a Transportar
              </label>
              <select
                className="w-full px-3 py-2 bg-[#f4e4c1] border-2 border-[#6b5d42] rounded-lg text-[#1d1408] font-serif focus:outline-none focus:ring-2 focus:ring-[#6b5d42]"
                value={currentOrder.supportedUnit || ''}
                onChange={(e) => handleOrderChange('supportedUnit', e.target.value)}
              >
                <option value="">Seleccionar ejército...</option>
                {allUnits.filter(u => u.type === 'army').map(u => (
                  <option key={u.id} value={u.id}>
                    Ejército en {game.map?.provinces?.[u.currentPosition]?.name || u.currentPosition}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentOrder?.action === 'besiege' && (
            <div className="mb-4">
              <label className="block text-sm font-heading font-semibold text-[#2c2416] mb-2">
                Ciudad a Asediar
              </label>
              <select
                className="w-full px-3 py-2 bg-[#f4e4c1] border-2 border-[#6b5d42] rounded-lg text-[#1d1408] font-serif focus:outline-none focus:ring-2 focus:ring-[#6b5d42]"
                value={currentOrder.targetProvince || ''}
                onChange={(e) => handleOrderChange('targetProvince', e.target.value)}
              >
                <option value="">Seleccionar ciudad...</option>
                <option value={unit.currentPosition}>
                  🏰 {getProvinceInfo(game.map, unit.currentPosition)?.cityName || getProvinceInfo(game.map, unit.currentPosition)?.name || unit.currentPosition}
                </option>
              </select>
              <div className="text-xs font-serif text-[#6b5d42] mt-2 italic">
                Solo puedes asediar la ciudad de tu provincia actual
              </div>
            </div>
          )}

          {currentOrder?.action === 'convert' && (
            <div className="mb-4">
              <label className="block text-sm font-heading font-semibold text-[#2c2416] mb-2">
                Convertir a
              </label>
              <select
                className="w-full px-3 py-2 bg-[#f4e4c1] border-2 border-[#6b5d42] rounded-lg text-[#1d1408] font-serif focus:outline-none focus:ring-2 focus:ring-[#6b5d42]"
                value={currentOrder.targetProvince || ''}
                onChange={(e) => handleOrderChange('targetProvince', e.target.value)}
              >
                <option value="">Seleccionar tipo...</option>
                {unit.type === 'fleet' && <option value="army">🗡️ Ejército (Army)</option>}
                {unit.type === 'army' && <option value="fleet">⛵ Flota (Fleet)</option>}
                {unit.type === 'garrison' && <option value="army">🗡️ Ejército (Army)</option>}
              </select>
            </div>
          )}

          {/* Mensaje de guardado */}
          {saveMessage && (
            <div className={`text-sm font-serif mb-4 p-3 rounded border ${
              saveMessage.includes('Error')
                ? 'bg-red-900/30 text-red-300 border-red-700'
                : 'bg-green-900/20 text-green-300 border-green-700'
            }`}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-[#6b5d42] bg-[#2d2416] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#6b5d42] hover:bg-[#544a35] text-white font-heading rounded-lg transition-colors shadow-ornate"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveOrder}
            disabled={isSaving || !currentOrder || !currentOrder.isValid}
            className="flex-1 px-4 py-2 bg-renaissance-gold hover:bg-renaissance-gold-dark disabled:opacity-50 disabled:cursor-not-allowed text-[#1d1408] font-heading font-bold rounded-lg transition-colors shadow-ornate"
          >
            {isSaving ? 'Guardando...' : 'Confirmar Orden'}
          </button>
        </div>
      </div>
    </div>
  )
}
