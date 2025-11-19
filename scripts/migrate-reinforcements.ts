/**
 * Script de migración: Añadir estimatedArrivalDay a refuerzos existentes
 *
 * Ejecutar con: npx tsx scripts/migrate-reinforcements.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'

// Inicializar Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json')
initializeApp({
  credential: cert(serviceAccountPath)
})

const db = getFirestore()

async function migrateReinforcements() {
  console.log('🚀 Iniciando migración de refuerzos...\n')

  try {
    // Obtener todas las campañas
    const campaignsSnapshot = await db.collection('campaigns').get()
    console.log(`📊 Encontradas ${campaignsSnapshot.size} campañas\n`)

    let totalUpdated = 0
    let totalProcessed = 0

    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaign = campaignDoc.data()

      if (!campaign.reinforcements || campaign.reinforcements.length === 0) {
        continue
      }

      totalProcessed++
      const campaignId = campaignDoc.id
      const gameId = campaign.gameId

      // Obtener el turno actual del juego
      const gameDoc = await db.collection('games').doc(gameId).get()
      if (!gameDoc.exists) {
        console.warn(`⚠️  Juego no encontrado para campaña ${campaignId}`)
        continue
      }

      const game = gameDoc.data()!
      const currentTurn = game.turnNumber || 1

      console.log(`📍 Campaña ${campaignId} (Juego: ${gameId}, Turno: ${currentTurn})`)

      let needsUpdate = false
      const updatedReinforcements = campaign.reinforcements.map((reinforcement: any) => {
        if (!reinforcement.estimatedArrivalDay) {
          // Generar días aleatorios (4-10) desde el turno actual
          const randomDays = Math.floor(Math.random() * 7) + 4
          const estimatedArrivalDay = currentTurn + randomDays

          console.log(`   ✏️  Refuerzo ${reinforcement.id}: añadiendo estimatedArrivalDay = ${estimatedArrivalDay} (${randomDays}d desde turno ${currentTurn})`)

          needsUpdate = true
          return {
            ...reinforcement,
            estimatedArrivalDay
          }
        }
        return reinforcement
      })

      if (needsUpdate) {
        await db.collection('campaigns').doc(campaignId).update({
          reinforcements: updatedReinforcements
        })
        totalUpdated++
        console.log(`   ✅ Campaña actualizada\n`)
      } else {
        console.log(`   ℹ️  Todos los refuerzos ya tienen estimatedArrivalDay\n`)
      }
    }

    console.log('\n📈 Resumen de migración:')
    console.log(`   - Campañas procesadas: ${totalProcessed}`)
    console.log(`   - Campañas actualizadas: ${totalUpdated}`)
    console.log(`   - Sin cambios: ${totalProcessed - totalUpdated}`)
    console.log('\n✅ Migración completada exitosamente!')

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    throw error
  }
}

// Ejecutar migración
migrateReinforcements()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
