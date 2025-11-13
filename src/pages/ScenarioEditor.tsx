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
  cloneProvincesFromScenario,
  resetProvinceTemplate,
  exportProvinceTemplate,
  importProvinceTemplate,
} from '@/lib/scenarioService'
import { FactionDocument } from '@/types/faction'
import { getAllFactions } from '@/lib/factionService'

const DEFAULT_FORM_DATA: ScenarioFormData = {
  name: 'Nuevo Escenario',
  description: '',
  year: 1454,
  minPlayers: 3,
  maxPlayers: 6,
  victoryConditions: {
    victoryPoints: 9, // Valor estándar para 6 jugadores
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
  const [factionSetups, setFactionSetups] = useState<FactionSetup[]>([])

  // Cargar lista de escenarios y facciones al montar
  useEffect(() => {
    loadScenarios()
    loadFactions()
  }, [])

  // Sincronizar factionSetups con las provincias
  useEffect(() => {
    // Obtener facciones que tienen provincias asignadas
    const factionsInMap = new Set<string>()
    provinces.forEach(p => {
      if (p.controlledBy) {
        factionsInMap.add(p.controlledBy)
      }
    })

    setFactionSetups(prev => {
      // Mantener facciones existentes que aún tienen provincias
      const updated = prev.filter(setup => factionsInMap.has(setup.factionId))

      // Añadir facciones nuevas con tesoro = 0
      factionsInMap.forEach(factionId => {
        if (!updated.find(s => s.factionId === factionId)) {
          updated.push({
            factionId,
            treasury: 0,
            provinces: provinces.filter(p => p.controlledBy === factionId).map(p => p.id)
          })
        } else {
          // Actualizar lista de provincias de facciones existentes
          const existingSetup = updated.find(s => s.factionId === factionId)
          if (existingSetup) {
            existingSetup.provinces = provinces.filter(p => p.controlledBy === factionId).map(p => p.id)
          }
        }
      })

      return updated
    })
  }, [provinces])

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
          name: scenario.scenarioData.name,
          description: scenario.scenarioData.description,
          year: scenario.scenarioData.year,
          minPlayers: scenario.scenarioData.minPlayers,
          maxPlayers: scenario.scenarioData.maxPlayers,
          victoryConditions: scenario.scenarioData.victoryConditions,
          availableFactions: scenario.scenarioData.availableFactions,
        })
        setProvinces(scenario.provinces)
        setFactionSetups(scenario.scenarioData.factionSetups || [])
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

      // Usar factionSetups del estado, o calcular si está vacío (primera vez)
      const finalFactionSetups = factionSetups.length > 0
        ? factionSetups
        : calculateFactionSetups(provinces, updatedFormData.availableFactions)

      if (selectedScenarioId) {
        // Actualizar existente
        await updateScenario(selectedScenarioId, updatedFormData, provinces, finalFactionSetups)
        alert('Escenario actualizado correctamente')
      } else {
        // Crear nuevo
        const newId = await createScenario(updatedFormData, user.uid, provinces, finalFactionSetups)
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

  // Clonar provincias desde otro escenario
  const handleCloneProvinces = async () => {
    const scenarioId = prompt(
      'Ingresa el ID del escenario desde el que quieres clonar las provincias:\n\n' +
        'Escenarios disponibles:\n' +
        scenarios.map((s) => `- ${s.name} (${s.year}): ${s.id}`).join('\n')
    )

    if (!scenarioId) return

    try {
      const clonedProvinces = await cloneProvincesFromScenario(scenarioId)
      if (clonedProvinces) {
        setProvinces(clonedProvinces)
        setSelectedProvinceId(null)
        alert(`${clonedProvinces.length} provincias clonadas correctamente`)
      } else {
        alert('No se pudieron clonar las provincias. Verifica el ID del escenario.')
      }
    } catch (err) {
      console.error('Error cloning provinces:', err)
      alert('Error al clonar provincias')
    }
  }

  // Resetear provincias al template base
  const handleResetProvinces = () => {
    if (!confirm('¿Estás seguro de resetear todas las provincias al template base?')) return

    const resetProvinces = resetProvinceTemplate()
    setProvinces(resetProvinces)
    setSelectedProvinceId(null)
    alert(`${resetProvinces.length} provincias reseteadas al template base`)
  }

  // Auto-corregir bidireccionalidad
  const handleAutoCorrectBidirectionality = () => {
    const provinceMap = new Map(provinces.map(p => [p.id, p]))

    // Hacer una copia profunda de las provincias
    const correctedProvinces = provinces.map(province => ({
      ...province,
      adjacencies: [...province.adjacencies]
    }))

    // Corregir bidireccionalidad
    for (const province of correctedProvinces) {
      for (const adjId of province.adjacencies) {
        const adjacent = correctedProvinces.find(p => p.id === adjId)
        if (adjacent && !adjacent.adjacencies.includes(province.id)) {
          adjacent.adjacencies.push(province.id)
        }
      }
    }

    setProvinces(correctedProvinces)
    alert('Bidireccionalidad corregida automáticamente')
  }

  // Exportar template de provincias
  const handleExportTemplate = () => {
    // Validar antes de exportar
    const adjacencyErrors = validateAdjacencies(provinces)
    if (adjacencyErrors.length > 0) {
      const confirmed = confirm(
        `Se encontraron ${adjacencyErrors.length} errores de bidireccionalidad.\n\n` +
        `¿Deseas exportar de todas formas?\n\n` +
        `Se recomienda usar "Auto-Corregir" primero.`
      )
      if (!confirmed) return
    }

    exportProvinceTemplate(provinces)
    alert(`Template exportado exitosamente con ${provinces.length} provincias`)
  }

  // Importar template de provincias
  const handleImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const importedProvinces = await importProvinceTemplate(file)
      if (importedProvinces) {
        setProvinces(importedProvinces)
        setSelectedProvinceId(null)
        alert(`${importedProvinces.length} provincias importadas exitosamente`)
      }
    } catch (error) {
      console.error('Error importing template:', error)
      alert(`Error al importar template: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }

    // Reset file input
    event.target.value = ''
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
      <div className="w-full px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Panel izquierdo - Province Editor (3 cols) */}
          <div className="col-span-3">
            <ProvinceEditorPanel
              province={selectedProvince}
              onChange={handleProvinceChange}
              factions={factions}
              onAdjacencyModeChange={setAdjacencyEditMode}
              allProvinces={provinces}
              onAutoCorrectBidirectionality={handleAutoCorrectBidirectionality}
            />
          </div>

          {/* Mapa - Columna central (6 cols) */}
          <div className="col-span-6">
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

          {/* Panel derecho - Scenario Info (3 cols) */}
          <div className="col-span-3">
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
              onCloneProvinces={handleCloneProvinces}
              onResetProvinces={handleResetProvinces}
              onExportTemplate={handleExportTemplate}
              onImportTemplate={handleImportTemplate}
              factionSetups={factionSetups}
              onFactionSetupsChange={setFactionSetups}
              provinces={provinces}
              factions={factions}
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
