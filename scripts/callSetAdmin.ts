import { initializeApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'

// Configuración de Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyCGIvUJTWjM6J17qbOA3WTjfpsml_oNJqk',
  authDomain: 'machiavelli-6ef06.firebaseapp.com',
  projectId: 'machiavelli-6ef06',
  storageBucket: 'machiavelli-6ef06.firebasestorage.app',
  messagingSenderId: '687381647623',
  appId: '1:687381647623:web:06b06a111f534c878335a2',
}

const app = initializeApp(firebaseConfig)
const functions = getFunctions(app)

async function makeAdmin(email: string) {
  try {
    console.log('=== Asignando rol de administrador ===\n')
    console.log(`Email: ${email}`)
    console.log('Llamando a Cloud Function...\n')

    const setAdminRole = httpsCallable(functions, 'setAdminRole')
    const result = await setAdminRole({ email })

    console.log('✅ Éxito!')
    console.log(JSON.stringify(result.data, null, 2))
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

// Ejecutar
makeAdmin('adriandiazmesa@gmail.com').then(() => {
  console.log('\n✅ Proceso completado.')
  process.exit(0)
})
