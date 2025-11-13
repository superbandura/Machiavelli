# Manejo de Jugadores Inactivos

## Introducción

El sistema de inactividad gestiona automáticamente a jugadores que no participan en el juego, con advertencias progresivas y consecuencias.

---

## 1. Primer Turno Sin Órdenes

### Comportamiento Automático

```javascript
if (!jugador.hasSubmittedOrders && deadline_expirado) {
  // Todas las unidades → Mantener
  Para cada unidad de jugador:
    unidad.orden = "Mantener"

  Registrar: "⚠️ [Jugador] no envió órdenes (inactivo)"
  Enviar_Email_Advertencia(jugador)
}
```

### Consecuencias
- **Órdenes por defecto:** Todas las unidades ejecutan "Mantener"
- **Registro visible:** Se registra en el historial del turno
- **Email de advertencia:** Se envía notificación automática al jugador
- **Contador:** `inactivity_strikes = 1`

### Email de Advertencia

```
Asunto: [Machiavelli] No enviaste órdenes - Italia 1454

Has faltado al turno. Todas tus unidades mantuvieron posición.

ADVERTENCIA: Si faltas a 3 turnos consecutivos, puedes ser marcado
como inactivo y reemplazado por otro jugador.

Próximo deadline: [Fecha/Hora]
[Botón: Volver al Juego]
```

---

## 2. Segundo Turno Sin Órdenes

### Comportamiento Automático

```javascript
jugador.inactivity_strikes = 2
Enviar_Email_Advertencia_Final(jugador)
Notificar_Otros_Jugadores("[Jugador] lleva 2 turnos inactivo")
```

### Consecuencias
- **Órdenes por defecto:** Todas las unidades ejecutan "Mantener" (igual que turno 1)
- **Advertencia final:** Email más urgente
- **Notificación a otros:** Jugadores activos son informados
- **Contador:** `inactivity_strikes = 2`

### Email de Advertencia Final

```
Asunto: [URGENTE] [Machiavelli] 2 turnos sin órdenes - Italia 1454

Has faltado a 2 turnos consecutivos. Todas tus unidades mantuvieron posición.

⚠️ ADVERTENCIA FINAL: Si faltas al próximo turno, serás marcado como
inactivo y podrás ser reemplazado o eliminado por votación de otros jugadores.

Próximo deadline: [Fecha/Hora]
[Botón: Volver al Juego Ahora]
```

### Notificación a Otros Jugadores

```
[Jugador Inactivo] lleva 2 turnos sin enviar órdenes.
Si falta al próximo turno, podrá ser reemplazado o eliminado.
```

---

## 3. Tercer Turno Sin Órdenes

### Comportamiento Automático

```javascript
jugador.status = "inactive"
Permitir_Votación_Reemplazo()
```

### Consecuencias
- **Estado:** Jugador marcado como "inactivo"
- **Votación:** Se inicia proceso de votación entre jugadores activos
- **Opciones disponibles:** Modo IA básica, Reemplazo, o Eliminación

### Opciones de Resolución

#### Opción 1: Modo IA Básica (Automático)
```javascript
// Todas las unidades mantienen automáticamente cada turno
Para cada turno:
  Para cada unidad de jugador_inactivo:
    unidad.orden = "Mantener"
```

**Ventajas:**
- Mantiene el balance del juego
- No penaliza a otros jugadores
- Simple de implementar

**Desventajas:**
- Jugador inactivo no expande territorio
- Otros pueden aprovecharse fácilmente

#### Opción 2: Reemplazo
```javascript
// Nuevo jugador puede unirse y tomar control
if (nuevo_jugador_acepta) {
  jugador.user_id = nuevo_jugador.id
  jugador.email = nuevo_jugador.email
  jugador.status = "active"
  jugador.inactivity_strikes = 0
  Enviar_Email_Bienvenida(nuevo_jugador)
}
```

**Proceso:**
1. Enviar invitación a nuevo jugador (email o enlace)
2. Nuevo jugador acepta y crea cuenta
3. Nuevo jugador toma control de la facción
4. Historial se mantiene intacto

**Ventajas:**
- Juego continúa con jugador activo
- Balance se mantiene

**Desventajas:**
- Requiere encontrar nuevo jugador
- Nuevo jugador hereda situación (puede ser mala)

#### Opción 3: Eliminación (Por Votación)
```javascript
if (mayoría_jugadores_votan_eliminar) {
  Eliminar_Jugador(jugador_inactivo)
}
```

**Proceso de eliminación:**
```javascript
function Eliminar_Jugador(jugador) {
  1. jugador.status = "eliminated"
  2. Para cada unidad de jugador:
       Eliminar_Unidad(unidad)
  3. Para cada provincia controlada:
       provincia.owner = null // Neutral
       provincia.guarnicion = null
  4. Invalidar fichas de asesinato:
       Para cada otro_jugador:
         otro_jugador.fichas[jugador.id] = null
  5. Registrar: "☠️ [Jugador] eliminado (inactividad)"
}
```

**Ventajas:**
- Libera territorios para conquista
- Simplifica el juego

**Desventajas:**
- Puede desequilibrar el juego
- Jugadores cercanos se benefician más

---

## 4. Reseteo del Contador de Inactividad

### Cuándo se Resetea

```javascript
if (jugador.hasSubmittedOrders) {
  jugador.inactivity_strikes = 0
  jugador.status = "active"
}
```

**Condición:** Jugador envía órdenes en cualquier turno

**Consecuencia:** Contador vuelve a 0, proceso de inactividad se reinicia

### Ejemplo
```
Turno 3: Jugador no envía órdenes → strikes = 1
Turno 4: Jugador no envía órdenes → strikes = 2
Turno 5: Jugador ENVÍA órdenes → strikes = 0 (reseteo)
Turno 6: Jugador no envía órdenes → strikes = 1 (empieza de nuevo)
```

---

## 5. Transferencias a Jugadores Inactivos

### Comportamiento

```javascript
if (receptor.status == "inactive" && transferencia) {
  // Transferencia se procesa normalmente
  receptor.ducados += cantidad
  Registrar: "💰 [Emisor] transfirió [cantidad]d a [Receptor] (inactivo)"
  // El dinero queda en la cuenta del inactivo
}
```

### Rationale
No se penaliza al emisor por inactividad del receptor. El dinero transferido queda disponible si el jugador vuelve o si un nuevo jugador toma control.

### Ejemplo
```
Turno 5:
  Venecia (activo) → Florencia (inactivo): 10d

Resultado:
  Venecia: 30 - 10 = 20d
  Florencia: 15 + 10 = 25d (dinero disponible si vuelve)
```

---

## 6. Notificaciones a Otros Jugadores

### Primer Turno de Inactividad
```
Notificación en juego:
"[Jugador] no envió órdenes este turno."
```

### Segundo Turno de Inactividad
```
Notificación en juego:
"⚠️ [Jugador] lleva 2 turnos sin enviar órdenes.
Si falta al próximo turno, podrá ser reemplazado o eliminado."
```

### Tercer Turno de Inactividad
```
Notificación en juego + Email:
"⚠️ [Jugador] ha sido marcado como inactivo.
Vota si deseas que sea reemplazado o eliminado del juego."

[Botón: Votar Opciones]
```

---

## 7. Interfaz de Votación

### Pantalla de Votación

```
Jugador Inactivo: Florencia
Turnos sin órdenes: 3

Opciones:
⚪ Mantener en modo IA (todas las unidades mantienen)
⚪ Permitir reemplazo por nuevo jugador
⚪ Eliminar del juego (territorios se vuelven neutrales)

Votos actuales:
- Venecia: Eliminar
- Milán: Reemplazo
- Papado: No ha votado
- Nápoles: IA
- Génova: No ha votado

[Botón: Votar]
```

### Resolución de Votación

```javascript
// Mayoría simple gana
let votos = contar_votos()
let opcion_ganadora = obtener_mayoria(votos)

if (opcion_ganadora == "eliminar") {
  Eliminar_Jugador(jugador_inactivo)
} else if (opcion_ganadora == "reemplazo") {
  Permitir_Reemplazo(jugador_inactivo)
} else {
  // Modo IA (default si empate)
  jugador_inactivo.ai_mode = true
}
```

---

## Referencias

- **Fase de Órdenes:** Ver [fase-ordenes.md](./fase-ordenes.md) para envío de órdenes
- **Casos Límite:** Ver [casos-limite.md](./casos-limite.md) para jugador eliminado
- **Visión General:** Ver [fases-overview.md](./fases-overview.md)
