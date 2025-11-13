# Fase de Órdenes

## Descripción General

La Fase de Órdenes ocurre en **todos los turnos** y es el momento donde los jugadores dan instrucciones a sus unidades y programan gastos especiales.

---

## Configuración de la Fase

**Duración:** Configurable (por defecto 48 horas)

**Inicio:**
- Email automático: "Fase de Órdenes iniciada - Envía tus órdenes"
- Contador regresivo visible en la interfaz
- Estado del juego visible con todas las posiciones actualizadas

**Fin:**
- Automático al expirar deadline
- Cloud Scheduler dispara automáticamente la Fase de Resolución
- No hay botón "Listo" ni votación para avanzar

---

## Actividades Durante la Fase

### 1. Órdenes Militares

**Obligatorio:** Introducir órdenes para TODAS las unidades

**Tipos de órdenes disponibles:**
- Mantener (Hold)
- Avanzar/Atacar (Attack/Move)
- Apoyar (Support)
- Convoy (Transport)
- Asediar (Siege)
- Convertirse (Convert)

**Nota:** Ver [ordenes-militares.md](./ordenes-militares.md) para detalles completos de cada orden.

### 2. Lista de Retirada

**Importante:** Especificar lista de retirada para cada unidad

**Formato:**
```json
{
  "retreatList": {
    "Ejército 1": ["Pisa", "Umbría", "Romaña"],
    "Ejército 2": ["Liguria", "Piamonte"]
  }
}
```

**Consecuencia:** Si una unidad debe retirarse y no tiene lista de retirada, será eliminada automáticamente.

### 3. Gastos Especiales

Los jugadores pueden programar los siguientes gastos:

#### a. Transferencias de Ducados
- Enviar dinero a otros jugadores
- Coste: Variable (cantidad que desees enviar)
- Validación: Se valida contra snapshot de fondos durante la Resolución

#### b. Asesinatos (Si aplica)
- Intentar asesinar a otro líder
- Coste: 6d, 12d o 18d (según probabilidad deseada)
- Requiere ficha de asesinato del jugador objetivo
- Ver [eventos-especiales.md](./eventos-especiales.md) para detalles

#### c. Sobornos (Si aplica)
- Sobornar unidad enemiga
- Coste fijo: 15 ducados
- Éxito automático (sin tirada de dados)

#### d. Mitigación de Hambre
- Prevenir hambre en provincia
- Coste: 3 ducados por provincia
- Debe hacerse en el turno ANTERIOR a la Primavera
- Retira marcador de hambre existente o previene su aparición

#### e. Reclutamiento de Unidades
- Reclutar nueva unidad en ciudad controlada
- Costes:
  - Ejército: 6 ducados
  - Flota: 6 ducados (solo en puertos)
  - Guarnición: 3 ducados
- Requisitos:
  - Ciudad debe pertenecer al jugador
  - Ciudad debe tener guarnición
  - Fondos suficientes

---

## Modificación de Órdenes

**Flexibilidad:**
- Se pueden cambiar las órdenes cuantas veces se quiera antes del deadline
- Solo la última versión enviada se ejecuta
- Estado visible en interfaz: "Borrador guardado"

**Interfaz:**
- Indicador visual de "Órdenes guardadas (no finales)"
- Botón para guardar cambios
- Aviso antes del deadline (ej: "Quedan 6 horas")

---

## Órdenes No Enviadas

**Si un jugador no envía órdenes:**
- Todas sus unidades ejecutan automáticamente "Mantener"
- Se registra en el historial: "[Jugador] no envió órdenes (inactivo)"
- Se inicia el proceso de seguimiento de inactividad

**Nota:** Ver [jugadores-inactivos.md](./jugadores-inactivos.md) para el manejo de jugadores inactivos.

---

## Transición a la Siguiente Fase

Cuando expira el deadline:
1. Cloud Scheduler detecta la expiración automáticamente
2. Inicia la Fase de Resolución
3. Todas las órdenes se congelan (no se pueden modificar)
4. El sistema ejecuta la resolución automática

**Nota:** Ver [fase-resolucion.md](./fase-resolucion.md) para detalles de la siguiente fase.

---

## Referencias

- **Visión General:** Ver [fases-overview.md](./fases-overview.md)
- **Órdenes Militares Detalladas:** Ver [ordenes-militares.md](./ordenes-militares.md)
- **Fase de Resolución:** Ver [fase-resolucion.md](./fase-resolucion.md)
- **Eventos Especiales:** Ver [eventos-especiales.md](./eventos-especiales.md)
- **Jugadores Inactivos:** Ver [jugadores-inactivos.md](./jugadores-inactivos.md)
