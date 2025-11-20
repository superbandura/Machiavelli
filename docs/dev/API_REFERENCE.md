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

### `setAdminRole`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/setAdminRole.ts`

**Descripción:**
Función administrativa temporal para asignar rol de administrador a un usuario mediante su email.

**Parámetros:**
```typescript
{
  email: string  // Email del usuario a hacer admin
}
```

**Retorno:**
```typescript
{
  success: boolean
  message: string
  user: {
    uid: string
    email: string
    displayName: string
    role: 'admin'
  }
}
```

**Ejemplo de uso (Cliente):**
```typescript
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

const setAdmin = httpsCallable(functions, 'setAdminRole')

try {
  const result = await setAdmin({ email: 'usuario@example.com' })
  console.log(result.data.message) // "Rol de administrador asignado correctamente"
} catch (error) {
  console.error('Error:', error.message)
}
```

**Seguridad:**
- NO requiere autenticación (temporal para setup inicial)
- Busca usuario en colección `users` por email
- Actualiza campo `role` a `'admin'`

**Errores:**
- `invalid-argument`: Email no proporcionado
- `not-found`: Usuario con ese email no existe
- `internal`: Error al actualizar usuario

⚠️ **IMPORTANTE:** Esta función debe eliminarse o protegerse antes de producción. Cualquiera puede usarla actualmente.

---

### `deleteGame`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/deleteGame.ts`

**Descripción:**
Elimina completamente una partida y todos sus datos relacionados de Firestore.

**Parámetros:**
```typescript
{
  gameId: string  // ID de la partida a eliminar
}
```

**Retorno:**
```typescript
{
  success: boolean
  message: string
  deletedCounts?: {
    diplomaticMessages: number
    votes: number
    orders: number
    turns: number
    campaigns: number
    warCouncilMessages: number
    players: number
  }
}
```

**Ejemplo de uso (Cliente):**
```typescript
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

const deleteGameFn = httpsCallable(functions, 'deleteGame')

try {
  const result = await deleteGameFn({ gameId: 'game-123' })
  console.log(result.data.message) // "Partida eliminada correctamente"
  console.log(result.data.deletedCounts) // Resumen de documentos eliminados
} catch (error) {
  console.error('Error:', error.message)
}
```

**Seguridad:**
- Requiere autenticación
- Solo el **creador de la partida** o un **administrador** pueden eliminarla
- Verifica `game.createdBy === userId` o `user.role === 'admin'`

**Colecciones eliminadas (en orden):**
1. `diplomatic_messages` (gameId)
2. `votes` (gameId)
3. `orders` (gameId)
4. `turns` (gameId)
5. `campaigns` (gameId)
6. `war_council_messages` (gameId)
7. `players` (gameId)
8. `games/{gameId}` (documento principal)

**Nota:** Las unidades están embebidas en `game.units[]`, no son una colección separada.

**Batch Processing:**
- Usa batches de 500 operaciones (límite de Firestore)
- Ejecuta múltiples batches si es necesario
- Logs detallados de progreso

**Errores:**
- `unauthenticated`: Usuario no autenticado
- `invalid-argument`: gameId faltante o inválido
- `not-found`: Partida no encontrada
- `permission-denied`: Usuario no es creador ni admin
- `internal`: Error durante eliminación

---

### `embarkTroops`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/embarkTroops.ts`

**Descripción:**
Embarca tropas de un ejército a una flota. Si el ejército queda vacío, se elimina automáticamente. Usa Admin SDK para bypasear Security Rules y modificar el array `game.units[]`.

**Parámetros:**
```typescript
{
  gameId: string
  playerId: string
  fleetId: string        // ID de la flota receptora
  armyId: string         // ID del ejército origen
  troopsToEmbark: {      // Tropas a embarcar
    militia?: number
    lancers?: number
    pikemen?: number
    archers?: number
    crossbowmen?: number
    lightCavalry?: number
    heavyCavalry?: number
  }
}
```

**Retorno:**
```typescript
{
  success: boolean
  message: string
}
```

**Ejemplo de uso (Cliente):**
```typescript
const embark = httpsCallable(functions, 'embarkTroops')

await embark({
  gameId: 'game-123',
  playerId: 'player-456',
  fleetId: 'fleet-789',
  armyId: 'army-101',
  troopsToEmbark: {
    militia: 50,
    lancers: 20,
    archers: 30
  }
})
```

**Validaciones:**
- Flota y ejército deben estar en la **misma provincia**
- Ambas unidades deben pertenecer al jugador
- Tropas suficientes en el ejército
- Capacidad de la flota no excedida

**Capacidad de flota:**
- Galera: 50 tropas
- Cog: 100 tropas
- Carrack: 200 tropas

**Transacción:**
1. Verifica pertenencia y ubicación
2. Actualiza `army.composition.troops` (resta tropas)
3. Actualiza `fleet.embarkedTroops.troops` (suma tropas)
4. Si ejército vacío: elimina unidad del array
5. Actualiza `game.units[]` y `game.updatedAt`

**Errores:**
- `unauthenticated`: Usuario no autenticado
- `invalid-argument`: Parámetros faltantes
- `not-found`: Jugador, partida, flota o ejército no encontrado
- `permission-denied`: Unidades no pertenecen al jugador
- `failed-precondition`:
  - Flota y ejército en diferentes provincias
  - Tropas insuficientes en ejército
  - Capacidad de flota excedida

---

### `disembarkTroops`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/disembarkTroops.ts`

**Descripción:**
Desembarca tropas de una flota, creando un nuevo ejército o añadiéndolas a uno existente. Usa Admin SDK para modificar o crear unidades.

**Parámetros:**
```typescript
{
  gameId: string
  playerId: string
  fleetId: string
  targetArmyId?: string  // ID de ejército existente (opcional)
  newArmyName?: string   // Nombre para nuevo ejército (opcional)
  troopsToDisembark: {   // Tropas a desembarcar
    militia?: number
    lancers?: number
    pikemen?: number
    archers?: number
    crossbowmen?: number
    lightCavalry?: number
    heavyCavalry?: number
  }
}
```

**Retorno:**
```typescript
{
  success: boolean
  message: string
}
```

**Ejemplo de uso (Cliente):**
```typescript
const disembark = httpsCallable(functions, 'disembarkTroops')

// Opción 1: Crear nuevo ejército
await disembark({
  gameId: 'game-123',
  playerId: 'player-456',
  fleetId: 'fleet-789',
  newArmyName: 'Desembarco de Nápoles',
  troopsToDisembark: {
    militia: 50,
    lancers: 20
  }
})

// Opción 2: Añadir a ejército existente
await disembark({
  gameId: 'game-123',
  playerId: 'player-456',
  fleetId: 'fleet-789',
  targetArmyId: 'army-101',
  troopsToDisembark: {
    archers: 30
  }
})
```

**Validaciones:**
- Flota debe tener tropas embarcadas
- Tropas suficientes en `fleet.embarkedTroops`
- Si `targetArmyId`: ejército debe estar en la misma provincia que la flota
- Si `targetArmyId`: ejército debe pertenecer al jugador

**Transacción:**
- **Con targetArmyId:** Suma tropas a ejército existente
- **Sin targetArmyId:** Crea nueva unidad tipo `'army'` con ID generado
- Actualiza o elimina `fleet.embarkedTroops`
- Si quedan tropas embarcadas: actualiza
- Si no quedan tropas: elimina campo `embarkedTroops`

**Errores:**
- `unauthenticated`: Usuario no autenticado
- `invalid-argument`: Parámetros faltantes
- `not-found`: Jugador, partida, flota o ejército destino no encontrado
- `permission-denied`: Flota o ejército destino no pertenecen al jugador
- `failed-precondition`:
  - Flota sin tropas embarcadas
  - Tropas insuficientes en flota
  - Ejército destino en diferente provincia

---

### `joinCampaign`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/joinCampaign.ts`

**Descripción:**
Permite a un jugador unirse a una campaña militar como aliado (atacante o defensor) durante la fase diplomática.

**Parámetros:**
```typescript
{
  gameId: string
  campaignId: string
  playerId: string
  side: 'attacker' | 'defender'
  unitIds: string[]       // IDs de unidades a aportar
}
```

**Retorno:**
```typescript
{
  success: boolean
  message: string
}
```

**Ejemplo de uso (Cliente):**
```typescript
const join = httpsCallable(functions, 'joinCampaign')

await join({
  gameId: 'game-123',
  campaignId: 'campaign-456',
  playerId: 'player-789',
  side: 'attacker',
  unitIds: ['unit-1', 'unit-2', 'unit-3']
})
```

**Validaciones:**
- Solo en **fase diplomática**
- Jugador no es el declarante de la campaña
- Jugador aún no se ha unido a la campaña
- Todas las unidades existen y pertenecen al jugador
- Al menos una unidad proporcionada

**Ownership de unidades:**
- Durante juego: `unit.owner === playerId`
- Durante lobby: `unit.owner === factionId`
- La función valida ambos casos

**Transacción:**
1. Crea nuevo `CampaignAlly`:
   ```typescript
   {
     id: string
     playerId: string
     faction: string
     side: 'attacker' | 'defender'
     unitIds: string[]
     joinedAt: Timestamp
   }
   ```
2. Añade aliado a `campaign.allies[]`
3. Añade unidades a `campaign.participatingUnits[]`
4. Actualiza `campaign.updatedAt`

**Errores:**
- `unauthenticated`: Usuario no autenticado
- `invalid-argument`: Parámetros faltantes o side inválido
- `not-found`: Jugador o campaña no encontrada
- `permission-denied`: playerId no coincide con usuario autenticado
- `failed-precondition`:
  - No estás en fase diplomática
  - Eres el declarante
  - Ya te uniste a la campaña
  - Unidades inválidas o no te pertenecen
  - No proporcionaste unidades

---

### `createFormation`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/createFormation.ts`

**Descripción:**
Crea una formación táctica en una campaña durante la fase de órdenes. Permite al declarante y aliados planificar despliegues tácticos.

**Parámetros:**
```typescript
{
  gameId: string
  campaignId: string
  formation: {
    id?: string            // Opcional, se genera si no se proporciona
    name: string
    troopType: string      // Tipo de tropa (militia, lancers, etc.)
    faction: string        // Facción propietaria
    quantity: number       // Cantidad de tropas
    deploymentZone: string // Zona de despliegue táctico
    strategicOrder: string // Orden estratégica
    tacticalOrder: string  // Orden táctica
    // Campos opcionales de refuerzo:
    isReinforcement?: boolean
    reinforcementId?: string
    estimatedArrivalDay?: number
  }
}
```

**Retorno:**
```typescript
{
  success: boolean
  formationId: string
  message: string
}
```

**Ejemplo de uso (Cliente):**
```typescript
const create = httpsCallable(functions, 'createFormation')

await create({
  gameId: 'game-123',
  campaignId: 'campaign-456',
  formation: {
    name: 'Vanguardia Florentina',
    troopType: 'lancers',
    faction: 'Florence',
    quantity: 50,
    deploymentZone: 'center',
    strategicOrder: 'attack',
    tacticalOrder: 'charge'
  }
})
```

**Validaciones:**
- Solo en **fase de órdenes**
- Usuario es declarante o aliado de la campaña
- Formación pertenece a la facción del jugador
- Estructura de formación completa

**Transacción:**
1. Genera ID único si no se proporciona
2. Crea `TacticalFormation` con timestamps
3. Añade a `campaign.formations[]`
4. Actualiza `campaign.updatedAt`

**Errores:**
- `unauthenticated`: Usuario no autenticado
- `invalid-argument`: Parámetros faltantes o formación incompleta
- `not-found`: Campaña no encontrada o no eres jugador
- `permission-denied`: No perteneces a la campaña o facción incorrecta
- `failed-precondition`:
  - No estás en fase de órdenes
  - Campaña no pertenece al juego

---

### `updateFormation`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/updateFormation.ts`

**Descripción:**
Actualiza una formación táctica existente durante la fase de órdenes. Solo puedes actualizar formaciones de tu propia facción.

**Parámetros:**
```typescript
{
  gameId: string
  campaignId: string
  formationId: string
  updates: Partial<TacticalFormation>  // Campos a actualizar
}
```

**Retorno:**
```typescript
{
  success: boolean
  message: string
}
```

**Ejemplo de uso (Cliente):**
```typescript
const update = httpsCallable(functions, 'updateFormation')

await update({
  gameId: 'game-123',
  campaignId: 'campaign-456',
  formationId: 'formation-789',
  updates: {
    quantity: 60,           // Aumentar cantidad
    deploymentZone: 'left', // Cambiar zona
    tacticalOrder: 'defend' // Cambiar orden táctica
  }
})
```

**Validaciones:**
- Solo en **fase de órdenes**
- Usuario es declarante o aliado
- Formación existe
- Formación pertenece a tu facción

**Transacción:**
1. Encuentra formación por ID
2. Aplica actualizaciones (merge)
3. Preserva `id` y `faction` originales
4. Actualiza `updatedAt`
5. Reemplaza en `campaign.formations[]`
6. Actualiza `campaign.updatedAt`

**Errores:**
- `unauthenticated`: Usuario no autenticado
- `invalid-argument`: Parámetros faltantes
- `not-found`: Campaña o formación no encontrada
- `permission-denied`: No perteneces a la campaña o formación no es de tu facción
- `failed-precondition`: No estás en fase de órdenes

---

### `deleteFormation`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/deleteFormation.ts`

**Descripción:**
Elimina una formación táctica de una campaña durante la fase de órdenes. Solo puedes eliminar tus propias formaciones.

**Parámetros:**
```typescript
{
  gameId: string
  campaignId: string
  formationId: string
}
```

**Retorno:**
```typescript
{
  success: boolean
  message: string
}
```

**Ejemplo de uso (Cliente):**
```typescript
const deleteForm = httpsCallable(functions, 'deleteFormation')

await deleteForm({
  gameId: 'game-123',
  campaignId: 'campaign-456',
  formationId: 'formation-789'
})
```

**Validaciones:**
- Solo en **fase de órdenes**
- Usuario es declarante o aliado
- Formación existe
- Formación pertenece a tu facción

**Transacción:**
1. Encuentra formación por ID
2. Verifica pertenencia a tu facción
3. Filtra formación del array `campaign.formations[]`
4. Actualiza `campaign.updatedAt`

**Errores:**
- `unauthenticated`: Usuario no autenticado
- `invalid-argument`: Parámetros faltantes
- `not-found`: Campaña o formación no encontrada
- `permission-denied`: No perteneces a la campaña o formación no es de tu facción
- `failed-precondition`: No estás en fase de órdenes

---

### `updateCampaignFleetPool`

**Tipo:** Callable (HTTPS)
**Archivo:** `functions/src/updateCampaignFleetPool.ts`

**Descripción:**
Actualiza el pool de naves disponibles para una campaña durante la fase de órdenes. Usado para gestionar refuerzos marítimos.

**Parámetros:**
```typescript
{
  gameId: string
  campaignId: string
  fleetPool: {
    galleys: number    // ≥ 0
    cogs: number       // ≥ 0
  }
}
```

**Retorno:**
```typescript
{
  success: boolean
  fleetPool: {
    galleys: number
    cogs: number
  }
  message: string
}
```

**Ejemplo de uso (Cliente):**
```typescript
const updatePool = httpsCallable(functions, 'updateCampaignFleetPool')

await updatePool({
  gameId: 'game-123',
  campaignId: 'campaign-456',
  fleetPool: {
    galleys: 5,
    cogs: 3
  }
})
```

**Validaciones:**
- Solo en **fase de órdenes**
- Usuario participa en la campaña (declarante, aliado o refuerzo)
- Valores numéricos válidos
- Valores no negativos

**Transacción:**
1. Verifica pertenencia a campaña
2. Valida estructura y valores de fleetPool
3. Actualiza `campaign.fleetPool`
4. Actualiza `campaign.updatedAt`

**Errores:**
- `unauthenticated`: Usuario no autenticado
- `invalid-argument`:
  - Parámetros faltantes
  - fleetPool sin estructura correcta
  - Valores negativos
- `not-found`: Campaña no encontrada o no eres jugador
- `permission-denied`: No participas en la campaña
- `failed-precondition`: No estás en fase de órdenes

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

**Última actualización:** 2025-01-20
**Funciones documentadas:** 12 (checkDeadlines, forcePhaseAdvance, setAdminRole, deleteGame, embarkTroops, disembarkTroops, joinCampaign, createFormation, updateFormation, deleteFormation, updateCampaignFleetPool, resolveTurn)
