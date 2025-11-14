# CLAUDE.md

Guía rápida para Claude Code al trabajar en el proyecto Machiavelli.

## Proyecto

**Machiavelli** es un juego de estrategia por turnos asíncrono ambientado en el Renacimiento italiano, inspirado en Diplomacy.

**Tech Stack:**
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4
- Backend: Firebase (Auth, Firestore, Cloud Functions, Hosting)
- State: Zustand + Real-time listeners (Firestore)
- Routing: React Router v7

**Modelo asíncrono:** Basado en deadlines (estilo "play-by-mail"), no tiempo real.

---

## Comandos Esenciales

### Desarrollo

```bash
# Setup inicial
npm install

# Dev server (http://localhost:5173)
npm run dev

# Build producción
npm run build

# Preview build
npm run preview
```

### Firebase

```bash
# Emulators (desarrollo local)
firebase emulators:start --only firestore,auth,functions

# Desplegar
npm run build
firebase deploy --only hosting          # Solo frontend
firebase deploy --only functions        # Solo backend
firebase deploy                         # Todo
```

### Environment

Crea `.env`:
```bash
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=machiavelli-6ef06.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=machiavelli-6ef06
VITE_FIREBASE_STORAGE_BUCKET=machiavelli-6ef06.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=687381647623
VITE_FIREBASE_APP_ID=your_app_id

# Para desarrollo con emulators
VITE_USE_EMULATORS=true
```

---

## Arquitectura Clave

### Cliente-Servidor Asíncrono

```
React Client ←→ Firebase Auth
     ↕
Firestore ←→ Cloud Functions
     ↕           ↕
Listeners    Scheduler (cron 1 min)
```

**Flujo:**
1. Usuario autenticado → Firebase Auth
2. React suscribe a Firestore (`onSnapshot`)
3. Cloud Scheduler verifica deadlines cada minuto
4. Deadline expirado → Cloud Function resuelve turno
5. Firestore actualiza → React recibe cambios en tiempo real

### Colecciones Firestore (Flat)

```
/games/{gameId}              # Estado del juego, fase, deadline, unidades embebidas
  └─ units: Unit[]           # Unidades con composición detallada (embebidas)
/players/{playerId}          # Tesoro, facción, userId
/orders/{orderId}            # Órdenes secretas (gameId, playerId, turnNumber)
/diplomatic_messages/{id}    # Chat (from, to, content)
/votes/{voteId}              # Votos para jugadores inactivos
/turns/{turnId}              # Historial de turnos resueltos
/scenarios/{scenarioId}      # Escenarios con provincias y unidades detalladas
/factions/{factionId}        # Facciones dinámicas
```

**Importante:**
- Las unidades están **embebidas** en `game.units[]` (NO colección separada)
- Cada unidad incluye `name` y `composition` (tropas/naves detalladas)
- Usa campo `gameId` para filtrar otras colecciones

### Cloud Functions

**Principales:**
- `checkDeadlines` (scheduled, 1 min) → Detecta deadlines expirados
- `resolveTurn` (internal) → Resuelve turno (9 pasos)
- `forcePhaseAdvance` (callable) → Avance manual (testing)

**Resolución (9 pasos):**
1. Validar órdenes
2. Procesar economía
3. Resolver movimientos/batallas
4. Procesar retiradas
5. Actualizar asedios
6. Convertir provincias
7. Escribir a Firestore
8. Guardar historial
9. Avanzar fase

---

## Patrones Importantes

### Timestamps

**Siempre usa `Timestamp` de Firebase:**
```typescript
import { Timestamp } from 'firebase/firestore'

// ✓ Correcto
phaseDeadline: Timestamp.now()

// ✗ Incorrecto
phaseDeadline: new Date()
```

### Real-time Listeners

**Patrón estándar:**
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    setData(snapshot.data())
  })
  return () => unsubscribe() // Cleanup importante
}, [dependencies])
```

### Validación de Órdenes

**Dos niveles obligatorios:**
1. Cliente (`src/utils/orderValidation.ts`) - UX inmediata
2. Servidor (`functions/src/resolution/step1-validate.ts`) - Autoridad

Ambos deben estar sincronizados.

### Security Rules

**Jugadores son READ-ONLY durante partidas activas:**
- Solo Cloud Functions (Admin SDK) modifican `games`, `units`, `players` durante juego activo
- Jugadores solo escriben `orders` y `diplomatic_messages`
- Lobby (`status: 'waiting'`) tiene reglas más permisivas

---

## Estructura del Código

```
src/
  components/      # UI (GameBoard, OrdersPanel, DiplomaticChat, etc.)
  pages/           # Lobby, Game, MapTest
  types/           # game.ts (Game, Player, Unit, Order), auth.ts, map.ts
  data/            # factions.ts, provinceData.ts, scenarios.ts
  utils/           # orderValidation.ts, provinceHelpers.ts
  store/           # authStore.ts (Zustand)
  lib/             # firebase.ts

functions/src/
  index.ts                   # Exports
  checkDeadlines.ts          # Scheduled
  resolveTurn.ts             # Orchestrator
  forcePhaseAdvance.ts       # Testing
  resolution/                # 9 steps
  events/processEvents.ts    # Hambruna, Peste
  visibility/                # Fog of war
  email/                     # Notificaciones
  types.ts                   # Tipos backend
```

---

## Path Alias

Usa `@` para imports:
```typescript
import { Game } from '@/types'
import { db } from '@/lib/firebase'
```

Configurado en `vite.config.ts`.

---

## Testing

### Emulators

```bash
# Terminal 1
firebase emulators:start --only firestore,auth,functions

# Terminal 2
npm run dev

# Emulator UI: http://localhost:4000
```

### Testing Manual

1. Crea partida
2. Únete con múltiples usuarios (ventanas incógnito)
3. Usa botón "⚡ Forzar Avance" para saltar fases
4. Verifica resolución en Emulator UI

### Callable Function (Testing)

```typescript
import { httpsCallable } from 'firebase/functions'

const forceAdvance = httpsCallable(functions, 'forcePhaseAdvance')
await forceAdvance({ gameId: 'game-id' })
```

---

## Deployment

**Orden recomendado:**
```bash
# 1. Security Rules primero
firebase deploy --only firestore:rules

# 2. Índices
firebase deploy --only firestore:indexes

# 3. Functions
firebase deploy --only functions

# 4. Hosting último
npm run build
firebase deploy --only hosting
```

**Requiere:** Plan Blaze para Cloud Functions en producción.

---

## Convenciones

### Código

- **TypeScript estricto** - No `any`
- **Componentes**: PascalCase
- **Funciones**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Archivos**: kebab-case (utils)

### Commits

```
feat: Añade sistema de asesinatos
fix: Corrige bug en resolución de apoyos
docs: Actualiza documentación de API
```

---

## Documentación Completa

### Para Jugadores
- **[Manual del Usuario](docs/user/MANUAL.md)** - Guía completa
- **[Inicio Rápido](docs/user/QUICK_START.md)** - Tutorial 5 minutos
- **[FAQ](docs/user/FAQ.md)** - Preguntas frecuentes

### Para Desarrolladores
- **[Guía de Contribución](docs/dev/CONTRIBUTING.md)** - Setup y flujo de trabajo
- **[Despliegue](docs/dev/DEPLOYMENT.md)** - Deploy a producción
- **[API Reference](docs/dev/API_REFERENCE.md)** - Cloud Functions
- **[Testing](docs/dev/TESTING.md)** - Estrategia de testing

### Para Operaciones
- **[Monitoreo](docs/ops/MONITORING.md)** - Métricas y alertas
- **[Troubleshooting](docs/ops/TROUBLESHOOTING.md)** - Solución de problemas

### Referencia Técnica
- **[Arquitectura](docs/reference/arquitectura.md)** - Diseño completo
- **[Base de Datos](docs/reference/database.md)** - Esquema Firestore
- **[Fases del Juego](docs/reference/GAME_PHASES.md)** - Sistema de turnos
- **[Órdenes Militares](docs/reference/ordenes-militares.md)** - Todas las órdenes
- **[Eventos Especiales](docs/reference/eventos-especiales.md)** - Hambruna, Peste, Asesinato
- **[Escenarios](docs/reference/escenarios.md)** - Italia 1454, 1494, Tutorial
- **[Glosario](docs/reference/glosario.md)** - Términos oficiales

**Navegación:** Ver **[docs/INDEX.md](docs/INDEX.md)** para documentación completa.

---

## Troubleshooting Rápido

### "Permission denied" en Firestore
→ Verifica `firestore.rules` y despliega: `firebase deploy --only firestore:rules`

### Real-time listeners no actualizan
→ Verifica cleanup: `return () => unsubscribe()`

### Function timeout
→ Aumenta `timeoutSeconds` o optimiza batch writes

### "Index required"
→ Click link del error o añade a `firestore.indexes.json`

### Mapa SVG no carga
→ Verifica `public/mapa-italia.svg` existe y build incluye public assets

**Más detalles:** [Troubleshooting completo](docs/ops/TROUBLESHOOTING.md)

---

## Estado del Proyecto

**Versión:** MVP funcional (98% completo)
**Pendiente:** Email notifications, testing exhaustivo

**Fase actual:** Testing y preparación para producción

---

## Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-repo/machiavelli/issues)
- **Documentación**: [docs/INDEX.md](docs/INDEX.md)

---

**Última actualización:** 2025-01-13
