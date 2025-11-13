# Fase de Resolución (Automática)

## Descripción General

La Fase de Resolución es **completamente automática** y no requiere intervención de los jugadores. Cloud Functions ejecuta toda la lógica del juego.

**Duración:** Variable (~5-30 minutos según complejidad del turno)

---

## Proceso de Resolución: 9 Pasos

### PASO 1: Validación de Órdenes

**Objetivo:** Asegurar que todas las órdenes son legales

**Proceso:**
```javascript
Para cada unidad de cada jugador:
  1. Verificar que orden es legal:
     - Ejército no puede ir a zona marítima sin convoy
     - Flota no puede ir a provincia terrestre sin puerto
     - Unidad solo puede moverse a provincia adyacente
     - Guarnición no puede moverse nunca

  2. Si orden es ilegal:
     - Marcar como "Mantener" (Hold)
     - Registrar: "Orden inválida de [Unidad]: [Razón]"

  3. Si orden es legal:
     - Continuar al siguiente paso
```

**Resultado:** Todas las órdenes son válidas o corregidas a "Mantener"

---

### PASO 2: Procesamiento Económico y Gastos Especiales

**IMPORTANTE:** Se usa **snapshot de fondos** al inicio del Paso 2 para evitar explotaciones.

#### PASO 2A: Transferencias entre Jugadores

**Snapshot de Fondos:**
```javascript
// Al inicio del Paso 2, capturar saldo de todos
const snapshot = {
  Florencia: 45,
  Venecia: 20,
  Milán: 12,
  // ...
}
```

**Procesamiento:**
```javascript
Para cada transferencia:
  1. Validar contra snapshot (NO contra saldo actual):
     if (snapshot[emisor] >= cantidad) {
       emisor.ducados -= cantidad
       receptor.ducados += cantidad
       Registrar: "✅ [Emisor] transfirió [cantidad]d a [Receptor]"
     } else {
       Registrar: "❌ [Emisor] intentó transferir [cantidad]d (fondos insuficientes)"
     }
```

**Ejemplo de snapshot (evita explotación):**
```
Snapshot inicial: Florencia 20d, Venecia 10d

Transferencias programadas:
1. Florencia → Venecia: 10d
2. Venecia → Florencia: 15d

Validación:
1. Florencia tiene 20d en snapshot ≥ 10d ✓ Ejecuta
2. Venecia tiene 10d en snapshot < 15d ✗ Falla

Resultado final:
Florencia: 20 - 10 = 10d (no recibe los 15d que falló)
Venecia: 10 + 10 = 20d

Sin snapshot (explotable):
Florencia: 20 - 10 = 10d → Venecia 20d → Venecia envía 15d → Florencia 25d ❌
```

**Nota:** Ver [casos-limite.md](./casos-limite.md) para más ejemplos de transferencias circulares.

#### PASO 2B: Asesinatos

**Proceso:**
```javascript
Para cada intento de asesinato:
  1. Validar fondos contra snapshot:
     if (snapshot[atacante] < coste) {
       Registrar: "❌ Asesinato fallido (fondos insuficientes)"
       NO consumir ficha
       Continuar
     }

  2. Consumir ducados y ficha:
     atacante.ducados -= coste
     atacante.fichas[víctima] = null // Ficha gastada

  3. Lanzar dado (1-6):
     if (resultado in númerosElegidos) {
       // ÉXITO
       Ejecutar_Efectos_Asesinato(víctima)
     } else {
       // FALLO
       Registrar: "❌ Asesinato de [Víctima] falló (dado: [resultado])"
     }
```

**Efectos de Asesinato Exitoso:**
```javascript
function Ejecutar_Efectos_Asesinato(víctima) {
  1. Parálisis Militar:
     Para cada unidad de víctima:
       orden = "Mantener" // Forzado

  2. Eliminar Guarniciones Asediadas:
     Para cada guarnición de víctima:
       if (contador_asedio >= 1) {
         Eliminar_Unidad(guarnición)
         ciudad.guarnicion = null
       }

  3. Registrar:
     "☠️ [Víctima] ha sido asesinado!"
     "⚠️ Todas sus unidades mantienen posición este turno"
}
```

**IMPORTANTE:** NO hay sistema de rebeliones aleatorias (eliminado por complejidad)

**Nota:** Ver [eventos-especiales.md](./eventos-especiales.md) para detalles completos de asesinatos.

#### PASO 2C: Sobornos de Unidades

**Mecánica Simple:**
```javascript
Para cada soborno:
  1. Validar fondos contra snapshot:
     if (snapshot[pagador] < 15) {
       Registrar: "❌ Soborno fallido (fondos insuficientes)"
       Continuar
     }

  2. Ejecutar soborno:
     pagador.ducados -= 15
     unidad_enemiga.owner = pagador
     Registrar: "💰 [Pagador] sobornó [Unidad] de [Víctima]"

  3. La unidad mantiene su posición este turno (no puede recibir órdenes)
```

**IMPORTANTE:** Soborno es automático (sin tirada de dados), coste fijo 15 ducados.

#### PASO 2D: Otros Gastos Especiales

**Mitigación de Hambre:**
```javascript
Para cada pago de mitigación (3d por provincia):
  1. Validar fondos contra snapshot
  2. Retirar marcador de hambre
  3. Provincia produce ingresos normalmente en siguiente Primavera
```

**Reclutamiento de Unidades:**
```javascript
Para cada reclutamiento:
  1. Validar requisitos:
     - Ciudad pertenece al jugador
     - Ciudad tiene guarnición
     - Para Flota: Ciudad es puerto
  2. Validar fondos: Ejército/Flota 6d, Guarnición 3d
  3. Crear nueva unidad en ciudad
  4. Registrar: "[Jugador] reclutó [Tipo] en [Ciudad]"
```

---

### PASO 3: Resolución de Movimientos Simultáneos

#### PASO 3.1: Calcular Rutas de Convoy

```javascript
Para cada ejército con orden de convoy:
  1. Buscar ruta de flotas aliadas:
     - Todas las flotas deben tener orden "Convoy [Ejército]"
     - Deben formar cadena continua entre origen y destino
  2. Si ruta válida:
     convoy_válido = true
  3. Si no hay ruta:
     orden = "Mantener"
     Registrar: "❌ Convoy de [Ejército] falló (sin ruta)"
```

#### PASO 3.2: Identificar Ataques a Unidades de Apoyo

```javascript
Para cada unidad con orden "Apoyar":
  Para cada atacante:
    if (atacante.destino == unidad.provincia) {
      // Apoyo cancelado (cut support)
      Cancelar_Apoyo(unidad)
      Registrar: "⚠️ Apoyo de [Unidad] cancelado por ataque"
    }
```

**EXCEPCIÓN:** Apoyo NO se cancela si ataque viene desde la provincia apoyada:
```javascript
if (atacante.origen == unidad.apoyo_destino) {
  // No cancela (ataque desde donde está apoyando)
  continue
}
```

#### PASO 3.3: Calcular Fuerzas de Combate

```javascript
function Calcular_Fuerza(provincia, tipo) {
  let fuerza = 0

  if (tipo == "ATAQUE") {
    // Sumar atacantes
    Para cada unidad atacando provincia:
      fuerza += 1
    // Sumar apoyos válidos (no cancelados)
    Para cada unidad apoyando ataque:
      if (!apoyo_cancelado) fuerza += 1
  }

  if (tipo == "DEFENSA") {
    // SOLO unidades con orden "Mantener"
    Para cada unidad en provincia:
      if (unidad.orden == "Mantener" || unidad.orden == "Asediar") {
        fuerza += 1
      }
    // Sumar apoyos defensivos válidos
    Para cada unidad apoyando defensa:
      if (!apoyo_cancelado) fuerza += 1
  }

  return fuerza
}
```

**REGLA CRÍTICA:** Solo "Mantener" y "Asediar" defienden. Todas las demás órdenes (Avanzar, Apoyar, Convoy, Convertirse) NO defienden.

**Nota:** Ver [ordenes-militares.md](./ordenes-militares.md) para tabla completa de fuerza defensiva.

#### PASO 3.4: Resolver Batallas

```javascript
Para cada provincia disputada:
  let fuerza_ataque = Calcular_Fuerza(provincia, "ATAQUE")
  let fuerza_defensa = Calcular_Fuerza(provincia, "DEFENSA")

  if (fuerza_ataque > fuerza_defensa) {
    // Atacante gana
    Mover_Unidad_Atacante(provincia)
    Forzar_Retirada(defensor)
    Registrar: "🏆 [Atacante] conquistó [Provincia] ([fuerza_ataque] vs [fuerza_defensa])"
  }
  else if (fuerza_ataque == fuerza_defensa) {
    // Empate (Standoff)
    Nadie_Se_Mueve()
    Registrar: "⚔️ Empate en [Provincia] ([fuerza_ataque] vs [fuerza_defensa])"
  }
  else {
    // Defensa exitosa
    Atacante_Se_Queda()
    Registrar: "🛡️ [Defensor] defendió [Provincia] ([fuerza_defensa] vs [fuerza_ataque])"
  }
```

**CASO ESPECIAL: Provincia Vacía (fuerza 0)**
```javascript
if (fuerza_defensa == 0 && fuerza_ataque > 0) {
  if (num_atacantes == 1) {
    // Un solo atacante → Entra automáticamente
    Mover_Unidad(atacante, provincia)
  } else {
    // Múltiples atacantes con misma fuerza → Standoff
    if (Todos_Tienen_Misma_Fuerza()) {
      Nadie_Entra()
      Registrar: "⚔️ Empate múltiple en [Provincia] (vacía, varios atacantes)"
    } else {
      // Gana el de mayor fuerza
      Mover_Unidad(atacante_más_fuerte, provincia)
    }
  }
}
```

**Nota:** Ver [casos-limite.md](./casos-limite.md) para ejemplos de múltiples atacantes.

#### PASO 3.5: Movimientos a Territorio Propio

```javascript
if (destino.owner == unidad.owner && !hay_combate) {
  // Movimiento a territorio propio → Reposicionamiento
  Mover_Unidad(unidad, destino)
  Registrar: "[Unidad] se reposicionó a [Destino]"
}
```

---

### PASO 4: Retiradas

**Proceso:**
```javascript
Para cada unidad forzada a retirarse:
  1. Obtener lista de retirada del jugador:
     lista = ["Pisa", "Umbría", "Romaña"] // Orden de preferencia

  2. Para cada opción en lista:
     if (provincia_disponible && adyacente) {
       Mover_Unidad(unidad, provincia)
       Registrar: "[Unidad] se retiró a [Provincia]"
       break
     }

  3. Si ninguna opción disponible:
     Eliminar_Unidad(unidad)
     Registrar: "☠️ [Unidad] eliminada (sin opciones de retirada)"
```

**Lista de Retirada:**
- Se proporciona CON las órdenes al inicio de la Fase de Órdenes
- Formato: JSON array con orden de preferencia
- Ejemplo: `["Pisa", "Umbría", "Romaña"]`
- Si no se proporciona: Unidad eliminada si debe retirarse

**Nota:** Ver [casos-limite.md](./casos-limite.md) para formato detallado de lista de retirada.

---

### PASO 5: Asedios

**Contador de Asedio:**
```javascript
Para cada ciudad en el mapa:
  Para cada ejército/flota en provincia de ciudad:
    if (ejército.orden == "Asediar" && ejército.provincia == ciudad.provincia) {
      if (ejército == asediador_previo) {
        // Mismo asediador, incrementar contador
        ciudad.contador_asedio++

        if (ciudad.contador_asedio >= 2) {
          // Ciudad capturada
          Capturar_Ciudad(ciudad, ejército.owner)
          if (ciudad.guarnicion) {
            Eliminar_Unidad(ciudad.guarnicion)
          }
          ciudad.contador_asedio = 0
          Registrar: "🏰 [Ciudad] capturada por [Jugador] (asedio completado)"
        } else {
          Registrar: "⏳ [Ciudad] asediada ([contador]/2)"
        }
      } else {
        // Nuevo asediador, resetear contador
        ciudad.contador_asedio = 1
        ciudad.asediador = ejército
        Registrar: "⏳ [Ejército] inició asedio de [Ciudad] (1/2)"
      }
    }

  // Si no hay asediadores, resetear contador
  if (!hay_asediadores) {
    ciudad.contador_asedio = 0
    ciudad.asediador = null
  }
```

**IMPORTANTE:**
- Contador es POR CIUDAD (no por unidad)
- Se requiere el MISMO asediador 2 turnos consecutivos
- Si el asediador se mueve o es eliminado → Contador se resetea
- Múltiples unidades asediando NO aceleran el proceso (cuenta solo una como "principal")

**Captura de Ciudad Sin Guarnición:**
```javascript
if (ejército.provincia == ciudad.provincia && !ciudad.guarnicion && !en_combate) {
  // Ciudad sin guarnición se captura automáticamente
  Capturar_Ciudad(ciudad, ejército.owner)
  Registrar: "🏰 [Ciudad] capturada automáticamente (sin guarnición)"
}
```

**Nota:** Ver [casos-limite.md](./casos-limite.md) para ejemplos de contador de asedio con múltiples asediadores.

---

### PASO 6: Conversiones de Unidades

**Proceso:**
```javascript
Para cada unidad con orden "Convertirse":
  1. Validar requisitos:
     - Flota → Ejército: Debe estar en provincia puerto
     - Ejército → Flota: Debe estar en provincia puerto
     - Guarnición → Ejército: Siempre válido

  2. Si válido:
     Cambiar_Tipo_Unidad(unidad, nuevo_tipo)
     Registrar: "[Unidad] se convirtió a [Nuevo Tipo]"

  3. Si inválido:
     // Orden ignorada, unidad mantiene tipo
     Registrar: "❌ Conversión fallida ([razón])"
```

**Timing:** Conversiones ocurren DESPUÉS de movimientos, ANTES de asedios.

**Fuerza Defensiva:** Unidades con orden "Convertirse" SÍ defienden con fuerza 1 (cambio de regla para mayor lógica).

---

### PASO 7: Actualización del Estado del Juego

**Proceso:**
```javascript
1. Actualizar posiciones de todas las unidades
2. Actualizar ciudades controladas por cada jugador
3. Eliminar unidades destruidas/sin retirada
4. Actualizar tesorería (ya modificada en Paso 2)
5. Guardar estado en Firestore
```

---

### PASO 8: Registro del Turno (Historial)

**Formato del Historial:**
```json
{
  "turnNumber": 5,
  "season": "Verano",
  "year": 1455,
  "events": [
    {
      "type": "transfer",
      "from": "Florencia",
      "to": "Venecia",
      "amount": 10,
      "success": true
    },
    {
      "type": "battle",
      "province": "Módena",
      "attacker": "Florencia",
      "defender": "Milán",
      "attackForce": 2,
      "defenseForce": 1,
      "result": "attacker_wins"
    },
    // ...
  ],
  "summary": {
    "conquests": ["Módena → Florencia"],
    "retreats": ["Ejército 1 de Milán → Mantua"],
    "eliminations": [],
    "siegesCompleted": []
  }
}
```

**Visualización:** Ver [sistema-transferencias.md](./sistema-transferencias.md) para detalles de UI

---

### PASO 9: Avance al Siguiente Turno

**Proceso:**
```javascript
1. Incrementar turnNumber
2. Cambiar currentPhase a 'diplomatic'
3. Calcular siguiente estación:
   Primavera → Verano → Otoño → Primavera (año++)
4. Establecer phaseDeadline (fecha_actual + duración_configurada)
5. Actualizar phaseStartedAt con timestamp actual
6. Resetear hasSubmittedOrders de todos a false
7. Enviar email de notificación a todos los jugadores
```

**Verificar Eliminación de Jugadores:**
```javascript
if (currentSeason == "Primavera" && después_de_mantenimiento) {
  Para cada jugador:
    if (jugador.ciudades_controladas == 0) {
      Eliminar_Jugador(jugador)
      Invalidar_Fichas_Asesinato(jugador)
      Convertir_Territorios_A_Neutral(jugador)
      Registrar: "☠️ [Jugador] ha sido eliminado del juego"
    }
}
```

**Nota:** Ver [casos-limite.md](./casos-limite.md) para detalles de jugador eliminado y territorios neutrales.

---

## Referencias

- **Visión General:** Ver [fases-overview.md](./fases-overview.md)
- **Órdenes Militares:** Ver [ordenes-militares.md](./ordenes-militares.md)
- **Eventos Especiales:** Ver [eventos-especiales.md](./eventos-especiales.md)
- **Casos Límite:** Ver [casos-limite.md](./casos-limite.md)
- **Ejemplo Completo:** Ver [ejemplo-turno.md](./ejemplo-turno.md)
- **Database:** Ver [database.md](./database.md) para estructura Firestore
- **Arquitectura:** Ver [arquitectura.md](./arquitectura.md) para flujo técnico
