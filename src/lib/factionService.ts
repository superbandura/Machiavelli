import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage } from './firebase'
import { FactionDocument, FactionFormData } from '@/types/faction'

const FACTIONS_COLLECTION = 'factions'
const SCENARIOS_COLLECTION = 'scenarios'

/**
 * Get all factions from Firestore
 */
export async function getAllFactions(): Promise<FactionDocument[]> {
  try {
    const factionsRef = collection(db, FACTIONS_COLLECTION)
    const snapshot = await getDocs(factionsRef)

    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as FactionDocument))
  } catch (error) {
    console.error('Error fetching factions:', error)
    throw new Error('Failed to load factions')
  }
}

/**
 * Get a single faction by ID
 */
export async function getFactionById(factionId: string): Promise<FactionDocument | null> {
  try {
    const factionRef = doc(db, FACTIONS_COLLECTION, factionId)
    const snapshot = await getDoc(factionRef)

    if (!snapshot.exists()) {
      return null
    }

    return {
      ...snapshot.data(),
      id: snapshot.id,
    } as FactionDocument
  } catch (error) {
    console.error('Error fetching faction:', error)
    throw new Error('Failed to load faction')
  }
}

/**
 * Upload emblem image to Firebase Storage
 */
async function uploadEmblem(factionId: string, file: File): Promise<string> {
  try {
    const storageRef = ref(storage, `factions/${factionId}/emblem`)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadUrl = await getDownloadURL(snapshot.ref)
    return downloadUrl
  } catch (error) {
    console.error('Error uploading emblem:', error)
    throw new Error('Failed to upload emblem image')
  }
}

/**
 * Delete emblem image from Firebase Storage
 */
async function deleteEmblem(factionId: string): Promise<void> {
  try {
    const storageRef = ref(storage, `factions/${factionId}/emblem`)
    await deleteObject(storageRef)
  } catch (error) {
    // Ignore error if file doesn't exist
    if ((error as any).code !== 'storage/object-not-found') {
      console.error('Error deleting emblem:', error)
    }
  }
}

/**
 * Create a new faction
 */
export async function createFaction(
  factionId: string,
  formData: FactionFormData
): Promise<FactionDocument> {
  try {
    // Check if faction ID already exists
    const existing = await getFactionById(factionId)
    if (existing) {
      throw new Error(`Faction with ID "${factionId}" already exists`)
    }

    // Upload emblem if provided
    let emblemUrl: string | undefined
    if (formData.emblemFile) {
      emblemUrl = await uploadEmblem(factionId, formData.emblemFile)
    }

    // Create faction document (exclude emblemUrl if undefined)
    const factionData: any = {
      id: factionId,
      name: formData.name,
      color: formData.color,
      colorDark: formData.colorDark || formData.color,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    // Only add emblemUrl if it exists
    if (emblemUrl) {
      factionData.emblemUrl = emblemUrl
    }

    const factionRef = doc(db, FACTIONS_COLLECTION, factionId)
    await setDoc(factionRef, factionData)

    return factionData
  } catch (error) {
    console.error('Error creating faction:', error)
    throw error
  }
}

/**
 * Update an existing faction
 */
export async function updateFaction(
  factionId: string,
  formData: FactionFormData
): Promise<FactionDocument> {
  try {
    const factionRef = doc(db, FACTIONS_COLLECTION, factionId)
    const existing = await getDoc(factionRef)

    if (!existing.exists()) {
      throw new Error(`Faction "${factionId}" not found`)
    }

    // Upload new emblem if provided
    let emblemUrl = existing.data().emblemUrl
    if (formData.emblemFile) {
      // Delete old emblem first
      await deleteEmblem(factionId)
      emblemUrl = await uploadEmblem(factionId, formData.emblemFile)
    }

    // Update faction document (exclude emblemUrl if undefined)
    const updateData: any = {
      name: formData.name,
      color: formData.color,
      colorDark: formData.colorDark || formData.color,
      updatedAt: Timestamp.now(),
    }

    // Only include emblemUrl if it exists
    if (emblemUrl !== undefined) {
      updateData.emblemUrl = emblemUrl
    }

    await updateDoc(factionRef, updateData)

    return {
      id: factionId,
      ...existing.data(),
      ...updateData,
    } as FactionDocument
  } catch (error) {
    console.error('Error updating faction:', error)
    throw error
  }
}

/**
 * Check if a faction is used in any scenario
 */
export async function isFactionInUse(factionId: string): Promise<boolean> {
  try {
    const scenariosRef = collection(db, SCENARIOS_COLLECTION)
    const q = query(
      scenariosRef,
      where('availableFactions', 'array-contains', factionId)
    )
    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    console.error('Error checking faction usage:', error)
    return false
  }
}

/**
 * Delete a faction
 * Will fail if faction is used in any scenario
 */
export async function deleteFaction(factionId: string): Promise<void> {
  try {
    // Check if faction is in use
    const inUse = await isFactionInUse(factionId)
    if (inUse) {
      throw new Error(
        `Cannot delete faction "${factionId}" because it is used in one or more scenarios`
      )
    }

    // Delete emblem from storage
    await deleteEmblem(factionId)

    // Delete faction document
    const factionRef = doc(db, FACTIONS_COLLECTION, factionId)
    await deleteDoc(factionRef)
  } catch (error) {
    console.error('Error deleting faction:', error)
    throw error
  }
}

/**
 * Get faction color by ID
 * Useful for map visualization
 */
export function getFactionColor(
  factionId: string,
  factions: FactionDocument[]
): string {
  const faction = factions.find(f => f.id === factionId)
  return faction?.color || '#9ca3af' // Default to gray
}

/**
 * Get faction dark color by ID
 */
export function getFactionDarkColor(
  factionId: string,
  factions: FactionDocument[]
): string {
  const faction = factions.find(f => f.id === factionId)
  return faction?.colorDark || faction?.color || '#6b7280' // Default to darker gray
}
