import { Timestamp } from 'firebase/firestore'

/**
 * Faction document stored in Firestore collection 'factions'
 */
export interface FactionDocument {
  id: string
  name: string
  color: string
  colorDark?: string
  emblemUrl?: string // Firebase Storage URL
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Form data for creating/editing a faction (without timestamps)
 */
export interface FactionFormData {
  name: string
  color: string
  colorDark?: string
  emblemFile?: File // File to upload
}

/**
 * Legacy faction type (kept for backward compatibility with hardcoded factions)
 */
export interface LegacyFaction {
  id: string
  name: string
  color: string
  colorDark: string
}
