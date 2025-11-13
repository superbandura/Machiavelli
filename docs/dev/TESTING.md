# Guía de Testing

Estrategia de testing para Machiavelli, desde testing manual hasta automatizado.

## Tabla de Contenidos

1. [Testing Manual](#testing-manual)
2. [Testing con Emulators](#testing-con-emulators)
3. [Testing de Integración](#testing-de-integración)
4. [Testing Automatizado](#testing-automatizado)
5. [Casos de Prueba](#casos-de-prueba)
6. [Checklist de Testing](#checklist-de-testing)

---

## Testing Manual

### Setup

1. **Inicia emulators:**
```bash
firebase emulators:start --only firestore,auth,functions
```

2. **Inicia dev server:**
```bash
npm run dev
```

3. **Abre múltiples ventanas:**
   - Ventana normal: Jugador 1
   - Ventana incógnito: Jugador 2
   - Otra ventana incógnito: Jugador 3

### Flujo Básico

#### 1. Registro y Login
```
✓ Registro con email/password
✓ Login exitoso
✓ Logout
✓ Login nuevamente
✓ Error con credenciales incorrectas
```

#### 2. Lobby
```
✓ Ver lista de partidas disponibles
✓ Crear nueva partida
✓ Configurar escenario (1454, 1494, Tutorial)
✓ Configurar plazos (24h, 48h, 72h)
✓ Ver detalles de partida
✓ Unirse a partida
✓ Seleccionar facción
✓ Ver facciones ocupadas
✓ Iniciar partida (botón solo visible para creador)
```

#### 3. Fase Diplomática
```
✓ Ver el mapa
✓ Zoom y pan en el mapa
✓ Ver tus unidades
✓ Ver provincias que controlas
✓ Enviar mensaje privado
✓ Enviar mensaje público
✓ Recibir mensajes
✓ Contador de mensajes no leídos
✓ Ver deadline
```

#### 4. Fase de Órdenes
```
✓ Seleccionar provincia
✓ Seleccionar unidad
✓ Dar orden Mover
✓ Dar orden Mantener
✓ Dar orden Apoyar
✓ Dar orden Sitiar
✓ Dar orden Convertir
✓ Ver lista de órdenes
✓ Modificar orden
✓ Eliminar orden
✓ Ver tesoro actual
✓ Transferir ducados
✓ Mitigar hambruna (si hay)
✓ Enviar órdenes
```

#### 5. Resolución Automática
```
✓ Esperar deadline (o usar "Forzar Avance")
✓ Ver resultados en historial
✓ Ver unidades actualizadas
✓ Ver tesoro actualizado
✓ Ver provincias capturadas
✓ Ver eventos (hambruna, peste)
```

#### 6. Victoria
```
✓ Alcanzar número de ciudades requerido
✓ Pantalla de victoria
✓ Ver estadísticas finales
✓ Juego pasa a estado "finished"
```

---

## Testing con Emulators

### Emulator UI

Abre `http://localhost:4000` para acceder a:

1. **Firestore Emulator**
   - Ver/editar documentos
   - Crear datos de prueba
   - Verificar queries

2. **Auth Emulator**
   - Ver usuarios registrados
   - Crear usuarios manualmente
   - Ver tokens

3. **Functions Emulator**
   - Ver logs en tiempo real
   - Ver ejecuciones
   - Ver errores

### Testing de Cloud Functions

#### Scheduled Function (checkDeadlines)

**Método 1: Esperar 1 minuto**
```bash
# En Emulator UI, ve a Functions → Logs
# Busca: [CheckDeadlines] Checking deadlines...
# Debe aparecer cada minuto
```

**Método 2: Trigger manual**
```bash
# En otra terminal
curl http://localhost:5001/machiavelli-6ef06/us-central1/checkDeadlines
```

#### Callable Function (forcePhaseAdvance)

**En el cliente:**
```typescript
import { httpsCallable } from 'firebase/functions'

const forceAdvance = httpsCallable(functions, 'forcePhaseAdvance')

try {
  const result = await forceAdvance({ gameId: 'your-game-id' })
  console.log('Success:', result.data)
} catch (error) {
  console.error('Error:', error)
}
```

**En Emulator UI:**
- Functions → Logs
- Busca `[ForcePhaseAdvance]`
- Verifica parámetros y retorno

### Datos de Prueba

**Crear partida rápida:**
```typescript
// Usa el botón "Forzar Avance" para saltar fases
// 1. Crea partida → Status: waiting
// 2. Únete con 3+ jugadores
// 3. Inicia partida → Status: active, Phase: diplomatic
// 4. Forzar Avance → Phase: orders
// 5. Da órdenes
// 6. Forzar Avance → Resolución + siguiente turno
```

---

## Testing de Integración

### Escenario Completo: Turno 1

**Jugadores:** 3 (Florencia, Venecia, Milán)

#### Fase Diplomática (5 minutos)

**Florencia:**
```
Envía a Venecia: "Propongo alianza contra Milán"
Envía a Milán: "No atacaré Bolonia si no atacas Florencia"
```

**Venecia:**
```
Responde a Florencia: "Acepto, no atacaré Ferrara"
```

**Milán:**
```
Envía público: "Busco alianzas"
```

#### Fase de Órdenes (10 minutos)

**Florencia:**
```
Ejército Florencia → Mover a Pisa
Ejército Arezzo → Apoyar Florencia → Pisa
Flota Mar de Liguria → Mantener
```

**Venecia:**
```
Ejército Venecia → Mover a Padua
Ejército Treviso → Apoyar Venecia → Padua
Flota Mar Adriático → Mantener
```

**Milán:**
```
Ejército Milán → Mover a Pavía
Ejército Como → Mantener
Transferir 5 ducados a Florencia (soborno)
```

#### Resolución (automática)

**Click en "Forzar Avance"**

**Esperado:**
```
✓ Florencia avanza a Pisa (fuerza 2)
✓ Venecia avanza a Padua (fuerza 2)
✓ Milán avanza a Pavía (fuerza 1)
✓ Transferencia: Milán -5d, Florencia +5d
✓ Fase avanza a: Turno 2, Fase Diplomática
✓ Historial guardado
```

**Verificar:**
- Emulator UI → Firestore → Collection `units`
  - Unidades en nuevas posiciones
- Collection `players`
  - Tesoros actualizados
- Collection `turns`
  - Nuevo documento con historial

---

## Testing Automatizado

### Unit Tests (Jest)

**Pendiente implementar.** Estructura recomendada:

```
functions/src/__tests__/
├── resolution/
│   ├── step1-validate.test.ts
│   ├── step2-economy.test.ts
│   ├── step3-movements.test.ts
│   └── ...
├── events/
│   └── processEvents.test.ts
└── utils/
    └── orderValidation.test.ts
```

**Ejemplo:**
```typescript
// step3-movements.test.ts
import { resolveMovements } from '../resolution/step3-movements'

describe('Movement Resolution', () => {
  test('Simple move succeeds with no opposition', async () => {
    const gameId = 'test-game'
    const orders = [
      {
        unitId: 'unit-1',
        action: 'move',
        from: 'florence',
        to: 'pisa'
      }
    ]

    const result = await resolveMovements(gameId, orders)

    expect(result.successful).toContain('unit-1')
    expect(result.battles).toHaveLength(0)
  })

  test('Battle with support resolves correctly', async () => {
    // Test con apoyo
  })

  test('Standoff prevents both moves', async () => {
    // Test de empate
  })
})
```

### Integration Tests

**Pendiente implementar.** Usar Firebase Test SDK:

```typescript
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'

describe('Turn Resolution Integration', () => {
  let testEnv

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-machiavelli',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8')
      }
    })
  })

  test('Full turn resolution', async () => {
    // 1. Setup: Crear juego, jugadores, unidades
    // 2. Dar órdenes
    // 3. Llamar resolveTurn()
    // 4. Verificar estado final
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })
})
```

### E2E Tests (Playwright)

**Pendiente implementar.** Estructura recomendada:

```
tests/e2e/
├── auth.spec.ts         # Login, registro
├── lobby.spec.ts        # Crear/unirse partida
├── gameplay.spec.ts     # Jugar turno completo
└── victory.spec.ts      # Condiciones de victoria
```

**Ejemplo:**
```typescript
// gameplay.spec.ts
import { test, expect } from '@playwright/test'

test('Complete turn workflow', async ({ page, context }) => {
  // Login como Jugador 1
  await page.goto('http://localhost:5173')
  await page.fill('[name="email"]', 'player1@test.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Crear partida
  await page.click('text=Crear Partida')
  await page.fill('[name="gameName"]', 'Test Game')
  await page.click('text=Comenzar')

  // Dar órdenes
  await page.click('[data-province="florence"]')
  await page.click('text=Mover')
  await page.click('[data-province="pisa"]')
  await page.click('text=Confirmar')

  // Forzar avance (si eres creador)
  await page.click('text=Forzar Avance')

  // Verificar resolución
  await expect(page.locator('[data-unit-location="pisa"]')).toBeVisible()
})
```

---

## Casos de Prueba

### Órdenes Militares

#### Move

| Caso | Entrada | Esperado |
|------|---------|----------|
| Movimiento simple | A → B (sin oposición) | A avanza a B |
| Movimiento bloqueado | A → B (B ocupado, misma fuerza) | Standoff |
| Batalla ganada | A → B (fuerza 2 vs 1) | A desaloja B |
| Movimiento ilegal | A → C (no adyacente) | Orden inválida |

#### Support

| Caso | Entrada | Esperado |
|------|---------|----------|
| Apoyo exitoso | A apoya B → C | B tiene fuerza +1 |
| Apoyo cortado | A apoya B, A es atacado | Apoyo cancelado |
| Apoyo a mantener | A apoya B (hold) | B tiene fuerza +1 defensiva |

#### Besiege

| Caso | Entrada | Esperado |
|------|---------|----------|
| Asedio turno 1 | Ejército asedia | Contador 1/2 |
| Asedio turno 2 | Ejército asedia nuevamente | Guarnición destruida |
| Asedio interrumpido | Ejército desalojado | Contador reinicia a 0 |

#### Convert

| Caso | Entrada | Esperado |
|------|---------|----------|
| Conversión en Otoño | Ejército en neutral (Otoño) | Provincia convertida |
| Conversión fuera de Otoño | Ejército en neutral (Primavera) | Sin cambio |
| Conversión de enemigo | Ejército en provincia enemiga | Orden inválida |

### Economía

| Caso | Entrada | Esperado |
|------|---------|----------|
| Ingreso normal | 3 ciudades (valor 2, 3, 5) | +10 ducados |
| Gasto normal | 2 ejércitos, 1 flota | -3 ducados |
| Saldo negativo | Tesoro 5d, gastos 8d | Pierde 3 unidades al azar |
| Transferencia | A envía 10d a B | A -10d, B +10d |

### Eventos Especiales

#### Hambruna

| Caso | Entrada | Esperado |
|------|---------|----------|
| Sin mitigación | Unidad en provincia con hambruna | Unidad destruida al final de Primavera |
| Con mitigación | Jugador paga 3d | Marcador eliminado, unidad sobrevive |
| Sin ducados | Jugador intenta mitigar sin ducados | Orden rechazada |

#### Asesinato

| Caso | Entrada | Esperado |
|------|---------|----------|
| Éxito (18d, 50%) | Roll ≤ 50 | Jugador pierde turno |
| Fallo (6d, 16.7%) | Roll > 16.7 | Sin efecto |
| Sin token | Intento sin token de asesino | Orden rechazada |

### Victoria

| Caso | Entrada | Esperado |
|------|---------|----------|
| Victoria estándar | Jugador controla 15 ciudades (5-6 jugadores) | Status → finished, winner set |
| Victoria por tiempo | Turno 12, jugador A tiene 10, B tiene 8 | A gana |
| Empate | Turno 12, A y B tienen 10 | Desempate por valor total |

---

## Checklist de Testing

### Pre-Commit

- [ ] `npm run build` sin errores
- [ ] `cd functions && npm run build` sin errores
- [ ] No hay `console.error` en código
- [ ] Tipos TypeScript correctos

### Pre-PR

- [ ] Testing manual en emulators
- [ ] Probado con 2+ usuarios simultáneos
- [ ] Firestore Security Rules permiten operaciones
- [ ] No hay regresiones en features existentes
- [ ] Documentación actualizada

### Pre-Deployment

- [ ] Testing en Firebase Staging (si existe)
- [ ] Security Rules desplegadas primero
- [ ] Índices verificados
- [ ] Variables de entorno configuradas
- [ ] Backup de Firestore (producción)

---

## Herramientas

### Firebase Emulator Suite

```bash
# Inicia todos los emulators
firebase emulators:start

# Solo algunos
firebase emulators:start --only firestore,auth,functions

# Con UI
firebase emulators:start --import=./emulator-data --export-on-exit
```

### Postman / Insomnia

Para testing de callable functions (producción):

```
POST https://us-central1-machiavelli-6ef06.cloudfunctions.net/forcePhaseAdvance
Headers:
  Authorization: Bearer <firebase-id-token>
Body:
  { "data": { "gameId": "test-game-id" } }
```

### Firebase Test SDK

```bash
npm install --save-dev @firebase/rules-unit-testing
```

---

## Recursos

- **[Firebase Emulator Docs](https://firebase.google.com/docs/emulator-suite)**
- **[Jest Testing](https://jestjs.io/)**
- **[Playwright E2E](https://playwright.dev/)**
- **[Testing Best Practices](https://firebase.google.com/docs/rules/unit-tests)**

---

**Próximos pasos:**
1. Implementar unit tests para `resolution/*`
2. Implementar integration tests para flujo completo
3. Configurar CI/CD con testing automatizado

---

**Última actualización:** 2025-01-13
