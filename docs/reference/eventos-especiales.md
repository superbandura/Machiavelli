# Eventos Especiales (Reglas Opcionales)

## Introducción

Los eventos especiales son mecánicas opcionales que añaden variabilidad y desafíos estratégicos al juego. Pueden activarse o desactivarse al configurar una partida.

---

## 1. Hambre (Famine)

### Cuándo Ocurre
- **Solo en Primavera**
- Durante la Fase de Eventos (Paso 1)
- Antes del mantenimiento

### Probabilidad
1d6 por cada 5 provincias terrestres:
- **1-2:** Ninguna hambre
- **3-4:** 1 provincia afectada
- **5-6:** 2 provincias afectadas

### Selección de Provincias
Tirar dado para determinar aleatoriamente qué provincia(s) son afectadas.

### Efectos

**1. Efecto Inmediato en Ingresos:**
```javascript
1. Colocar marcador de Hambre en provincia
2. INMEDIATO: Provincia NO produce ingresos en mantenimiento de este turno
3. DESPUÉS DE MANTENIMIENTO: Todas las unidades en provincia eliminadas
4. Reclutamiento bloqueado en provincia hasta que se retire marcador
```

**Orden de Aplicación (Primavera):**
```
1. EVENTOS: Hambre aparece → Marcadores colocados
2. MANTENIMIENTO:
   a. Calcular ingresos (provincias con hambre NO producen)
   b. Pagar mantenimiento de tropas
   c. Licenciar si fondos insuficientes
3. ELIMINACIÓN: Unidades en provincias con hambre eliminadas
```

**IMPORTANTE:** Pagas mantenimiento de tropas que luego mueren por hambre.

### Mitigación (Preventiva)

**Proceso:**
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

**Coste:** 3 ducados por provincia

**Timing:** Debe hacerse en el turno ANTERIOR a la Primavera

### Duración
Marcador se retira automáticamente en siguiente Verano (Fase de Eventos)

### Estrategia
Pagar 3d para prevenir puede valer la pena si:
- Ciudad rica (5d) en provincia
- Múltiples unidades costosas (3d cada una de mantenimiento)
- Provincia estratégicamente crítica

### Ejemplo
```
Turno 2 - Otoño 1454:
  Florencia paga 3d para prevenir hambre en Toscana

Turno 3 - Primavera 1455:
  Hambre aparece (tirada: 4 → 1 provincia)
  Provincia seleccionada: Toscana
  Florencia había pagado 3d → Marcador NO se coloca
  Toscana produce ingresos normalmente
```

---

## 2. Peste (Plague)

### Cuándo Ocurre
- **Solo en Verano**
- Durante la Fase de Eventos (Paso 1)

### Probabilidad
1d6:
- **1-4:** Sin peste
- **5-6:** Peste aparece (tirar otra vez para determinar provincia)

### Efectos (Instantáneos)

```javascript
1. TODAS las unidades en provincia afectada eliminadas inmediatamente
   - Ejércitos eliminados
   - Flotas eliminadas
   - Guarniciones eliminadas (ciudades quedan indefensas)

2. NO hay marcador persistente

3. Unidades que entren DESPUÉS en el turno NO son afectadas
```

### Mitigación
**NINGUNA** - Evento instantáneo e inevitable

### Impacto
Muy severo, puede cambiar drásticamente el curso del juego.

### Nota de Balance
Considerar desactivar Peste en partidas competitivas o reducir probabilidad (solo 6 en lugar de 5-6).

### Ejemplo
```
Turno 4 - Verano 1455:
  Tirada de Peste: 6 → Peste aparece
  Provincia seleccionada: Módena

  Unidades en Módena antes:
    - Ejército 1 de Milán
    - Ejército 2 de Milán
    - Guarnición de Módena

  Resultado:
    - Todas las unidades eliminadas
    - Módena queda sin guarnición (vulnerable)
    - Cualquier unidad puede capturarla este turno
```

---

## 3. Asesinato (Assassination) - Juego Avanzado

### Costes y Probabilidades

| Inversión | Números Elegidos | Probabilidad | Coste Anterior |
|-----------|------------------|--------------|----------------|
| 6 ducados | 1 número (1-6) | 16.7% | 12d |
| 12 ducados | 2 números | 33.3% | 24d |
| 18 ducados | 3 números | 50.0% | 36d |

**Nota:** Los costes han sido reducidos para mejor balance del juego.

### Fichas de Asesinato

**Sistema:**
- Cada jugador recibe **1 ficha del color de cada rival** al inicio
- Partida 6 jugadores = 5 fichas por jugador
- Fichas se consumen al USAR (no al fallar por fondos insuficientes)
- NO se recuperan nunca
- Si jugador es eliminado, sus fichas en posesión de otros se invalidan

**Ejemplo:**
```
Florencia tiene 5 fichas al inicio:
  - 1 ficha de Venecia
  - 1 ficha de Milán
  - 1 ficha del Papado
  - 1 ficha de Nápoles
  - 1 ficha de Génova

Florencia usa ficha de Venecia (intento de asesinato)
→ Ficha consumida, nunca se recupera
→ Florencia solo puede intentar asesinar a Venecia 1 vez en toda la partida
```

### Proceso de Asesinato

**Durante Fase de Órdenes:**
```javascript
jugador.gastos.push({
  type: "assassination",
  target: "Florencia",
  amount: 18, // 6, 12 o 18
  numbers: [2, 4, 6] // Números elegidos según inversión
})
```

**Durante Resolución (Paso 2B):**
```javascript
1. Validar fondos contra snapshot
2. Si insuficiente → NO consumir ficha, asesinato cancelado
3. Si suficiente:
   - Consumir ducados
   - Consumir ficha (permanente)
   - Lanzar 1d6
   - Si resultado in números elegidos → Éxito
   - Si no → Fallo (dinero y ficha perdidos)
```

### Efectos de Asesinato Exitoso

```javascript
function Ejecutar_Efectos_Asesinato(víctima) {
  1. Parálisis Militar (este turno):
     - Todas las órdenes de víctima cambian a "Mantener"
     - NO puede atacar ni apoyar

  2. Guarniciones Asediadas Eliminadas:
     - Si guarnición tiene contador_asedio >= 1 → Eliminada
     - Ciudad queda sin defensa

  3. Asedios NO avanzan:
     - Contador de asedio de víctima no incrementa este turno

  4. Registrar:
     "☠️ [Víctima] ha sido asesinado!"
     "⚠️ Todas sus unidades mantienen posición este turno"
}
```

### Efectos de Asesinato Fallido

```javascript
1. Ducados perdidos
2. Ficha consumida (perdida para siempre)
3. Registro: "❌ Asesinato de [Víctima] falló (dado: [resultado])"
4. Víctima NO es notificada del intento (secreto)
```

### LO QUE NO HAY

**ELIMINADO por complejidad:**
- ❌ Sistema de rebeliones aleatorias
- ❌ Eliminación permanente del jugador
- ❌ Múltiples turnos de parálisis (solo 1 turno)

### Momento de Ejecución
Paso 2B de la Fase de Resolución (después de transferencias, antes de movimientos)

### Ejemplo Completo

```
Turno 5 - Verano 1455

Fase de Órdenes:
  Venecia programa asesinato de Florencia:
    - Inversión: 12 ducados
    - Números elegidos: [3, 5]
    - Ficha de Florencia consumida

Fase de Resolución - Paso 2B:
  Snapshot: Venecia tiene 25d
  Validación: 25d >= 12d ✓

  Tirada: 1d6 = 5 → ¡ÉXITO!

  Efectos:
    - Todas las unidades de Florencia → "Mantener"
    - Guarnición de Florencia (asediada, contador=1) → Eliminada
    - Florencia no puede atacar este turno

Resultado:
  Venecia: 25 - 12 = 13d
  Florencia: Paralizada este turno
  Historial: "☠️ Florencia ha sido asesinada!"
```

---

## Configuración de Eventos

### Al Crear Partida

Los eventos se pueden activar/desactivar individualmente:

```javascript
{
  "gameSettings": {
    "events": {
      "famine": true,     // Hambre activa
      "plague": false,    // Peste desactivada
      "assassination": true // Asesinato activo
    }
  }
}
```

### Recomendaciones

**Partidas Casuales:**
- Hambre: ✅ Activada (añade estrategia)
- Peste: ❌ Desactivada (muy aleatoria)
- Asesinato: ✅ Activada (añade intriga)

**Partidas Competitivas:**
- Hambre: ✅ Activada (puede mitigarse)
- Peste: ❌ Desactivada (demasiado aleatoria)
- Asesinato: ⚠️ Opcional (añade suerte, pero es costoso)

---

## Referencias

- **Fase de Órdenes:** Ver [fase-ordenes.md](./fase-ordenes.md) para programar gastos
- **Fase de Resolución:** Ver [fase-resolucion.md](./fase-resolucion.md) para ejecución
- **Visión General:** Ver [fases-overview.md](./fases-overview.md) para orden de eventos
- **Ejemplo Completo:** Ver [ejemplo-turno.md](./ejemplo-turno.md)
