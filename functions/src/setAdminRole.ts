import * as admin from 'firebase-admin'
import { https } from 'firebase-functions'

/**
 * Cloud Function temporal para asignar rol de administrador
 *
 * Llámala desde el navegador o Postman:
 * POST https://us-central1-machiavelli-6ef06.cloudfunctions.net/setAdminRole
 * Body: { "email": "adriandiazmesa@gmail.com" }
 */
export const setAdminRole = https.onCall(async (request) => {
  const email = request.data.email

  if (!email) {
    throw new https.HttpsError('invalid-argument', 'Email es requerido')
  }

  try {
    // Buscar usuario en Firestore
    const usersRef = admin.firestore().collection('users')
    const querySnapshot = await usersRef.where('email', '==', email).get()

    if (querySnapshot.empty) {
      throw new https.HttpsError('not-found', `Usuario con email ${email} no encontrado`)
    }

    // Actualizar primer usuario encontrado
    const userDoc = querySnapshot.docs[0]
    await userDoc.ref.update({
      role: 'admin',
    })

    const userData = userDoc.data()

    return {
      success: true,
      message: `Rol de administrador asignado correctamente`,
      user: {
        uid: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        role: 'admin',
      },
    }
  } catch (error) {
    console.error('Error al asignar rol de admin:', error)
    throw new https.HttpsError('internal', 'Error al asignar rol de administrador')
  }
})
