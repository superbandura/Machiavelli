import { useState, useEffect } from 'react'
import {
  DetailedUnit,
  ArmyComposition,
  GarrisonComposition,
  FleetComposition,
  ArmyTroopType,
  GarrisonTroopType,
  FleetShipType,
} from '@/types/scenario'
import {
  ARMY_TROOP_TYPES,
  GARRISON_TROOP_TYPES,
  FLEET_SHIP_TYPES,
  TROOP_INCREMENT,
  FLEET_INCREMENT,
} from '@/data/unitTypes'

interface UnitBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  unitType: 'army' | 'garrison' | 'fleet'
  existingUnits: DetailedUnit[]
  onSave: (units: DetailedUnit[]) => void
  cityName?: string // Para mostrar en el título de guarniciones
}

export default function UnitBuilderModal({
  isOpen,
  onClose,
  unitType,
  existingUnits,
  onSave,
  cityName,
}: UnitBuilderModalProps) {
  const [units, setUnits] = useState<DetailedUnit[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [unitName, setUnitName] = useState('')
  const [composition, setComposition] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  // Inicializar unidades cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setUnits([...existingUnits])
      resetForm()
    }
  }, [isOpen, existingUnits])

  const resetForm = () => {
    setIsCreating(false)
    setEditingIndex(null)
    setUnitName('')
    setError(null)

    // Inicializar composición según tipo
    const initialComposition: Record<string, number> = {}
    if (unitType === 'army') {
      Object.keys(ARMY_TROOP_TYPES).forEach(key => {
        initialComposition[key] = 0
      })
    } else if (unitType === 'garrison') {
      Object.keys(GARRISON_TROOP_TYPES).forEach(key => {
        initialComposition[key] = 0
      })
    } else if (unitType === 'fleet') {
      Object.keys(FLEET_SHIP_TYPES).forEach(key => {
        initialComposition[key] = 0
      })
    }
    setComposition(initialComposition)
  }

  const handleCreateNew = () => {
    resetForm()
    setIsCreating(true)
  }

  const handleEdit = (index: number) => {
    const unit = units[index]
    setEditingIndex(index)
    setUnitName(unit.name)

    if ('troops' in unit) {
      setComposition({ ...unit.troops })
    } else if ('ships' in unit) {
      setComposition({ ...unit.ships })
    }

    setIsCreating(false)
    setError(null)
  }

  const handleDelete = (index: number) => {
    const newUnits = units.filter((_, i) => i !== index)
    setUnits(newUnits)
    resetForm()
  }

  const adjustCount = (key: string, delta: number) => {
    setComposition(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta)
    }))
  }

  const getTotalCount = () => {
    return Object.values(composition).reduce((sum, count) => sum + count, 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones
    if (!unitName.trim()) {
      setError('El nombre es requerido')
      return
    }

    const total = getTotalCount()
    if (total === 0) {
      setError(unitType === 'fleet' ? 'Debe añadir al menos una nave' : 'Debe añadir al menos una tropa')
      return
    }

    // Verificar nombre único (excepto si estamos editando la misma unidad)
    const nameExists = units.some((u, i) =>
      u.name.toLowerCase() === unitName.trim().toLowerCase() && i !== editingIndex
    )
    if (nameExists) {
      setError('Ya existe una unidad con este nombre')
      return
    }

    // Crear la unidad según el tipo
    let newUnit: DetailedUnit

    if (unitType === 'army') {
      newUnit = {
        name: unitName.trim(),
        troops: composition as Record<ArmyTroopType, number>
      } as ArmyComposition
    } else if (unitType === 'garrison') {
      newUnit = {
        name: unitName.trim(),
        troops: composition as Record<GarrisonTroopType, number>
      } as GarrisonComposition
    } else {
      newUnit = {
        name: unitName.trim(),
        ships: composition as Record<FleetShipType, number>
      } as FleetComposition
    }

    // Actualizar lista de unidades
    let newUnits: DetailedUnit[]
    if (editingIndex !== null) {
      newUnits = [...units]
      newUnits[editingIndex] = newUnit
    } else {
      newUnits = [...units, newUnit]
    }

    setUnits(newUnits)
    resetForm()
  }

  const handleSave = () => {
    onSave(units)
    onClose()
  }

  if (!isOpen) return null

  // Configuración según tipo de unidad
  const config = {
    army: {
      title: 'Gestionar Ejércitos',
      icon: '⚔️',
      types: ARMY_TROOP_TYPES,
      unitLabel: 'Ejército',
      countLabel: 'tropas'
    },
    garrison: {
      title: cityName ? `Gestionar Guarnición de ${cityName}` : 'Gestionar Guarnición',
      icon: '🏰',
      types: GARRISON_TROOP_TYPES,
      unitLabel: 'Guarnición',
      countLabel: 'tropas'
    },
    fleet: {
      title: 'Gestionar Flotas',
      icon: '⛵',
      types: FLEET_SHIP_TYPES,
      unitLabel: 'Flota',
      countLabel: 'naves'
    }
  }[unitType]

  const showingForm = isCreating || editingIndex !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>{config.icon}</span>
              <span>{config.title}</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded text-red-500">
              {error}
            </div>
          )}

          {/* Formulario de creación/edición */}
          {showingForm ? (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-700/50 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingIndex !== null ? `Editar ${config.unitLabel}` : `Crear ${config.unitLabel}`}
              </h3>

              {/* Nombre */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del {config.unitLabel}
                </label>
                <input
                  type="text"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder={`Ej: ${config.unitLabel} del Norte`}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Composición */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Composición (Total: {getTotalCount()} {config.countLabel})
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(config.types).map(([key, meta]) => {
                    // Usar incremento según tipo de unidad
                    const increment = unitType === 'fleet' ? FLEET_INCREMENT : TROOP_INCREMENT

                    return (
                      <div key={key} className="flex items-center justify-between bg-gray-700 rounded p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{meta.icon}</span>
                          <span className="text-sm text-gray-300">{meta.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => adjustCount(key, -increment)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold"
                          >
                            −
                          </button>
                          <span className="text-white font-mono w-16 text-center">
                            {composition[key] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustCount(key, increment)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  {editingIndex !== null ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={handleCreateNew}
              className="mb-6 w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
            >
              + Crear {config.unitLabel}
            </button>
          )}

          {/* Lista de unidades */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              {config.unitLabel}es Creados ({units.length})
            </h3>
            {units.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No hay {config.unitLabel.toLowerCase()}es creados aún
              </p>
            ) : (
              <div className="space-y-2">
                {units.map((unit, index) => {
                  const count = 'troops' in unit
                    ? Object.values(unit.troops).reduce((sum, n) => sum + n, 0)
                    : Object.values(unit.ships).reduce((sum, n) => sum + n, 0)

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-700 rounded p-3"
                    >
                      <div>
                        <div className="font-semibold text-white">{unit.name}</div>
                        <div className="text-sm text-gray-400">
                          {count} {config.countLabel}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(index)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Botones finales */}
          <div className="flex gap-2 mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
            >
              Guardar y Cerrar
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              Cerrar sin Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
