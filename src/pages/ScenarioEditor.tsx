import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import GameBoard from '@/components/GameBoard'
import ScenarioInfoPanel from '@/components/scenario-editor/ScenarioInfoPanel'
import ProvinceEditorPanel from '@/components/scenario-editor/ProvinceEditorPanel'
import FactionEditorModal from '@/components/scenario-editor/FactionEditorModal'
import {
  ScenarioFormData,
  ScenarioListItem,
  EditableProvinceData,
  FactionSetup,
} from '@/types/scenario'
import {
  listScenarios,
  getScenario,
  createScenario,
  updateScenario,
  deleteScenario,
  initializeProvincesData,
  validateAdjacencies,
  validateFleetPlacements,
  calculateFactionSetups,
} from '@/lib/scenarioService'
import { FactionDocument } from '@/types/faction'
import { getAllFactions } from '@/lib/factionService'

const DEFAULT_FORM_DATA: ScenarioFormData = {
  name: 'Nuevo Escenario',
  description: '',
  year: 1454,
  minPlayers: 3,
  maxPlayers: 6,
  difficulty: 'medium',
  estimatedDuration: '8-15 turnos',
  victoryConditions: {
    citiesRequired: { 3: 5, 4: 6, 5: 8, 6: 9 },
    timeLimit: 12,
  },
  availableFactions: ['FLORENCE', 'VENICE', 'MILAN', 'NAPLES', 'PAPAL'],
}

export default function ScenarioEditor() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ScenarioFormData>(DEFAULT_FORM_DATA)
  const [provinces, setProvinces] = useState<EditableProvinceData[]>(initializeProvincesData())
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFactionModalOpen, setIsFactionModalOpen] = useState(false)
  const [factions, setFactions] = useState<FactionDocument[]>([])
  const [adjacencyEditMode, setAdjacencyEditMode] = useState(false)

  // Cargar lista de escenarios y facciones al montar
  useEffect(() => {
    loadScenarios()
    loadFactions()
  }, [])

  const loadFactions = async () => {
    try {
      const loadedFactions = await getAllFactions()
      setFactions(loadedFactions)
    } catch (err) {
      console.error('Error loading factions:', err)
      // No mostrar error, simplemente continuar con facciones vacías
    }
  }

  const loadScenarios = async () => {
    try {
      setLoading(true)
      const list = await listScenarios()
      setScenarios(list)
    } catch (err) {
      console.error('Error loading scenarios:', err)
      setError('Error al cargar escenarios')
    } finally {
      setLoading(false)
    }
  }

  // Cargar escenario seleccionado
  const handleSelectScenario = async (scenarioId: string | null) => {
    if (!scenarioId) {
      // Nuevo escenario
      setSelectedScenarioId(null)
      setFormData(DEFAULT_FORM_DATA)
      setProvinces(initializeProvincesData())
      setSelectedProvinceId(null)
      setError(null)
      return
    }

    try {
      setLoading(true)
      const scenario = await getScenario(scenarioId)
      if (scenario) {
        setSelectedScenarioId(scenarioId)
        setFormData({
          name: scenario.name,
          description: scenario.description,
          year: scenario.year,
          minPlayers: scenario.minPlayers,
          maxPlayers: scenario.maxPlayers,
          difficulty: scenario.difficulty,
          estimatedDuration: scenario.estimatedDuration,
          victoryConditions: scenario.victoryConditions,
          availableFactions: scenario.availableFactions,
        })
        setProvinces(scenario.provinces)
        setSelectedProvinceId(null)
        setError(null)
      }
    } catch (err) {
      console.error('Error loading scenario:', err)
      setError('Error al cargar el escenario')
    } finally {
      setLoading(false)
    }
  }

  // Crear nuevo escenario
  const handleNew = () => {
    setSelectedScenarioId(null)
    setFormData(DEFAULT_FORM_DATA)
    setProvinces(initializeProvincesData())
    setSelectedProvinceId(null)
    setError(null)
  }

  // Guardar escenario
  const handleSave = async () => {
    if (!user) return

    // Validaciones
    const adjacencyErrors = validateAdjacencies(provinces)
    const fleetErrors = validateFleetPlacements(provinces)
    const allErrors = [...adjacencyErrors, ...fleetErrors]

    if (allErrors.length > 0) {
      setError(
        `Errores de validación:\n${allErrors.slice(0, 5).join('\n')}${
          allErrors.length > 5 ? `\n... y ${allErrors.length - 5} más` : ''
        }`
      )
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Auto-detectar facciones disponibles desde provincias
      const detectedFactions = Array.from(
        new Set(
          provinces
            .filter(p => p.controlledBy !== null && p.controlledBy !== 'NEUTRAL')
            .map(p => p.controlledBy!)
        )
      )

      console.log('[ScenarioEditor] Facciones detectadas:', detectedFactions)

      // Actualizar formData con facciones detectadas
      const updatedFormData = {
        ...formData,
        availableFactions: detectedFactions
      }

      const factionSetups = calculateFactionSetups(provinces, updatedFormData.availableFactions)

      if (selectedScenarioId) {
        // Actualizar existente
        await updateScenario(selectedScenarioId, updatedFormData, provinces, factionSetups)
        alert('Escenario actualizado correctamente')
      } else {
        // Crear nuevo
        const newId = await createScenario(updatedFormData, user.uid, provinces, factionSetups)
        setSelectedScenarioId(newId)
        alert('Escenario creado correctamente')
      }

      // Recargar lista
      await loadScenarios()
    } catch (err) {
      console.error('Error saving scenario:', err)
      setError('Error al guardar el escenario')
    } finally {
      setSaving(false)
    }
  }

  // Eliminar escenario
  const handleDelete = async () => {
    if (!selectedScenarioId) return

    if (!confirm('¿Estás seguro de eliminar este escenario?')) return

    try {
      setSaving(true)
      await deleteScenario(selectedScenarioId)
      alert('Escenario eliminado correctamente')
      handleNew()
      await loadScenarios()
    } catch (err) {
      console.error('Error deleting scenario:', err)
      setError('Error al eliminar el escenario')
    } finally {
      setSaving(false)
    }
  }

  // Actualizar provincia editada
  const handleProvinceChange = (updatedProvince: EditableProvinceData) => {
    setProvinces((prev) =>
      prev.map((p) => (p.id === updatedProvince.id ? updatedProvince : p))
    )
  }

  // Toggle adyacencia bidireccional (añadir/quitar)
  const handleAdjacencyToggle = (targetId: string) => {
    if (!selectedProvinceId) return

    setProvinces((prevProvinces) => {
      return prevProvinces.map((province) => {
        // Actualizar provincia seleccionada
        if (province.id === selectedProvinceId) {
          const isCurrentlyAdjacent = province.adjacencies.includes(targetId)
          const updatedAdjacencies = isCurrentlyAdjacent
            ? province.adjacencies.filter((id) => id !== targetId) // Quitar
            : [...province.adjacencies, targetId] // Añadir

          return { ...province, adjacencies: updatedAdjacencies }
        }

        // Actualizar provincia target (bidireccional)
        if (province.id === targetId) {
          const isCurrentlyAdjacent = province.adjacencies.includes(selectedProvinceId)
          const updatedAdjacencies = isCurrentlyAdjacent
            ? province.adjacencies.filter((id) => id !== selectedProvinceId) // Quitar
            : [...province.adjacencies, selectedProvinceId] // Añadir

          return { ...province, adjacencies: updatedAdjacencies }
        }

        return province
      })
    })
  }

  // Mapear provincias a facciones para el GameBoard
  const provinceFactionMap: Record<string, string> = {}
  provinces.forEach((province) => {
    if (province.controlledBy) {
      provinceFactionMap[province.id] = province.controlledBy
    }
  })

  const selectedProvince = selectedProvinceId
    ? provinces.find((p) => p.id === selectedProvinceId) || null
    : null

  if (loading && scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Editor de Escenarios</h1>
            <p className="text-sm text-gray-400">Crea y edita escenarios personalizados</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFactionModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            >
              Facciones
            </button>
            <button
              onClick={() => navigate('/lobby')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Volver al Lobby
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="container mx-auto mt-4 px-4">
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded whitespace-pre-line">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Mapa - Columna izquierda (8 cols) */}
          <div className="col-span-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2">Mapa de Italia</h2>
              <GameBoard
                onProvinceClick={setSelectedProvinceId}
                selectedProvince={selectedProvinceId}
                provinceFaction={provinceFactionMap}
                factions={factions}
                adjacencyEditMode={adjacencyEditMode}
                highlightedAdjacencies={selectedProvince?.adjacencies || []}
                onAdjacencyToggle={handleAdjacencyToggle}
              />
            </div>
          </div>

          {/* Panel derecho - Info + Province Editor (4 cols) */}
          <div className="col-span-4 space-y-4">
            {/* Panel de información del escenario */}
            <ScenarioInfoPanel
              formData={formData}
              onChange={setFormData}
              scenarios={scenarios}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={handleSelectScenario}
              onSave={handleSave}
              onDelete={handleDelete}
              onNew={handleNew}
              saving={saving}
            />

            {/* Panel de edición de provincia */}
            <ProvinceEditorPanel
              province={selectedProvince}
              onChange={handleProvinceChange}
              factions={factions}
              onAdjacencyModeChange={setAdjacencyEditMode}
              allProvinces={provinces}
            />
          </div>
        </div>
      </div>

      {/* Faction Editor Modal */}
      <FactionEditorModal
        isOpen={isFactionModalOpen}
        onClose={() => setIsFactionModalOpen(false)}
        onFactionChanged={() => {
          // Reload factions and scenarios to reflect changes
          loadFactions()
          loadScenarios()
        }}
      />
    </div>
  )
}
