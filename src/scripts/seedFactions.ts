/**
 * Migration script to seed initial factions from hardcoded data to Firestore
 *
 * Usage:
 * 1. Make sure Firebase emulators are running (or use production with care)
 * 2. Run: npx tsx src/scripts/seedFactions.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, Timestamp, connectFirestoreEmulator } from 'firebase/firestore'
import { FACTIONS } from '../data/factions'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Connect to emulators if specified
if (process.env.VITE_USE_EMULATORS === 'true') {
  console.log('🔧 Connecting to Firebase Emulators...')
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

const FACTIONS_COLLECTION = 'factions'

async function seedFactions() {
  console.log('🌱 Starting faction seeding...')

  try {
    const factionEntries = Object.values(FACTIONS)

    for (const faction of factionEntries) {
      console.log(`📝 Creating faction: ${faction.name} (${faction.id})`)

      const factionRef = doc(db, FACTIONS_COLLECTION, faction.id)

      await setDoc(factionRef, {
        id: faction.id,
        name: faction.name,
        color: faction.color,
        colorDark: faction.colorDark,
        emblemUrl: null, // No emblems initially
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })

      console.log(`✅ Created: ${faction.name}`)
    }

    console.log('\n🎉 Faction seeding completed successfully!')
    console.log(`📊 Total factions created: ${factionEntries.length}`)

  } catch (error) {
    console.error('❌ Error seeding factions:', error)
    throw error
  }
}

// Run the seed function
seedFactions()
  .then(() => {
    console.log('\n✨ Done! You can now use factions from Firestore.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error)
    process.exit(1)
  })
