import { useState, useEffect } from 'react'
import { FactionDocument, FactionFormData } from '@/types/faction'
import {
  getAllFactions,
  createFaction,
  updateFaction,
  deleteFaction,
  isFactionInUse,
} from '@/lib/factionService'

interface FactionEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onFactionChanged?: () => void
}

export default function FactionEditorModal({
  isOpen,
  onClose,
  onFactionChanged,
}: FactionEditorModalProps) {
  const [factions, setFactions] = useState<FactionDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [editingFactionId, setEditingFactionId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [factionId, setFactionId] = useState('')
  const [factionName, setFactionName] = useState('')
  const [factionColor, setFactionColor] = useState('#3b82f6')
  const [factionColorDark, setFactionColorDark] = useState('#2563eb')
  const [emblemFile, setEmblemFile] = useState<File | null>(null)
  const [emblemPreview, setEmblemPreview] = useState<string | null>(null)

  // Delete confirmation
  const [deletingFactionId, setDeletingFactionId] = useState<string | null>(null)

  // Load factions
  useEffect(() => {
    if (isOpen) {
      loadFactions()
    }
  }, [isOpen])

  const loadFactions = async () => {
    try {
      setLoading(true)
      const loadedFactions = await getAllFactions()
      setFactions(loadedFactions)
      setError(null)
    } catch (err) {
      setError('Error al cargar facciones')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingFactionId(null)
    setIsCreating(false)
    setFactionId('')
    setFactionName('')
    setFactionColor('#3b82f6')
    setFactionColorDark('#2563eb')
    setEmblemFile(null)
    setEmblemPreview(null)
    setError(null)
    setSuccess(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen')
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen debe ser menor a 2MB')
        return
      }

      setEmblemFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setEmblemPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateNew = () => {
    resetForm()
    setIsCreating(true)
  }

  const handleEdit = (faction: FactionDocument) => {
    resetForm()
    setEditingFactionId(faction.id)
    setFactionId(faction.id)
    setFactionName(faction.name)
    setFactionColor(faction.color)
    setFactionColorDark(faction.colorDark || faction.color)
    setEmblemPreview(faction.emblemUrl || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validation
    if (!factionId.trim()) {
      setError('El ID de la facción es requerido')
      return
    }

    if (!factionName.trim()) {
      setError('El nombre de la facción es requerido')
      return
    }

    if (!factionColor.trim()) {
      setError('El color es requerido')
      return
    }

    setLoading(true)

    try {
      const formData: FactionFormData = {
        name: factionName.trim(),
        color: factionColor,
        colorDark: factionColorDark || factionColor,
        emblemFile: emblemFile || undefined,
      }

      if (editingFactionId) {
        // Update existing faction
        await updateFaction(editingFactionId, formData)
        setSuccess(`Facción "${factionName}" actualizada exitosamente`)
      } else {
        // Create new faction
        await createFaction(factionId.toUpperCase().trim(), formData)
        setSuccess(`Facción "${factionName}" creada exitosamente`)
      }

      // Reload factions
      await loadFactions()
      resetForm()

      // Notify parent component
      if (onFactionChanged) {
        onFactionChanged()
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar la facción')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (factionId: string) => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      // Check if faction is in use
      const inUse = await isFactionInUse(factionId)
      if (inUse) {
        setError(
          `No se puede eliminar la facción "${factionId}" porque está siendo usada en uno o más escenarios`
        )
        setDeletingFactionId(null)
        return
      }

      await deleteFaction(factionId)
      setSuccess(`Facción "${factionId}" eliminada exitosamente`)

      // Reload factions
      await loadFactions()
      setDeletingFactionId(null)

      // Notify parent component
      if (onFactionChanged) {
        onFactionChanged()
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la facción')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Editor de Facciones</h2>
            <button
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* Create/Edit Form */}
          {(isCreating || editingFactionId) && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-700 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingFactionId ? 'Editar Facción' : 'Crear Nueva Facción'}
              </h3>

              {/* Faction ID (only for new factions) */}
              {!editingFactionId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ID de la Facción *
                  </label>
                  <input
                    type="text"
                    value={factionId}
                    onChange={(e) => setFactionId(e.target.value.toUpperCase())}
                    placeholder="MILAN, VENICE, etc."
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    ID único en mayúsculas (ej: MILAN, VENICE)
                  </p>
                </div>
              )}

              {/* Faction Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={factionName}
                  onChange={(e) => setFactionName(e.target.value)}
                  placeholder="República de Venecia"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color Principal *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={factionColor}
                      onChange={(e) => setFactionColor(e.target.value)}
                      className="w-16 h-10 bg-gray-600 border border-gray-500 rounded cursor-pointer"
                      required
                    />
                    <input
                      type="text"
                      value={factionColor}
                      onChange={(e) => setFactionColor(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color Oscuro
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={factionColorDark}
                      onChange={(e) => setFactionColorDark(e.target.value)}
                      className="w-16 h-10 bg-gray-600 border border-gray-500 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={factionColorDark}
                      onChange={(e) => setFactionColorDark(e.target.value)}
                      placeholder="#2563eb"
                      className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Color Preview */}
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-300">Vista previa:</span>
                <div
                  className="w-16 h-8 rounded border border-gray-500"
                  style={{ backgroundColor: factionColor }}
                />
                <div
                  className="w-16 h-8 rounded border border-gray-500"
                  style={{ backgroundColor: factionColorDark }}
                />
              </div>

              {/* Emblem Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Emblema (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Imagen PNG o JPG, máximo 2MB
                </p>
              </div>

              {/* Emblem Preview */}
              {emblemPreview && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vista previa del emblema:
                  </label>
                  <img
                    src={emblemPreview}
                    alt="Emblem preview"
                    className="w-24 h-24 object-contain bg-gray-600 rounded border border-gray-500"
                  />
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : editingFactionId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          )}

          {/* Create New Button */}
          {!isCreating && !editingFactionId && (
            <button
              onClick={handleCreateNew}
              className="w-full mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              + Crear Nueva Facción
            </button>
          )}

          {/* Faction List */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Facciones Existentes</h3>

            {loading && !isCreating && !editingFactionId && (
              <div className="text-gray-400 text-center py-4">Cargando...</div>
            )}

            {!loading && factions.length === 0 && (
              <div className="text-gray-400 text-center py-4">
                No hay facciones creadas. Crea la primera facción usando el botón de arriba.
              </div>
            )}

            <div className="space-y-2">
              {factions.map((faction) => (
                <div
                  key={faction.id}
                  className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {/* Emblem */}
                    {faction.emblemUrl ? (
                      <img
                        src={faction.emblemUrl}
                        alt={faction.name}
                        className="w-12 h-12 object-contain bg-gray-600 rounded border border-gray-500"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-600 rounded border border-gray-500 flex items-center justify-center text-gray-400 text-xs">
                        Sin emblema
                      </div>
                    )}

                    {/* Info */}
                    <div>
                      <div className="font-semibold text-white">{faction.name}</div>
                      <div className="text-sm text-gray-400">ID: {faction.id}</div>
                    </div>

                    {/* Color Preview */}
                    <div className="flex gap-2 ml-4">
                      <div
                        className="w-8 h-8 rounded border border-gray-500"
                        style={{ backgroundColor: faction.color }}
                        title="Color principal"
                      />
                      {faction.colorDark && (
                        <div
                          className="w-8 h-8 rounded border border-gray-500"
                          style={{ backgroundColor: faction.colorDark }}
                          title="Color oscuro"
                        />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(faction)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Editar
                    </button>

                    {deletingFactionId === faction.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(faction.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:bg-gray-500"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeletingFactionId(null)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingFactionId(faction.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
