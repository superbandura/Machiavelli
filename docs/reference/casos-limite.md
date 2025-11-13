# Casos Límite Resueltos

## Introducción

Este documento detalla situaciones complejas o ambiguas que requieren resolución específica.

---

## 1. Formato de Lista de Retirada

### Estructura JSON Requerida

**Proporcionada con órdenes:**
```json
{
  "orders": [
    { "unit": "Ejército 1", "order": "Avanzar a Módena" }
  ],
  "retreatList": {
    "Ejército 1": ["Pisa", "Umbría", "Romaña"],
    "Ejército 2": ["Liguria", "Piamonte"]
  }
}
```

### Interpretación
- **Orden de preferencia:** La primera provincia de la lista es la preferida
- **Provincias adyacentes:** Solo provincias adyacentes a la posición actual son válidas
- **Disponibilidad:** Solo provincias vacías o controladas por el mismo jugador

### Sin Lista Proporcionada

```javascript
if (!retreatList[unidad] && debe_retirarse) {
  Eliminar_Unidad(unidad)
  Registrar: "☠️ [Unidad] eliminada (sin lista de retirada)"
}
```

**Consecuencia:** Unidad eliminada automáticamente si debe retirarse.

### Ejemplo Completo

```
Situación:
  Ejército 1 (Florencia) en Módena
  Ejército 2 (Venecia) ataca Módena con fuerza 2
  Ejército 1 pierde y debe retirarse

Lista de retirada:
  "Ejército 1": ["Pisa", "Umbría", "Romaña"]

Resolución:
  1. Intentar Pisa → Ocupada por enemigo ✗
  2. Intentar Umbría → Vacía y adyacente ✓
  3. Ejército 1 se retira a Umbría
```

---

## 2. Múltiples Atacantes a Provincia Vacía

### Algoritmo de Resolución

```javascript
if (fuerza_defensa == 0 && num_atacantes > 1) {
  let max_fuerza = Math.max(...atacantes.map(a => a.fuerza))
  let atacantes_max = atacantes.filter(a => a.fuerza == max_fuerza)

  if (atacantes_max.length == 1) {
    // Un solo atacante con mayor fuerza
    Mover_Unidad(atacantes_max[0], provincia)
  } else {
    // Múltiples con misma fuerza máxima → Standoff
    Nadie_Entra()
    Registrar: "⚔️ Empate múltiple en [Provincia] ([num] atacantes, todos fuerza [max])"
  }
}
```

### Ejemplos

#### Ejemplo 1: Un Atacante Más Fuerte
```
Provincia: Módena (vacía)

Atacantes:
  - Ejército 1 (Florencia): fuerza 2 (con 1 apoyo)
  - Ejército 2 (Venecia): fuerza 1 (sin apoyo)

Resolución:
  max_fuerza = 2
  atacantes_max = [Ejército 1]
  Resultado: Ejército 1 (Florencia) entra en Módena
```

#### Ejemplo 2: Múltiples Atacantes con Igual Fuerza
```
Provincia: Módena (vacía)

Atacantes:
  - Ejército 1 (Florencia): fuerza 2
  - Ejército 2 (Venecia): fuerza 2
  - Ejército 3 (Milán): fuerza 1

Resolución:
  max_fuerza = 2
  atacantes_max = [Ejército 1, Ejército 2]
  Resultado: Standoff, nadie entra
```

#### Ejemplo 3: Todos Atacantes con Fuerza 1
```
Provincia: Módena (vacía)

Atacantes:
  - Ejército 1 (Florencia): fuerza 1
  - Ejército 2 (Venecia): fuerza 1

Resolución:
  max_fuerza = 1
  atacantes_max = [Ejército 1, Ejército 2]
  Resultado: Standoff, nadie entra
```

---

## 3. Contador de Asedio con Múltiples Asediadores

### Regla Principal

**Solo UNA unidad puede ser el "asediador principal"** para propósitos del contador.

### Algoritmo

```javascript
// Solo UNA unidad puede ser el "asediador principal"
// Se elige la primera que dio orden de asedio

if (múltiples_unidades_asediando) {
  let principal = primera_unidad_con_orden_asedio
  ciudad.asediador = principal
  ciudad.contador_asedio++ // Solo cuenta una vez
}
```

### Ejemplos

#### Ejemplo 1: Múltiples Unidades Asediando
```
Turno 3:
  Ejército 1 (Florencia) en Toscana → Asediar Florencia
  Ejército 2 (Florencia) en Toscana → Asediar Florencia

Resolución:
  Asediador principal: Ejército 1 (primero en lista)
  Contador: 1/2

Turno 4:
  Ambos siguen asediando
  Contador: 2/2 → Ciudad capturada
```

#### Ejemplo 2: Cambio de Asediador Principal
```
Turno 3:
  Ejército 1 (Florencia) en Toscana → Asediar Florencia
  Contador: 1/2, Asediador: Ejército 1

Turno 4:
  Ejército 1 se mueve a Módena
  Ejército 2 (Florencia) en Toscana → Asediar Florencia

Resolución:
  Nuevo asediador: Ejército 2
  Contador: RESETEA a 1/2 (diferente asediador)
```

#### Ejemplo 3: Unidades de Diferentes Jugadores
```
Turno 3:
  Ejército 1 (Florencia) en Toscana → Asediar Venecia
  Contador: 1/2, Asediador: Ejército 1 (Florencia)

Turno 4:
  Ejército 1 (Florencia) eliminado
  Ejército 2 (Milán) en Toscana → Asediar Venecia

Resolución:
  Nuevo asediador: Ejército 2 (Milán)
  Contador: RESETEA a 1/2 (diferente jugador/unidad)
```

---

## 4. Transferencias Circulares con Snapshot

### Por Qué Se Usa Snapshot

**Problema sin snapshot:**
Jugadores podrían explotar el orden de procesamiento para multiplicar dinero.

**Solución:**
Capturar fondos de todos los jugadores al inicio del Paso 2, antes de procesar cualquier transferencia.

### Algoritmo

```javascript
// PASO 0: Crear snapshot al inicio del Paso 2
const snapshot = {}
Para cada jugador:
  snapshot[jugador.id] = jugador.ducados

// PASO 1: Validar y procesar transferencias
Para cada transferencia:
  if (snapshot[emisor] >= cantidad) {
    emisor.ducados -= cantidad
    receptor.ducados += cantidad
  } else {
    // Transferencia falla
  }
```

### Ejemplos

#### Ejemplo 1: Transferencias Circulares Simples
```javascript
Snapshot: A=10, B=10, C=10

Transferencias:
A → B: 5d
B → C: 12d
C → A: 8d

Validación (contra snapshot):
A → B: 10 >= 5 ✓
B → C: 10 < 12 ✗ FALLO
C → A: 10 >= 8 ✓

Resultado:
A: 10 - 5 + 8 = 13d
B: 10 + 5 = 15d (NO envía los 12d)
C: 10 - 8 = 2d
```

#### Ejemplo 2: Explotación Prevenida
```
Snapshot inicial: Florencia 20d, Venecia 10d

Transferencias programadas:
1. Florencia → Venecia: 10d
2. Venecia → Florencia: 15d

Sin snapshot (explotable):
  1. Florencia: 20 - 10 = 10d
  2. Venecia: 10 + 10 = 20d
  3. Venecia: 20 - 15 = 5d ✓ (tiene fondos)
  4. Florencia: 10 + 15 = 25d
  ❌ Florencia ganó 5d de la nada

Con snapshot (correcto):
  1. Validar Florencia → Venecia: 20 >= 10 ✓
  2. Validar Venecia → Florencia: 10 >= 15 ✗
  3. Florencia: 20 - 10 = 10d
  4. Venecia: 10 + 10 = 20d
  ✓ Florencia perdió 10d, Venecia ganó 10d (correcto)
```

#### Ejemplo 3: Cadena Larga
```javascript
Snapshot: A=100, B=0, C=0, D=0

Transferencias:
A → B: 30d
B → C: 30d
C → D: 30d
D → A: 30d

Validación:
A → B: 100 >= 30 ✓
B → C: 0 < 30 ✗ FALLO
C → D: 0 < 30 ✗ FALLO
D → A: 0 < 30 ✗ FALLO

Resultado:
A: 100 - 30 = 70d
B: 0 + 30 = 30d
C: 0d (no recibe nada)
D: 0d (no recibe nada)
```

---

## 5. Jugador Eliminado - Territorios Neutrales

### Proceso de Eliminación

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

  5. Registrar: "☠️ [Jugador] eliminado (0 ciudades)"
}
```

### Captura de Territorios Neutrales

```javascript
if (provincia.owner == null && unidad.entra) {
  provincia.owner = unidad.owner
  if (provincia.ciudad) {
    // Ciudad neutral capturada automáticamente
    Capturar_Ciudad(provincia.ciudad, unidad.owner)
  }
}
```

**Regla:** Territorios neutrales se capturan automáticamente al entrar con cualquier unidad.

### Ejemplo Completo

```
Situación Inicial:
  Florencia controla: Toscana (Florencia), Módena, Pisa
  Florencia tiene: 0 ducados, 1 ciudad (Florencia)

Turno 5 - Primavera 1455 (Mantenimiento):
  Ingresos: Florencia produce 3d
  Mantenimiento: 3 unidades × 3d = 9d
  Fondos insuficientes: 3d < 9d
  Licenciar unidades hasta tener fondos suficientes
  Resultado: 0 ciudades controladas

Verificación de Eliminación:
  Florencia tiene 0 ciudades → ELIMINADO

Efectos:
  - Todas las unidades de Florencia eliminadas
  - Toscana → owner = null (neutral)
  - Módena → owner = null (neutral)
  - Pisa → owner = null (neutral)
  - Fichas de asesinato de Florencia invalidadas en otros jugadores

Turno 6 - Verano 1455:
  Venecia mueve Ejército 1 a Toscana
  Toscana (neutral) → Capturada automáticamente por Venecia
  Florencia (ciudad) → Capturada automáticamente por Venecia
```

---

## 6. Apoyo Cancelado por Ataque desde Provincia Apoyada

### Regla de Excepción

**Apoyo NO se cancela** si el ataque viene desde la provincia que está siendo apoyada.

### Algoritmo

```javascript
Para cada unidad con orden "Apoyar":
  Para cada atacante:
    if (atacante.destino == unidad.provincia) {
      if (atacante.origen == unidad.apoyo_destino) {
        // NO cancela (ataque desde donde está apoyando)
        continue
      } else {
        // SÍ cancela (cut support)
        Cancelar_Apoyo(unidad)
      }
    }
```

### Ejemplos

#### Ejemplo 1: Cut Support Normal
```
Módena: Ejército 1 (Milán) → Mantener
Lombardía: Ejército 2 (Milán) → Apoyar Módena
Piamonte: Ejército 3 (Florencia) → Avanzar a Lombardía

Resolución:
  Ejército 3 ataca Lombardía
  Apoyo de Ejército 2 CANCELADO (cut support)
  Módena se defiende solo con fuerza 1
```

#### Ejemplo 2: Apoyo NO Cancelado (Excepción)
```
Módena: Ejército 1 (Milán) → Mantener
Lombardía: Ejército 2 (Milán) → Apoyar Módena
Módena: Ejército 3 (Florencia) → Avanzar a Lombardía

Resolución:
  Ejército 3 ataca Lombardía DESDE Módena (provincia apoyada)
  Apoyo de Ejército 2 NO se cancela (excepción)
  Módena se defiende con fuerza 2
```

#### Ejemplo 3: Múltiples Ataques
```
Módena: Ejército 1 (Milán) → Mantener
Lombardía: Ejército 2 (Milán) → Apoyar Módena
Módena: Ejército 3 (Florencia) → Avanzar a Lombardía
Piamonte: Ejército 4 (Venecia) → Avanzar a Lombardía

Resolución:
  Ejército 3 ataca DESDE Módena → NO cancela apoyo (excepción)
  Ejército 4 ataca DESDE Piamonte → SÍ cancela apoyo (normal)
  Apoyo CANCELADO (basta con 1 ataque que no sea desde provincia apoyada)
```

---

## 7. Convoy Interrumpido por Batalla

### Regla

Si una flota con orden "Convoy" es atacada, el convoy se interrumpe.

### Algoritmo

```javascript
if (atacante.destino == flota_convoy.provincia) {
  // Convoy cancelado (similar a cut support)
  convoy.válido = false
  ejército.orden = "Mantener" // Ejército no se mueve
  Registrar: "❌ Convoy interrumpido en [Zona Marítima]"
}
```

### Ejemplo

```
Ejército 1 (Florencia) en Toscana → Avanzar a Córcega (convoy)
Flota 1 (Florencia) en Mar de Liguria → Convoy Ejército 1
Flota 2 (Venecia) en Mar Tirreno → Avanzar a Mar de Liguria

Resolución:
  Flota 2 ataca Mar de Liguria
  Convoy de Flota 1 INTERRUMPIDO
  Ejército 1 no puede moverse → Mantener en Toscana
```

---

## Referencias

- **Fase de Resolución:** Ver [fase-resolucion.md](./fase-resolucion.md) para algoritmos completos
- **Órdenes Militares:** Ver [ordenes-militares.md](./ordenes-militares.md)
- **Ejemplo Completo:** Ver [ejemplo-turno.md](./ejemplo-turno.md)
- **Jugadores Inactivos:** Ver [jugadores-inactivos.md](./jugadores-inactivos.md)
