# Sistema de Fases y Turnos

Documentación completa del sistema de fases asíncronas de Machiavelli.

## Tabla de Contenidos

1. [Modelo Asíncrono](#modelo-asíncrono)
2. [Estructura de Turnos](#estructura-de-turnos)
3. [Fase Diplomática](#fase-diplomática)
4. [Fase de Órdenes](#fase-de-órdenes)
5. [Fase de Resolución](#fase-de-resolución)
6. [Eventos Especiales](#eventos-especiales)
7. [Verificación de Victoria](#verificación-de-victoria)

---

## Modelo Asíncrono

### Concepto Fundamental

Machiavelli NO es un juego en tiempo real. Opera en un modelo **"play-by-mail"** basado en **deadlines temporales**:

- Los jugadores **NO necesitan estar conectados simultáneamente**
- Cada fase tiene un plazo configurable (ej. 24-72 horas)
- Los jugadores pueden conectarse cuando quieran durante ese plazo
- Al expirar el deadline, la fase avanza **automáticamente**
- Cloud Scheduler verifica deadlines cada 1 minuto

### Ventajas

✅ Juego casual - conecta cuando puedas
✅ Partidas largas (días o semanas)
✅ Tiempo para pensar estrategias
✅ Compatible con zonas horarias diferentes

### Plazos Configurables

Cada partida configura sus plazos al crearse:

| Fase | Típico | Rango Posible |
|------|--------|---------------|
| Diplomática | 48 horas | 12-168 horas (0.5-7 días) |
| Órdenes | 48 horas | 12-168 horas (0.5-7 días) |
| Resolución | ~1 minuto | Automática (no configurable) |

---

## Estructura de Turnos

### Ciclo Anual

**1 año = 3 turnos (estaciones):**

```
Primavera → Verano → Otoño → (Nuevo año)
```

Cada turno tiene las mismas fases, pero algunas mecánicas especiales ocurren solo en ciertas estaciones.

### Orden de Fases por Turno

**TODOS los turnos:**
1. Fase Diplomática
2. Fase de Órdenes
3. Fase de Resolución

**Turnos específicos (mecánicas especiales):**

**Primavera:**
- **Eventos**: Hambruna (2-4 provincias aleatorias)
- **Mantenimiento**: Ingresos y gastos de tropas
- **Eliminación por hambruna**: Al final, si no se mitigó

**Verano:**
- **Eventos**: Peste (1-2 provincias aleatorias, destrucción inmediata)

**Otoño:**
- **Conversión de provincias neutrales** (solo en Otoño)
- **Verificación de victoria** (al final del turno)

### Orden Detallado: Turno de Primavera

Ejemplo completo con todas las mecánicas:

```
1. EVENTOS
   └─ Hambruna aparece → 2-4 provincias reciben marcadores

2. MANTENIMIENTO (solo Primavera)
   a. Calcular ingresos
      └─ +1-5 ducados por ciudad controlada
      └─ Provincias con hambruna NO producen ingresos
   b. Pagar mantenimiento
      └─ -1 ducado por ejército
      └─ -1 ducado por flota
      └─ Guarniciones gratis
   c. Licenciar tropas (si fondos insuficientes)
      └─ Destruye unidades al azar hasta poder pagarlas

3. ELIMINACIÓN POR HAMBRUNA
   └─ Unidades en provincias con hambruna son destruidas
   └─ Excepto si se pagó mitigación (3d) en turno anterior

4. FASE DIPLOMÁTICA (48 horas)
   └─ Jugadores negocian, envían mensajes

5. FASE DE ÓRDENES (48 horas)
   └─ Jugadores dan órdenes militares
   └─ Jugadores pueden pagar para mitigar hambruna (3d por provincia)
   └─ Jugadores pueden transferir ducados, intentar asesinatos, etc.

6. FASE DE RESOLUCIÓN (~1 minuto, automática)
   └─ Ejecuta órdenes
   └─ Resuelve batallas
   └─ Actualiza mapa
   └─ Guarda historial
```

**NOTA CRÍTICA sobre hambruna:**
- Hambruna aparece ANTES del mantenimiento
- Pagas mantenimiento de tropas que luego mueren por hambruna
- **Mitigación:** Paga 3d durante Órdenes del turno ANTERIOR para prevenir eliminación

---

## Fase Diplomática

**Duración:** Configurable (típicamente 48 horas)
**Objetivo:** Negociar alianzas, pactos, traiciones

### Actividades

**Mensajería:**
- **Privada (1-a-1):** Solo emisor y receptor ven el mensaje
- **Pública:** Todos los jugadores ven el mensaje
- Mensajes en tiempo real (Firestore real-time listeners)

**Negociación:**
- Pactos de no agresión
- Alianzas ofensivas/defensivas
- Repartir territorio
- Tributos o pagos
- Coordinación de apoyos

**Estrategia:**
- Observar el mapa
- Analizar posiciones de otros jugadores
- Detectar amenazas
- Planear movimientos coordinados

### Reglas

✅ Permitido:
- Mentir, engañar, traicionar
- Negociar en secreto
- Cambiar de aliados

❌ No permitido:
- Dar órdenes militares (solo en Fase de Órdenes)
- Ver órdenes de otros jugadores

### Interfaz (DiplomaticChat.tsx)

- Lista de jugadores
- Selector de destinatario (individual o "Todos")
- Historial de mensajes
- Indicador de mensajes no leídos
- Contador de deadline

---

## Fase de Órdenes

**Duración:** Configurable (típicamente 48 horas)
**Objetivo:** Dar órdenes militares y ejecutar acciones especiales

### Órdenes Militares

Cada unidad debe recibir una orden (o dará "mantener" automáticamente):

#### 1. Mover (Move)
```
Ejército en Florencia → Mover a Pisa
```
- Mueve unidad a provincia adyacente
- Ejércitos: solo tierra
- Flotas: solo mar/puertos

#### 2. Mantener (Hold)
```
Ejército en Roma → Mantener
```
- Unidad se queda defendiendo
- Fuerza defensiva: 1 + apoyos

#### 3. Apoyar (Support)

**Apoyo a movimiento:**
```
Ejército en Pisa → Apoyar Ejército Florencia → Siena
```
- Suma +1 de fuerza al movimiento

**Apoyo a mantener:**
```
Ejército en Pisa → Apoyar Ejército en Florencia
```
- Suma +1 de fuerza defensiva

**Apoyo cortado:**
- Si la unidad que apoya es atacada, el apoyo se cancela

#### 4. Convoy (Convoy)
```
Ejército en Génova → Convoy a Córcega
Flota en Mar de Liguria → Convoy Ejército Génova → Córcega
```
- Flota transporta ejército a través del mar
- Requiere flota en el mar entre origen y destino

#### 5. Sitiar (Besiege)
```
Turno 1: Ejército → Sitiar Florencia (contador 1/2)
Turno 2: Ejército → Sitiar Florencia (contador 2/2 → guarnición destruida)
```
- Ataca guarnición enemiga
- Requiere 2 turnos consecutivos
- Si ejército es desalojado, contador se reinicia

#### 6. Convertir (Convert)
```
Turno N (cualquier estación): Ejército → Provincia neutral
Otoño: Provincia se convierte a tu facción
```
- Solo en **Otoño**
- Solo provincias neutrales
- Requiere mantener ejército allí 1 turno completo

### Gastos Especiales (Extra Expenses)

**Mitigar Hambruna (3 ducados):**
```
Provincia: Toscana
Costo: 3 ducados
Efecto: Elimina marcador de hambruna, unidad sobrevive
```

**Transferir Ducados:**
```
Destinatario: Venecia
Cantidad: 10 ducados
Efecto: Tu tesoro -10d, tesoro de Venecia +10d
```

**Asesinato (6-18 ducados + token):**
```
Objetivo: Milán
Costo: 12 ducados + 1 token de asesino
Probabilidad: 33.3%
Efecto (si éxito): Milán pierde su siguiente turno
```

**Soborno (15 ducados):**
```
Objetivo: Florencia
Costo: 15 ducados
Efecto: Según reglas avanzadas (negociación)
```

### Modificar Órdenes

✅ Puedes modificar órdenes tantas veces como quieras durante la fase
✅ Solo las órdenes al final del deadline se ejecutan
✅ Órdenes son secretas hasta la resolución

### Interfaz (OrdersPanel.tsx)

- Seleccionar provincia en mapa
- Seleccionar unidad
- Elegir tipo de orden
- Seleccionar destino/objetivo
- Ver lista de órdenes actuales
- Modificar/eliminar órdenes
- Ver tesoro actual
- Botón "Enviar Órdenes"

---

## Fase de Resolución

**Duración:** ~1 minuto (automática)
**Ejecutor:** Cloud Functions (resolveTurn.ts)

### 9 Pasos de Resolución

#### Paso 1: Validación (step1-validate.ts)
```
- Verifica sintaxis de órdenes
- Verifica adyacencias
- Verifica legalidad de movimientos
- Marca órdenes inválidas
```

#### Paso 2: Economía (step2-economy.ts)
```
- Procesa transferencias de ducados
- Ejecuta intentos de asesinato (roll probabilidad)
- Procesa sobornos
- Actualiza tesoros
```

#### Paso 3: Movimientos y Batallas (step3-movements.ts)
```
- Calcula fuerza de cada unidad (1 + apoyos)
- Resuelve batallas simultáneamente
- Detecta standoffs (empates)
- Desaloja unidades perdedoras
- Actualiza posiciones
```

**Fórmula de fuerza:**
```
Fuerza = 1 (base) + número de apoyos recibidos
```

**Resolución de batalla:**
```
Si Fuerza_A > Fuerza_B:
  └─ A gana, B desalojado

Si Fuerza_A == Fuerza_B:
  └─ Standoff, ambos mantienen posición original

Si múltiples unidades atacan B:
  └─ Se suman todas las fuerzas atacantes
```

#### Paso 4: Retiradas (step4-retreats.ts)
```
- Unidades desalojadas retiran a provincia adyacente
- Si no hay espacio disponible → unidad destruida
- Actualiza estado de unidades
```

#### Paso 5: Asedios (step5-sieges.ts)
```
- Incrementa contadores de asedio
- Si contador llega a 2 → destruye guarnición
- Si ejército fue desalojado → reinicia contador
```

#### Paso 6: Conversiones (step6-conversions.ts)
```
- Solo en Otoño
- Convierte provincias neutrales con ejército
- Actualiza ownership de provincia
```

#### Paso 7: Actualizar Estado (step7-update.ts)
```
- Batch write a Firestore
- Actualiza unidades (posiciones, status)
- Actualiza jugadores (treasury, assassinTokens)
- Actualiza juego (siegeStatus, etc.)
```

#### Paso 8: Guardar Historial (step8-history.ts)
```
- Crea documento en colección 'turns'
- Guarda órdenes ejecutadas
- Guarda batallas, asedios, conversiones
- Guarda eventos especiales
```

#### Paso 9: Avanzar Fase (step9-advance.ts)
```
- orders → diplomatic (siguiente turno)
- diplomatic → orders (mismo turno)
- Calcula nuevo deadline
- Actualiza turnNumber y season si corresponde
- Llama a checkVictory() si es Otoño
- Procesa eventos especiales (hambruna, peste)
```

### Logs de Resolución

**Ejemplo:**
```
[ResolveTurn] Starting turn resolution for game-abc123
[ResolveTurn] Step 1: Validating orders
  └─ 15 orders valid, 2 invalid
[ResolveTurn] Step 2: Processing economy
  └─ 3 transfers, 1 assassination attempt (failed)
[ResolveTurn] Step 3: Resolving movements
  └─ 8 successful moves, 2 standoffs, 3 battles
[ResolveTurn] Step 4: Processing retreats
  └─ 2 units retreated, 1 destroyed
[ResolveTurn] Step 5: Updating sieges
  └─ 1 garrison destroyed
[ResolveTurn] Step 6: Processing conversions
  └─ 2 provinces converted
[ResolveTurn] Step 7: Updating game state
  └─ Batch write complete (45 operations)
[ResolveTurn] Step 8: Saving turn history
  └─ Turn 5 history saved
[ResolveTurn] Step 9: Advancing phase
  └─ New phase: diplomatic, Turn 6, Spring
[ResolveTurn] Turn resolved successfully in 12.3 seconds
```

---

## Eventos Especiales

### Hambruna (Primavera)

**Cuándo:** Inicio de cada turno de Primavera
**Frecuencia:** 2-4 provincias aleatorias

**Efecto:**
1. Provincias marcadas con icono ⚠️
2. **NO producen ingresos** durante mantenimiento
3. Al final de Primavera: unidades en esas provincias son **destruidas**

**Mitigación:**
- Paga **3 ducados** durante Fase de Órdenes (del turno anterior ideal, o del mismo turno antes de que termine)
- Elimina el marcador de hambruna
- Unidad sobrevive

**Timing crítico:**
```
Turno 1 Primavera:
  └─ Hambruna aparece en Toscana
  └─ Mantenimiento: Toscana NO produce ingresos
  └─ Fin de Primavera: Unidad en Toscana destruida (si no se mitigó)

Turno 2 Verano:
  └─ Hambruna de Toscana ya ejecutada
```

### Peste (Verano)

**Cuándo:** Inicio de cada turno de Verano
**Frecuencia:** 1-2 provincias aleatorias

**Efecto:**
- Unidades en provincias afectadas son **destruidas inmediatamente**
- **NO se puede mitigar**
- Es aleatorio e inevitable

**Diferencia con hambruna:**
| Característica | Hambruna | Peste |
|----------------|----------|-------|
| Estación | Primavera | Verano |
| Timing | Al final del turno | Inmediato |
| Mitigación | Sí (3d) | No |
| Ingresos | Bloqueados | No afecta |

---

## Verificación de Victoria

**Cuándo:** Al final de cada turno de **Otoño**
**Ejecutor:** checkVictory.ts (llamada desde step9-advance.ts)

### Condiciones de Victoria

#### Victoria Estándar
```
Controla X ciudades:
  - 3-4 jugadores: 12 ciudades
  - 5-6 jugadores: 15 ciudades
  - 7-8 jugadores: 18 ciudades

→ Status del juego: 'finished'
→ Winner: playerId
```

#### Victoria por Tiempo Límite
```
Tras 12 turnos (4 años):
  Jugador con más ciudades gana

Desempate:
  Mayor valor total de ciudades
  (Ciudades valen 1-5 ducados cada una)
```

### Pantalla de Victoria

Al detectar victoria:
1. `game.status` → `'finished'`
2. `game.winner` → `playerId`
3. UI muestra `VictoryScreen.tsx`:
   - Nombre del ganador
   - Ranking final
   - Estadísticas del juego
   - Botón "Volver al Lobby"

---

## Flujo Completo: Ejemplo de 1 Turno

**Escenario:** Turno 5, Primavera, 3 jugadores (Florencia, Venecia, Milán)

### Pre-Turno (Eventos y Mantenimiento)

```
1. EVENTOS - Hambruna
   └─ Hambruna aparece en: Toscana, Romagna

2. MANTENIMIENTO
   Florencia:
     Ingresos: Florencia (5d) + Pisa (2d) - Toscana (0d, hambruna) = +7d
     Gastos: 3 ejércitos + 1 flota = -4d
     Balance: +3d (tesoro: 15d → 18d)

   Venecia:
     Ingresos: Venecia (5d) + Padua (3d) = +8d
     Gastos: 2 ejércitos + 2 flotas = -4d
     Balance: +4d (tesoro: 20d → 24d)

   Milán:
     Ingresos: Milán (4d) + Pavía (2d) + Como (1d) = +7d
     Gastos: 4 ejércitos = -4d
     Balance: +3d (tesoro: 12d → 15d)

3. ELIMINACIÓN POR HAMBRUNA
   └─ Ejército de Florencia en Toscana → DESTRUIDO
   └─ Ejército de Milán en Romagna → DESTRUIDO
```

### Fase Diplomática (48 horas)

```
Florencia → Venecia (privado):
  "Propongo alianza contra Milán. No atacaré Ferrara si no atacas Bolonia."

Venecia → Florencia (privado):
  "Acepto. Coordinemos ataque en Turno 6."

Milán → Todos (público):
  "Busco alianzas. Ofrezco 5 ducados a quien me apoye contra Florencia."
```

### Fase de Órdenes (48 horas)

**Florencia:**
```
Órdenes militares:
  - Ejército Florencia → Mover a Bolonia
  - Ejército Arezzo → Apoyar Florencia → Bolonia
  - Flota Mar de Liguria → Mantener

Gastos especiales:
  - Ninguno
```

**Venecia:**
```
Órdenes militares:
  - Ejército Venecia → Mover a Ferrara
  - Ejército Treviso → Apoyar Venecia → Ferrara
  - Flota Mar Adriático → Mantener
  - Flota Mar Jónico → Mantener

Gastos especiales:
  - Ninguno
```

**Milán:**
```
Órdenes militares:
  - Ejército Milán → Mover a Bolonia (intenta bloquear Florencia)
  - Ejército Como → Apoyar Milán → Bolonia
  - Ejército Pavía → Mantener

Gastos especiales:
  - Transferir 5 ducados a Florencia (soborno fallido)
```

### Fase de Resolución (~1 minuto)

**Paso 3 - Resolución de Movimientos:**

**Batalla en Bolonia:**
```
Atacante 1: Florencia
  Fuerza: 1 (base) + 1 (apoyo Arezzo) = 2

Atacante 2: Milán
  Fuerza: 1 (base) + 1 (apoyo Como) = 2

Defensor: Neutral
  Fuerza: 0

Resultado: Standoff (empate 2 vs 2)
  └─ Florencia queda en Florencia
  └─ Milán queda en Milán
  └─ Bolonia queda neutral
```

**Batalla en Ferrara:**
```
Atacante: Venecia
  Fuerza: 1 (base) + 1 (apoyo Treviso) = 2

Defensor: Neutral
  Fuerza: 0

Resultado: Venecia gana
  └─ Venecia avanza a Ferrara
```

**Paso 7 - Actualizar Estado:**
```
Unidades:
  - Ejército Venecia: Venecia → Ferrara
  - Resto sin cambios

Jugadores:
  - Milán: 15d → 10d (transferencia)
  - Florencia: 18d → 23d (recibe transferencia)
```

**Paso 9 - Avanzar Fase:**
```
Nuevo estado:
  - Fase: diplomatic
  - Turno: 6
  - Estación: Summer
  - Deadline: +48 horas
```

### Resultado Final del Turno

**Mapa actualizado:**
- Venecia controla Ferrara (nuevo)
- Bolonia sigue neutral (standoff)
- Unidades en Toscana y Romagna destruidas por hambruna

**Historial guardado:**
- Turno 5 (Primavera) con todas las órdenes y resultados

**Siguiente turno:**
- Turno 6, Verano
- Posible peste

---

## Referencias

- **[Órdenes Militares](ordenes-militares.md)** - Detalles técnicos de cada orden
- **[Eventos Especiales](eventos-especiales.md)** - Hambruna, Peste, Asesinato
- **[Casos Límite](casos-limite.md)** - Algoritmos de resolución complejos
- **[API Reference](../dev/API_REFERENCE.md)** - Documentación de Cloud Functions

---

**Última actualización:** 2025-01-13
