# Plan de Testing Manual - Machiavelli

**Fecha**: 12 de Octubre 2025
**Servidor**: http://localhost:5173/
**Estado**: ✅ Servidor corriendo

---

## 🎯 Objetivo

Realizar un flujo completo por la aplicación para verificar que todas las funcionalidades implementadas funcionan correctamente en un entorno de desarrollo real.

---

## 📋 Checklist de Testing

### Fase 1: Autenticación ✅

#### Test 1.1: Registro de Usuario
**URL**: `http://localhost:5173/register`

**Pasos**:
1. Navegar a la página de registro
2. Completar el formulario:
   - Email: `test1@machiavelli.game`
   - Username: `Marco_Polo_Test`
   - Password: `TestPassword123`
3. Click en "Register"

**Resultado esperado**:
- ✅ Usuario creado exitosamente
- ✅ Redirección automática a `/lobby`
- ✅ Mensaje de bienvenida o confirmación

**Verificar**:
- [ ] Formulario funciona correctamente
- [ ] Validación de campos (email válido, contraseña fuerte)
- [ ] No hay errores en consola de Chrome (F12)
- [ ] Usuario aparece autenticado

---

#### Test 1.2: Logout
**Ubicación**: Navbar o esquina superior derecha

**Pasos**:
1. Click en botón de logout
2. Verificar redirección a login

**Resultado esperado**:
- ✅ Usuario deslogueado
- ✅ Redirección a `/login`
- ✅ No puede acceder a rutas protegidas

**Verificar**:
- [ ] Logout funciona correctamente
- [ ] No quedan datos de sesión

---

#### Test 1.3: Login
**URL**: `http://localhost:5173/login`

**Pasos**:
1. Usar credenciales del usuario creado:
   - Email: `test1@machiavelli.game`
   - Password: `TestPassword123`
2. Click en "Login"

**Resultado esperado**:
- ✅ Login exitoso
- ✅ Redirección a `/lobby`
- ✅ Usuario autenticado correctamente

**Verificar**:
- [ ] Login funciona con credenciales correctas
- [ ] Mensaje de error con credenciales incorrectas
- [ ] No hay errores en consola

---

### Fase 2: Lobby y Gestión de Partidas 🎮

#### Test 2.1: Ver Lobby
**URL**: `http://localhost:5173/lobby`

**Pasos**:
1. Navegar al lobby después del login
2. Observar la lista de partidas disponibles

**Resultado esperado**:
- ✅ Página de lobby carga correctamente
- ✅ Se muestra lista de partidas (puede estar vacía)
- ✅ Botón "Crear Partida" o "Nueva Partida" visible
- ✅ Información del usuario actual visible

**Verificar**:
- [ ] UI del lobby se renderiza correctamente
- [ ] Lista de partidas carga (aunque esté vacía)
- [ ] Botones interactivos
- [ ] Layout responsive

---

#### Test 2.2: Crear Partida
**Ubicación**: Botón en `/lobby`

**Pasos**:
1. Click en "Crear Partida" o "Nueva Partida"
2. Completar formulario:
   - Nombre: `Test Game - Development`
   - Número de jugadores: `5`
   - Deadline por fase: `24 horas`
3. Click en "Crear"

**Resultado esperado**:
- ✅ Partida creada exitosamente
- ✅ Aparece en la lista de partidas
- ✅ Estado: "Esperando jugadores" o "Lobby"
- ✅ Creador aparece como primer jugador

**Verificar**:
- [ ] Formulario de creación funciona
- [ ] Validación de campos
- [ ] Partida aparece en lista
- [ ] Datos correctos en Firestore (verificar en Emulator UI: http://127.0.0.1:4000/firestore)

---

#### Test 2.3: Unirse a Partida
**Ubicación**: Lista de partidas en `/lobby`

**Pasos**:
1. Crear un segundo usuario (repetir Test 1.1 con datos diferentes)
   - Email: `test2@machiavelli.game`
   - Username: `Ludovico_Test`
2. Login con el segundo usuario
3. Ver la partida creada en la lista
4. Click en "Unirse" o entrar a la partida

**Resultado esperado**:
- ✅ Usuario se une correctamente
- ✅ Aparece en la lista de jugadores
- ✅ Puede seleccionar facción
- ✅ Contador de jugadores actualizado

**Verificar**:
- [ ] Sistema de unirse funciona
- [ ] Jugador aparece en la lista
- [ ] Selección de facción disponible
- [ ] No puede haber 2 jugadores con la misma facción

---

#### Test 2.4: Iniciar Partida
**Ubicación**: Lobby de la partida (cuando hay suficientes jugadores)

**Pasos**:
1. Con el usuario creador, iniciar la partida
2. Click en "Iniciar Partida" o "Start Game"

**Resultado esperado**:
- ✅ Partida cambia de estado a "Activa"
- ✅ Redirección a `/game/:gameId`
- ✅ Mapa se carga correctamente
- ✅ Todos los jugadores son redirigidos

**Verificar**:
- [ ] Solo el creador puede iniciar
- [ ] Requiere mínimo 2-3 jugadores
- [ ] Estado actualizado en Firestore
- [ ] Redirección funciona

---

### Fase 3: Mapa y Visualización 🗺️

#### Test 3.1: Visualización del Mapa
**URL**: `http://localhost:5173/game/:gameId`

**Pasos**:
1. Entrar a la partida activa
2. Observar el mapa de Italia

**Resultado esperado**:
- ✅ Mapa de Italia renderizado correctamente
- ✅ Provincias visibles con colores
- ✅ Provincias tienen nombres o IDs
- ✅ Mapa es interactivo (hover, click)

**Verificar**:
- [ ] SVG del mapa carga sin errores
- [ ] Colores de provincias correctos
- [ ] Provincias son clicables
- [ ] Zoom/pan funciona (si está implementado)
- [ ] No hay errores en consola

---

#### Test 3.2: Visualización de Unidades
**Ubicación**: Sobre el mapa

**Pasos**:
1. Observar las unidades iniciales de cada facción
2. Verificar que cada provincia con unidades las muestra

**Resultado esperado**:
- ✅ Unidades visibles en sus provincias
- ✅ Iconos de ejércitos (⚔️) y flotas (⚓) diferenciados
- ✅ Colores por facción correctos
- ✅ Tooltip o info al hacer hover

**Verificar**:
- [ ] Unidades renderizadas en posiciones correctas
- [ ] Iconos visibles y diferenciados
- [ ] Colores de facción aplicados
- [ ] Info de unidad visible al hover

---

#### Test 3.3: Información de Provincias
**Ubicación**: Click en provincia del mapa

**Pasos**:
1. Click en una provincia
2. Ver información desplegada

**Resultado esperado**:
- ✅ Sidebar o modal con info de provincia
- ✅ Nombre de provincia
- ✅ Dueño (facción)
- ✅ Unidades presentes
- ✅ Tipo (tierra/mar/costera)

**Verificar**:
- [ ] Sidebar/modal aparece al click
- [ ] Información correcta
- [ ] UI bien diseñada
- [ ] Cierre del panel funciona

---

### Fase 4: Sistema de Turnos y Fases ⏰

#### Test 4.1: Información de Turno Actual
**Ubicación**: Header o sidebar del juego

**Pasos**:
1. Ver la información del turno actual

**Resultado esperado**:
- ✅ Número de turno visible
- ✅ Fase actual visible (Diplomática/Órdenes/Resolución)
- ✅ Deadline del turno
- ✅ Tiempo restante actualizado

**Verificar**:
- [ ] Info de turno mostrada claramente
- [ ] Fase actual correcta (debería empezar en "Diplomática")
- [ ] Countdown funciona (si está implementado)
- [ ] Deadline correcta

---

#### Test 4.2: Indicador de Jugadores
**Ubicación**: Lista de jugadores o scoreboard

**Pasos**:
1. Ver la lista de jugadores en la partida
2. Verificar quién ha enviado órdenes

**Resultado esperado**:
- ✅ Lista de todos los jugadores
- ✅ Indicador de "órdenes enviadas" (✅ o ❌)
- ✅ Facción de cada jugador
- ✅ Estado (activo/inactivo/eliminado)

**Verificar**:
- [ ] Lista completa de jugadores
- [ ] Estados actualizados en tiempo real
- [ ] Indicadores claros
- [ ] Tu usuario destacado

---

### Fase 5: Sistema de Órdenes 📝

#### Test 5.1: Fase Diplomática
**Fase**: Diplomática

**Pasos**:
1. En fase diplomática, ver opciones disponibles
2. Intentar enviar mensajes a otros jugadores (si está implementado)

**Resultado esperado**:
- ✅ UI de fase diplomática visible
- ✅ Opciones de comunicación disponibles
- ✅ No se pueden enviar órdenes militares aún

**Verificar**:
- [ ] UI específica de fase diplomática
- [ ] Sistema de mensajes funciona (si existe)
- [ ] No hay botones de órdenes militares
- [ ] Mensaje de "Esperando fase de órdenes" si intentas ordenar

---

#### Test 5.2: Fase de Órdenes - Enviar Órdenes
**Fase**: Órdenes

**Pasos**:
1. Esperar a que la fase cambie a "Órdenes" (o simular cambio)
2. Seleccionar una unidad propia
3. Intentar dar una orden:
   - **Movimiento**: Click en unidad → Click en provincia destino
   - **Soporte**: Click en unidad → "Apoyar" → Seleccionar unidad aliada
   - **Mantener**: Click en unidad → "Mantener"

**Resultado esperado**:
- ✅ UI de órdenes visible
- ✅ Unidades propias seleccionables
- ✅ Opciones de órdenes disponibles
- ✅ Validación de órdenes (no puede moverse a provincia lejana)
- ✅ Confirmación visual de orden enviada

**Verificar**:
- [ ] Selección de unidades funciona
- [ ] Opciones de orden aparecen
- [ ] Validación correcta (movimientos legales)
- [ ] Feedback visual al enviar orden
- [ ] Orden guardada en Firestore

---

#### Test 5.3: Revisar Órdenes Enviadas
**Ubicación**: Panel de órdenes o lista

**Pasos**:
1. Después de enviar órdenes, revisar lista
2. Verificar que se pueden editar antes del deadline

**Resultado esperado**:
- ✅ Lista de órdenes enviadas visible
- ✅ Botón "Editar" o "Eliminar" disponible
- ✅ Confirmación final antes del deadline

**Verificar**:
- [ ] Lista de órdenes mostrada
- [ ] Edición funciona
- [ ] Eliminación funciona
- [ ] Cambios se guardan en Firestore

---

#### Test 5.4: Confirmar Órdenes
**Ubicación**: Botón en panel de órdenes

**Pasos**:
1. Revisar todas las órdenes
2. Click en "Confirmar Órdenes" o "Enviar"
3. Verificar cambio de estado

**Resultado esperado**:
- ✅ Confirmación requerida
- ✅ Flag `hasSubmittedOrders` = true
- ✅ Indicador en lista de jugadores actualizado (✅)
- ✅ No se pueden editar órdenes después de confirmar

**Verificar**:
- [ ] Confirmación funciona
- [ ] Estado actualizado
- [ ] Órdenes bloqueadas después de confirmar
- [ ] Indicador visual claro

---

### Fase 6: Resolución de Turnos 🔄

#### Test 6.1: Esperar Resolución Automática
**Escenario**: Todos enviaron órdenes O deadline pasó

**Pasos**:
1. Esperar a que todos envíen órdenes o deadline expire
2. Observar transición a fase "Resolución"

**Resultado esperado**:
- ✅ Fase cambia automáticamente a "Resolución"
- ✅ Mensaje de "Procesando órdenes..."
- ✅ Órdenes se ejecutan automáticamente
- ✅ Mapa se actualiza con nuevas posiciones

**Verificar**:
- [ ] Cambio automático de fase
- [ ] Función Cloud `checkDeadlines` ejecutándose
- [ ] Logs en Firebase Functions (ver con `firebase functions:log`)
- [ ] Sin errores en ejecución

---

#### Test 6.2: Ver Resultados de Resolución
**Ubicación**: Después de resolución

**Pasos**:
1. Ver el mapa actualizado
2. Ver log de eventos o historial

**Resultado esperado**:
- ✅ Unidades en nuevas posiciones
- ✅ Combates resueltos (si hubo)
- ✅ Provincias conquistadas actualizadas
- ✅ Log de eventos visible

**Verificar**:
- [ ] Mapa actualizado correctamente
- [ ] Unidades en posiciones finales
- [ ] Log de eventos mostrado
- [ ] Sin errores de renderizado

---

#### Test 6.3: Inicio de Nuevo Turno
**Escenario**: Después de resolución

**Pasos**:
1. Verificar que el turno incrementa automáticamente
2. Verificar que la fase vuelve a "Diplomática"
3. Verificar que flags de jugadores se resetean

**Resultado esperado**:
- ✅ `turnNumber` incrementado (ej: 1 → 2)
- ✅ Fase = "Diplomática"
- ✅ Todos los jugadores tienen `hasSubmittedOrders` = false
- ✅ Nuevo deadline configurado

**Verificar**:
- [ ] Turno incrementado correctamente
- [ ] Fase reseteada
- [ ] Flags de jugadores reseteados
- [ ] Nuevo deadline visible

---

### Fase 7: Notificaciones y Emails 📧

#### Test 7.1: Verificar Notificaciones en UI
**Ubicación**: Bell icon o área de notificaciones

**Pasos**:
1. Buscar icono de notificaciones en UI
2. Ver notificaciones recientes

**Resultado esperado**:
- ✅ Icono de notificaciones visible
- ✅ Badge con contador de no leídas
- ✅ Lista de notificaciones al click
- ✅ Tipos: cambio de fase, recordatorio, etc.

**Verificar**:
- [ ] Sistema de notificaciones UI funciona
- [ ] Badge actualizado
- [ ] Lista de notificaciones visible
- [ ] Marcar como leída funciona

---

#### Test 7.2: Verificar Emails Simulados
**Ubicación**: Logs del servidor y consola

**Pasos**:
1. Abrir consola de desarrollo (F12)
2. Buscar logs de emails simulados
3. Verificar en logs de Firebase Functions

**Resultado esperado**:
- ✅ Logs de "EMAIL SIMULATION" en consola
- ✅ Contenido del email visible
- ✅ Destinatarios correctos
- ✅ Subject apropiado

**Verificar**:
- [ ] Logs de emails aparecen
- [ ] Info completa (to, subject, html)
- [ ] No hay errores en envío
- [ ] Emails para eventos correctos

---

### Fase 8: Sistema de Inactividad ⚠️

#### Test 8.1: Simular Jugador Inactivo
**Escenario**: Un jugador no envía órdenes

**Pasos**:
1. Login con un segundo usuario
2. NO enviar órdenes en una fase
3. Esperar a que deadline expire
4. Verificar sistema de strikes

**Resultado esperado**:
- ✅ Jugador inactivo recibe strike
- ✅ `inactivityStrikes` incrementado
- ✅ Email de advertencia enviado (simulado)
- ✅ Indicador visual en lista de jugadores

**Verificar**:
- [ ] Strike aplicado correctamente
- [ ] Email de advertencia en logs
- [ ] Contador de strikes visible
- [ ] Advertencia progresiva (1/3, 2/3, 3/3)

---

#### Test 8.2: Strikes Acumulados
**Escenario**: Mismo jugador inactivo varias veces

**Pasos**:
1. Repetir inactividad en múltiples turnos
2. Verificar que strikes se acumulan
3. Ver qué pasa al llegar a 3 strikes

**Resultado esperado**:
- ✅ Strikes acumulados (0 → 1 → 2 → 3)
- ✅ Emails progresivamente más severos
- ✅ Al 3er strike: votación iniciada
- ✅ Posible eliminación del jugador

**Verificar**:
- [ ] Acumulación de strikes funciona
- [ ] Emails con severidad creciente
- [ ] Sistema de votación activado a 3 strikes
- [ ] Eliminación funciona (si votan)

---

### Fase 9: Condiciones de Victoria 🏆

#### Test 9.1: Victoria por Dominio
**Escenario**: Un jugador controla suficientes provincias

**Pasos**:
1. Simular conquista de provincias (puede requerir modificar datos)
2. Verificar que el sistema detecta victoria
3. Ver pantalla de fin de partida

**Resultado esperado**:
- ✅ Sistema detecta condición de victoria
- ✅ Partida cambia a estado "Finished"
- ✅ Pantalla de victoria mostrada
- ✅ Email de fin de partida enviado a todos

**Verificar**:
- [ ] Detección de victoria funciona
- [ ] Estado de partida actualizado
- [ ] Pantalla de fin de partida
- [ ] Estadísticas finales mostradas
- [ ] Email de fin en logs

---

#### Test 9.2: Victoria por Tiempo
**Escenario**: Llegar a turno 12 sin ganador claro

**Pasos**:
1. Avanzar turnos hasta el turno 12
2. Verificar que se declara ganador por mayor territorio

**Resultado esperado**:
- ✅ Al turno 12, partida finaliza automáticamente
- ✅ Ganador = jugador con más provincias
- ✅ Tipo de victoria = "time_limit"
- ✅ Email de fin de partida

**Verificar**:
- [ ] Límite de turnos funciona
- [ ] Cálculo de ganador correcto
- [ ] Tipo de victoria correcto
- [ ] Fin de partida automático

---

### Fase 10: Performance y UX 🚀

#### Test 10.1: Performance del Mapa
**Ubicación**: Página del juego

**Pasos**:
1. Abrir DevTools (F12) → Performance
2. Interactuar con el mapa (zoom, click, hover)
3. Verificar framerate

**Resultado esperado**:
- ✅ 60 FPS durante interacción normal
- ✅ Sin lag al hacer hover en provincias
- ✅ Renderizado fluido de unidades

**Verificar**:
- [ ] FPS estable
- [ ] No hay memory leaks
- [ ] Interacciones fluidas
- [ ] Sin warnings de performance

---

#### Test 10.2: Responsividad
**Ubicación**: Todas las páginas

**Pasos**:
1. Abrir DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Probar diferentes tamaños:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1920px)

**Resultado esperado**:
- ✅ UI se adapta a diferentes tamaños
- ✅ Mapa visible en mobile (aunque puede requerir scroll)
- ✅ Botones accesibles
- ✅ No hay overflow horizontal

**Verificar**:
- [ ] Layout responsive
- [ ] Mapa funciona en mobile
- [ ] Botones accesibles en todos los tamaños
- [ ] No hay elementos cortados

---

#### Test 10.3: Actualización en Tiempo Real
**Escenario**: Múltiples usuarios en misma partida

**Pasos**:
1. Abrir partida en 2 navegadores diferentes (o 2 pestañas)
2. Login con 2 usuarios diferentes
3. Realizar acción con un usuario
4. Verificar que el otro usuario ve el cambio

**Resultado esperado**:
- ✅ Cambios se reflejan en tiempo real
- ✅ Sin necesidad de refrescar página
- ✅ Listeners de Firestore funcionando
- ✅ UI actualizada automáticamente

**Verificar**:
- [ ] Updates en tiempo real funcionan
- [ ] Sin necesidad de F5
- [ ] Listeners de Firestore activos
- [ ] Sin conflictos de estado

---

## 🐛 Reporte de Bugs

Usar este formato para reportar bugs encontrados:

```markdown
### Bug #X: [Título descriptivo]

**Severidad**: Alta / Media / Baja
**Ubicación**: [Página o componente]
**Pasos para reproducir**:
1. ...
2. ...
3. ...

**Comportamiento esperado**:
...

**Comportamiento actual**:
...

**Screenshots**:
[Si aplica]

**Errores en consola**:
```
[Copiar errores de consola]
```

**Verificado en Firestore**:
[Si aplica, mencionar qué datos están mal en Firestore]
```

---

## 📊 Resumen de Testing

Al finalizar, completar este resumen:

### Tests Ejecutados

| Fase | Tests | Pasados | Fallados | % Éxito |
|------|-------|---------|----------|---------|
| Autenticación | 3 | ? | ? | ?% |
| Lobby | 4 | ? | ? | ?% |
| Mapa | 3 | ? | ? | ?% |
| Turnos | 2 | ? | ? | ?% |
| Órdenes | 4 | ? | ? | ?% |
| Resolución | 3 | ? | ? | ?% |
| Notificaciones | 2 | ? | ? | ?% |
| Inactividad | 2 | ? | ? | ?% |
| Victoria | 2 | ? | ? | ?% |
| Performance | 3 | ? | ? | ?% |
| **TOTAL** | **28** | **?** | **?** | **?%** |

### Bugs Encontrados

Total de bugs: ?
- Alta severidad: ?
- Media severidad: ?
- Baja severidad: ?

### Tiempo de Testing

- Inicio: [Hora]
- Fin: [Hora]
- Duración total: [X horas]

### Conclusión

[Resumen general del estado de la aplicación]

---

## 🚀 Próximos Pasos Según Resultados

### Si 90-100% de tests pasan:
✅ Listo para deploy a producción
✅ Proceder con partida beta con usuarios reales

### Si 70-89% de tests pasan:
⚠️ Corregir bugs críticos primero
⚠️ Re-testear features fallidas
⚠️ Deploy después de correcciones

### Si <70% de tests pasan:
❌ Revisar arquitectura
❌ Debugging intensivo requerido
❌ Más desarrollo antes de deploy

---

**Documento creado automáticamente**
**Última actualización**: 12 de Octubre 2025
**Versión**: 1.0
