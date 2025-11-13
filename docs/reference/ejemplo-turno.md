# Ejemplo Completo de Turno

## Introducción

Este documento muestra un ejemplo completo de un turno, desde los eventos hasta el avance al siguiente turno, con todos los pasos de la Fase de Resolución.

---

## Contexto Inicial

**Turno:** 4 - Verano 1455

**Jugadores Activos:**
- Florencia: 18 ducados
- Venecia: 25 ducados
- Milán: 12 ducados

**Posiciones de Unidades:**
- Florencia:
  - Ejército 1 en Toscana
  - Ejército 2 en Umbría
- Venecia:
  - Ejército 1 en Véneto
  - Ejército 2 en Romaña (Mantener)
- Milán:
  - Ejército 1 en Módena
  - Ejército 2 en Lombardía

---

## PASO 1: EVENTOS (~5 segundos)

### Verificar Eventos de Verano

**Peste:**
```
Tirada: 1d6 = 3
Resultado: Sin Peste (solo 5-6 activa peste)
Registro: "✓ Sin eventos de peste este turno"
```

**Hambre:**
No aplica (solo Primavera)

**Duración:** ~5 segundos

---

## PASO 2A: TRANSFERENCIAS (~1 segundo)

### Snapshot de Fondos

```javascript
const snapshot = {
  Florencia: 18,
  Venecia: 25,
  Milán: 12
}
```

### Transferencias Programadas

```
1. Florencia → Venecia: 10d
2. Milán → Florencia: 15d
```

### Procesamiento

**Transferencia 1: Florencia → Venecia: 10d**
```javascript
Validar: snapshot[Florencia] >= 10 → 18 >= 10 ✓
Ejecutar:
  Florencia: 18 - 10 = 8d
  Venecia: 25 + 10 = 35d
Registrar: "✅ Florencia transfirió 10d a Venecia"
```

**Transferencia 2: Milán → Florencia: 15d**
```javascript
Validar: snapshot[Milán] >= 15 → 12 >= 15 ✗
NO Ejecutar
Registrar: "❌ Milán intentó transferir 15d a Florencia (fondos insuficientes)"
```

### Estado Después de Transferencias

```
Florencia: 8d
Venecia: 35d
Milán: 12d
```

**Duración:** ~1 segundo

---

## PASO 2B: ASESINATOS (~2 segundos)

### Intento de Asesinato

**Venecia intenta asesinar a Florencia:**
```javascript
Coste: 12d (2 números elegidos)
Números: [3, 5]

Validación:
  snapshot[Venecia] >= 12 → 25 >= 12 ✓

Consumir:
  Venecia: 35 - 12 = 23d
  Ficha de Florencia consumida (permanente)

Tirada: 1d6 = 4

Resultado: 4 NOT IN [3, 5] → ❌ FALLO
Registrar: "❌ Asesinato de Florencia por Venecia falló (dado: 4)"
```

### Estado Después de Asesinatos

```
Florencia: 8d (sin cambios, asesinato falló)
Venecia: 23d (perdió 12d y ficha)
Milán: 12d (sin cambios)
```

**Duración:** ~2 segundos

---

## PASO 3: RESOLUCIÓN MOVIMIENTOS (~10 segundos)

### Órdenes Militares

**FLORENCIA:**
```
Ejército 1 (Toscana) → Avanzar a Módena
Ejército 2 (Umbría) → Apoyar Ejército 1
```

**VENECIA:**
```
Ejército 1 (Véneto) → Avanzar a Módena
Ejército 2 (Romaña) → Mantener
```

**MILÁN:**
```
Ejército 1 (Módena) → Mantener
Ejército 2 (Lombardía) → Apoyar Ejército 1
```

### PASO 3.1: Calcular Rutas de Convoy

No hay órdenes de convoy este turno.

### PASO 3.2: Identificar Ataques a Unidades de Apoyo

```javascript
Verificar si Ejército 2 (Umbría) está siendo atacado:
  - No hay ataques a Umbría
  - Apoyo válido ✓

Verificar si Ejército 2 (Lombardía) está siendo atacado:
  - No hay ataques a Lombardía
  - Apoyo válido ✓
```

### PASO 3.3: Calcular Fuerzas de Combate en Módena

**Atacantes:**
```javascript
Florencia (Ejército 1):
  - Fuerza base: 1
  - Apoyo de Ejército 2 (Umbría): +1
  - Total: 2

Venecia (Ejército 1):
  - Fuerza base: 1
  - Sin apoyo: 0
  - Total: 1
```

**Defensor:**
```javascript
Milán (Ejército 1):
  - Fuerza base: 1 (Mantener)
  - Apoyo de Ejército 2 (Lombardía): +1
  - Total: 2
```

### PASO 3.4: Resolver Batalla en Módena

```javascript
fuerza_ataque_florencia = 2
fuerza_ataque_venecia = 1
fuerza_defensa = 2

Mejor atacante: Florencia con fuerza 2

Comparar:
  Florencia (2) vs Milán (2) → EMPATE (2 == 2)

Resultado: STANDOFF
  - Nadie se mueve
  - Todos permanecen en posición original

Registrar: "⚔️ Empate en Módena (Florencia: 2 vs Milán: 2, Venecia: 1)"
```

**Nota:** Venecia tenía fuerza 1, insuficiente para ganar.

### Movimientos Finales

```
Florencia:
  - Ejército 1 permanece en Toscana
  - Ejército 2 permanece en Umbría

Venecia:
  - Ejército 1 permanece en Véneto
  - Ejército 2 permanece en Romaña

Milán:
  - Ejército 1 permanece en Módena (defendió exitosamente)
  - Ejército 2 permanece en Lombardía
```

**Duración:** ~10 segundos

---

## PASO 4: RETIRADAS (~1 segundo)

No hay unidades que deban retirarse (no hubo derrotas).

**Duración:** ~1 segundo

---

## PASO 5: ASEDIOS (~1 segundo)

No hay órdenes de asedio este turno.

**Duración:** ~1 segundo

---

## PASO 6: CONVERSIONES (~1 segundo)

No hay órdenes de conversión este turno.

**Duración:** ~1 segundo

---

## PASO 7: ACTUALIZAR ESTADO (~2 segundos)

### Actualización del Estado

```javascript
1. Actualizar posiciones:
   - Sin cambios (standoff en Módena)

2. Actualizar ciudades controladas:
   - Sin cambios

3. Eliminar unidades:
   - Ninguna

4. Actualizar tesorería:
   - Florencia: 8d
   - Venecia: 23d
   - Milán: 12d
   (Ya modificadas en Paso 2)

5. Guardar en Firestore
```

**Duración:** ~2 segundos

---

## PASO 8: REGISTRO HISTORIAL (~1 segundo)

### Formato JSON del Historial

```json
{
  "turnNumber": 4,
  "season": "Verano",
  "year": 1455,
  "timestamp": "2024-06-15T14:30:00Z",
  "events": [
    {
      "type": "transfer",
      "from": "Florencia",
      "to": "Venecia",
      "amount": 10,
      "success": true
    },
    {
      "type": "transfer",
      "from": "Milán",
      "to": "Florencia",
      "amount": 15,
      "success": false,
      "reason": "Fondos insuficientes"
    },
    {
      "type": "assassination",
      "attacker": "Venecia",
      "target": "Florencia",
      "cost": 12,
      "numbers": [3, 5],
      "roll": 4,
      "success": false
    },
    {
      "type": "battle",
      "province": "Módena",
      "attackers": {
        "Florencia": 2,
        "Venecia": 1
      },
      "defender": {
        "Milán": 2
      },
      "result": "standoff",
      "description": "Empate entre Florencia (2) y Milán (2)"
    }
  ],
  "summary": {
    "conquests": [],
    "retreats": [],
    "eliminations": [],
    "siegesCompleted": [],
    "standoffs": ["Módena"]
  }
}
```

### Visualización en UI

**Resumen del Turno:**
```
Turno 4 - Verano 1455 - COMPLETADO

💰 Economía:
  ✅ Florencia → Venecia: 10d
  ❌ Milán → Florencia: 15d (fondos insuficientes)

☠️ Asesinatos:
  ❌ Venecia intentó asesinar a Florencia (falló)

⚔️ Batallas:
  ⚔️ Módena: Empate (Florencia 2 vs Milán 2, Venecia 1)

📊 Cambios:
  - Sin cambios territoriales
  - Sin unidades eliminadas
```

**Duración:** ~1 segundo

---

## PASO 9: AVANCE AL SIGUIENTE TURNO (~2 segundos)

### Actualización de Estado del Juego

```javascript
1. Incrementar turnNumber: 4 → 5

2. Cambiar currentPhase: 'resolution' → 'diplomatic'

3. Calcular siguiente estación:
   season: 'Verano' → 'Otoño'
   year: 1455 (sin cambio)

4. Establecer phaseDeadline:
   fecha_actual + 48h = 2024-06-17T14:30:00Z

5. Actualizar phaseStartedAt:
   timestamp = 2024-06-15T14:30:00Z

6. Resetear hasSubmittedOrders:
   Para cada jugador:
     hasSubmittedOrders = false
```

### Notificaciones por Email

**Email a todos los jugadores:**
```
Asunto: [Machiavelli] Turno 4 Resuelto - Italia 1454

El turno 4 (Verano 1455) ha sido completado.

Resumen:
- Empate en Módena entre Florencia y Milán
- Florencia transfirió 10d a Venecia
- Intento de asesinato de Venecia contra Florencia falló

Nueva Fase Diplomática:
Deadline: 17 de Junio, 14:30 (48 horas)

Puedes negociar con otros jugadores y planificar tu estrategia.

[Botón: Ver Turno Resuelto]
[Botón: Ir al Juego]
```

### Verificar Eliminación de Jugadores

```javascript
// No aplica en Verano, solo en Primavera después de mantenimiento
if (currentSeason == "Primavera" && después_de_mantenimiento) {
  // Verificar jugadores con 0 ciudades
}
```

**Duración:** ~2 segundos

---

## TIEMPO TOTAL DE RESOLUCIÓN

```
PASO 1: Eventos                           ~5 segundos
PASO 2A: Transferencias                   ~1 segundo
PASO 2B: Asesinatos                       ~2 segundos
PASO 3: Resolución Movimientos           ~10 segundos
PASO 4: Retiradas                         ~1 segundo
PASO 5: Asedios                           ~1 segundo
PASO 6: Conversiones                      ~1 segundo
PASO 7: Actualizar Estado                 ~2 segundos
PASO 8: Registro Historial                ~1 segundo
PASO 9: Avance al Siguiente Turno         ~2 segundos
───────────────────────────────────────────────────────
TOTAL:                                   ~26 segundos
```

**Nota:** Estos tiempos son estimados. Turnos con más unidades y batallas complejas pueden tardar más.

---

## Estado Final

### Tesorería
```
Florencia: 8d (-10d por transferencia)
Venecia: 23d (+10d por transferencia, -12d por asesinato fallido)
Milán: 12d (sin cambios)
```

### Territorios
Sin cambios (standoff en Módena)

### Unidades
Todas en sus posiciones originales

### Fichas de Asesinato
Venecia perdió 1 ficha de Florencia (no recuperable)

---

## Próximo Turno

**Turno 5 - Otoño 1455**

**Fase Actual:** Diplomática (48 horas)

**Deadline:** 17 de Junio, 14:30

**Acciones Disponibles:**
- Negociar con otros jugadores
- Planificar estrategia militar
- Consultar mapa y recursos

---

## Referencias

- **Fase de Resolución Completa:** Ver [fase-resolucion.md](./fase-resolucion.md)
- **Órdenes Militares:** Ver [ordenes-militares.md](./ordenes-militares.md)
- **Eventos Especiales:** Ver [eventos-especiales.md](./eventos-especiales.md)
- **Casos Límite:** Ver [casos-limite.md](./casos-limite.md)
- **Visión General:** Ver [fases-overview.md](./fases-overview.md)
