import * as admin from 'firebase-admin'
import { https } from 'firebase-functions/v2'

/**
 * Cloud Function para eliminar una partida completa.
 *
 * Elimina:
 * - diplomatic_messages (gameId)
 * - votes (gameId)
 * - orders (gameId)
 * - turns (gameId)
 * - units (gameId) ⭐
 * - players (gameId)
 * - games (gameId)
 *
 * Permisos: Solo el creador de la partida o un admin puede eliminar.
 * Estados: Se puede eliminar partidas en cualquier estado (waiting, active, finished).
 */

const db = admin.firestore()

interface DeleteGameRequest {
  gameId: string
}

interface DeleteGameResponse {
  success: boolean
  message: string
  deletedCounts?: {
    diplomaticMessages: number
    votes: number
    orders: number
    turns: number
    units: number
    players: number
  }
}

export const deleteGame = https.onCall(async (request): Promise<DeleteGameResponse> => {
  const userId = request.auth?.uid

  // 1. Verificar autenticación
  if (!userId) {
    throw new https.HttpsError('unauthenticated', 'Usuario no autenticado')
  }

  const { gameId } = request.data as DeleteGameRequest

  // 2. Validar gameId
  if (!gameId || typeof gameId !== 'string') {
    throw new https.HttpsError('invalid-argument', 'gameId es requerido y debe ser string')
  }

  console.log(`[deleteGame] Iniciando eliminación de partida ${gameId} por usuario ${userId}`)

  try {
    // 3. Obtener documento de la partida
    const gameRef = db.collection('games').doc(gameId)
    const gameDoc = await gameRef.get()

    if (!gameDoc.exists) {
      throw new https.HttpsError('not-found', 'Partida no encontrada')
    }

    const gameData = gameDoc.data()!

    // 4. Verificar permisos: creador o admin
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const isAdmin = userData?.role === 'admin'
    const isCreator = gameData.createdBy === userId

    if (!isCreator && !isAdmin) {
      throw new https.HttpsError(
        'permission-denied',
        'Solo el creador de la partida o un administrador puede eliminarla'
      )
    }

    console.log(`[deleteGame] Usuario autorizado: ${isCreator ? 'creador' : 'admin'}`)

    // 5. Eliminar todas las colecciones relacionadas
    const deletedCounts = {
      diplomaticMessages: 0,
      votes: 0,
      orders: 0,
      turns: 0,
      units: 0,
      players: 0
    }

    // Helper para eliminar documentos en batches
    const deleteCollection = async (
      collectionName: string,
      fieldName: string = 'gameId'
    ): Promise<number> => {
      const query = db.collection(collectionName).where(fieldName, '==', gameId)
      let deletedCount = 0

      // Firestore permite max 500 operaciones por batch
      const batchSize = 500
      let hasMore = true

      while (hasMore) {
        const snapshot = await query.limit(batchSize).get()

        if (snapshot.empty) {
          hasMore = false
          break
        }

        // Crear batch para eliminar
        const batch = db.batch()
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref)
          deletedCount++
        })

        await batch.commit()
        console.log(`[deleteGame] Eliminados ${snapshot.size} documentos de ${collectionName}`)

        // Si obtuvimos menos del límite, no hay más
        if (snapshot.size < batchSize) {
          hasMore = false
        }
      }

      return deletedCount
    }

    // 6. Eliminar colecciones en orden (menos críticas primero)
    console.log('[deleteGame] Eliminando diplomatic_messages...')
    deletedCounts.diplomaticMessages = await deleteCollection('diplomatic_messages')

    console.log('[deleteGame] Eliminando votes...')
    deletedCounts.votes = await deleteCollection('votes')

    console.log('[deleteGame] Eliminando orders...')
    deletedCounts.orders = await deleteCollection('orders')

    console.log('[deleteGame] Eliminando turns...')
    deletedCounts.turns = await deleteCollection('turns')

    console.log('[deleteGame] Eliminando units...')
    deletedCounts.units = await deleteCollection('units')

    console.log('[deleteGame] Eliminando players...')
    deletedCounts.players = await deleteCollection('players')

    // 7. Finalmente, eliminar el documento de la partida
    console.log('[deleteGame] Eliminando documento de partida...')
    await gameRef.delete()

    console.log('[deleteGame] Partida eliminada exitosamente:', deletedCounts)

    return {
      success: true,
      message: 'Partida eliminada correctamente',
      deletedCounts
    }
  } catch (error: any) {
    console.error('[deleteGame] Error eliminando partida:', error)

    // Si es un error de HttpsError que ya lanzamos, re-lanzarlo
    if (error instanceof https.HttpsError) {
      throw error
    }

    // Otros errores
    throw new https.HttpsError(
      'internal',
      `Error al eliminar la partida: ${error.message}`
    )
  }
})
