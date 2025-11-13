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
import { PROVINCE_INFO } from '@/data/provinceData'

const SCENARIOS_COLLECTION = 'scenarios'

/**
 * Inicializa los datos de provincias con valores por defecto desde PROVINCE_INFO
 */
export function initializeProvincesData(): EditableProvinceData[] {
  return Object.values(PROVINCE_INFO).map((province) => ({
    id: province.id,
    name: province.name,
    type: province.type,
    adjacencies: [...province.adjacencies],
    hasCity: province.hasCity || false,
    cityName: province.cityName || '',
    isPort: province.isPort || false,
    income: province.income || 0,
    controlledBy: null, // Neutral por defecto
    garrisons: 0,
    armies: 0,
    fleets: 0,
  }))
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
  const scenarioData: Omit<ScenarioDocument, 'id'> = {
    ...formData,
    factionSetups,
    provinces,
    neutralTerritories: provinces
      .filter((p) => p.controlledBy === null && p.hasCity)
      .map((p) => p.id),
    createdBy: userId,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  }

  const docRef = await addDoc(collection(db, SCENARIOS_COLLECTION), scenarioData)
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
    ...formData,
    factionSetups,
    provinces,
    neutralTerritories: provinces
      .filter((p) => p.controlledBy === null && p.hasCity)
      .map((p) => p.id),
    updatedAt: serverTimestamp(),
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
  const scenariosQuery = query(collection(db, SCENARIOS_COLLECTION), orderBy('year', 'asc'))
  const querySnapshot = await getDocs(scenariosQuery)

  return querySnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name,
      year: data.year,
      difficulty: data.difficulty,
      minPlayers: data.minPlayers,
      maxPlayers: data.maxPlayers,
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
    if (province.fleets > 0 && !province.isPort) {
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
