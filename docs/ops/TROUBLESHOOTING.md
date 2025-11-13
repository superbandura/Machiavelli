# Troubleshooting - Solución de Problemas

Guía para diagnosticar y resolver problemas comunes en Machiavelli.

## Tabla de Contenidos

1. [Problemas de Autenticación](#problemas-de-autenticación)
2. [Problemas de Firestore](#problemas-de-firestore)
3. [Problemas de Cloud Functions](#problemas-de-cloud-functions)
4. [Problemas de UI](#problemas-de-ui)
5. [Problemas de Despliegue](#problemas-de-despliegue)
6. [Problemas de Performance](#problemas-de-performance)

---

## Problemas de Autenticación

### Error: "auth/user-not-found"

**Síntoma:** Login falla con error "Usuario no encontrado"

**Causas posibles:**
1. Email incorrecto
2. Usuario no registrado
3. Usuario eliminado

**Solución:**
```typescript
// Verificar en Firebase Console → Authentication
// Buscar usuario por email
// Si no existe → Registrar nuevo usuario
```

**Prevención:**
- Mensaje claro: "Email o contraseña incorrectos" (sin especificar cuál)

---

### Error: "auth/wrong-password"

**Síntoma:** Login falla con contraseña incorrecta

**Solución:**
1. Verificar que usuario escribe contraseña correcta
2. Opción "Olvidé mi contraseña" → Reset via email

**Implementar reset de contraseña:**
```typescript
import { sendPasswordResetEmail } from 'firebase/auth'

await sendPasswordResetEmail(auth, email)
```

---

### Error: "auth/email-already-in-use"

**Síntoma:** Registro falla porque email ya existe

**Solución:**
- Redirigir a login
- Ofrecer recuperar contraseña

---

### Error: "auth/network-request-failed"

**Síntoma:** Operaciones de auth fallan por red

**Causas:**
1. Usuario sin internet
2. Firebase Auth endpoint bloqueado
3. CORS issue

**Solución:**
```typescript
try {
  await signInWithEmailAndPassword(auth, email, password)
} catch (error) {
  if (error.code === 'auth/network-request-failed') {
    alert('Error de red. Verifica tu conexión a internet.')
  }
}
```

---

## Problemas de Firestore

### Error: "Missing or insufficient permissions"

**Síntoma:** Query o write falla con "Permission denied"

**Causa #1: Security Rules bloqueando operación**

**Diagnóstico:**
```bash
# Ver reglas actuales
firebase firestore:rules get

# O en Firebase Console → Firestore → Rules
```

**Ejemplo de regla problemática:**
```javascript
// ❌ Demasiado restrictivo
match /games/{gameId} {
  allow read: if request.auth != null && resource.data.createdBy == request.auth.uid;
}

// ✓ Correcto - permite leer juegos activos
match /games/{gameId} {
  allow read: if request.auth != null;
}
```

**Solución:**
1. Ajusta `firestore.rules`
2. Despliega: `firebase deploy --only firestore:rules`
3. Reintenta operación

**Causa #2: Usuario no autenticado**

**Diagnóstico:**
```typescript
import { getAuth } from 'firebase/auth'

const auth = getAuth()
console.log('User:', auth.currentUser) // null si no autenticado
```

**Solución:**
- Verificar que `ProtectedRoute` funciona
- Forzar login antes de queries

---

### Error: "Index required"

**Síntoma:** Query compuesta falla con "index required"

**Ejemplo:**
```typescript
// Esta query necesita índice
const q = query(
  collection(db, 'players'),
  where('gameId', '==', gameId),
  where('status', '==', 'active'),
  orderBy('treasury', 'desc')
)
```

**Solución:**

**Opción 1: Usar link del error**
```
Error message contiene link a Firebase Console
Click → Crea índice automáticamente
Espera 1-2 minutos
```

**Opción 2: Añadir a firestore.indexes.json**
```json
{
  "indexes": [
    {
      "collectionGroup": "players",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "gameId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "treasury", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Despliega:
```bash
firebase deploy --only firestore:indexes
```

---

### Error: "Document doesn't exist"

**Síntoma:** `getDoc()` retorna snapshot vacío

**Diagnóstico:**
```typescript
const docSnap = await getDoc(docRef)
if (!docSnap.exists()) {
  console.error('Document not found:', docRef.path)
}
```

**Causas:**
1. ID incorrecto
2. Documento eliminado
3. Colección incorrecta
4. Security Rules bloqueando read

**Solución:**
1. Verificar ID en Firebase Console
2. Verificar que documento existe
3. Verificar Security Rules permiten read

---

### Real-time Listener No Actualiza

**Síntoma:** `onSnapshot` no recibe updates

**Causa #1: Listener no configurado correctamente**

**Diagnóstico:**
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    console.log('Snapshot received:', snapshot.data())
  }, (error) => {
    console.error('Listener error:', error) // Ver errores aquí
  })

  return () => unsubscribe() // Cleanup importante!
}, [dependencies])
```

**Causa #2: Dependencies incorrectas**

```typescript
// ❌ Listener se recrea constantemente
useEffect(() => {
  const unsubscribe = onSnapshot(docRef, ...)
  return () => unsubscribe()
}, []) // dependencies vacías → docRef puede cambiar

// ✓ Correcto
useEffect(() => {
  if (!gameId) return
  const docRef = doc(db, 'games', gameId)
  const unsubscribe = onSnapshot(docRef, ...)
  return () => unsubscribe()
}, [gameId])
```

**Causa #3: Security Rules bloqueando updates**

- Verificar que usuario tiene permisos read en tiempo real

---

## Problemas de Cloud Functions

### Error: "Function timeout"

**Síntoma:** Function excede límite de tiempo (60s default)

**Causas:**
1. Batch write muy grande (>500 ops)
2. Queries lentas sin índices
3. Loops infinitos
4. Network timeout (external API)

**Diagnóstico:**
```bash
# Ver logs
firebase functions:log --only resolveTurn --limit 20

# Buscar:
# [ResolveTurn] Step X: ... (cuál step tarda más)
```

**Solución:**

**Opción 1: Aumentar timeout**
```typescript
export const resolveTurn = functions
  .runWith({ timeoutSeconds: 300 }) // 5 minutos
  .https.onCall(...)
```

**Opción 2: Optimizar lógica**
- Reduce tamaño de batch writes
- Añade índices
- Usa queries más específicas
- Paraleliza operaciones independientes

---

### Error: "Permission denied" en Function

**Síntoma:** Cloud Function falla al escribir a Firestore

**Causa:** ¿Usas Admin SDK?

**Diagnóstico:**
```typescript
// ❌ Incorrecto - usa client SDK (sujeto a Security Rules)
import { getFirestore } from 'firebase/firestore'
const db = getFirestore()

// ✓ Correcto - usa Admin SDK (bypass Security Rules)
import * as admin from 'firebase-admin'
const db = admin.firestore()
```

**Solución:**
- Cloud Functions deben usar `firebase-admin`
- Admin SDK tiene permisos completos

---

### Scheduled Function No Se Ejecuta

**Síntoma:** `checkDeadlines` no corre cada minuto

**Diagnóstico:**
```bash
# Ver logs recientes
firebase functions:log --only checkDeadlines --limit 50

# Verificar última ejecución
# Debería haber logs cada 1 minuto
```

**Causa #1: Cloud Scheduler deshabilitado**

**Solución:**
1. Firebase Console → Functions
2. Busca `checkDeadlines`
3. Verifica "Trigger: Cloud Scheduler"
4. Si no aparece → Redesplegar

```bash
firebase deploy --only functions:checkDeadlines
```

**Causa #2: Proyecto no en plan Blaze**

- Cloud Scheduler requiere plan **Blaze**
- Upgrade en Firebase Console

**Causa #3: Región incorrecta**

```typescript
// Verifica que función scheduled está en región correcta
export const checkDeadlines = functions
  .region('us-central1') // Región debe coincidir con Firestore
  .pubsub.schedule('every 1 minutes')
  .onRun(...)
```

---

### Function Retorna Error pero No Hay Logs

**Síntoma:** Function falla pero logs no muestran error

**Causa:** Error no capturado con try-catch

**Solución:**
```typescript
export const myFunction = functions.https.onCall(async (data, context) => {
  try {
    // Lógica
    return { success: true }
  } catch (error) {
    // ✓ Log del error
    console.error('[MyFunction] Error:', error)

    // ✓ Retornar HttpsError
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Unknown error'
    )
  }
})
```

---

## Problemas de UI

### Mapa SVG No Carga

**Síntoma:** Mapa no se muestra en `GameBoard.tsx`

**Diagnóstico:**
```typescript
useEffect(() => {
  fetch('/mapa-italia.svg')
    .then(res => {
      console.log('SVG response:', res.status) // 200 = OK, 404 = not found
      return res.text()
    })
    .then(svg => console.log('SVG loaded, length:', svg.length))
    .catch(err => console.error('SVG load error:', err))
}, [])
```

**Causas:**
1. Archivo `public/mapa-italia.svg` no existe
2. Path incorrecto
3. Build no incluye public assets

**Solución:**
1. Verificar que `public/mapa-italia.svg` existe
2. Build: `npm run build`
3. Verificar que `dist/mapa-italia.svg` existe

---

### Unidades No Se Muestran en Mapa

**Síntoma:** Mapa carga pero no hay marcadores de unidades

**Diagnóstico:**
```typescript
// En GameBoard.tsx
console.log('Units:', units)
console.log('Province coordinates:', provinceCoordinates)

// Verificar:
// 1. units array tiene datos
// 2. provinceCoordinates tiene coordenadas
// 3. units[0].province coincide con key en provinceCoordinates
```

**Causas:**
1. Query de units falla (Security Rules)
2. `provinceCoordinates` no tiene coordenadas para provincia
3. SVG transform mal configurado

**Solución:**
1. Verificar Security Rules permiten leer units
2. Añadir coordenadas faltantes a `provinceCoordinates.ts`
3. Verificar `viewBox` del SVG

---

### Órdenes No Se Guardan

**Síntoma:** Usuario da orden, pero no aparece en Firestore

**Diagnóstico:**
```typescript
// En OrdersPanel.tsx
const handleSubmitOrder = async () => {
  try {
    const orderRef = await addDoc(collection(db, 'orders'), orderData)
    console.log('Order saved:', orderRef.id)
  } catch (error) {
    console.error('Error saving order:', error) // Ver error aquí
  }
}
```

**Causas:**
1. Security Rules bloqueando write
2. `orderData` tiene formato incorrecto
3. Usuario no autenticado

**Solución:**
1. Verificar Security Rules:
```javascript
match /orders/{orderId} {
  allow create: if request.auth != null
    && request.resource.data.playerId == request.auth.uid;
}
```

2. Verificar formato:
```typescript
const orderData = {
  gameId: string,
  playerId: string,
  turnNumber: number,
  orders: Order[],
  submittedAt: Timestamp.now() // ✓ Timestamp, no Date
}
```

---

### Fog of War No Funciona

**Síntoma:** Jugador ve todas las unidades, no solo las visibles

**Diagnóstico:**
```typescript
// Verificar query
const q = query(
  collection(db, 'units'),
  where('gameId', '==', gameId),
  where('visibleTo', 'array-contains', playerId) // ✓
)

// ❌ Incorrecto - no filtra por visibleTo
const q = query(
  collection(db, 'units'),
  where('gameId', '==', gameId)
)
```

**Solución:**
1. Usar query correcto con `visibleTo`
2. Verificar que `updateVisibility()` se ejecuta en resolución
3. Verificar Security Rules:
```javascript
match /units/{unitId} {
  allow read: if request.auth != null
    && request.auth.uid in resource.data.visibleTo;
}
```

---

## Problemas de Despliegue

### Error: "Billing account not configured"

**Síntoma:** Deploy de Functions falla

**Solución:**
1. Firebase Console → Settings → Usage and billing
2. Upgrade a **Blaze plan**
3. Añade tarjeta de crédito
4. Reintenta deploy

---

### Error: "Build failed"

**Síntoma:** `npm run build` falla con errores TypeScript

**Diagnóstico:**
```bash
npm run build

# Ver errores específicos
# Ejemplo: "Property 'foo' does not exist on type 'Bar'"
```

**Solución:**
1. Corrige errores TypeScript
2. Verifica imports
3. Verifica tipos en `src/types/`

**Common fix:**
```typescript
// ❌ Error
const game: Game = gameDoc.data()

// ✓ Correcto
const game = { id: gameDoc.id, ...gameDoc.data() } as Game
```

---

### Hosting Muestra Versión Antigua

**Síntoma:** Deploy exitoso pero site muestra versión anterior

**Causa:** Caché del navegador

**Solución:**
1. **Ctrl + Shift + R** (hard refresh)
2. Modo incógnito
3. Espera 5-10 minutos (CDN cache)

**Para usuarios:**
- Firebase Hosting invalida caché automáticamente
- Usuarios verán nueva versión en siguiente visita

---

### Security Rules No Se Actualizan

**Síntoma:** Cambios en `firestore.rules` no tienen efecto

**Diagnóstico:**
```bash
# Ver reglas actuales en producción
firebase firestore:rules get
```

**Solución:**
```bash
# Despliega solo rules
firebase deploy --only firestore:rules

# Verifica en Firebase Console → Firestore → Rules
```

---

## Problemas de Performance

### App Carga Lento

**Síntoma:** First load tarda >5 segundos

**Diagnóstico:**
1. Chrome DevTools → Network tab
2. Identificar recursos lentos

**Causas comunes:**
1. Bundle JS muy grande
2. Imágenes no optimizadas
3. Demasiados listeners real-time
4. Queries sin índices

**Soluciones:**

**Code splitting:**
```typescript
// Lazy load de componentes
const GameBoard = lazy(() => import('./components/GameBoard'))

<Suspense fallback={<Loading />}>
  <GameBoard />
</Suspense>
```

**Optimizar imágenes:**
- Usa WebP en vez de PNG/JPG
- Comprime imágenes
- Lazy load de imágenes fuera de viewport

**Reduce listeners:**
```typescript
// ❌ Múltiples listeners
onSnapshot(collection(db, 'units'), ...)
onSnapshot(collection(db, 'players'), ...)
onSnapshot(collection(db, 'orders'), ...)

// ✓ Combina en uno con batch read
const batch = await Promise.all([
  getDocs(collection(db, 'units')),
  getDocs(collection(db, 'players')),
  getDocs(collection(db, 'orders'))
])
```

---

### Firestore Queries Lentas

**Síntoma:** Queries tardan >2 segundos

**Diagnóstico:**
```typescript
console.time('query')
const snapshot = await getDocs(q)
console.timeEnd('query') // Ver tiempo
```

**Solución:**
1. Añade índices (ver sección "Index required")
2. Usa pagination:
```typescript
const q = query(
  collection(db, 'units'),
  where('gameId', '==', gameId),
  limit(50) // Limita resultados
)
```

3. Usa `startAfter` para paginación:
```typescript
const lastDoc = snapshot.docs[snapshot.docs.length - 1]
const nextQuery = query(
  collection(db, 'units'),
  where('gameId', '==', gameId),
  startAfter(lastDoc),
  limit(50)
)
```

---

## Herramientas de Diagnóstico

### Firebase Console

- **Overview**: Estado general
- **Firestore → Data**: Ver/editar documentos
- **Functions → Logs**: Ver logs en tiempo real
- **Performance**: Core Web Vitals

### Chrome DevTools

- **Console**: Errores JS
- **Network**: Requests lentos
- **Performance**: Profiling
- **Application → IndexedDB**: Firestore cache local

### Firebase CLI

```bash
# Ver proyecto actual
firebase use

# Ver logs
firebase functions:log

# Ver configuración
firebase functions:config:get

# Debug de Security Rules
firebase emulators:start --inspect-functions
```

---

## Contacto de Soporte

Si el problema persiste:

1. **GitHub Issues**: https://github.com/tu-repo/machiavelli/issues
2. **Logs**: Incluye logs relevantes (censura datos sensibles)
3. **Pasos para reproducir**: Describe cómo replicar el problema
4. **Entorno**: Producción vs emulators, navegador, versión

---

## Recursos

- **[Firebase Docs](https://firebase.google.com/docs)**
- **[Stack Overflow - Firebase](https://stackoverflow.com/questions/tagged/firebase)**
- **[Firebase Status](https://status.firebase.google.com/)** - Verificar outages
- **[Monitoreo](MONITORING.md)** - Guía de monitoreo

---

**Última actualización:** 2025-01-13
