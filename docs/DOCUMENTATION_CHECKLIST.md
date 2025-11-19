# Checklist de Documentación Pendiente

**Generado:** 2025-01-19
**Actualizado:** 2025-01-19 (después de unificación de tipos)
**Por:** Claude Code (comando /documenta)

## ✅ Documentación Completa

La siguiente documentación técnica ya existe y está actualizada:

- ✅ **docs/reference/arquitectura.md** (600 líneas) - Arquitectura completa del sistema
- ✅ **docs/reference/database.md** (929 líneas) - Esquema Firestore detallado
- ✅ **docs/reference/glosario.md** (571 líneas) - Términos técnicos y de juego
- ✅ **docs/dev/CODE_SYNCHRONIZATION.md** (617 líneas) - Guía de sincronización frontend/backend
- ✅ **docs/INDEX.md** - Índice completo actualizado

## ⚠️ Inconsistencias Detectadas

### 1. Diferencias en Tipos (Frontend vs Backend)

**Frontend** (`src/types/game.ts`):
```typescript
export interface Game {
  id: string
  name?: string
  scenario: string
  scenarioId?: string
  status: 'waiting' | 'active' | 'finished'
  currentYear: number
  currentSeason: 'spring' | 'summer' | 'fall'
  currentPhase: 'diplomatic' | 'orders' | 'resolution'
  turnNumber: number
  maxPlayers: number
  playersCount: number
  map: GameMap
  scenarioData: ScenarioData
  units: Unit[]  // ⚠️ EMBEBIDAS en Game
  phaseDeadline: Timestamp
  phaseStartedAt: Timestamp
  phaseDurations: {
    diplomatic: number
    orders: number
    resolution: number
  }
  gameSettings: {
    advancedRules: boolean
    optionalRules: {
      famine: boolean
      plague: boolean
      assassination: boolean
    }
    emailNotifications: boolean
  }
  activeDisasters: {
    famineProvinces: string[]
  }
  createdAt: Timestamp
  createdBy: string
  updatedAt: Timestamp
}
```

**Backend** (`functions/src/types.ts`):
```typescript
export interface Game {
  id: string
  name?: string
  scenario: string
  scenarioId?: string
  status: 'waiting' | 'active' | 'finished'
  turnNumber: number
  currentYear: number
  currentSeason: 'spring' | 'summer' | 'fall'
  currentPhase: 'diplomatic' | 'orders' | 'resolution'
  phaseDeadline: admin.firestore.Timestamp  // ⚠️ Admin SDK
  phaseStartedAt: admin.firestore.Timestamp
  createdAt: admin.firestore.Timestamp
  map: GameMap
  scenarioData: ScenarioData
  eventsConfig?: {  // ⚠️ Campo extra backend
    famine: boolean
    plague: boolean
  }
  siegeStatus?: Record<string, { ... }>  // ⚠️ Campo extra backend
  famineProvinces?: string[]  // ⚠️ Campo extra backend
  [key: string]: any  // ⚠️ Catch-all backend
}
```

**Diferencias encontradas:**

1. **Frontend tiene campos que backend NO tiene:**
   - `maxPlayers`, `playersCount`
   - `units` (embebidas)
   - `phaseDurations` (objeto completo)
   - `gameSettings` (objeto completo)
   - `activeDisasters` (objeto completo)
   - `createdBy`, `updatedAt`

2. **Backend tiene campos que frontend NO tiene:**
   - `eventsConfig` (duplicado de `gameSettings.optionalRules`?)
   - `siegeStatus` (estado interno de resolución)
   - `famineProvinces` (duplicado de `activeDisasters.famineProvinces`?)
   - `[key: string]: any` (catch-all)

3. **Timestamps diferentes:**
   - Frontend: `import { Timestamp } from 'firebase/firestore'`
   - Backend: `admin.firestore.Timestamp`

**Estado:** ⚠️ **DESINCRONIZACIÓN PARCIAL** - Funcional pero confuso

### 2. Unit Interface

**Frontend:**
```typescript
export interface Unit {
  id: string
  type: 'army' | 'fleet' | 'garrison'
  owner: string
  currentPosition: string
  status: 'active' | 'besieged' | 'destroyed'
  siegeTurns: number
  visibleTo?: string[]
  createdAt: Timestamp
  name?: string  // ⚠️ Frontend tiene composición detallada
  composition?: ArmyComposition | GarrisonComposition | FleetComposition
  embarkedTroops?: { ... }
}
```

**Backend:**
```typescript
export interface Unit {
  id: string
  gameId: string  // ⚠️ Backend tiene gameId
  owner: string
  type: 'army' | 'fleet' | 'garrison'
  currentPosition: string
  status?: 'active' | 'besieged' | 'destroyed'  // ⚠️ Opcional
  siegeTurns?: number  // ⚠️ Opcional
  visibleTo?: string[]
  [key: string]: any  // ⚠️ Catch-all
}
```

**Diferencias:**
- Backend tiene `gameId` explícito
- Backend usa `[key: string]: any` para permitir campos extras
- Frontend tiene `name`, `composition`, `embarkedTroops` (no en backend)

**Estado:** ⚠️ **DESINCRONIZACIÓN MODERADA** - Backend acepta campos extras con catch-all

### 3. Validación de Órdenes

**Archivo:** `src/utils/orderValidation.ts` vs `functions/src/resolution/step1-validate.ts`

**Estado:** ✅ **SINCRONIZADO** - La lógica de validación es consistente:
- Mismo flujo de validación por tipo de orden
- Mismas restricciones (garrisons no se mueven, etc.)
- Mismos mensajes de error

**Diferencia conceptual:**
- Cliente valida con contexto limitado (fog of war)
- Servidor re-valida con contexto completo

### 4. Provincias Data

**Estado:** ✅ **SINCRONIZADO** - `src/data/provinceData.ts` y `functions/src/data/provinceData.ts` son idénticos (solo diferencias de sintaxis semicolons)

---

## 📋 Tareas Pendientes

### Alta Prioridad

- [x] **Unificar campos de Game interface** ✅ COMPLETADO
  - ✅ Eliminado `eventsConfig` → usar `gameSettings.optionalRules`
  - ✅ `famineProvinces` marcado como DEPRECATED → usar `activeDisasters.famineProvinces`
  - ✅ Campos exclusivos del backend documentados con comentarios
  - ✅ Añadidos campos faltantes: `maxPlayers`, `playersCount`, `phaseDurations`

- [x] **Eliminar `[key: string]: any` del backend** ✅ COMPLETADO
  - ✅ Eliminado de `Game` interface
  - ✅ Eliminado de `Player` interface (añadidos campos temporales explícitos)
  - ✅ Eliminado de `Unit` interface (campos opcionales bien tipados)
  - ✅ Eliminado de `Order` interface (añadidos campos faltantes)
  - ✅ Eliminado de `ResolutionContext` (campos de estado explícitos)
  - ⚠️ Mantenido en `TurnEvent` (estructura variable por diseño)

- [x] **Verificar Unit interface** ✅ COMPLETADO
  - ✅ `gameId` marcado como opcional (embebidas en Game)
  - ✅ `name`, `composition`, `embarkedTroops` añadidos al backend
  - ✅ Tipos de `status` y `siegeTurns` unificados (opcionales donde apropiado)
  - ✅ Backend compila sin errores

- [ ] **Arreglar errores menores del frontend**
  - ⚠️ campaignHelpers.ts usa campos antiguos de composición
  - ⚠️ unitOperations.ts tiene checks de undefined necesarios
  - ⚠️ Variables no usadas en varios componentes (TS6133)

### Media Prioridad

- [ ] **Añadir JSDoc a componentes principales**
  - src/components/GameBoard.tsx
  - src/components/OrdersPanel.tsx
  - src/components/ProvinceInfoPanel.tsx
  - src/components/TreasuryPanel.tsx
  - src/components/DiplomaticChat.tsx
  - src/components/TurnHistory.tsx

- [ ] **Añadir JSDoc a utilidades**
  - src/utils/orderValidation.ts (ya tiene algunos, completar)
  - src/utils/gameMapHelpers.ts
  - src/utils/provinceHelpers.ts (si existe)

- [ ] **Consolidar documentación de fases**
  - Actualmente hay 5 documentos separados:
    - docs/reference/fase-diplomatica.md
    - docs/reference/fase-ordenes.md
    - docs/reference/fase-resolucion.md
    - docs/reference/fases-overview.md
    - docs/reference/GAME_PHASES.md
  - Decidir si consolidar en 1-2 documentos o mantener separados
  - Eliminar duplicación de contenido

- [ ] **Actualizar API_REFERENCE.md**
  - Verificar que todas las funciones exportadas en `functions/src/index.ts` estén documentadas:
    - ✅ checkDeadlines
    - ✅ resolveTurn
    - ✅ forcePhaseAdvance
    - ❓ setAdminRole (verificar si está documentado)
    - ❓ deleteGame (verificar si está documentado)

### Baja Prioridad

- [ ] **TypeDoc autogenerado**
  - Considerar añadir generación automática de API docs con TypeDoc
  - Integrar en build pipeline

- [ ] **Storybook para componentes**
  - Considerar añadir Storybook para documentar componentes visuales
  - Útil para desarrolladores nuevos

- [ ] **Diagramas más detallados**
  - Considerar agregar diagramas PlantUML si Mermaid no es suficiente
  - Diagramas de secuencia para cada tipo de orden
  - Diagramas de estado para asedios

- [ ] **Internacionalización de docs**
  - Considerar traducir docs principales a inglés
  - Mantener versión en español como primaria

- [ ] **Script de verificación de sincronización**
  - Crear `scripts/verify-sync.ts` como se menciona en CODE_SYNCHRONIZATION.md
  - Comparar automáticamente tipos frontend vs backend
  - Comparar provinceData.ts
  - Integrar en CI/CD

### Testing y Calidad

- [ ] **Capturas de pantalla**
  - Añadir screenshots a MANUAL.md
  - Añadir screenshots a QUICK_START.md
  - Actualizar imágenes en docs obsoletas

- [ ] **Revisar links rotos**
  - Verificar todos los links en documentación
  - Actualizar rutas si hay cambios

- [ ] **Spell check**
  - Revisar ortografía en documentación española
  - Verificar términos técnicos consistentes

---

## 🎯 Recomendaciones

### 1. Simplificar Types (Máxima Prioridad)

**Problema:** Campos duplicados/confusos entre `Game.eventsConfig`, `Game.gameSettings.optionalRules`, `Game.famineProvinces`, `Game.activeDisasters.famineProvinces`.

**Solución recomendada:**
```typescript
// Frontend y Backend UNIFICADOS
export interface Game {
  // ... campos básicos

  // Usar SOLO gameSettings (eliminar eventsConfig)
  gameSettings: {
    advancedRules: boolean
    optionalRules: {
      famine: boolean
      plague: boolean
      assassination: boolean
    }
    emailNotifications: boolean
  }

  // Usar SOLO activeDisasters (eliminar famineProvinces)
  activeDisasters: {
    famineProvinces: string[]
  }

  // Backend-only fields (documentar como tales)
  siegeStatus?: Record<string, { ... }>  // Solo backend: estado interno
}
```

### 2. Eliminar Catch-all `[key: string]: any`

**Problema:** Backend usa `[key: string]: any` perdiendo type safety.

**Solución:** Definir explícitamente todos los campos posibles y usar unión de tipos si necesario.

### 3. JSDoc Prioritario

**Componentes críticos que NECESITAN JSDoc:**
1. GameBoard.tsx (componente más complejo)
2. OrdersPanel.tsx (lógica de órdenes)
3. src/utils/orderValidation.ts (validación dual crítica)

### 4. Consolidar Docs de Fases

**Opción A:** Un documento maestro
- docs/reference/GAME_PHASES.md (maestro, completo)
- Eliminar los 4 restantes o convertir en enlaces

**Opción B:** Tres documentos
- docs/reference/fase-diplomatica.md
- docs/reference/fase-ordenes.md
- docs/reference/fase-resolucion.md
- Eliminar fases-overview.md y GAME_PHASES.md (o viceversa)

**Recomendación:** Opción B (más modular, fácil de mantener)

---

## 📊 Estadísticas de Documentación

### Documentos Existentes

| Categoría | Documentos | Estado |
|-----------|------------|--------|
| **Para jugadores** | 3 | ✅ Completo |
| **Para desarrolladores** | 5 | ✅ Completo |
| **Para operaciones** | 2 | ✅ Completo |
| **Referencia técnica** | 15+ | ⚠️ Duplicación |

### Cobertura de Código

| Categoría | Archivos | Con JSDoc | Sin JSDoc |
|-----------|----------|-----------|-----------|
| **Tipos** | 4 | 1 (25%) | 3 (75%) |
| **Componentes** | 30+ | ~5 (17%) | ~25 (83%) |
| **Utilidades** | 5+ | 1 (20%) | 4 (80%) |
| **Cloud Functions** | 20+ | 3 (15%) | 17 (85%) |

**Total:** ~15-20% de cobertura JSDoc

---

## ✅ Próximos Pasos

### Esta Semana
1. Unificar campos de Game interface
2. Añadir JSDoc a GameBoard.tsx, OrdersPanel.tsx, orderValidation.ts
3. Consolidar documentación de fases

### Este Mes
1. Completar JSDoc de todos los componentes principales
2. Script de verificación de sincronización
3. Capturas de pantalla para manuales

### Este Trimestre
1. TypeDoc autogenerado
2. Storybook (opcional)
3. Internacionalización (opcional)

---

## 🔗 Referencias

- **[Arquitectura](reference/arquitectura.md)** - Diseño técnico completo
- **[Base de Datos](reference/database.md)** - Esquema Firestore
- **[CODE_SYNCHRONIZATION](dev/CODE_SYNCHRONIZATION.md)** - Guía de sincronización
- **[CONTRIBUTING](dev/CONTRIBUTING.md)** - Guía de contribución

---

**Última actualización:** 2025-01-19
**Próxima revisión:** 2025-02-01
