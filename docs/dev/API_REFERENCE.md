# API Reference - Cloud Functions

Documentación completa de las Cloud Functions de Machiavelli.

## Tabla de Contenidos

1. [Funciones Programadas](#funciones-programadas)
2. [Funciones Callable](#funciones-callable)
3. [Resolución de Turnos](#resolución-de-turnos)
4. [Servicios Internos](#servicios-internos)
5. [Tipos y Estructuras](#tipos-y-estructuras)

---

## Funciones Programadas

### `checkDeadlines`

**Tipo:** Scheduled (Cloud Scheduler)
**Frecuencia:** Cada 1 minuto
**Archivo:** `functions/src/checkDeadlines.ts`

**Descripción:**
Verifica si algún juego ha alcanzado su deadline y activa la resolución del turno.

**Flujo:**
1. Query a Firestore: `games` donde `status === 'active'` y `phaseDeadline <= now()`
2. Para cada juego encontrado:
   - Llama a `resolveTurn(gameId)`
   - Procesa la fase actual
   - Avanza a la siguiente fase

**Logs:**
```
[CheckDeadlines] Checking deadlines for games...
[CheckDeadlines] Found 3 games with expired deadlines
[CheckDeadlines] Processing game: game-xyz
[CheckDeadlines] Completed successfully
```

**Errores comunes:**
- `Permission denied`: Security Rules bloqueando lectura de games
- `Timeout`: Demasiados juegos simultáneos

**Monitoreo:**
- Debe ejecutarse cada minuto sin fallos
- Tiempo de ejecución < 5 segundos (sin resoluciones)
- Si hay resoluciones, puede tomar 10-30 segundos

---

## Funciones Callable

### `forcePhaseAdvance`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/forcePhaseAdvance.ts`

**Descripción:**
Fuerza el avance de fase manualmente, útil para testing. Solo el creador del juego puede usarla.

**Parámetros:**
```typescript
{
  gameId: string  // ID del juego a avanzar
}
```

**Retorno:**
```typescript
{
  success: boolean
  message: string
  newPhase?: string
  newTurn?: number
}
```

**Ejemplo de uso (Cliente):**
```typescript
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

const forceAdvance = httpsCallable(functions, 'forcePhaseAdvance')

try {
  const result = await forceAdvance({ gameId: 'game-123' })
  console.log(result.data.message) // "Fase avanzada exitosamente"
} catch (error) {
  console.error('Error:', error.message)
}
```

**Seguridad:**
- Requiere autenticación (`request.auth`)
- Solo el creador del juego (`createdBy === userId`) puede ejecutarla
- Juego debe existir

**Errores:**
```typescript
// 'unauthenticated'
throw new HttpsError('unauthenticated', 'Usuario debe estar autenticado')

// 'invalid-argument'
throw new HttpsError('invalid-argument', 'gameId es requerido')

// 'not-found'
throw new HttpsError('not-found', 'Juego no encontrado')

// 'permission-denied'
throw new HttpsError('permission-denied', 'Solo el creador puede forzar el avance')
```

**Comportamiento por fase:**

| Estado Actual | Acción |
|---------------|--------|
| `waiting` | Activa juego → `diplomatic` fase |
| `diplomatic` | Avanza a `orders` (mismo turno) |
| `orders` | Resuelve turno → `diplomatic` (siguiente turno) |

---

## Resolución de Turnos

### `resolveTurn`

**Tipo:** Internal (llamada por otras funciones)
**Archivo:** `functions/src/resolveTurn.ts`

**Descripción:**
Orquestador principal que ejecuta los 9 pasos de resolución de un turno.

**Parámetros:**
```typescript
gameId: string
```

**Flujo de 9 pasos:**

#### 1. `step1-validate.ts` - Validación
```typescript
validateOrders(gameId: string): Promise<ValidationResult>
```
- Valida todas las órdenes de todos los jugadores
- Verifica sintaxis, adyacencias, legalidad
- Retorna lista de órdenes válidas e inválidas

#### 2. `step2-economy.ts` - Economía
```typescript
processEconomy(gameId: string): Promise<EconomyResult>
```
- Calcula ingresos (Primavera): +1-5d por ciudad
- Cobra gastos (Primavera): -1d por ejército/flota
- Procesa transferencias de ducados
- Procesa asesinatos (verifica tokens, calcula probabilidad)
- Procesa sobornos

#### 3. `step3-movements.ts` - Movimientos y Batallas
```typescript
resolveMovements(gameId: string, orders: Order[]): Promise<MovementResult>
```
- Calcula fuerza de cada movimiento (1 + apoyos)
- Resuelve batallas simultáneamente
- Detecta standoffs (empates)
- Desaloja unidades perdedoras
- Actualiza posiciones

#### 4. `step4-retreats.ts` - Retiradas
```typescript
processRetreats(gameId: string, dislodged: Unit[]): Promise<void>
```
- Unidades desalojadas retiran a provincias adyacentes
- Si no hay espacio, unidad destruida
- Actualiza estado de unidades

#### 5. `step5-sieges.ts` - Asedios
```typescript
updateSieges(gameId: string): Promise<SiegeResult>
```
- Incrementa contadores de asedio (ejércitos sobre guarniciones)
- Si contador llega a 2: destruye guarnición
- Si ejército fue desalojado: reinicia contador
- Retorna guarniciones destruidas

#### 6. `step6-conversions.ts` - Conversiones
```typescript
processConversions(gameId: string): Promise<ConversionResult>
```
- En **Otoño**: convierte provincias neutrales
- Verifica que ejército mantuvo posición 1 turno completo
- Actualiza ownership de provincia
- Retorna provincias convertidas

#### 7. `step7-update.ts` - Actualizar Estado
```typescript
updateGameState(gameId: string, results: ResolutionResults): Promise<void>
```
- Escribe todos los cambios a Firestore (batch write)
- Actualiza unidades (posiciones, status)
- Actualiza jugadores (treasury, assassinTokens)
- Actualiza juego (siegeStatus, etc.)

#### 8. `step8-history.ts` - Guardar Historial
```typescript
saveTurnHistory(gameId: string, results: ResolutionResults): Promise<void>
```
- Crea documento en colección `turns`
- Guarda órdenes ejecutadas
- Guarda batallas, asedios, conversiones
- Guarda eventos especiales (hambruna, peste, asesinatos)

#### 9. `step9-advance.ts` - Avanzar Fase
```typescript
advancePhase(gameId: string): Promise<void>
```
- `orders` → `diplomatic` (siguiente turno)
- `diplomatic` → `orders` (mismo turno)
- Calcula nuevo deadline (+X horas configurables)
- Actualiza `turnNumber` y `season` si corresponde
- Llama a `checkVictory()` al final de cada turno
- Procesa eventos especiales (hambruna en Primavera, peste en Verano)

**Logs:**
```
[ResolveTurn] Starting turn resolution for game-xyz
[ResolveTurn] Step 1: Validating orders
[ResolveTurn] Step 2: Processing economy
[ResolveTurn] Step 3: Resolving movements
[ResolveTurn] Step 4: Processing retreats
[ResolveTurn] Step 5: Updating sieges
[ResolveTurn] Step 6: Processing conversions
[ResolveTurn] Step 7: Updating game state
[ResolveTurn] Step 8: Saving turn history
[ResolveTurn] Step 9: Advancing phase
[ResolveTurn] Turn resolved successfully
```

**Manejo de errores:**
- Cada step tiene try-catch individual
- Si un step falla, se aborta toda la resolución
- No se hacen cambios parciales (transacciones)

---

## Servicios Internos

### `checkVictory.ts`

```typescript
checkVictory(gameId: string): Promise<VictoryResult | null>
```

**Descripción:**
Verifica si algún jugador ha ganado el juego.

**Condiciones de victoria:**
- **Estándar**: Controlar X ciudades (12/15/18 según jugadores)
- **Tiempo límite**: Tras 12 turnos, gana quien tenga más ciudades
- **Desempate**: Mayor valor total de ciudades

**Retorno:**
```typescript
{
  winner: string         // playerId
  reason: 'standard' | 'time_limit'
  citiesControlled: number
  totalValue: number
}
```

**Efecto:**
- Actualiza `game.status` a `'finished'`
- Actualiza `game.winner`
- No avanza más turnos

---

### `processInactiveVotes.ts`

```typescript
processInactiveVotes(gameId: string): Promise<void>
```

**Descripción:**
Procesa votos de jugadores para eliminar/reemplazar inactivos.

**Flujo:**
1. Busca votos abiertos en colección `votes`
2. Cuenta votos por opción (AI mode, Replacement, Elimination)
3. Si mayoría (>50%): ejecuta acción
4. Actualiza estado del jugador afectado
5. Borra votos procesados

**Acciones:**
- **AI Mode**: Jugador da "hold" automáticamente
- **Replacement**: Notifica que buscan reemplazo (no implementado)
- **Elimination**: Elimina jugador, unidades pasan a neutral

---

### `processEvents.ts`

```typescript
processEvents(gameId: string, season: string): Promise<EventResult[]>
```

**Descripción:**
Procesa eventos especiales (hambruna, peste).

**Por estación:**

**Primavera:**
```typescript
{
  type: 'famine'
  affectedProvinces: string[]  // IDs de provincias con hambruna
}
```
- Selecciona 2-4 provincias aleatorias
- Añade marcadores de hambruna
- Jugadores pueden mitigar pagando 3d
- Al final de Primavera: destruye unidades no mitigadas

**Verano:**
```typescript
{
  type: 'plague'
  affectedProvinces: string[]  // IDs de provincias con peste
  destroyedUnits: string[]     // IDs de unidades destruidas
}
```
- Selecciona 1-2 provincias aleatorias
- Destruye unidades **inmediatamente**
- No se puede mitigar

**Otoño:**
- Sin eventos especiales

---

### `updateVisibility.ts`

```typescript
updateVisibility(gameId: string): Promise<void>
```

**Descripción:**
Actualiza el campo `visibleTo` de todas las unidades (fog of war).

**Lógica:**
- Unidad visible para su dueño
- Unidad visible para jugadores con unidades en provincia adyacente
- Actualiza `unit.visibleTo: string[]` (playerIds)

---

### Email Services

#### `emailService.ts`
```typescript
sendEmail(to: string, subject: string, html: string): Promise<void>
```

Envía emails vía SendGrid.

#### `emailTemplates.ts`
```typescript
getPhaseChangeTemplate(gameId: string, phase: string): string
getInactivityWarningTemplate(playerName: string): string
```

Genera HTML para emails.

#### `notificationService.ts`
```typescript
notifyPhaseChange(gameId: string): Promise<void>
notifyInactivePlayer(playerId: string): Promise<void>
```

Envía notificaciones a jugadores.

---

## Tipos y Estructuras

### Game
```typescript
interface Game {
  id: string
  name: string
  scenario: 'ITALIA_1454' | 'ITALIA_1494' | 'TUTORIAL'
  status: 'waiting' | 'active' | 'finished'
  phase: 'diplomatic' | 'orders' | 'resolution'
  turnNumber: number
  season: 'spring' | 'summer' | 'fall'
  phaseDeadline: Timestamp
  phaseDurations: {
    diplomatic: number  // horas
    orders: number
  }
  playersCount: number
  maxPlayers: number
  createdBy: string
  createdAt: Timestamp
  activeDisasters: {
    famineProvinces: string[]
  }
  siegeStatus: {
    [provinceId: string]: {
      attackerId: string
      counter: number
    }
  }
  winner?: string
}
```

### Player
```typescript
interface Player {
  id: string
  gameId: string
  userId: string
  faction: string
  treasury: number
  assassinTokens: {
    [playerId: string]: number
  }
  hasSubmittedOrders: boolean
  inactivityCounter: number
  status: 'active' | 'inactive' | 'eliminated'
  lastSeen: Timestamp
}
```

### Unit
```typescript
interface Unit {
  id: string
  gameId: string
  type: 'army' | 'fleet' | 'garrison'
  owner: string  // playerId
  province: string
  status: 'active' | 'besieged' | 'destroyed'
  visibleTo: string[]  // playerIds
}
```

### Order
```typescript
interface Order {
  id: string
  gameId: string
  playerId: string
  turnNumber: number
  orders: MilitaryOrder[]
  extraExpenses: ExtraExpense[]
  submittedAt: Timestamp
}

interface MilitaryOrder {
  unitId: string
  action: 'move' | 'hold' | 'support' | 'convoy' | 'besiege' | 'convert'
  target?: string       // provincia destino
  supportTarget?: {
    unitId: string
    province: string
  }
}

interface ExtraExpense {
  type: 'remove_famine' | 'transfer' | 'assassination' | 'bribe'
  provinceId?: string   // para remove_famine
  targetPlayerId?: string  // para transfer, assassination
  amount?: number       // ducados
}
```

### TurnHistory
```typescript
interface TurnHistory {
  id: string
  gameId: string
  turnNumber: number
  season: string
  events: Event[]
  battles: Battle[]
  sieges: Siege[]
  conversions: Conversion[]
  economy: {
    playerId: string
    income: number
    expenses: number
    finalBalance: number
  }[]
  timestamp: Timestamp
}
```

---

## Configuración

### Emulators

```json
{
  "emulators": {
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "auth": {
      "port": 9099
    }
  }
}
```

### Environment Variables

**Frontend (.env):**
```bash
VITE_FIREBASE_API_KEY=...
VITE_USE_EMULATORS=true  # para desarrollo
```

**Backend (Functions config):**
```bash
firebase functions:config:set sendgrid.api_key="SG.XXX"
```

---

## Testing

### Test Manual de Función Callable

```typescript
// En el cliente
import { httpsCallable } from 'firebase/functions'

const testFunction = httpsCallable(functions, 'forcePhaseAdvance')
const result = await testFunction({ gameId: 'test' })
console.log(result.data)
```

### Test de Scheduled Function

**Emulators:**
1. Inicia emulators
2. Abre Emulator UI: `http://localhost:4000`
3. Ve a **Functions** → **Logs**
4. Busca `[CheckDeadlines]` cada minuto

**Producción:**
```bash
firebase functions:log --only checkDeadlines --limit 20
```

---

## Recursos

- **[Firebase Functions Docs](https://firebase.google.com/docs/functions)**
- **[Cloud Scheduler Docs](https://cloud.google.com/scheduler/docs)**
- **[Firestore Admin SDK](https://firebase.google.com/docs/firestore/server/overview)**
- **[Guía de Testing](TESTING.md)**

---

**Última actualización:** 2025-01-13
