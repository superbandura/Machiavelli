import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { SCENARIOS, getScenariosList, getInitialSetup } from '@/data/scenarios'
import { listScenarios, getScenario as getFirestoreScenario } from '@/lib/scenarioService'
import { ScenarioListItem, ScenarioDocument } from '@/types/scenario'

interface CreateGameModalProps {
  isOpen: boolean
  onClose: () => void
  onGameCreated?: (gameId: string) => void
}

/**
 * Inicializa todas las facciones del escenario con sus unidades iniciales
 * Esto permite que se vean en el mapa aunque no haya jugador asignado
 */
async function initializeScenarioFactions(gameId: string, scenarioId: string) {
  const scenario = SCENARIOS[scenarioId]
  if (!scenario) {
    console.error('[initializeScenarioFactions] Escenario no encontrado:', scenarioId)
    return
  }

  const unitPromises: Promise<any>[] = []

  // Crear unidades para cada facción disponible en el escenario
  for (const factionId of scenario.availableFactions) {
    const initialSetup = getInitialSetup(scenarioId, factionId)
    if (!initialSetup) {
      console.warn(`[initializeScenarioFactions] No hay setup para ${scenarioId}:${factionId}`)
      continue
    }

    // Crear guarniciones
    initialSetup.garrison.forEach((provinceId) => {
      unitPromises.push(
        addDoc(collection(db, 'units'), {
          gameId,
          owner: factionId, // owner es el factionId (no playerId)
          type: 'garrison',
          currentPosition: provinceId,
          status: 'active',
          siegeTurns: 0,
          createdAt: serverTimestamp()
        })
      )
    })

    // Crear ejércitos
    initialSetup.armies.forEach((provinceId) => {
      unitPromises.push(
        addDoc(collection(db, 'units'), {
          gameId,
          owner: factionId,
          type: 'army',
          currentPosition: provinceId,
          status: 'active',
          siegeTurns: 0,
          createdAt: serverTimestamp()
        })
      )
    })

    // Crear flotas
    initialSetup.fleets.forEach((provinceId) => {
      unitPromises.push(
        addDoc(collection(db, 'units'), {
          gameId,
          owner: factionId,
          type: 'fleet',
          currentPosition: provinceId,
          status: 'active',
          siegeTurns: 0,
          createdAt: serverTimestamp()
        })
      )
    })
  }

  // Crear todas las unidades en paralelo
  await Promise.all(unitPromises)
  console.log(`[initializeScenarioFactions] Creadas ${unitPromises.length} unidades para ${scenario.availableFactions.length} facciones`)
}

/**
 * Inicializa unidades desde un escenario de Firestore
 */
async function initializeFromFirestoreScenario(gameId: string, scenarioDoc: ScenarioDocument) {
  const unitPromises: Promise<any>[] = []

  // Crear unidades según los datos de las provincias
  for (const province of scenarioDoc.provinces) {
    if (!province.controlledBy) continue // Skip neutral provinces

    // Crear guarniciones
    for (let i = 0; i < province.garrisons; i++) {
      unitPromises.push(
        addDoc(collection(db, 'units'), {
          gameId,
          owner: province.controlledBy,
          type: 'garrison',
          currentPosition: province.id,
          status: 'active',
          siegeTurns: 0,
          createdAt: serverTimestamp(),
        })
      )
    }

    // Crear ejércitos
    for (let i = 0; i < province.armies; i++) {
      unitPromises.push(
        addDoc(collection(db, 'units'), {
          gameId,
          owner: province.controlledBy,
          type: 'army',
          currentPosition: province.id,
          status: 'active',
          siegeTurns: 0,
          createdAt: serverTimestamp(),
        })
      )
    }

    // Crear flotas
    for (let i = 0; i < province.fleets; i++) {
      unitPromises.push(
        addDoc(collection(db, 'units'), {
          gameId,
          owner: province.controlledBy,
          type: 'fleet',
          currentPosition: province.id,
          status: 'active',
          siegeTurns: 0,
          createdAt: serverTimestamp(),
        })
      )
    }
  }

  await Promise.all(unitPromises)
  console.log(`[initializeFromFirestoreScenario] Creadas ${unitPromises.length} unidades`)
}

export default function CreateGameModal({ isOpen, onClose, onGameCreated }: CreateGameModalProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Configuración del juego
  const [gameName, setGameName] = useState('')
  const [selectedScenario, setSelectedScenario] = useState('ITALIA_1454')
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
    } catch (error) {
      console.error('Error loading Firestore scenarios:', error)
      // No mostramos error al usuario, simplemente no hay escenarios custom
    }
  }

  // Obtener configuración del escenario seleccionado (hardcoded o Firestore)
  const scenario = SCENARIOS[selectedScenario]
  const isFirestoreScenario = !scenario && selectedScenario.startsWith('fs_')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Cargar escenario si es de Firestore
      let scenarioDoc: ScenarioDocument | null = null
      let scenarioName: string
      let scenarioYear: number

      if (isFirestoreScenario) {
        const fsId = selectedScenario.replace('fs_', '')
        scenarioDoc = await getFirestoreScenario(fsId)
        if (!scenarioDoc) {
          throw new Error('Escenario no encontrado')
        }
        scenarioName = scenarioDoc.name
        scenarioYear = scenarioDoc.year
      } else {
        scenarioName = scenario.name
        scenarioYear = scenario.year
      }

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

      // Inicializar unidades según el tipo de escenario
      if (isFirestoreScenario && scenarioDoc) {
        await initializeFromFirestoreScenario(docRef.id, scenarioDoc)
      } else {
        await initializeScenarioFactions(docRef.id, selectedScenario)
      }

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
                  const newScenario = SCENARIOS[e.target.value]
                  if (newScenario) {
                    setMaxPlayers(newScenario.maxPlayers)
                  } else {
                    // Es de Firestore, buscar en la lista
                    const fsScenario = firestoreScenarios.find(
                      (s) => `fs_${s.id}` === e.target.value
                    )
                    if (fsScenario) {
                      setMaxPlayers(fsScenario.maxPlayers)
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Escenarios Oficiales">
                  {getScenariosList().map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </optgroup>
                {firestoreScenarios.length > 0 && (
                  <optgroup label="Escenarios Personalizados">
                    {firestoreScenarios.map((sc) => (
                      <option key={`fs_${sc.id}`} value={`fs_${sc.id}`}>
                        {sc.name} ({sc.year})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {scenario && (
                <div className="mt-2 text-sm text-gray-400">
                  <div className="mb-1">{scenario.description}</div>
                  <div className="flex gap-4 text-xs">
                    <span>
                      {scenario.minPlayers}-{scenario.maxPlayers} jugadores
                    </span>
                    <span>•</span>
                    <span className={`font-medium ${
                      scenario.difficulty === 'tutorial' ? 'text-green-400' :
                      scenario.difficulty === 'medium' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {scenario.difficulty === 'tutorial' ? '📚 Tutorial' :
                       scenario.difficulty === 'medium' ? '⚔️ Medio' :
                       '🔥 Difícil'}
                    </span>
                    <span>•</span>
                    <span>{scenario.estimatedDuration}</span>
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
                min={scenario?.minPlayers || 2}
                max={scenario?.maxPlayers || 8}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{scenario?.minPlayers || 2}</span>
                {scenario && scenario.maxPlayers > scenario.minPlayers + 1 && (
                  <span>{Math.floor((scenario.minPlayers + scenario.maxPlayers) / 2)}</span>
                )}
                <span>{scenario?.maxPlayers || 8} (Recomendado)</span>
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
                disabled={loading}
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
