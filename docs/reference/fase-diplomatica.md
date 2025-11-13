# Fase Diplomática

## Descripción General

La Fase Diplomática ocurre en **todos los turnos** del juego y es el momento donde los jugadores pueden negociar, formar alianzas y planificar estrategias.

---

## Configuración de la Fase

**Duración:** Configurable (por defecto 48 horas)

**Inicio:**
- Email automático a todos los jugadores
- Contador regresivo visible en interfaz
- Mensaje: "Nueva fase diplomática - Deadline: [Fecha/Hora]"

**Fin:**
- Automático al expirar deadline
- NO hay botón "Listo" o "Completar"
- Cloud Scheduler detecta expiración → Cambia a Fase de Órdenes

---

## Actividades Permitidas

Durante la Fase Diplomática, los jugadores pueden:

- **Enviar/recibir mensajes diplomáticos privados**
  - Comunicación secreta entre jugadores
  - Los mensajes quedan registrados aunque el destinatario esté offline

- **Negociar alianzas y traiciones**
  - Acuerdos militares
  - Coordinación de ataques
  - Pactos de no agresión

- **Planificar acuerdos económicos**
  - Transferencias de ducados
  - Apoyo financiero
  - Comercio de favores

- **Consultar información del juego**
  - Estado actual del mapa
  - Tesorería propia
  - Posiciones de unidades

---

## Características del Sistema Asíncrono

**Importante:**
- Los jugadores pueden entrar/salir en cualquier momento
- NO se requiere estar conectado simultáneamente
- Mensajes quedan registrados aunque el destinatario esté offline
- El deadline es fijo y no se extiende
- No hay votación para avanzar de fase

---

## Transición a la Siguiente Fase

Cuando expira el deadline:
1. Cloud Scheduler detecta automáticamente la expiración
2. Cambia `currentPhase` a `'orders'` en Firestore
3. Inicia la Fase de Órdenes
4. Envía notificaciones por email a todos los jugadores

**Nota:** Ver [fase-ordenes.md](./fase-ordenes.md) para detalles de la siguiente fase.

---

## Referencias

- **Visión General:** Ver [fases-overview.md](./fases-overview.md)
- **Fase de Órdenes:** Ver [fase-ordenes.md](./fase-ordenes.md)
- **Sistema de Transferencias:** Ver [sistema-transferencias.md](./sistema-transferencias.md)
