# Glosario de Machiavelli

## Introducción

Este glosario define todos los términos técnicos y de juego utilizados en Machiavelli, organizados alfabéticamente.

---

## A

### Adyacencia
Relación geográfica entre dos provincias que comparten frontera. Solo provincias adyacentes permiten movimiento directo de unidades terrestres.

**Ejemplo:** Florencia es adyacente a Pisa, Siena, Arezzo, Urbino, Bologna y Pistoia.

### Admin SDK
Firebase Admin SDK. Herramientas de servidor que permiten a Cloud Functions bypasear Security Rules y acceder a toda la base de datos sin restricciones.

### Apoyo (Support)
Orden militar que añade +1 de fuerza a otra unidad (propia o aliada). Puede ser ofensivo (apoyar ataque) o defensivo (apoyar defensa).

**Sintaxis:** `"Apoyar Ejército 1"`

### Apoyo Cortado (Cut Support)
Cuando una unidad que está apoyando es atacada, su apoyo se anula automáticamente (incluso si el ataque falla). Excepción: ataques desde la provincia apoyada no cortan.

**Ejemplo:**
```
Ejército 1 apoya Ejército 2
Ejército 3 ataca Ejército 1
→ Apoyo de Ejército 1 se corta
```

### Apoyo Defensivo
Apoyo a una unidad que está en Mantener o Asediar. Incrementa la fuerza defensiva.

### Apoyo Ofensivo
Apoyo a una unidad que está Avanzando. Incrementa la fuerza de ataque.

### Arquitectura Flat
Diseño de base de datos donde todas las colecciones son de nivel superior (no anidadas). Las relaciones se manejan mediante campos `gameId` compartidos.

### Asesinato (Assassination)
Gasto especial que permite atacar a un jugador rival. Coste: 12, 24 o 36 ducados. El atacante elige 1-3 números (1-6), y se lanza un dado. Si sale uno de los números elegidos, el asesinato tiene éxito.

**Efectos:**
- Anula todas las órdenes del jugador víctima ese turno
- Destruye guarniciones asediadas
- Causa rebeliones en provincias asediadas

### Asediar (Besiege)
Orden militar para asediar una ciudad. Requiere 3 turnos consecutivos de asedio exitoso para capturar la ciudad.

**Progreso:** 0 → 1 → 2 → Ciudad capturada

**Sintaxis:** `"Asediar Florencia"`

### Asíncrono (Asynchronous)
Modelo de juego donde los jugadores NO necesitan estar conectados simultáneamente. Cada fase tiene un deadline (típicamente 48 horas) y el servidor resuelve automáticamente cuando expira el plazo.

### Avanzar (Move/Attack)
Orden militar para mover una unidad a una provincia adyacente. Si la provincia está ocupada por enemigos, se resuelve como combate.

**Sintaxis:** `"Avanzar a Pisa"`

---

## B

### Batch Writes
Operaciones de escritura atómicas en Firestore. Máximo 500 operaciones por batch. Si una falla, todas fallan (transacción).

**Ejemplo:**
```typescript
const batch = db.batch()
batch.update(gameRef, data)
batch.set(unitRef, unitData)
await batch.commit()
```

### Batalla (Battle)
Combate que ocurre cuando múltiples unidades intentan ocupar la misma provincia. Se resuelve comparando fuerzas.

**Resolución:**
- Atacante gana si fuerza_ataque > fuerza_defensa
- Defensor gana si fuerza_defensa ≥ fuerza_ataque
- Perdedor retira o es eliminado

---

## C

### Callable Function
Cloud Function que puede ser invocada directamente desde el cliente. Requiere autenticación.

**Ejemplo:** `forcePhaseAdvance`, `resolveTurn`

### Ciudad (City)
Provincia con asentamiento urbano que genera ingresos (1-5 ducados/turno). Las ciudades requieren guarniciones para defenderlas efectivamente.

**Ciudades mayores:** Milán, Venecia, Florencia, Nápoles, Roma (5 ducados)

### Cloud Functions
Funciones serverless de Firebase que ejecutan lógica backend. En Machiavelli, manejan la resolución de turnos.

**Funciones principales:**
- `checkDeadlines` (scheduled)
- `resolveTurn` (internal)
- `forcePhaseAdvance` (callable)

### Cloud Scheduler
Servicio de Google Cloud que ejecuta tareas programadas. En Machiavelli, ejecuta `checkDeadlines` cada 1 minuto.

### Convoy (Transport)
Orden militar donde una flota transporta un ejército a través del mar. Requiere cadena de flotas conectando origen y destino.

**Sintaxis:** `"Convoy Ejército 1 a Sicilia"`

### Conversión (Convert)
Orden militar para cambiar el tipo de unidad:
- Flota ↔ Ejército (solo en puertos)
- Guarnición → Ejército (cualquier ciudad)

**Sintaxis:** `"Convertir a Flota"`

---

## D

### Deadline
Plazo límite de una fase. Cuando expira, Cloud Scheduler detecta el vencimiento y ejecuta la resolución automáticamente.

**Típico:** 48 horas por fase

### Denormalización
Técnica de base de datos donde se duplica información para mejorar performance. En Machiavelli, `map` y `scenarioData` se embeben en `Game` en vez de referenciarlos.

### Ducado (Ducat)
Moneda del juego. Se obtiene de ciudades controladas y se gasta en mantenimiento de tropas y acciones especiales.

**Ingresos:** 1-5 ducados/ciudad/turno (solo en Primavera)
**Gastos:** 1 ducado/ejército, 1 ducado/flota

---

## E

### Ejército (Army)
Tipo de unidad militar terrestre. Puede moverse a provincias terrestres y puertos adyacentes.

**Coste mantenimiento:** 1 ducado/turno

### Eliminación
Remoción de un jugador del juego. Ocurre si:
- Pierde todas sus ciudades
- Es expulsado por votación (inactividad)
- Hambruna destruye todas sus tropas

### Emulators
Herramientas de Firebase para desarrollo local. Simulan Firestore, Auth, Functions y Hosting sin tocar producción.

**Comando:** `firebase emulators:start --only firestore,auth,functions`

### Estación (Season)
División del año en el juego. Cada año tiene 3 estaciones: Primavera, Verano, Otoño.

**Mecánicas especiales:**
- **Primavera:** Hambruna, mantenimiento, ingresos
- **Verano:** Peste
- **Otoño:** Conversión de neutrales, verificación de victoria

---

## F

### Facción (Faction)
Potencia política que controla un jugador. Ejemplos: Florencia, Venecia, Milán, Nápoles, Papal, Francia.

### Fase Diplomática
Primera fase del turno (típicamente 48h). Los jugadores negocian, forman alianzas y envían mensajes secretos o públicos.

**Duración típica:** 48 horas

### Fase de Órdenes
Segunda fase del turno (típicamente 48h). Los jugadores envían órdenes militares secretas para sus unidades.

**Duración típica:** 48 horas

### Fase de Resolución
Tercera fase del turno (automática, ~1-5 minutos). El servidor ejecuta los 9 pasos de resolución de turno.

**Pasos:**
0. Eventos especiales
1. Validación de órdenes
2. Economía
3. Movimientos
4. Retiradas
5. Asedios
6. Conversiones
7. Actualización de estado
8. Historial
9. Avance de fase

### Firestore
Base de datos NoSQL en tiempo real de Firebase. Almacena todo el estado del juego.

**Colecciones principales:** games, players, units, orders, diplomatic_messages

### Flota (Fleet)
Tipo de unidad militar naval. Puede moverse a zonas marítimas y puertos adyacentes.

**Coste mantenimiento:** 1 ducado/turno

### Fog of War
Sistema de visibilidad limitada. Los jugadores solo ven unidades enemigas en provincias adyacentes a sus propias unidades.

**Campo:** `visibleTo: string[]` en cada unidad

### Fuerza (Strength)
Valor numérico que determina el resultado de combates. Se calcula sumando:
- Unidad base: 1
- Apoyos: +1 por cada apoyo válido

**Ejemplo:** Ejército con 2 apoyos = fuerza 3

---

## G

### GameId
Identificador único de una partida. Usado en todas las colecciones para relacionar documentos con su partida.

### Guarnición (Garrison)
Tipo de unidad militar defensiva. NO puede moverse. Se coloca automáticamente en ciudades capturadas.

**Coste mantenimiento:** 0 ducados (gratis)
**Defensa:** Fuerza 1 en Mantener

---

## H

### Hambruna (Famine)
Evento especial que ocurre en Primavera. 2-4 provincias aleatorias reciben marcadores de hambruna. Si no se mitiga pagando ducados, las tropas en esas provincias son licenciadas.

**Coste mitigación:** Variable según provincia

---

## I

### Índice Compuesto (Composite Index)
Índice de Firestore necesario para queries con múltiples campos. Definidos en `firestore.indexes.json`.

**Ejemplo:**
```json
{
  "fields": [
    { "fieldPath": "gameId", "order": "ASCENDING" },
    { "fieldPath": "turnNumber", "order": "DESCENDING" }
  ]
}
```

### Inactividad (Inactivity)
Estado de un jugador que no envía órdenes durante un turno. Después de 3 turnos consecutivos de inactividad, puede ser expulsado por votación.

**Contador:** `inactivityCounter` en documento Player

---

## J

### JSDoc
Sistema de documentación para JavaScript/TypeScript mediante comentarios especiales.

**Ejemplo:**
```typescript
/**
 * Valida una orden de movimiento
 * @param order - Orden a validar
 * @returns Resultado de validación
 */
```

---

## L

### Listener
Suscripción en tiempo real a cambios en Firestore. Usa `onSnapshot` para recibir actualizaciones automáticas.

**Patrón:**
```typescript
const unsubscribe = onSnapshot(docRef, callback)
return () => unsubscribe() // Cleanup obligatorio
```

### Lobby
Estado inicial de una partida (`status: 'waiting'`). Los jugadores se unen, eligen facciones y esperan a que la partida comience.

---

## M

### Mantenimiento (Maintenance)
Coste periódico de tropas, pagado en Primavera. Ejércitos y flotas cuestan 1 ducado/turno. Guarniciones son gratis.

### Mantener (Hold)
Orden militar para permanecer en la provincia actual y defender. Es la ÚNICA orden que proporciona fuerza defensiva pura (fuerza 1).

**Sintaxis:** `"Mantener"`

### Mapa (Map)
Conjunto de 74 provincias que forman Italia renacentista. Incluye provincias terrestres, marítimas, puertos e islas.

### Mermaid
Lenguaje de diagramas usado en documentación markdown. Permite crear flowcharts, diagramas ER, secuencias, etc.

---

## N

### Neutral (Neutral Territory)
Provincia sin dueño al inicio del juego. Puede ser capturada mediante Conversión en Otoño.

**Ejemplos:** Córcega, Cerdeña, Suiza, Túnez

### NoSQL
Tipo de base de datos no relacional. Firestore es una base de datos NoSQL orientada a documentos.

---

## O

### onSnapshot
Función de Firestore para suscribirse a cambios en tiempo real.

**Uso:**
```typescript
onSnapshot(doc(db, 'games', gameId), (snapshot) => {
  setGame(snapshot.data())
})
```

### Orden (Order)
Instrucción militar enviada por un jugador a una unidad. Tipos: Mantener, Avanzar, Apoyar, Convoy, Asediar, Convertir.

### Orden Secreta (Secret Order)
Durante la fase de órdenes, las órdenes son secretas (solo el jugador que las envía puede verlas). Se revelan después de la resolución.

---

## P

### Path Alias
Atajo de importación configurado en `vite.config.ts`. `@` apunta a `/src`.

**Ejemplo:** `import { Game } from '@/types'`

### Peste (Plague)
Evento especial que ocurre en Verano. 1-2 provincias aleatorias son afectadas, destruyendo guarniciones inmediatamente.

### Play-by-Mail
Modelo de juego asíncrono donde los jugadores envían órdenes por correo (o digitalmente) y el árbitro resuelve periódicamente. Machiavelli usa este modelo.

### Provincia (Province)
División territorial del mapa. Tipos:
- **Terrestre (land):** Solo ejércitos
- **Marítima (sea):** Solo flotas
- **Puerto (port):** Ejércitos y flotas

**Total:** 74 provincias

### Puerto (Port)
Provincia costera que permite tanto ejércitos como flotas. Necesario para conversiones entre ejércitos y flotas.

**Ejemplos:** Génova, Venecia, Nápoles, Pisa, Ancona

---

## Q

### Query
Consulta a Firestore para obtener documentos. Puede incluir filtros (`where`), ordenamiento (`orderBy`) y límites (`limit`).

**Ejemplo:**
```typescript
query(
  collection(db, 'games'),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc')
)
```

---

## R

### Read-Only
Modo de solo lectura. Durante partida activa, los jugadores NO pueden modificar `games`, `units`, `players`. Solo Cloud Functions pueden escribir.

### Real-time
Tiempo real. Firestore notifica cambios instantáneamente mediante listeners (`onSnapshot`).

### Resolución de Turno (Turn Resolution)
Proceso de 9 pasos que ejecuta Cloud Functions cuando expira el deadline de la fase de órdenes.

### Retirada (Retreat)
Movimiento forzado de una unidad que perdió un combate. El jugador debe proporcionar una lista de retirada con provincias adyacentes preferidas.

**Sin lista:** Unidad eliminada

---

## S

### Scheduled Function
Cloud Function que se ejecuta automáticamente en un horario. `checkDeadlines` es scheduled (cada 1 minuto).

### Scenario
Configuración inicial de una partida: facciones disponibles, territorios neutrales, condiciones de victoria.

**Escenarios:**
- Italia 1454 - Paz de Lodi
- Italia 1494 - Guerras Italianas
- Tutorial - Italia Simplificada

### Security Rules
Reglas de seguridad de Firestore que controlan quién puede leer/escribir qué documentos.

**Archivo:** `firestore.rules`

### Standoff
Empate en combate. Ocurre cuando:
- Múltiples atacantes con igual fuerza máxima
- Fuerza de ataque = fuerza de defensa

**Resultado:** Nadie se mueve, todos permanecen en sus posiciones

---

## T

### Tesoro (Treasury)
Cantidad de ducados que posee un jugador. Se usa para pagar mantenimiento, mitigar hambrunas y gastos especiales.

### Timestamp
Tipo de dato de Firebase para fechas/horas. **SIEMPRE usar `Timestamp`, NO `Date`.**

**Ejemplo:**
```typescript
import { Timestamp } from 'firebase/firestore'
phaseDeadline: Timestamp.now()
```

### Transferencia (Transfer)
Gasto especial para enviar ducados a otro jugador. Útil para alianzas y negociaciones.

**Coste:** Variable (lo que elija el jugador)

### Turno (Turn)
Ciclo completo de 3 fases: Diplomática → Órdenes → Resolución. Cada año tiene 3 turnos (estaciones).

---

## U

### Unidad (Unit)
Pieza militar controlada por un jugador. Tipos: Ejército, Flota, Guarnición.

### User ID (userId)
Identificador único de usuario de Firebase Auth. Vincula usuarios con jugadores en partidas.

---

## V

### Validación Dual (Dual Validation)
Patrón donde las órdenes se validan tanto en cliente (UX) como en servidor (autoridad).

**Cliente:** `src/utils/orderValidation.ts`
**Servidor:** `functions/src/resolution/step1-validate.ts`

### Victoria (Victory)
Condición de fin de juego. Se verifica en Otoño. Requiere controlar un número mínimo de ciudades (típicamente 8-9).

**Condiciones:**
- Controlar X ciudades (depende del número de jugadores)
- O alcanzar el límite de turnos

### Visibilidad (Visibility)
Sistema de fog of war. Controlado por campo `visibleTo` en cada unidad.

**Reglas:**
- Unidad visible a su owner siempre
- Visible a jugadores con unidades adyacentes
- Guarniciones solo visibles si controlas la provincia

---

## Z

### Zona Marítima (Sea Zone)
Provincia de tipo `sea`. Solo flotas pueden ocuparlas. Ejemplos: Mar Tirreno, Mar Adriático, Golfo de León.

### Zustand
Librería de state management para React. Usado en Machiavelli para `authStore`.

**Ventajas:** Más simple que Redux, mejor performance

---

## Términos Técnicos Adicionales

### Admin SDK
Ver "Admin SDK" en sección A.

### Batch Commit
Confirmación atómica de un conjunto de operaciones de escritura en Firestore.

### Callable
Ver "Callable Function" en sección C.

### Composite Index
Ver "Índice Compuesto" en sección I.

### Denormalization
Ver "Denormalización" en sección D.

### Flat Architecture
Ver "Arquitectura Flat" en sección A.

### onCall
Decorador de Cloud Functions para crear funciones callable.

### onSchedule
Decorador de Cloud Functions para crear funciones scheduled.

### Serverless
Arquitectura donde el código se ejecuta sin gestionar servidores. Cloud Functions es serverless.

---

## Acrónimos

| Acrónimo | Significado |
|----------|-------------|
| **DB** | Database (Base de Datos) |
| **ER** | Entity-Relationship (Entidad-Relación) |
| **FK** | Foreign Key (Clave Foránea) |
| **GCF** | Google Cloud Functions |
| **JSDoc** | JavaScript Documentation |
| **MVP** | Minimum Viable Product |
| **NoSQL** | Not Only SQL |
| **PK** | Primary Key (Clave Primaria) |
| **SDK** | Software Development Kit |
| **SPA** | Single Page Application |
| **UI** | User Interface |
| **UX** | User Experience |

---

## Referencias

- **[Arquitectura](./arquitectura.md)** - Diseño completo del sistema
- **[Base de Datos](./database.md)** - Esquema Firestore
- **[Órdenes Militares](./ordenes-militares.md)** - Detalles de todas las órdenes
- **[Eventos Especiales](./eventos-especiales.md)** - Hambruna, Peste, Asesinato
- **[Fases del Juego](./GAME_PHASES.md)** - Sistema de turnos completo
