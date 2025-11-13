# Sistema de Fases y Resolución de Turnos - Machiavelli (VERSIÓN CORREGIDA)

## Visión General

El juego se desarrolla en ciclos de turnos con fases bien definidas. El sistema utiliza un **modelo asíncrono basado en deadlines temporales**, donde los jugadores NO necesitan estar conectados simultáneamente.

---

## 1. ORDEN COMPLETO DE FASES (TIMING DEFINITIVO)

### Estructura de un Turno Completo

**ORDEN NUMERADO (sin ambigüedad):**

1. **Fase de Eventos** (solo turnos específicos)
2. **Fase de Mantenimiento** (solo Primavera)
3. **Fase Diplomática** (todos los turnos)
4. **Fase de Órdenes** (todos los turnos)
5. **Fase de Resolución** (todos los turnos)
6. **Verificación de Victoria** (todos los turnos de Otoño)

### IMPORTANTE: Orden para Primavera con Hambre

**Turno de Primavera (Ejemplo):**
```
1. EVENTOS: Hambre aparece → Marcadores colocados
2. MANTENIMIENTO:
   a. Calcular ingresos (ciudades sin hambre producen)
   b. Pagar mantenimiento de tropas
   c. Licenciar si fondos insuficientes
3. ELIMINACIÓN POR HAMBRE: Unidades en provincias con hambre eliminadas
4. DIPLOMÁTICA: Jugadores negocian (48h)
5. ÓRDENES: Jugadores dan órdenes (48h)
6. RESOLUCIÓN: Ejecución automática
```

**CLARIFICACIÓN CRÍTICA:**
- Hambre aparece ANTES del mantenimiento (Paso 1)
- Ingresos se calculan DURANTE mantenimiento (Paso 2a)
- Provincias con hambre NO producen ingresos (Paso 2a)
- Unidades se eliminan DESPUÉS del mantenimiento (Paso 3)
- **Consecuencia:** Pagas mantenimiento de tropas que luego mueren
- **Mitigación:** Puedes pagar 3d por provincia durante Fase de Órdenes del turno ANTERIOR para prevenir

---

## 2. FASE DIPLOMÁTICA (Todos los turnos)

**Duración:** Configurable (por defecto 48 horas)

**Inicio:**
- Email automático a todos los jugadores
- Contador regresivo visible en interfaz
- Mensaje: "Nueva fase diplomática - Deadline: [Fecha/Hora]"

**Actividades:**
- Enviar/recibir mensajes diplomáticos privados
- Negociar alianzas, traiciones, acuerdos económicos
- Planificar estrategia para el próximo turno
- Consultar estado actual del mapa y tesorería

**Fin:**
- Automático al expirar deadline
- NO hay botón "Listo" o "Completar"
- Cloud Scheduler detecta expiración → Cambia a Fase de Órdenes

**Importante:**
- Los jugadores pueden entrar/salir en cualquier momento
- No se requiere estar conectado simultáneamente
- Mensajes quedan registrados aunque el destinatario esté offline

---

## 3. FASE DE ÓRDENES (Todos los turnos)

**Duración:** Configurable (por defecto 48 horas)

**Inicio:**
- Email automático: "Fase de Órdenes iniciada - Envía tus órdenes"
- Contador regresivo visible

**Actividades:**
- Introducir órdenes militares para TODAS las unidades
- Especificar lista de retirada (ver sección 9.1)
- Programar gastos especiales:
  - Transferencias de ducados
  - Asesinatos (si aplica)
  - Sobornos (si aplica)
  - Mitigación de Hambre (3d por provincia)
  - Reclutamiento de nuevas unidades

**Modificación de Órdenes:**
- Se pueden cambiar cuantas veces se quiera antes del deadline
- Solo la última versión se ejecuta
- Estado visible: "Borrador guardado"

**Fin:**
- Automático al expirar deadline
- Cloud Scheduler dispara Fase de Resolución

**Órdenes no enviadas:**
- Si jugador no envía órdenes → Todas sus unidades ejecutan "Mantener"
- Se registra en historial: "[Jugador] no envió órdenes (inactivo)"

---

## 4. FASE DE RESOLUCIÓN (Automática)

**Duración:** Variable (~5-30 minutos según complejidad)

**Sin intervención de jugadores:** Cloud Function ejecuta toda la lógica

### 4.1. PASO 1: Validación de Órdenes

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

### 4.2. PASO 2: Procesamiento Económico y Gastos Especiales

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

### 4.3. PASO 3: Resolución de Movimientos Simultáneos

#### Algoritmo de Resolución

**PASO 3.1: Calcular Rutas de Convoy**
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

**PASO 3.2: Identificar Ataques a Unidades de Apoyo**
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

**PASO 3.3: Calcular Fuerzas de Combate**
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

**PASO 3.4: Resolver Batallas**
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

**PASO 3.5: Movimientos a Territorio Propio**
```javascript
if (destino.owner == unidad.owner && !hay_combate) {
  // Movimiento a territorio propio → Reposicionamiento
  Mover_Unidad(unidad, destino)
  Registrar: "[Unidad] se reposicionó a [Destino]"
}
```

---

### 4.4. PASO 4: Retiradas

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

---

### 4.5. PASO 5: Asedios

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

---

### 4.6. PASO 6: Conversiones de Unidades

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

### 4.7. PASO 7: Actualización del Estado del Juego

**Proceso:**
```javascript
1. Actualizar posiciones de todas las unidades
2. Actualizar ciudades controladas por cada jugador
3. Eliminar unidades destruidas/sin retirada
4. Actualizar tesorería (ya modificada en Paso 2)
5. Guardar estado en Firestore
```

---

### 4.8. PASO 8: Registro del Turno (Historial)

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

**Visualización:** Ver sistema-transferencias.md para detalles de UI

---

### 4.9. PASO 9: Avance al Siguiente Turno

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

---

## 5. EVENTOS ESPECIALES (Reglas Opcionales)

### 5.1. Hambre (Famine) - Solo Primavera

**Cuándo Ocurre:** Fase de Eventos (Paso 1), solo en Primavera

**Probabilidad:** 1d6 por cada 5 provincias terrestres
- 1-2: Ninguna hambre
- 3-4: 1 provincia afectada
- 5-6: 2 provincias afectadas

**Selección Aleatoria:** Tirar dado para determinar qué provincia(s)

**Efectos:**
```javascript
1. Colocar marcador de Hambre en provincia
2. INMEDIATO: Provincia NO produce ingresos en mantenimiento de este turno
3. DESPUÉS DE MANTENIMIENTO: Todas las unidades en provincia eliminadas
4. Reclutamiento bloqueado en provincia hasta que se retire marcador
```

**Mitigación (Preventiva):**
```javascript
Durante Fase de Órdenes del turno ANTERIOR:
  jugador.gastos.push({
    type: "prevent_famine",
    province: "Toscana",
    cost: 3
  })

Durante Resolución (Paso 2D):
  if (jugador pagó 3d) {
    No_Colocar_Marcador(provincia)
    // O retirarlo si ya estaba
  }
```

**Duración:** Marcador se retira automáticamente en siguiente Verano (Fase de Eventos)

**Estrategia:** Pagar 3d para prevenir puede valer la pena si:
- Ciudad rica (5d) en provincia
- Múltiples unidades costosas (3d cada una)
- Provincia estratégicamente crítica

---

### 5.2. Peste (Plague) - Solo Verano

**Cuándo Ocurre:** Fase de Eventos (Paso 1), solo en Verano

**Probabilidad:** 1d6
- 1-4: Sin peste
- 5-6: Peste aparece (tirar otra vez para determinar provincia)

**Efectos (Instantáneos):**
```javascript
1. TODAS las unidades en provincia afectada eliminadas inmediatamente
   - Ejércitos eliminados
   - Flotas eliminadas
   - Guarniciones eliminadas (ciudades quedan indefensas)

2. NO hay marcador persistente

3. Unidades que entren DESPUÉS en el turno NO son afectadas
```

**Mitigación:** NINGUNA (evento instantáneo e inevitable)

**Impacto:** Muy severo, puede cambiar el curso del juego

**Nota de Balance:** Considerar desactivar Peste en partidas competitivas o reducir probabilidad (solo 6 en lugar de 5-6)

---

### 5.3. Asesinato (Assassination) - Juego Avanzado

**Costes y Probabilidades (Reducidos para mejor balance):**
| Inversión | Números Elegidos | Probabilidad | Coste Anterior |
|-----------|------------------|--------------|----------------|
| 6 ducados | 1 número (1-6) | 16.7% | 12d |
| 12 ducados | 2 números | 33.3% | 24d |
| 18 ducados | 3 números | 50.0% | 36d |

**Fichas de Asesinato:**
- Cada jugador recibe 1 ficha del color de cada rival al inicio
- Partida 6 jugadores = 5 fichas por jugador
- Fichas se consumen al USAR (no al fallar por fondos insuficientes)
- NO se recuperan nunca
- Si jugador es eliminado, sus fichas en posesión de otros se invalidan

**Proceso:**
```javascript
// Durante Fase de Órdenes
jugador.gastos.push({
  type: "assassination",
  target: "Florencia",
  amount: 18, // 6, 12 o 18
  numbers: [2, 4, 6] // Números elegidos según inversión
})

// Durante Resolución (Paso 2B)
1. Validar fondos contra snapshot
2. Si insuficiente → NO consumir ficha, asesinato cancelado
3. Si suficiente:
   - Consumir ducados
   - Consumir ficha (permanente)
   - Lanzar 1d6
   - Si resultado in números elegidos → Éxito
   - Si no → Fallo (dinero y ficha perdidos)
```

**Efectos de Éxito:**
```javascript
1. Parálisis Militar (este turno):
   - Todas las órdenes de víctima cambian a "Mantener"
   - NO puede atacar ni apoyar

2. Guarniciones Asediadas Eliminadas:
   - Si guarnición tiene contador_asedio >= 1 → Eliminada
   - Ciudad queda sin defensa

3. Asedios NO avanzan:
   - Contador de asedio de víctima no incrementa este turno
```

**NO HAY:**
- ❌ Sistema de rebeliones aleatorias (eliminado por complejidad)
- ❌ Eliminación permanente del jugador
- ❌ Múltiples turnos de parálisis (solo 1 turno)

**Momento de Ejecución:** Paso 2B (después de transferencias, antes de movimientos)

---

## 6. ÓRDENES MILITARES DETALLADAS

### 6.1. Mantener (Hold)

**Sintaxis:** `"Mantener"` o `"H"`

**Efecto:**
- Unidad permanece en su provincia
- **Defiende con fuerza 1**
- Es la ÚNICA orden que proporciona fuerza defensiva

**Uso Estratégico:**
- Defender territorios clave
- Siempre dejar al menos 1 unidad en "Mantener" en provincias importantes
- Default si no se envían órdenes

---

### 6.2. Avanzar (Attack/Move)

**Sintaxis:** `"Avanzar a [Provincia]"` o `"A [Provincia]"` o `"→ [Provincia]"`

**Efecto:**
- Unidad intenta moverse a provincia adyacente
- **NO defiende provincia actual** (fuerza 0)
- Si hay combate: Participa con fuerza 1

**Movimiento a Territorio Propio:**
```javascript
if (destino.owner == unidad.owner) {
  // Reposicionamiento táctico (válido)
  if (!hay_combate_en_destino) {
    Mover_Automáticamente()
  } else {
    // Si otro ataca ese territorio, se resuelve como batalla normal
    Resolver_Como_Combate()
  }
}
```

**Restricciones:**
- Ejércitos: Solo provincias terrestres adyacentes (o convoy)
- Flotas: Solo zonas marítimas o puertos adyacentes
- Guarniciones: NO pueden moverse nunca

---

### 6.3. Apoyar (Support)

**Sintaxis:** `"Apoyar a [Unidad]"` o `"S [Unidad]"`

**Tipos (Automático según contexto):**

**Apoyo Ofensivo:**
```javascript
if (unidad_apoyada.orden == "Avanzar") {
  // Apoyo al ataque
  agregar_fuerza_al_atacante()
}
```

**Apoyo Defensivo:**
```javascript
if (unidad_apoyada.orden == "Mantener" || unidad_apoyada.orden == "Asediar") {
  // Apoyo a la defensa
  agregar_fuerza_al_defensor()
}
```

**Requisitos:**
- La unidad que apoya debe poder alcanzar la provincia objetivo (adyacencia)
- Puede apoyar unidades propias o aliadas

**Cancelación de Apoyo (Cut Support):**
```javascript
if (atacante.destino == unidad_apoyo.provincia) {
  if (atacante.origen != provincia_apoyada) {
    // Apoyo CANCELADO
    apoyo.válido = false
  }
}
```

**EXCEPCIÓN:** Apoyo NO se cancela si ataque viene desde la provincia apoyada

**Fuerza Defensiva:** NO defiende (fuerza 0 en su propia provincia)

---

### 6.4. Convoy (Transport)

**Sintaxis:** `"Convoy [Ejército]"` o `"C [Ejército]"`

**Solo para Flotas**

**Requisitos:**
- Debe haber ruta continua de flotas aliadas desde origen a destino del ejército
- Cada flota en la ruta debe tener orden "Convoy [mismo ejército]"
- Origen y destino deben ser provincias costeras

**Ejemplo:**
```
Ejército 1 en Toscana → Avanzar a Córcega (via convoy)
Flota 1 en Mar de Liguria → Convoy Ejército 1
Flota 2 en Mar Tirreno → Convoy Ejército 1

Ruta válida: Toscana → Mar Liguria → Mar Tirreno → Córcega ✓
```

**Cancelación de Convoy:**
```javascript
if (atacante.destino == flota_convoy.provincia) {
  // Convoy cancelado (similar a cut support)
  convoy.válido = false
  ejército.orden = "Mantener" // Ejército no se mueve
}
```

**Algoritmo de Ruta:**
```javascript
function Calcular_Ruta_Convoy(ejército) {
  // Búsqueda en amplitud (BFS) para encontrar ruta de flotas
  let ruta = BFS(origen, destino, flotas_con_orden_convoy)
  if (ruta.exists) {
    return ruta
  } else {
    return null // Convoy falla
  }
}
```

**Fuerza Defensiva:** NO defiende (fuerza 0)

---

### 6.5. Asediar (Siege)

**Sintaxis:** `"Asediar [Ciudad]"` o `"Asedio [Ciudad]"`

**Requisitos:**
- Unidad debe estar en la provincia de la ciudad
- Solo Ejércitos y Flotas (en puertos)

**Mecánica:**
```javascript
Turno 1: Asediar Florencia → Contador 1/2
Turno 2: (Mismo asediador) Asediar Florencia → Contador 2/2 → CAPTURADA

Si en Turno 2 el asediador cambia:
  Nuevo asediador → Contador resetea a 1/2
```

**Fuerza Defensiva:** SÍ defiende la provincia con fuerza 1 (puede repeler ataques mientras asedia)

**Interrupción:**
- Si asediador se mueve → Contador resetea a 0
- Si asediador es eliminado → Contador resetea a 0
- Si guarnición es reforzada (nueva guarnición reclutada) → Contador resetea a 0

---

### 6.6. Convertirse (Convert)

**Sintaxis:** `"Convertirse a [Tipo]"` o `"Convert [Tipo]"`

**Conversiones Permitidas:**
| Desde | Hacia | Requisito |
|-------|-------|-----------|
| Flota | Ejército | Provincia puerto |
| Ejército | Flota | Provincia puerto |
| Guarnición | Ejército | Siempre (en ciudad) |

**Timing:** Después de movimientos, antes de asedios (Paso 6)

**Fuerza Defensiva:** SÍ defiende con fuerza 1 (cambio de regla para mayor lógica táctica)

**Uso Estratégico:**
- Flota → Ejército: Para asediar ciudad costera
- Guarnición → Ejército: Para abandonar ciudad y atacar

**Restricciones:**
- NO se puede Ejército → Guarnición (solo reclutas nueva)
- Conversión tarda 1 turno completo

---

## 7. TABLA RESUMEN DE FUERZA DEFENSIVA

| Orden | ¿Defiende? | Fuerza Defensiva | Notas |
|-------|-----------|------------------|-------|
| **Mantener** | ✅ SÍ | 1 | Única orden puramente defensiva |
| **Avanzar** | ❌ NO | 0 | Unidad está saliendo |
| **Apoyar** | ❌ NO | 0 | Concentrada en apoyar |
| **Convoy** | ❌ NO | 0 | Ocupada transportando |
| **Asediar** | ✅ SÍ | 1 | Defiende mientras asedia |
| **Convertirse** | ✅ SÍ | 1 | Cambio de regla (lógico) |

---

## 8. MANEJO DE JUGADORES INACTIVOS

### 8.1. Primer Turno Sin Órdenes

**Comportamiento:**
```javascript
if (!jugador.hasSubmittedOrders && deadline_expirado) {
  // Todas las unidades → Mantener
  Para cada unidad de jugador:
    unidad.orden = "Mantener"

  Registrar: "⚠️ [Jugador] no envió órdenes (inactivo)"
  Enviar_Email_Advertencia(jugador)
}
```

**Email de Advertencia:**
```
Asunto: [Machiavelli] No enviaste órdenes - Italia 1454

Has faltado al turno. Todas tus unidades mantuvieron posición.

ADVERTENCIA: Si faltas a 3 turnos consecutivos, puedes ser marcado
como inactivo y reemplazado por otro jugador.

Próximo deadline: [Fecha/Hora]
[Botón: Volver al Juego]
```

---

### 8.2. Segundo Turno Sin Órdenes

**Comportamiento:**
```javascript
jugador.inactivity_strikes = 2
Enviar_Email_Advertencia_Final(jugador)
Notificar_Otros_Jugadores("[Jugador] lleva 2 turnos inactivo")
```

---

### 8.3. Tercer Turno Sin Órdenes

**Comportamiento:**
```javascript
jugador.status = "inactive"
Permitir_Votación_Reemplazo()
```

**Opciones:**
1. **Modo IA básica:** Todas las unidades mantienen (automático)
2. **Reemplazo:** Nuevo jugador puede unirse y tomar control
3. **Eliminación:** Si mayoría de jugadores vota, se elimina

---

### 8.4. Transferencias a Jugadores Inactivos

**Comportamiento:**
```javascript
if (receptor.status == "inactive" && transferencia) {
  // Transferencia se procesa normalmente
  receptor.ducados += cantidad
  Registrar: "💰 [Emisor] transfirió [cantidad]d a [Receptor] (inactivo)"
  // El dinero queda en la cuenta del inactivo
}
```

**Rationale:** No se penaliza al emisor por inactividad del receptor.

---

## 9. CASOS LÍMITE RESUELTOS

### 9.1. Formato de Lista de Retirada

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

**Sin lista proporcionada:**
```javascript
if (!retreatList[unidad] && debe_retirarse) {
  Eliminar_Unidad(unidad)
  Registrar: "☠️ [Unidad] eliminada (sin lista de retirada)"
}
```

---

### 9.2. Múltiples Atacantes a Provincia Vacía

**Algoritmo:**
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

---

### 9.3. Contador de Asedio con Múltiples Asediadores

**Regla:**
```javascript
// Solo UNA unidad puede ser el "asediador principal"
// Se elige la primera que dio orden de asedio

if (múltiples_unidades_asediando) {
  let principal = primera_unidad_con_orden_asedio
  ciudad.asediador = principal
  ciudad.contador_asedio++ // Solo cuenta una vez
}
```

---

### 9.4. Transferencias Circulares con Snapshot

**Ejemplo:**
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

---

### 9.5. Jugador Eliminado - Territorios Neutrales

**Proceso:**
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

**Captura de Territorios Neutrales:**
```javascript
if (provincia.owner == null && unidad.entra) {
  provincia.owner = unidad.owner
  if (provincia.ciudad) {
    // Ciudad neutral capturada automáticamente
    Capturar_Ciudad(provincia.ciudad, unidad.owner)
  }
}
```

---

## 10. Ejemplo Completo de Turno

### Turno 4 - Verano 1455

**PASO 1: EVENTOS (5 segundos)**
```
Tirada de Peste: 3 → Sin Peste
```

**PASO 2A: TRANSFERENCIAS (1 segundo)**
```
Snapshot de fondos:
  Florencia: 18d, Venecia: 25d, Milán: 12d

Procesando transferencias:
  ✅ Florencia → Venecia: 10d (18 >= 10)
  ❌ Milán → Florencia: 15d (12 < 15) FALLO

Resultado:
  Florencia: 18 - 10 = 8d
  Venecia: 25 + 10 = 35d
  Milán: 12d (sin cambios)
```

**PASO 2B: ASESINATOS (2 segundos)**
```
Venecia intenta asesinar Florencia:
  Coste: 12d (2 números)
  Validación: 25d >= 12d ✓
  Números elegidos: [3, 5]
  Tirada: 4 → ❌ FALLO

  Venecia: 35 - 12 = 23d
  Ficha consumida (perdida permanentemente)
```

**PASO 3: RESOLUCIÓN MOVIMIENTOS (10 segundos)**

**Órdenes:**
```
FLORENCIA:
  Ejército 1 (Toscana) → Avanzar a Módena
  Ejército 2 (Umbría) → Apoyar Ejército 1

VENECIA:
  Ejército 1 (Véneto) → Avanzar a Módena
  Ejército 2 (Romaña) → Mantener

MILÁN:
  Ejército 1 (Módena) → Mantener
  Ejército 2 (Lombardía) → Apoyar Ejército 1
```

**Cálculo de Fuerzas en Módena:**
```
Atacante Florencia: 1 + 1 apoyo = 2
Atacante Venecia: 1 (sin apoyo) = 1
Defensor Milán: 1 + 1 apoyo = 2

Florencia (2) vs Milán (2) → EMPATE (standoff)
Venecia (1) no puede entrar (fuerza insuficiente)

Resultado: Nadie se mueve, todos permanecen en posición
```

**PASO 4: RETIRADAS** → No hay (nadie perdió batalla)

**PASO 5: ASEDIOS** → No hay órdenes de asedio

**PASO 6: CONVERSIONES** → No hay órdenes de conversión

**PASO 7: ACTUALIZAR ESTADO**
```
Posiciones finales: Sin cambios
Ciudades controladas: Sin cambios
```

**PASO 8: REGISTRO HISTORIAL**
```json
{
  "turnNumber": 4,
  "season": "Verano",
  "events": [
    {"type": "transfer", "from": "Florencia", "to": "Venecia", "amount": 10, "success": true},
    {"type": "transfer", "from": "Milán", "to": "Florencia", "amount": 15, "success": false},
    {"type": "assassination", "attacker": "Venecia", "target": "Florencia", "success": false},
    {"type": "battle", "province": "Módena", "result": "standoff", "forces": {"Florencia": 2, "Venecia": 1, "Milán": 2}}
  ]
}
```

**PASO 9: AVANZAR TURNO**
```
turnNumber: 4 → 5
currentPhase: 'resolution' → 'diplomatic'
season: 'Verano' → 'Otoño'
phaseDeadline: now + 48h

Email enviado: "Turno 4 resuelto. Nueva fase diplomática iniciada."
```

---

## 11. Referencias

- **Escenarios:** Ver [escenarios.md](./escenarios.md) para configuración Italia 1454
- **Glosario:** Ver [glosario.md](./glosario.md) para términos oficiales
- **Database:** Ver [database.md](./database.md) para estructura Firestore
- **Transferencias:** Ver [sistema-transferencias.md](./sistema-transferencias.md) para UI
- **Arquitectura:** Ver [arquitectura.md](./arquitectura.md) para flujo técnico
