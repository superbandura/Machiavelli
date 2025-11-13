# Guía de Contribución

Gracias por tu interés en contribuir a Machiavelli. Esta guía te ayudará a configurar tu entorno de desarrollo y entender el proceso de contribución.

## Tabla de Contenidos

1. [Setup Inicial](#setup-inicial)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Flujo de Desarrollo](#flujo-de-desarrollo)
4. [Estándares de Código](#estándares-de-código)
5. [Testing](#testing)
6. [Pull Requests](#pull-requests)

---

## Setup Inicial

### Requisitos Previos

- **Node.js** 18+ y npm
- **Firebase CLI**: `npm install -g firebase-tools`
- **Git**
- Cuenta de Firebase (gratis para desarrollo con emuladores)

### Instalación

1. **Clona el repositorio:**
```bash
git clone https://github.com/tu-repo/machiavelli.git
cd machiavelli
```

2. **Instala dependencias:**
```bash
# Frontend
npm install

# Backend (Cloud Functions)
cd functions
npm install
cd ..
```

3. **Configura variables de entorno:**

Crea `.env` en la raíz:
```bash
# Firebase Config (puedes usar valores de prueba con emulators)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=machiavelli-6ef06.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=machiavelli-6ef06
VITE_FIREBASE_STORAGE_BUCKET=machiavelli-6ef06.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=687381647623
VITE_FIREBASE_APP_ID=your_app_id

# Para desarrollo local, usa emulators
VITE_USE_EMULATORS=true
```

4. **Inicia los emuladores de Firebase:**

En una terminal:
```bash
firebase emulators:start --only firestore,auth,functions
```

Esto inicia:
- Firestore Emulator en `localhost:8080`
- Auth Emulator en `localhost:9099`
- Functions Emulator en `localhost:5001`
- Emulator UI en `http://localhost:4000`

5. **Inicia el servidor de desarrollo:**

En otra terminal:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Verificar Setup

1. Abre `http://localhost:5173`
2. Regístrate con un email de prueba
3. Crea una partida
4. Verifica que aparezca en el lobby

Si funciona, ¡estás listo!

---

## Estructura del Proyecto

```
Machiavelli/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # Componentes React
│   │   ├── GameBoard.tsx           # Mapa SVG interactivo
│   │   ├── OrdersPanel.tsx         # Panel de órdenes
│   │   ├── DiplomaticChat.tsx      # Chat diplomático
│   │   └── ...
│   ├── pages/              # Páginas principales
│   │   ├── Lobby.tsx               # Lobby de partidas
│   │   ├── Game.tsx                # Vista principal del juego
│   │   └── MapTest.tsx             # Testing del mapa
│   ├── types/              # Definiciones TypeScript
│   │   ├── game.ts                 # Tipos principales (Game, Player, Unit, etc.)
│   │   ├── auth.ts
│   │   └── map.ts
│   ├── data/               # Datos estáticos
│   │   ├── factions.ts             # 7 facciones
│   │   ├── provinceData.ts         # 74 provincias
│   │   ├── provinceCoordinates.ts  # Coordenadas SVG
│   │   └── scenarios.ts            # Escenarios (1454, 1494, Tutorial)
│   ├── utils/              # Utilidades
│   │   ├── orderValidation.ts      # Validación cliente
│   │   └── provinceHelpers.ts
│   ├── store/              # State management
│   │   └── authStore.ts            # Zustand store
│   ├── lib/                # Configuraciones
│   │   └── firebase.ts             # Firebase setup
│   ├── App.tsx             # Router principal
│   └── main.tsx            # Entry point
│
├── functions/              # Cloud Functions (Backend)
│   └── src/
│       ├── index.ts                # Exports
│       ├── checkDeadlines.ts       # Scheduled (cron)
│       ├── resolveTurn.ts          # Orquestador principal
│       ├── forcePhaseAdvance.ts    # Testing manual
│       ├── resolution/             # 9 pasos de resolución
│       │   ├── step1-validate.ts
│       │   ├── step2-economy.ts
│       │   ├── step3-movements.ts
│       │   ├── step4-retreats.ts
│       │   ├── step5-sieges.ts
│       │   ├── step6-conversions.ts
│       │   ├── step7-update.ts
│       │   ├── step8-history.ts
│       │   ├── step9-advance.ts
│       │   ├── checkVictory.ts
│       │   └── processInactiveVotes.ts
│       ├── events/
│       │   └── processEvents.ts    # Hambruna, Peste
│       ├── visibility/
│       │   └── updateVisibility.ts # Fog of war
│       ├── email/
│       │   ├── emailService.ts
│       │   ├── emailTemplates.ts
│       │   └── notificationService.ts
│       ├── types.ts                # Tipos backend
│       └── data/
│           └── provinceData.ts     # Provincias (sync con frontend)
│
├── docs/                   # Documentación
│   ├── INDEX.md            # Navegación principal
│   ├── user/               # Docs para jugadores
│   ├── dev/                # Docs para desarrolladores (estás aquí)
│   ├── ops/                # Docs operacionales
│   └── reference/          # Referencia técnica
│
├── public/                 # Assets estáticos
│   └── mapa-italia.svg     # Mapa SVG de Italia
│
├── firestore.rules         # Reglas de seguridad
├── firestore.indexes.json  # Índices de Firestore
├── firebase.json           # Config de Firebase
├── vite.config.ts          # Config de Vite
├── tailwind.config.js      # Config de Tailwind
└── CLAUDE.md               # Guía para Claude Code
```

---

## Flujo de Desarrollo

### Branching Strategy

- **`main`**: Rama principal, siempre estable
- **`develop`**: Rama de desarrollo, integración continua
- **`feature/nombre-feature`**: Nuevas características
- **`fix/nombre-bug`**: Correcciones de bugs
- **`docs/nombre-doc`**: Mejoras en documentación

### Crear una Feature

1. **Crea una rama desde `develop`:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo
```

2. **Desarrolla tu feature:**
   - Sigue los estándares de código
   - Añade tests si aplica
   - Actualiza documentación si es necesario

3. **Commits frecuentes:**
```bash
git add .
git commit -m "feat: descripción breve de la característica"
```

4. **Push y crea Pull Request:**
```bash
git push origin feature/nombre-descriptivo
```

Luego crea PR en GitHub hacia `develop`.

---

## Estándares de Código

### TypeScript

- **Tipos estrictos**: Siempre define tipos explícitos
- **No uses `any`**: Usa `unknown` si es necesario
- **Interfaces sobre types** para objetos

**Ejemplo:**
```typescript
// ✓ Correcto
interface Player {
  id: string
  faction: string
  treasury: number
}

// ✗ Incorrecto
const player: any = { ... }
```

### Nomenclatura

- **Componentes**: PascalCase (`GameBoard.tsx`)
- **Funciones/variables**: camelCase (`calculateForce`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_PLAYERS`)
- **Archivos**: kebab-case para utils (`order-validation.ts`)

### Imports

Usa alias `@` para imports:
```typescript
// ✓ Correcto
import { Game } from '@/types'
import { db } from '@/lib/firebase'

// ✗ Incorrecto
import { Game } from '../../types'
```

### Componentes React

**Estructura recomendada:**
```typescript
import { useState, useEffect } from 'react'
import type { Game } from '@/types'

interface Props {
  gameId: string
  onUpdate?: (game: Game) => void
}

export default function MyComponent({ gameId, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Lógica de efecto
    return () => {
      // Cleanup
    }
  }, [gameId])

  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### Firebase

**Timestamps:**
```typescript
// ✓ Correcto
import { Timestamp } from 'firebase/firestore'
phaseDeadline: Timestamp.now()

// ✗ Incorrecto
phaseDeadline: new Date()
```

**Real-time listeners:**
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    // Actualizar estado
  })

  return () => unsubscribe() // ¡Importante!
}, [dependencies])
```

### Cloud Functions

- **Manejo de errores**: Siempre usar try-catch
- **Logging**: Usa `console.log` con prefijos `[FunctionName]`
- **Validación**: Valida todos los inputs
- **Transacciones**: Usa batch writes para actualizaciones múltiples

```typescript
export const myFunction = functions.https.onCall(async (data, context) => {
  try {
    // Validación
    if (!data.gameId) {
      throw new functions.https.HttpsError('invalid-argument', 'gameId required')
    }

    // Lógica
    console.log('[MyFunction] Processing:', data.gameId)

    // Resultado
    return { success: true }
  } catch (error) {
    console.error('[MyFunction] Error:', error)
    throw new functions.https.HttpsError('internal', 'An error occurred')
  }
})
```

---

## Testing

### Testing Manual con Emulators

1. **Inicia emulators:**
```bash
firebase emulators:start --only firestore,auth,functions
```

2. **UI de emulators:** `http://localhost:4000`
   - Ver datos de Firestore
   - Ver usuarios Auth
   - Ver logs de Functions

3. **Testing de flujo completo:**
   - Crea partida
   - Únete con múltiples usuarios (ventanas de incógnito)
   - Da órdenes
   - Usa "Forzar Avance" para avanzar fases
   - Verifica resolución

### Testing de Cloud Functions

**Manual:**
```bash
cd functions
npm run build
firebase emulators:start --only functions,firestore
```

**Callable functions:**
```typescript
// En el cliente
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

const forceAdvance = httpsCallable(functions, 'forcePhaseAdvance')
const result = await forceAdvance({ gameId: 'test-game-id' })
```

### Checklist de Testing

Antes de crear un PR, verifica:

- [ ] La app compila sin errores (`npm run build`)
- [ ] No hay errores TypeScript
- [ ] Probado en emulators localmente
- [ ] Probado con múltiples usuarios simultáneos
- [ ] Firestore Security Rules permiten las operaciones necesarias
- [ ] No hay console.errors en producción
- [ ] Documentación actualizada si es necesario

---

## Pull Requests

### Antes de Crear un PR

1. **Actualiza tu rama:**
```bash
git checkout develop
git pull origin develop
git checkout feature/tu-feature
git merge develop
```

2. **Resuelve conflictos** si los hay

3. **Verifica que todo funciona** con emulators

### Formato del PR

**Título:**
```
feat: Añade sistema de asesinatos
fix: Corrige bug en resolución de apoyos
docs: Actualiza documentación de API
```

**Descripción:**
```markdown
## Descripción
Breve descripción de los cambios.

## Cambios
- Cambio 1
- Cambio 2

## Testing
Cómo se probó (manual, emulators, etc.)

## Capturas (si aplica)
[Imágenes o GIFs]

## Checklist
- [ ] Código compilado sin errores
- [ ] Probado localmente
- [ ] Documentación actualizada
- [ ] Sin breaking changes (o documentados)
```

### Proceso de Review

1. **Crea el PR** hacia `develop`
2. **Espera review** de mantainers
3. **Responde a comentarios**
4. **Haz cambios** si se solicitan
5. **Merge** una vez aprobado

---

## Áreas de Contribución

### Frontend

- Mejoras en UI/UX
- Nuevos componentes
- Optimizaciones de rendimiento
- Accesibilidad (WCAG)
- Responsividad móvil

### Backend

- Nuevas Cloud Functions
- Optimización de resolución
- Nuevos eventos especiales
- Mejoras en Security Rules
- Índices de Firestore

### Documentación

- Guías de usuario
- Tutoriales
- Traducción a inglés
- Ejemplos de código
- Diagramas de arquitectura

### Testing

- Tests unitarios (Jest)
- Tests de integración
- Tests E2E (Playwright)
- Casos límite
- Documentación de testing

---

## Recursos Útiles

### Documentación del Proyecto

- **[INDEX.md](../INDEX.md)** - Navegación principal
- **[Arquitectura](../reference/arquitectura.md)** - Diseño del sistema
- **[Base de Datos](../reference/database.md)** - Esquema de Firestore
- **[API Reference](API_REFERENCE.md)** - Documentación de funciones

### Documentación Externa

- **[React 19](https://react.dev/)** - Framework frontend
- **[Firebase Docs](https://firebase.google.com/docs)** - Backend
- **[TypeScript](https://www.typescriptlang.org/)** - Lenguaje
- **[Tailwind CSS](https://tailwindcss.com/)** - Estilos
- **[Vite](https://vite.dev/)** - Build tool

---

## Contacto

¿Preguntas o problemas?

- **Issues**: [GitHub Issues](https://github.com/tu-repo/machiavelli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tu-repo/machiavelli/discussions)
- **Email**: tu-email@example.com

---

**¡Gracias por contribuir a Machiavelli!**
