import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  ScenarioDocument,
  ScenarioFormData,
  ScenarioListItem,
  EditableProvinceData,
  FactionSetup,
} from '@/types/scenario'
import { PROVINCE_TEMPLATE } from '@/data/provinceTemplate'

const SCENARIOS_COLLECTION = 'scenarios'

/**
 * Hace que todas las adyacencias sean bidireccionales automáticamente
 */
function makeBidirectional(provinces: EditableProvinceData[]): EditableProvinceData[] {
  const provinceMap = new Map(provinces.map(p => [p.id, p]))

  // Para cada provincia, asegurarse de que sus adyacencias también la incluyan
  for (const province of provinces) {
    for (const adjId of province.adjacencies) {
      const adjacent = provinceMap.get(adjId)
      if (adjacent && !adjacent.adjacencies.includes(province.id)) {
        adjacent.adjacencies.push(province.id)
      }
    }
  }

  return provinces
}

/**
 * Inicializa un array con el template base de provincias italianas.
 *
 * NOTA: Retorna una copia del template para que el usuario pueda editarla.
 * Todas las provincias inician como neutrales (controlledBy: null).
 * Las adyacencias se hacen bidireccionales automáticamente.
 *
 * Alternativas disponibles:
 * 1. Usar este template base (por defecto)
 * 2. Clonar provincias de un escenario existente
 * 3. Resetear a template si se cometen errores
 *
 * @returns Array de provincias editables basado en el template de Italia
 */
export function initializeProvincesData(): EditableProvinceData[] {
  // Retornar copia profunda del template para que sea editable
  const provinces = JSON.parse(JSON.stringify(PROVINCE_TEMPLATE)) as EditableProvinceData[]

  // Hacer todas las adyacencias bidireccionales automáticamente
  return makeBidirectional(provinces)
}

/**
 * Crea un nuevo escenario en Firestore
 */
export async function createScenario(
  formData: ScenarioFormData,
  userId: string,
  provinces: EditableProvinceData[],
  factionSetups: FactionSetup[]
): Promise<string> {
  const scenarioDocument: Omit<ScenarioDocument, 'id'> = {
    scenarioData: {
      ...formData,
      factionSetups,
      createdBy: userId,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    },
    provinces,
  }

  const docRef = await addDoc(collection(db, SCENARIOS_COLLECTION), scenarioDocument)
  return docRef.id
}

/**
 * Actualiza un escenario existente
 */
export async function updateScenario(
  scenarioId: string,
  formData: ScenarioFormData,
  provinces: EditableProvinceData[],
  factionSetups: FactionSetup[]
): Promise<void> {
  const scenarioRef = doc(db, SCENARIOS_COLLECTION, scenarioId)

  await updateDoc(scenarioRef, {
    scenarioData: {
      ...formData,
      factionSetups,
      updatedAt: serverTimestamp(),
    },
    provinces,
  })
}

/**
 * Elimina un escenario
 */
export async function deleteScenario(scenarioId: string): Promise<void> {
  const scenarioRef = doc(db, SCENARIOS_COLLECTION, scenarioId)
  await deleteDoc(scenarioRef)
}

/**
 * Obtiene un escenario por ID
 */
export async function getScenario(scenarioId: string): Promise<ScenarioDocument | null> {
  const scenarioRef = doc(db, SCENARIOS_COLLECTION, scenarioId)
  const scenarioSnap = await getDoc(scenarioRef)

  if (!scenarioSnap.exists()) {
    return null
  }

  return {
    id: scenarioSnap.id,
    ...scenarioSnap.data(),
  } as ScenarioDocument
}

/**
 * Lista todos los escenarios disponibles
 */
export async function listScenarios(): Promise<ScenarioListItem[]> {
  const scenariosQuery = query(collection(db, SCENARIOS_COLLECTION), orderBy('scenarioData.year', 'asc'))
  const querySnapshot = await getDocs(scenariosQuery)

  return querySnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.scenarioData?.name || '',
      year: data.scenarioData?.year || 0,
      minPlayers: data.scenarioData?.minPlayers || 0,
      maxPlayers: data.scenarioData?.maxPlayers || 0,
    }
  })
}

/**
 * Valida que las adyacencias sean bidireccionales
 */
export function validateAdjacencies(provinces: EditableProvinceData[]): string[] {
  const errors: string[] = []
  const provinceMap = new Map(provinces.map((p) => [p.id, p]))

  for (const province of provinces) {
    for (const adjacentId of province.adjacencies) {
      const adjacent = provinceMap.get(adjacentId)
      if (!adjacent) {
        errors.push(`${province.name}: provincia adyacente "${adjacentId}" no existe`)
        continue
      }

      if (!adjacent.adjacencies.includes(province.id)) {
        errors.push(
          `${province.name} → ${adjacent.name}: adyacencia no es bidireccional (falta ${adjacent.name} → ${province.name})`
        )
      }
    }
  }

  return errors
}

/**
 * Valida que las flotas estén en puertos
 */
export function validateFleetPlacements(provinces: EditableProvinceData[]): string[] {
  const errors: string[] = []

  for (const province of provinces) {
    // Verificar si tiene flotas en el nuevo sistema de units
    const hasFleets = province.units.some(unit => 'ships' in unit)
    if (hasFleets && !province.isPort) {
      errors.push(`${province.name}: tiene flotas pero no es puerto`)
    }
  }

  return errors
}

/**
 * Calcula el setup de facciones a partir de las provincias
 */
export function calculateFactionSetups(
  provinces: EditableProvinceData[],
  availableFactions: string[]
): FactionSetup[] {
  const setupMap = new Map<string, FactionSetup>()

  // Inicializar todas las facciones
  for (const factionId of availableFactions) {
    setupMap.set(factionId, {
      factionId,
      treasury: 0,
      provinces: [],
    })
  }

  // Calcular por provincia
  for (const province of provinces) {
    if (province.controlledBy && setupMap.has(province.controlledBy)) {
      const setup = setupMap.get(province.controlledBy)!
      setup.provinces.push(province.id)

      // Sumar ingreso de ciudades
      if (province.hasCity && province.income > 0) {
        setup.treasury += province.income
      }
    }
  }

  return Array.from(setupMap.values()).filter((setup) => setup.provinces.length > 0)
}

/**
 * Clona las provincias de un escenario existente
 */
export async function cloneProvincesFromScenario(
  scenarioId: string
): Promise<EditableProvinceData[] | null> {
  try {
    const scenario = await getScenario(scenarioId)
    if (!scenario || !scenario.provinces) {
      return null
    }

    // Retornar copia profunda para que sea editable
    return JSON.parse(JSON.stringify(scenario.provinces))
  } catch (error) {
    console.error('Error cloning provinces:', error)
    return null
  }
}

/**
 * Resetea las provincias al template base
 */
export function resetProvinceTemplate(): EditableProvinceData[] {
  return initializeProvincesData()
}

/**
 * Exporta las provincias actuales como archivo JSON descargable
 */
export function exportProvinceTemplate(provinces: EditableProvinceData[]): void {
  // Crear JSON formateado
  const jsonContent = JSON.stringify(provinces, null, 2)

  // Crear blob y URL
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  // Crear elemento de descarga temporal
  const link = document.createElement('a')
  link.href = url
  link.download = `province-template-${new Date().toISOString().slice(0, 10)}.json`

  // Trigger download
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Importa provincias desde un archivo JSON
 */
export async function importProvinceTemplate(file: File): Promise<EditableProvinceData[] | null> {
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    // Validar que sea un array
    if (!Array.isArray(data)) {
      throw new Error('El archivo debe contener un array de provincias')
    }

    // Validar estructura básica de cada provincia
    for (const province of data) {
      if (!province.id || !province.name || !province.type || !Array.isArray(province.adjacencies)) {
        throw new Error(`Provincia inválida: falta información requerida (id, name, type, adjacencies)`)
      }
    }

    return data as EditableProvinceData[]
  } catch (error) {
    console.error('Error importing province template:', error)
    throw error
  }
}
