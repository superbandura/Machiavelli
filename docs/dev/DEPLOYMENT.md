# Guía de Despliegue a Producción

Guía paso a paso para desplegar Machiavelli a Firebase Hosting y Cloud Functions.

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Preparación](#preparación)
3. [Despliegue Inicial](#despliegue-inicial)
4. [Despliegue de Actualizaciones](#despliegue-de-actualizaciones)
5. [Rollback](#rollback)
6. [Monitoreo Post-Despliegue](#monitoreo-post-despliegue)
7. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

### 1. Plan de Firebase

**Cloud Functions requiere plan Blaze (pago):**
- Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
- Actualiza a plan **Blaze** (pay-as-you-go)
- Configura método de pago

**Costos estimados:**
- Hosting: **Gratis** (10 GB almacenamiento, 360 MB/día transferencia)
- Firestore: **Gratis** hasta 1 GB almacenado, 50K lecturas/día
- Cloud Functions: **~$5-20/mes** según uso
- Auth: **Gratis** para email/password

### 2. Firebase CLI

```bash
# Instala Firebase CLI globalmente
npm install -g firebase-tools

# Verifica instalación
firebase --version

# Login a Firebase
firebase login
```

### 3. Proyecto Configurado

```bash
# Verifica que estás en el proyecto correcto
firebase projects:list

# Selecciona proyecto si es necesario
firebase use machiavelli-6ef06
```

---

## Preparación

### 1. Variables de Entorno

**Frontend (.env):**
```bash
# Producción - Apunta a Firebase real
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=machiavelli-6ef06.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=machiavelli-6ef06
VITE_FIREBASE_STORAGE_BUCKET=machiavelli-6ef06.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=687381647623
VITE_FIREBASE_APP_ID=1:687381647623:web:XXXXXXXXXXXXXXXX

# IMPORTANTE: Desactiva emulators para producción
VITE_USE_EMULATORS=false
```

**Cloud Functions:**

Si necesitas variables secretas (ej. SendGrid API Key):
```bash
firebase functions:config:set sendgrid.api_key="SG.XXXXXXXXXXXXXXXX"

# Ver configuración actual
firebase functions:config:get
```

### 2. Build Local

**Verifica que todo compila:**
```bash
# Frontend
npm run build

# Cloud Functions
cd functions
npm run build
cd ..
```

Si hay errores, **resuélvelos antes de continuar**.

### 3. Firestore Security Rules

**CRÍTICO:** Despliega Security Rules **ANTES** que código.

Verifica `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tus reglas aquí
  }
}
```

**Despliega solo las reglas primero:**
```bash
firebase deploy --only firestore:rules
```

Esto previene errores de permisos cuando despliegues código nuevo.

### 4. Firestore Indexes

Verifica `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "players",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "gameId", "order": "ASCENDING" },
        { "fieldPath": "faction", "order": "ASCENDING" }
      ]
    }
    // ... más índices
  ]
}
```

**Despliega índices:**
```bash
firebase deploy --only firestore:indexes
```

---

## Despliegue Inicial

### 1. Despliegue Completo

```bash
# Desde la raíz del proyecto
npm run build                    # Build frontend
cd functions && npm run build    # Build functions
cd ..

# Despliega todo
firebase deploy
```

Esto despliega:
- ✅ Firestore Rules
- ✅ Firestore Indexes
- ✅ Cloud Functions
- ✅ Firebase Hosting

**Tiempo estimado:** 3-5 minutos

### 2. Verificación

**Hosting:**
```
✔  Deploy complete!

Hosting URL: https://machiavelli-6ef06.web.app
```

Abre la URL y verifica:
- [ ] La app carga correctamente
- [ ] Login funciona
- [ ] Lobby muestra partidas
- [ ] Puedes crear partida

**Cloud Functions:**

Ve a [Firebase Console → Functions](https://console.firebase.google.com/) y verifica:
- [ ] `checkDeadlines` desplegada (scheduled)
- [ ] `resolveTurn` desplegada
- [ ] `forcePhaseAdvance` desplegada (callable)
- No hay errores en logs

---

## Despliegue de Actualizaciones

### Despliegue Selectivo

**Solo Hosting (frontend):**
```bash
npm run build
firebase deploy --only hosting
```

**Solo Functions (backend):**
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

**Solo Security Rules:**
```bash
firebase deploy --only firestore:rules
```

**Función específica:**
```bash
firebase deploy --only functions:resolveTurn
```

### Orden Recomendado

Para cambios que afectan múltiples componentes:

1. **Security Rules primero:**
```bash
firebase deploy --only firestore:rules
```

2. **Índices (si cambiaron):**
```bash
firebase deploy --only firestore:indexes
```

3. **Cloud Functions:**
```bash
firebase deploy --only functions
```

4. **Hosting último:**
```bash
firebase deploy --only hosting
```

**Razón:** Evita que frontend nuevo intente usar reglas antiguas o funciones no desplegadas.

### Verificación Post-Despliegue

**Logs de Functions:**
```bash
firebase functions:log --only checkDeadlines --limit 50
```

**Errores recientes:**
```bash
firebase functions:log --only errors
```

---

## Rollback

### Rollback de Hosting

Firebase guarda versiones anteriores:

1. Ve a [Firebase Console → Hosting](https://console.firebase.google.com/)
2. Pestaña **"Release history"**
3. Encuentra la versión anterior
4. Click **"Roll back"**

**Vía CLI:**
```bash
# Listar releases
firebase hosting:channel:list

# Rollback a versión específica
firebase hosting:rollback
```

### Rollback de Functions

**No hay rollback automático.** Debes redesplegar versión anterior:

1. **Checkout versión anterior:**
```bash
git checkout <commit-hash-anterior>
```

2. **Build:**
```bash
cd functions
npm run build
cd ..
```

3. **Despliega:**
```bash
firebase deploy --only functions
```

4. **Vuelve a main:**
```bash
git checkout main
```

### Rollback de Emergency

**Deshabilita una función problemática:**
```bash
# Elimina la función
firebase functions:delete nombreFuncion

# Despliega sin esa función (comentada en index.ts)
firebase deploy --only functions
```

---

## Monitoreo Post-Despliegue

### 1. Verificación Inmediata (primeros 10 minutos)

**Firebase Console:**
- ✅ **Functions → Logs**: Sin errores
- ✅ **Firestore → Data**: Queries funcionan
- ✅ **Hosting**: URL carga correctamente

**Testing manual:**
- [ ] Login con cuenta de prueba
- [ ] Crea partida
- [ ] Únete a partida
- [ ] Da órdenes
- [ ] Fuerza avance (si tienes permisos)
- [ ] Verifica resolución

### 2. Monitoreo Continuo (primeras 24 horas)

**Cloud Functions:**
```bash
# Ver logs en tiempo real
firebase functions:log --limit 100

# Ver solo errores
firebase functions:log --only checkDeadlines,resolveTurn --limit 50
```

**Firebase Console → Functions:**
- **Invocations**: Verifica que `checkDeadlines` se ejecuta cada minuto
- **Execution time**: Debe ser <5 segundos (resolución <30s)
- **Error rate**: Debe ser 0% o muy bajo

**Firebase Console → Firestore:**
- **Usage**: Verifica lecturas/escrituras razonables
- **Requests**: Sin picos anormales

### 3. Alertas

**Configura alertas en Firebase:**

1. Firebase Console → **Performance Monitoring**
2. Configura alertas para:
   - Error rate > 5%
   - Execution time > 30s
   - Invocation failures

---

## Troubleshooting

### Error: "Missing or insufficient permissions"

**Causa:** Security Rules bloqueando operaciones.

**Solución:**
1. Verifica `firestore.rules`
2. Despliega reglas:
```bash
firebase deploy --only firestore:rules
```

### Error: "Function deployment failed"

**Causa:** Error en build de Functions.

**Solución:**
```bash
cd functions
npm run build
# Revisa errores TypeScript
```

### Error: "Billing account not configured"

**Causa:** Proyecto no está en plan Blaze.

**Solución:**
1. Firebase Console → **Settings → Usage and billing**
2. Upgrade a **Blaze plan**
3. Añade método de pago

### Functions se ejecutan pero no actualizan Firestore

**Causa:** Permisos de Admin SDK.

**Solución:**
Verifica que Functions usan Admin SDK:
```typescript
import * as admin from 'firebase-admin'
admin.initializeApp()

const db = admin.firestore()
// db tiene permisos completos
```

### Scheduled Function no se ejecuta

**Causa:** Cloud Scheduler no configurado.

**Solución:**
1. Firebase Console → **Functions**
2. Busca `checkDeadlines`
3. Verifica que muestra **"Trigger: Cloud Scheduler"**
4. Si no, redesplega:
```bash
firebase deploy --only functions:checkDeadlines
```

### Hosting muestra versión antigua (caché)

**Causa:** Caché del navegador.

**Solución:**
- **Ctrl + Shift + R** (hard refresh)
- O modo incógnito

**Para usuarios:**
Firebase Hosting maneja caché automáticamente. Espera 5-10 minutos.

### Error: "Index required"

**Causa:** Query compleja sin índice.

**Solución:**
1. Firebase Console → **Firestore → Indexes**
2. Click link del error en logs
3. Crea índice automáticamente
4. O añade a `firestore.indexes.json` y despliega

---

## Checklist de Despliegue

### Pre-Despliegue

- [ ] Build local exitoso (`npm run build`)
- [ ] Functions build exitoso (`cd functions && npm run build`)
- [ ] `.env` configurado para producción (`VITE_USE_EMULATORS=false`)
- [ ] Security Rules actualizadas
- [ ] Índices configurados
- [ ] Variables secretas configuradas (`firebase functions:config:set`)

### Despliegue

- [ ] Despliega Security Rules primero
- [ ] Despliega Índices
- [ ] Despliega Functions
- [ ] Despliega Hosting último
- [ ] Verifica Hosting URL funciona
- [ ] Verifica Functions sin errores en logs

### Post-Despliegue

- [ ] Testing manual completo
- [ ] Monitoreo de logs (10 minutos)
- [ ] Verifica métricas en Console
- [ ] Notifica al equipo
- [ ] Documenta cambios en CHANGELOG

---

## Comandos Útiles

```bash
# Ver proyecto actual
firebase use

# Cambiar proyecto
firebase use machiavelli-6ef06

# Ver configuración de Functions
firebase functions:config:get

# Ver logs en tiempo real
firebase functions:log --limit 100

# Listar todas las Functions desplegadas
firebase functions:list

# Eliminar una función
firebase functions:delete nombreFuncion

# Ver versiones de Hosting
firebase hosting:channel:list

# Preview antes de desplegar
firebase hosting:channel:deploy preview

# Abrir Firebase Console
firebase open
```

---

## Recursos

- **[Firebase Console](https://console.firebase.google.com/)**
- **[Firebase CLI Reference](https://firebase.google.com/docs/cli)**
- **[Cloud Functions Docs](https://firebase.google.com/docs/functions)**
- **[Hosting Docs](https://firebase.google.com/docs/hosting)**
- **[Monitoreo](MONITORING.md)** - Guía de monitoreo

---

**¡Despliegue exitoso!** 🚀
