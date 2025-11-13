import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { listScenarios, getScenario as getFirestoreScenario } from '@/lib/scenarioService'
import { ScenarioListItem, ScenarioDocument } from '@/types/scenario'
import { GameMap, ScenarioData, ProvinceInfo } from '@/types/game'

interface CreateGameModalProps {
  isOpen: boolean
  onClose: () => void
  onGameCreated?: (gameId: string) => void
}

/**
 * Construye el GameMap desde un escenario de Firestore
 */
function buildGameMapFromFirestore(scenarioDoc: ScenarioDocument): GameMap {
  const provinces: Record<string, ProvinceInfo> = {}

  scenarioDoc.provinces.forEach(province => {
    provinces[province.id] = {
      id: province.id,
      name: province.name,
      type: province.type,
      adjacencies: province.adjacencies,
      controlledBy: province.controlledBy, // Copiar control inicial de la provincia
      hasCity: province.hasCity,
      cityName: province.cityName,
      isPort: province.isPort,
      income: province.income
    }
  })

  return { provinces }
}

/**
 * Construye ScenarioData desde escenario de Firestore
 */
function buildScenarioDataFromFirestore(scenarioDoc: ScenarioDocument): ScenarioData {
  return {
    availableFactions: scenarioDoc.scenarioData.availableFactions,
    victoryConditions: scenarioDoc.scenarioData.victoryConditions,
    factionSetups: scenarioDoc.scenarioData.factionSetups
  }
}

/**
 * Inicializa unidades desde un escenario de Firestore
 */
async function initializeFirestoreScenarioUnits(gameId: string, scenarioDoc: ScenarioDocument) {
  const unitPromises: Promise<any>[] = []

  // Crear unidades según los datos de las provincias
  for (const province of scenarioDoc.provinces) {
    if (!province.controlledBy) continue // Skip neutral provinces

    // Iterar sobre las unidades detalladas de la provincia
    for (const unit of province.units) {
      // Determinar el tipo de unidad
      let unitType: 'army' | 'fleet' | 'garrison'

      if ('ships' in unit) {
        // Es una flota
        unitType = 'fleet'
      } else if ('troops' in unit && 'lightCavalry' in unit.troops) {
        // Es un ejército (tiene tipos de caballería)
        unitType = 'army'
      } else {
        // Es una guarnición (sin caballería)
        unitType = 'garrison'
      }

      // Crear la unidad en Firestore
      unitPromises.push(
        addDoc(collection(db, 'units'), {
          gameId,
          owner: province.controlledBy,
          type: unitType,
          currentPosition: province.id,
          status: 'active',
          siegeTurns: 0,
          createdAt: serverTimestamp(),
          // Campos adicionales para el nuevo sistema
          name: unit.name,
          composition: 'troops' in unit ? unit.troops : unit.ships,
        })
      )
    }
  }

  await Promise.all(unitPromises)
  console.log(`[initializeFirestoreScenarioUnits] Creadas ${unitPromises.length} unidades`)
}

export default function CreateGameModal({ isOpen, onClose, onGameCreated }: CreateGameModalProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Configuración del juego
  const [gameName, setGameName] = useState('')
  const [selectedScenario, setSelectedScenario] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [diplomaticDuration, setDiplomaticDuration] = useState(48)
  const [ordersDuration, setOrdersDuration] = useState(48)
  const [advancedRules, setAdvancedRules] = useState(true)
  const [famine, setFamine] = useState(true)
  const [plague, setPlague] = useState(true)
  const [assassination, setAssassination] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)

  // Escenarios de Firestore
  const [firestoreScenarios, setFirestoreScenarios] = useState<ScenarioListItem[]>([])

  // Cargar escenarios de Firestore al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadFirestoreScenarios()
    }
  }, [isOpen])

  const loadFirestoreScenarios = async () => {
    try {
      const scenarios = await listScenarios()
      setFirestoreScenarios(scenarios)

      // Seleccionar el primer escenario por defecto
      if (scenarios.length > 0 && !selectedScenario) {
        setSelectedScenario(scenarios[0].id)
        setMaxPlayers(scenarios[0].maxPlayers)
      }
    } catch (error) {
      console.error('Error loading Firestore scenarios:', error)
      setError('Error al cargar escenarios. Por favor recarga la página.')
    }
  }

  // Obtener información del escenario seleccionado
  const selectedScenarioInfo = firestoreScenarios.find(s => s.id === selectedScenario)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!selectedScenario) {
      setError('Por favor selecciona un escenario')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Cargar escenario de Firestore
      const scenarioDoc = await getFirestoreScenario(selectedScenario)
      if (!scenarioDoc) {
        throw new Error('Escenario no encontrado')
      }

      const scenarioName = scenarioDoc.name
      const scenarioYear = scenarioDoc.year
      const gameMap = buildGameMapFromFirestore(scenarioDoc)
      const scenarioData = buildScenarioDataFromFirestore(scenarioDoc)

      // Crear documento de partida en Firestore
      const gameData = {
        name: gameName || `Partida de ${user.displayName || user.email}`,
        scenario: scenarioName,
        scenarioId: selectedScenario,
        status: 'waiting',
        currentYear: scenarioYear,
        currentSeason: 'spring',
        currentPhase: 'diplomatic',
        turnNumber: 1,
        maxPlayers: maxPlayers,
        playersCount: 0, // El creador se une después

        // Datos del mapa y escenario
        map: gameMap,
        scenarioData: scenarioData,

        // Deadlines (se calculan al empezar)
        phaseDeadline: null,
        phaseStartedAt: null,

        phaseDurations: {
          diplomatic: diplomaticDuration,
          orders: ordersDuration,
          resolution: 1 // Procesamiento automático
        },

        gameSettings: {
          advancedRules: advancedRules,
          optionalRules: {
            famine: famine,
            plague: plague,
            assassination: assassination
          },
          emailNotifications: emailNotifications
        },

        activeDisasters: {
          famineProvinces: []
        },

        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'games'), gameData)
      console.log('[CreateGameModal] Partida creada con ID:', docRef.id)

      // Inicializar unidades desde Firestore
      await initializeFirestoreScenarioUnits(docRef.id, scenarioDoc)

      // Cerrar modal primero
      onClose()

      // Callback después de cerrar (para evitar interferencias)
      if (onGameCreated) {
        onGameCreated(docRef.id)
      }

      // Reset form
      setGameName('')
      setMaxPlayers(6)
      setDiplomaticDuration(48)
      setOrdersDuration(48)
      setAdvancedRules(true)
      setFamine(true)
      setPlague(true)
      setAssassination(true)
      setEmailNotifications(true)

    } catch (err) {
      console.error('Error creando partida:', err)
      setError('Error al crear la partida. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Crear Nueva Partida</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Nombre de la partida */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de la Partida
              </label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder={`Partida de ${user?.displayName || 'Usuario'}`}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Selector de escenario */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Escenario
              </label>
              <select
                value={selectedScenario}
                onChange={(e) => {
                  setSelectedScenario(e.target.value)
                  // Ajustar jugadores según el escenario
                  const scenario = firestoreScenarios.find(s => s.id === e.target.value)
                  if (scenario) {
                    setMaxPlayers(scenario.maxPlayers)
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {firestoreScenarios.length === 0 ? (
                  <option value="">Cargando escenarios...</option>
                ) : (
                  firestoreScenarios.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name} ({sc.year})
                    </option>
                  ))
                )}
              </select>
              {selectedScenarioInfo && (
                <div className="mt-2 text-sm text-gray-400">
                  <div className="flex gap-4 text-xs">
                    <span>
                      {selectedScenarioInfo.minPlayers}-{selectedScenarioInfo.maxPlayers} jugadores
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Número de jugadores */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número Máximo de Jugadores: {maxPlayers}
              </label>
              <input
                type="range"
                min={selectedScenarioInfo?.minPlayers || 2}
                max={selectedScenarioInfo?.maxPlayers || 8}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full"
                disabled={!selectedScenarioInfo}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{selectedScenarioInfo?.minPlayers || 2}</span>
                {selectedScenarioInfo && selectedScenarioInfo.maxPlayers > selectedScenarioInfo.minPlayers + 1 && (
                  <span>{Math.floor((selectedScenarioInfo.minPlayers + selectedScenarioInfo.maxPlayers) / 2)}</span>
                )}
                <span>{selectedScenarioInfo?.maxPlayers || 8} (Recomendado)</span>
              </div>
            </div>

            {/* Duración de fases */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fase Diplomática (horas)
                </label>
                <select
                  value={diplomaticDuration}
                  onChange={(e) => setDiplomaticDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={24}>24h (1 día)</option>
                  <option value={48}>48h (2 días)</option>
                  <option value={72}>72h (3 días)</option>
                  <option value={96}>96h (4 días)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fase de Órdenes (horas)
                </label>
                <select
                  value={ordersDuration}
                  onChange={(e) => setOrdersDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={24}>24h (1 día)</option>
                  <option value={48}>48h (2 días)</option>
                  <option value={72}>72h (3 días)</option>
                  <option value={96}>96h (4 días)</option>
                </select>
              </div>
            </div>

            {/* Reglas del juego */}
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Reglas del Juego</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedRules}
                    onChange={(e) => setAdvancedRules(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                  />
                  <div>
                    <div className="text-white font-medium">Juego Avanzado</div>
                    <div className="text-sm text-gray-400">
                      Incluye tesorería, sobornos, mercenarios
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={famine}
                    onChange={(e) => setFamine(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                  />
                  <div>
                    <div className="text-white font-medium">Hambre</div>
                    <div className="text-sm text-gray-400">
                      33% probabilidad en Primavera
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plague}
                    onChange={(e) => setPlague(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                  />
                  <div>
                    <div className="text-white font-medium">Peste</div>
                    <div className="text-sm text-gray-400">
                      33% probabilidad en Verano
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assassination}
                    onChange={(e) => setAssassination(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                  />
                  <div>
                    <div className="text-white font-medium">Asesinato</div>
                    <div className="text-sm text-gray-400">
                      Permite matar al príncipe enemigo
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                  />
                  <div>
                    <div className="text-white font-medium">Notificaciones por Email</div>
                    <div className="text-sm text-gray-400">
                      Recibir emails al cambiar de fase
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedScenario}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Partida'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
