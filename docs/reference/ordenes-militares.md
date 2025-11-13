# Órdenes Militares Detalladas

## Introducción

Este documento describe todas las órdenes militares disponibles en el juego, sus sintaxis, efectos, y uso estratégico.

---

## 1. Mantener (Hold)

**Sintaxis:** `"Mantener"` o `"H"`

**Efecto:**
- Unidad permanece en su provincia
- **Defiende con fuerza 1**
- Es la ÚNICA orden que proporciona fuerza defensiva pura

**Uso Estratégico:**
- Defender territorios clave
- Siempre dejar al menos 1 unidad en "Mantener" en provincias importantes
- Default si no se envían órdenes

**Ejemplo:**
```
Ejército 1 en Toscana → "Mantener"
Resultado: Permanece en Toscana, defiende con fuerza 1
```

---

## 2. Avanzar (Attack/Move)

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

**Ejemplo:**
```
Ejército 1 en Toscana → "Avanzar a Módena"
Si Módena está vacía → Entra automáticamente
Si Módena está defendida → Se resuelve combate
```

---

## 3. Apoyar (Support)

**Sintaxis:** `"Apoyar a [Unidad]"` o `"S [Unidad]"`

**Tipos (Automático según contexto):**

### Apoyo Ofensivo
```javascript
if (unidad_apoyada.orden == "Avanzar") {
  // Apoyo al ataque
  agregar_fuerza_al_atacante()
}
```

**Ejemplo:**
```
Ejército 1 en Toscana → "Avanzar a Módena"
Ejército 2 en Umbría → "Apoyar Ejército 1"
Resultado: Ejército 1 ataca con fuerza 2
```

### Apoyo Defensivo
```javascript
if (unidad_apoyada.orden == "Mantener" || unidad_apoyada.orden == "Asediar") {
  // Apoyo a la defensa
  agregar_fuerza_al_defensor()
}
```

**Ejemplo:**
```
Ejército 1 en Módena → "Mantener"
Ejército 2 en Lombardía → "Apoyar Ejército 1"
Resultado: Módena se defiende con fuerza 2
```

**Requisitos:**
- La unidad que apoya debe poder alcanzar la provincia objetivo (adyacencia)
- Puede apoyar unidades propias o aliadas

### Cancelación de Apoyo (Cut Support)

```javascript
if (atacante.destino == unidad_apoyo.provincia) {
  if (atacante.origen != provincia_apoyada) {
    // Apoyo CANCELADO
    apoyo.válido = false
  }
}
```

**EXCEPCIÓN:** Apoyo NO se cancela si ataque viene desde la provincia apoyada

**Ejemplo de Cancelación:**
```
Ejército 1 en Lombardía → "Apoyar Módena"
Ejército 2 en Piamonte → "Avanzar a Lombardía"
Resultado: Apoyo de Ejército 1 CANCELADO (cut support)
```

**Fuerza Defensiva:** NO defiende (fuerza 0 en su propia provincia)

---

## 4. Convoy (Transport)

**Sintaxis:** `"Convoy [Ejército]"` o `"C [Ejército]"`

**Solo para Flotas**

**Requisitos:**
- Debe haber ruta continua de flotas aliadas desde origen a destino del ejército
- Cada flota en la ruta debe tener orden "Convoy [mismo ejército]"
- Origen y destino deben ser provincias costeras

**Ejemplo:**
```
Ejército 1 en Toscana → "Avanzar a Córcega" (via convoy)
Flota 1 en Mar de Liguria → "Convoy Ejército 1"
Flota 2 en Mar Tirreno → "Convoy Ejército 1"

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

## 5. Asediar (Siege)

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

**Ejemplo:**
```
Turno 3:
  Ejército 1 (Florencia) en Toscana → "Asediar Florencia"
  Resultado: Contador 1/2

Turno 4:
  Ejército 1 (Florencia) en Toscana → "Asediar Florencia"
  Resultado: Contador 2/2, Ciudad capturada
```

---

## 6. Convertirse (Convert)

**Sintaxis:** `"Convertirse a [Tipo]"` o `"Convert [Tipo]"`

**Conversiones Permitidas:**

| Desde | Hacia | Requisito |
|-------|-------|-----------|
| Flota | Ejército | Provincia puerto |
| Ejército | Flota | Provincia puerto |
| Guarnición | Ejército | Siempre (en ciudad) |

**Timing:** Después de movimientos, antes de asedios (Paso 6 de Resolución)

**Fuerza Defensiva:** SÍ defiende con fuerza 1 (cambio de regla para mayor lógica táctica)

**Uso Estratégico:**
- Flota → Ejército: Para asediar ciudad costera
- Guarnición → Ejército: Para abandonar ciudad y atacar

**Restricciones:**
- NO se puede Ejército → Guarnición (solo reclutar nueva)
- Conversión tarda 1 turno completo

**Ejemplo:**
```
Flota 1 en Venecia (puerto) → "Convertirse a Ejército"
Siguiente turno: Es Ejército, puede asediar Venecia
```

---

## Tabla Resumen de Fuerza Defensiva

| Orden | ¿Defiende? | Fuerza Defensiva | Notas |
|-------|-----------|------------------|-------|
| **Mantener** | ✅ SÍ | 1 | Única orden puramente defensiva |
| **Avanzar** | ❌ NO | 0 | Unidad está saliendo |
| **Apoyar** | ❌ NO | 0 | Concentrada en apoyar |
| **Convoy** | ❌ NO | 0 | Ocupada transportando |
| **Asediar** | ✅ SÍ | 1 | Defiende mientras asedia |
| **Convertirse** | ✅ SÍ | 1 | Cambio de regla (lógico) |

---

## Reglas Críticas

### 1. Solo "Mantener" y "Asediar" defienden
Todas las demás órdenes (Avanzar, Apoyar, Convoy, Convertirse) NO proporcionan fuerza defensiva en la provincia donde se encuentra la unidad.

### 2. Apoyo se puede cancelar
Un ataque a una unidad que está apoyando cancela el apoyo (cut support), EXCEPTO si el ataque viene desde la provincia que está siendo apoyada.

### 3. Convoy requiere ruta continua
Para que un convoy sea exitoso, todas las flotas deben tener la orden "Convoy [mismo ejército]" y formar una cadena continua.

### 4. Asedio requiere persistencia
El asedio requiere 2 turnos consecutivos con el MISMO asediador. Si cambia el asediador o se mueve, el contador se resetea.

### 5. Conversiones tienen restricciones de ubicación
Solo se puede convertir Flota ↔ Ejército en provincias puerto. Guarnición → Ejército es siempre válido.

---

## Referencias

- **Fase de Órdenes:** Ver [fase-ordenes.md](./fase-ordenes.md) para cuándo y cómo dar órdenes
- **Fase de Resolución:** Ver [fase-resolucion.md](./fase-resolucion.md) para cómo se ejecutan las órdenes
- **Ejemplo Completo:** Ver [ejemplo-turno.md](./ejemplo-turno.md) para ver órdenes en acción
- **Casos Límite:** Ver [casos-limite.md](./casos-limite.md) para situaciones especiales
