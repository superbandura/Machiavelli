import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'

// Configuración de Firebase (producción)
const firebaseConfig = {
  apiKey: 'AIzaSyCGIvUJTWjM6J17qbOA3WTjfpsml_oNJqk',
  authDomain: 'machiavelli-6ef06.firebaseapp.com',
  projectId: 'machiavelli-6ef06',
  storageBucket: 'machiavelli-6ef06.firebasestorage.app',
  messagingSenderId: '687381647623',
  appId: '1:687381647623:web:06b06a111f534c878335a2',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function setAdminRole(email: string) {
  try {
    console.log(`Buscando usuario con email: ${email}...`)

    // Buscar usuario por email en la colección users
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log('❌ Usuario no encontrado en Firestore.')
      console.log('El usuario debe registrarse primero en la aplicación.')
      return
    }

    // Actualizar el primer usuario encontrado
    const userDoc = querySnapshot.docs[0]
    const userId = userDoc.id
    const userData = userDoc.data()

    console.log(`✓ Usuario encontrado: ${userData.displayName || 'Sin nombre'} (${userId})`)

    // Actualizar role a admin
    await updateDoc(doc(db, 'users', userId), {
      role: 'admin',
    })

    console.log('✅ Rol de administrador asignado correctamente!')
    console.log(`Usuario: ${userData.displayName || userData.email}`)
    console.log(`Email: ${userData.email}`)
    console.log(`UID: ${userId}`)
    console.log(`Nuevo rol: admin`)
  } catch (error) {
    console.error('❌ Error al asignar rol de administrador:', error)
  }
}

// Ejecutar
const adminEmail = 'adriandiazmesa@gmail.com'
console.log('=== Asignando rol de administrador ===\n')
setAdminRole(adminEmail).then(() => {
  console.log('\n✅ Proceso completado.')
  process.exit(0)
})
