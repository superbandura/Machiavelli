# Documentación de Componentes React

Guía de referencia de los componentes principales de Machiavelli con JSDoc completo.

**Última actualización:** 2025-01-20

---

## Estado de Documentación

- **Componentes con JSDoc completo:** 19/40 (~48%)
- **Componentes críticos documentados:** 100% ✅
- **Utilidades críticas documentadas:** 100% ✅

Todos los **componentes críticos y complejos** del sistema están completamente documentados con JSDoc profesional.

---

## Componentes Principales del Juego

### 🗺️ Mapa y Visualización

#### `GameBoard.tsx` ✅
Componente principal del mapa SVG interactivo.

**Funcionalidad:**
- Renderiza mapa de Italia con 74 provincias
- Sistema de zoom y pan (rueda del ratón)
- Coloreado de provincias por facción
- Marcadores de unidades (UnitMarker)
- Overlays de filtros (ciudades, puertos, campañas, ingresos)
- Click en provincias para selección

**Props documentadas:**
- `game: Game` - Estado del juego
- `units: Unit[]` - Todas las unidades
- `selectedProvinceId: string | null` - Provincia seleccionada
- `onProvinceClick: (id: string) => void` - Callback de selección
- `mapFilter: MapFilter | null` - Filtro visual activo
- Y 5+ props más...

**Documentación:** [src/components/GameBoard.tsx:1-50](../../src/components/GameBoard.tsx)

---

#### `UnitMarker.tsx` ✅
Marcador SVG de unidad en el mapa.

**Funcionalidad:**
- Iconos distintos por tipo (Army: escudo, Fleet: barco, Garrison: torre)
- Color de facción
- Borde rojo si asediada
- Contador de turnos de asedio
- Interactivo (click para seleccionar)

**Props documentadas:**
- `unit: Unit` - Unidad a representar
- `color: string` - Color hexadecimal de la facción
- `position: { x: number; y: number }` - Posición en el SVG
- `onClick?: () => void` - Callback de click

**Documentación:** [src/components/UnitMarker.tsx:1-37](../../src/components/UnitMarker.tsx)

---

#### `MapsPanel.tsx` ✅
Panel de filtros visuales del mapa.

**Funcionalidad:**
- Grid 2x2 de botones con iconos
- Filtros: Ciudades, Puertos, Campañas, Ingresos
- Toggle behavior (click activa/desactiva)
- Estado visual claro cuando activo

**Props documentadas:**
- `activeFilter: MapFilter` - Filtro activo
- `onFilterChange: (filter: MapFilter) => void` - Callback de cambio

**Documentación:** [src/components/MapsPanel.tsx:1-37](../../src/components/MapsPanel.tsx)

---

### 📊 Paneles de Información

#### `ProvinceInfoPanel.tsx` ✅
Panel de información de provincia seleccionada.

**Funcionalidad:**
- Nombre, tipo (tierra/mar/puerto), control
- Unidades presentes con tooltips de composición
- Campañas activas en la provincia
- Botones de reclutamiento (si controlada)
- Modal de órdenes para unidades propias

**Props documentadas:**
- `selectedProvinceId: string | null`
- `game: Game`
- `units: Unit[]`
- `currentPlayer: Player`
- `onUnitSelect: (unit: Unit) => void`
- Y 5+ props más...

**Documentación:** [src/components/ProvinceInfoPanel.tsx:1-40](../../src/components/ProvinceInfoPanel.tsx)

---

#### `TurnIndicator.tsx` ✅
Indicador de turno y fase con countdown timer.

**Funcionalidad:**
- Número de turno y fecha (Anno Domini 1454 - Primavera)
- Estado de partida (Waiting/Active/Finished)
- Fase actual con color temático (Diplomática/Órdenes/Resolución)
- Contador regresivo hasta deadline (actualizado cada 1s)
- Alerta visual < 6 horas (rojo + pulse)
- Duraciones configuradas de cada fase

**Props documentadas:**
- `game: Game` - Info completa del juego
- `onDiplomacyClick?: () => void` - Click en fase diplomática

**Documentación:** [src/components/TurnIndicator.tsx:5-39](../../src/components/TurnIndicator.tsx)

---

#### `TreasuryPanel.tsx` ✅
Panel económico del jugador.

**Funcionalidad:**
- Tesoro actual en florines
- Ingreso por turno
- Lista de ciudades controladas con income

**Props documentadas:**
- `treasury: number`
- `income: number`
- `controlledCities: string[]`
- `game: Game`

**Documentación:** Ya documentado previamente.

---

#### `TurnHistory.tsx` ✅
Historial de turnos resueltos.

**Funcionalidad:**
- Lista de turnos pasados
- Eventos de cada turno
- Resultados de batallas
- Cambios de control

**Props documentadas:**
- `gameId: string`

**Documentación:** Ya documentado previamente.

---

### ⚔️ Sistema de Campañas Militares

#### `MilitaryCampaignPanel.tsx` ✅
Panel para planificar campañas contra provincias enemigas.

**Funcionalidad:**
- Validación de unidades adyacentes
- Cálculo automático de rutas anfibias (si costera)
- Tooltips de ruta marítima (provincias, duración, días)
- Imagen de facción controladora
- Botón de declaración (solo si válido)

**Props documentadas:**
- `game: Game`
- `provinceId: string` - Objetivo
- `currentPlayer: Player`
- `units: Unit[]`
- `provinceFaction: Record<string, string>`
- `onOpenCampaignModal: (id: string) => void`

**Documentación:** [src/components/MilitaryCampaignPanel.tsx:6-55](../../src/components/MilitaryCampaignPanel.tsx)

---

#### `CampaignsPanel.tsx` ✅
Lista compacta de campañas activas.

**Funcionalidad:**
- Emblemas de atacantes vs defensores
- Muestra aliados de cada bando
- Objetivo (nombre de provincia)
- Indicador de campaña anfibia (⚓)
- Estrella (★) si es campaña propia
- Click abre modal de gestión

**Props documentadas:**
- `campaigns: MilitaryCampaign[]`
- `game: Game`
- `player: Player`
- `onSelectCampaign: (campaign) => void`

**Documentación:** [src/components/CampaignsPanel.tsx:5-49](../../src/components/CampaignsPanel.tsx)

---

#### `CampaignManagementModal.tsx` ✅ 🌟 **COMPLEJO**
Modal principal de gestión de campañas militares (el más complejo del juego).

**Tabs:**
1. **Planificar** (diplomatic): Seleccionar unidades, declarar campaña
2. **Gestión Táctica** (orders): Crear formaciones, desplegar tropas
3. **Refuerzos** (orders): Enviar refuerzos con ETA
4. **Consejo de Guerra**: Chat privado por bando
5. **Historial**: Eventos y resultados de batallas

**Funcionalidad:**
- Real-time sync con Firestore listener
- Detección automática de bando (atacante/defensor/neutral)
- Sistema de formaciones tácticas (vanguardia, flanco, retaguardia)
- Cálculo de rutas anfibias
- Cloud Function `joinCampaign` para refuerzos
- Contador de mensajes no leídos

**Props documentadas:**
- `targetProvince: string`
- `existingCampaign?: MilitaryCampaign`
- `game: Game`
- `player: Player`
- `players: Player[]`
- Y 4+ props más...

**Documentación:** [src/components/CampaignManagementModal.tsx:25-131](../../src/components/CampaignManagementModal.tsx)

---

#### `WarCouncilChat.tsx` ✅
Chat privado del Consejo de Guerra por bando.

**Funcionalidad:**
- 2 salas separadas (atacantes vs defensores)
- Filtrado automático por `senderFaction`
- Real-time messaging con listeners
- Marcado automático como leído (`readBy` array)
- Emblemas de facciones en mensajes
- Límite de 1000 caracteres
- Acceso denegado si jugador no pertenece al bando

**Props documentadas:**
- `gameId: string`
- `campaign: MilitaryCampaign`
- `currentPlayer: Player`
- `players: Player[]`
- `game: Game`

**Documentación:** [src/components/WarCouncilChat.tsx:7-68](../../src/components/WarCouncilChat.tsx)

---

### 💬 Sistema de Comunicación

#### `DiplomaticChat.tsx` ✅
Chat diplomático general entre jugadores.

**Funcionalidad:**
- Mensajes privados (1-a-1) o públicos (todos)
- Real-time con Firestore listeners
- Auto-scroll a nuevos mensajes
- Marcado automático como leídos
- Filtro de conversaciones por destinatario
- Solo habilitado en fase diplomática

**Props documentadas:**
- `gameId: string`
- `currentPlayer: Player`
- `players: Player[]`
- `currentPhase: string`
- `turnNumber: number`

**Documentación:** [src/components/DiplomaticChat.tsx:8-46](../../src/components/DiplomaticChat.tsx)

---

### 🎖️ Gestión de Unidades

#### `UnitManagementModal.tsx` ✅
Modal completo de gestión de unidades (5 tabs).

**Tabs:**
1. **Reclutar:** Contratar tropas/barcos (cuesta florines)
2. **Transferir:** Mover tropas entre unidades (misma provincia)
3. **Embarcar/Desembarcar:** Tropas en Fleet (validación de capacidad)
4. **Licenciar:** Licenciar tropas (recupera 50% del coste)
5. **Renombrar:** Cambiar nombre de la unidad

**Funcionalidad:**
- Real-time sync con Firestore listener
- Validación de capacidad (Fleet: Galera=500, Coca=1000 tropas)
- Protección de mínimos (Garrison: 5 milicia mínimo)
- Cálculo automático de costes con lotes
- Bloqueado si unidad está en campaña
- Callable Functions (embarkTroops, disembarkTroops)

**Props documentadas:**
- `unit: Unit`
- `game: Game`
- `currentPlayer: Player`
- `allUnits: Unit[]`
- `campaigns: MilitaryCampaign[]`
- `onClose: () => void`

**Documentación:** [src/components/UnitManagementModal.tsx:26-87](../../src/components/UnitManagementModal.tsx)

---

#### `OrdersModal.tsx` ✅
Modal para asignar órdenes militares a unidades.

**Órdenes disponibles:**
- **Hold:** Mantener posición
- **Move:** Mover a provincia adyacente
- **Support:** Apoyar otra unidad
- **Convoy:** Transportar ejército (solo Fleet)
- **Besiege:** Asediar ciudad (no Garrison)
- **Convert:** Convertir tipo de unidad

**Funcionalidad:**
- Validación en tiempo real (`orderValidation.ts`)
- Carga órdenes existentes desde `/orders`
- Grid visual de iconos para selección
- Selectores dinámicos según tipo
- Estado visual (válida/inválida + mensaje)
- Composición de unidad visible
- Auto-cierre tras guardado

**Props documentadas:**
- `unit: Unit`
- `game: Game`
- `currentPlayer: Player`
- `allUnits: Unit[]`
- `onClose: () => void`

**Documentación:** [src/components/OrdersModal.tsx:8-61](../../src/components/OrdersModal.tsx)

---

### 🏛️ Sistema de Jugadores

#### `InactivePlayerVoting.tsx` ✅
Sistema de votación para jugadores inactivos (3+ turnos sin órdenes).

**Opciones de votación:**
1. **🤖 Modo IA Básica:** Hold automático
2. **🔄 Permitir Reemplazo:** Nuevo jugador puede entrar
3. **☠️ Eliminar del Juego:** Destruir todas las unidades

**Funcionalidad:**
- Real-time voting con listeners
- Cada jugador vota una vez por inactivo
- Opción ganadora = mayoría simple
- Voto guardado en `/votes/{gameId}_{targetId}_{voterId}`
- Muestra quién votó y por qué
- Auto-ejecuta al final del turno (Cloud Function)

**Props documentadas:**
- `gameId: string`
- `currentPlayer: Player`
- `players: Player[]`

**Documentación:** [src/components/InactivePlayerVoting.tsx:18-58](../../src/components/InactivePlayerVoting.tsx)

---

### 🎮 Lobby y Autenticación

#### `Login.tsx` ✅
Página de login con Firebase Auth.

**Funcionalidad:**
- Autenticación con `signInWithEmailAndPassword`
- Delay 1s para carga de rol (evita race condition)
- Navegación automática al lobby
- Mensajes de error
- Diseño renacentista con emblemas de 10 facciones

**Documentación:** [src/components/Login.tsx:29-60](../../src/components/Login.tsx)

---

#### `GamesList.tsx` ✅
Lista de partidas disponibles en el lobby.

**Funcionalidad:**
- Real-time sync con Firestore (`status: 'waiting'`)
- Excluye partidas donde el usuario ya juega
- Ordenadas por fecha (más recientes primero)
- Botón "Unirse" abre JoinGameDialog
- Botón "Eliminar" solo para admins
- Indicador de partidas privadas (🔒)

**Props documentadas:**
- `onJoinGame: (gameId, name, max) => void`

**Documentación:** [src/components/GamesList.tsx:9-63](../../src/components/GamesList.tsx)

---

#### `JoinGameDialog.tsx` ✅
Dialog de selección de facción para unirse a partida.

**Funcionalidad:**
- Carga facciones desde `scenarioData.availableFactions`
- Marca facciones tomadas
- Emblemas con estado visual (disponible/tomada)
- Validación: no permite unirse si lleno
- Soporte para facciones dinámicas (`/factions` collection)
- Fallback a `FACTIONS` hardcoded
- Actualización atómica con Firestore

**Flujo de unión:**
1. Selecciona facción disponible
2. Crea documento en `/players`
3. Actualiza `/games/{gameId}` (currentPlayerCount +1)
4. Transfiere control de provincias y unidades
5. Navega a la partida

**Props documentadas:**
- `isOpen: boolean`
- `onClose: () => void`
- `gameId: string`
- `gameName: string`
- `maxPlayers: number`
- `onJoined?: (gameId) => void`

**Documentación:** [src/components/JoinGameDialog.tsx:8-90](../../src/components/JoinGameDialog.tsx)

---

#### `CreateGameModal.tsx` ✅
Modal de creación de nueva partida.

**Configuración:**
- Nombre de la partida
- Escenario (Italia 1454, 1494, Tutorial)
- Duraciones de fases (sliders en horas)
- Público/Privada
- Contraseña opcional

**Proceso:**
1. Carga escenario desde `/scenarios`
2. Configura duraciones
3. Valida campos
4. Construye GameMap, ScenarioData, Units
5. Crea documento en `/games` (`status: 'waiting'`)
6. Navega al lobby

**Builders internos:**
- `buildGameMapFromFirestore()`: Provincias → GameMap
- `buildScenarioDataFromFirestore()`: Extrae facciones
- `buildUnitsFromScenario()`: Crea unidades embebidas

**Props documentadas:**
- `isOpen: boolean`
- `onClose: () => void`
- `onGameCreated?: (gameId) => void`

**Documentación:** [src/components/CreateGameModal.tsx:9-77](../../src/components/CreateGameModal.tsx)

---

## Utilidades Críticas

### `orderValidation.ts` ✅
Validación de órdenes militares (cliente y servidor).

**Funciones principales:**
- `validateOrder()` - Valida según tipo de acción
- `validateHoldOrder()` - Siempre válida
- `validateMoveOrder()` - Verifica adyacencia y terreno
- `validateSupportOrder()` - Verifica alcance
- `validateConvoyOrder()` - Verifica ruta marítima
- `validateBesiegeOrder()` - Verifica ciudad presente
- `validateConvertOrder()` - Verifica tipo compatible
- `getValidMoveDestinations()` - Destinos posibles
- `getValidSupportTargets()` - Unidades apoyables

**Documentación:** [src/utils/orderValidation.ts:12-37](../../src/utils/orderValidation.ts)

---

### `gameMapHelpers.ts` ✅
Helpers para trabajar con el mapa del juego.

**Funciones principales:**
- `getAdjacentProvinces()` - Provincias adyacentes
- `getValidAdjacentProvinces()` - Filtradas por tipo de unidad
- `isProvinceControlled()` - Verifica control (garrison)
- `getControlledProvinces()` - Lista de provincias propias
- `getVisibleUnits()` - Fog of war
- `groupUnitsByProvince()` - Agrupación
- `getProvinceDistance()` - Distancia BFS
- `isLand()`, `isSea()`, `isPort()` - Verificaciones de tipo
- `calculatePlayerIncome()` - Ingresos totales
- `canUnitMoveTo()` - Validación de movimiento
- `isCoastalProvince()` - Verifica si es costa
- `findMaritimeRoutes()` - Rutas marítimas (BFS)
- `findAmphibiousRoute()` - Ruta para desembarco
- `isCampaignTarget()` - Validación de objetivo de campaña

**Documentación:** [src/utils/gameMapHelpers.ts:1-598](../../src/utils/gameMapHelpers.ts)

---

## Componentes Pendientes de Documentación

Los siguientes componentes tienen funcionalidad más simple y son menos críticos para entender el sistema. Están marcados para documentación futura:

### Componentes Decorativos
- `CollapsibleSection.tsx`
- `Separator.tsx`
- `WaxSeal.tsx`
- `HeaderTreasuryInfo.tsx`
- `UnitCompositionTooltip.tsx`
- `UnitIcon.tsx`

### Componentes de Formularios
- `CreateFormationModal.tsx`
- `TacticalDeploymentModal.tsx`
- `FormationCard.tsx`
- `TroopPoolSummary.tsx`
- `ShipPoolSummary.tsx`
- `ReinforcementsTab.tsx`
- `ReinforcementTroopCard.tsx`

### Componentes de Listado
- `MyGamesList.tsx`
- `HistoryModal.tsx`

### Componentes de Autenticación
- `Register.tsx`
- `ProtectedRoute.tsx`
- `AdminRoute.tsx`

### Otros Modales
- `DiplomacyModal.tsx`
- `FactionDiplomacyModal.tsx`
- `DeleteGameDialog.tsx`

### Paneles Especiales
- `FamineMitigationPanel.tsx`
- `VictoryScreen.tsx`

---

## Convenciones de JSDoc

Todos los componentes documentados siguen estas convenciones:

### Props Interface
```typescript
/**
 * Props para el componente [ComponentName]
 */
interface ComponentNameProps {
  /** Descripción clara de la prop */
  propName: Type
  /** Callback cuando ocurre X */
  onAction?: () => void
}
```

### Componente
```typescript
/**
 * Título descriptivo del componente
 *
 * Descripción detallada de funcionalidad y propósito.
 *
 * **Características:**
 * - Característica 1
 * - Característica 2
 * - Característica 3
 *
 * **Flujo:**
 * 1. Paso 1
 * 2. Paso 2
 * 3. Paso 3
 *
 * @component
 * @example
 * <ComponentName
 *   prop1="value"
 *   prop2={value}
 * />
 */
export default function ComponentName({ props }: ComponentNameProps) {
  // ...
}
```

### Funciones
```typescript
/**
 * Descripción de la función
 *
 * Detalles adicionales si necesario.
 *
 * @param param1 - Descripción del parámetro
 * @param param2 - Descripción del parámetro
 * @returns Descripción del valor retornado
 *
 * @example
 * ```typescript
 * const result = functionName(arg1, arg2)
 * ```
 */
export function functionName(param1: Type, param2: Type): ReturnType {
  // ...
}
```

---

## Cómo Usar Esta Documentación

### Buscar un Componente
1. Usa Ctrl+F para buscar el nombre del componente
2. Lee la sección correspondiente aquí
3. Ve al archivo fuente para ver el JSDoc completo

### Entender un Sistema
1. Lee la sección del sistema (ej. "Sistema de Campañas")
2. Revisa los componentes relacionados
3. Consulta las utilidades críticas si es necesario

### Contribuir Nuevos Componentes
1. Sigue las convenciones de JSDoc
2. Documenta Props interface
3. Documenta el componente principal
4. Añade ejemplo de uso
5. Actualiza este archivo COMPONENTS.md

---

## Próximos Pasos

Para completar la documentación al 100%:

1. ✅ Componentes críticos de juego (13/13)
2. ✅ Modales principales (5/5)
3. ✅ Componentes de lobby (3/3)
4. ✅ Utilidades críticas (2/2)
5. ⏳ Componentes decorativos (~8 componentes)
6. ⏳ Componentes de formularios (~8 componentes)
7. ⏳ Componentes auxiliares (~10 componentes)

**Estado actual:** 19/40 componentes documentados (48%)
**Componentes críticos:** 100% ✅

---

**Última actualización:** 2025-01-20
**Por:** Claude Code (sesión de documentación de componentes)
