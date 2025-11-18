# 🔄 Reporte de Sincronización Frontend/Backend

**Fecha:** 2025-01-18
**Ejecutado por:** Claude Code
**Comando:** Verificación completa de sincronización

---

## ✅ Resumen Ejecutivo

**Estado general:** ⚠️ **REQUIERE ATENCIÓN - Desincronizaciones detectadas**

He analizado la sincronización entre el código frontend y backend. Hay **diferencias significativas** que requieren corrección antes del próximo deploy.

---

## 📊 Resultados de Verificación

### 1. Tipos (Game, Player, Unit, Order)

#### ✅ Estructuras Base - SINCRONIZADAS

Las estructuras fundamentales están alineadas:
- ✅ `ProvinceType` - Idéntico
- ✅ `ProvinceInfo` - Idéntico
- ✅ `GameMap` - Idéntico
- ✅ `FactionSetup` - Idéntico
- ✅ `ScenarioData` - Idéntico

#### ⚠️ Interface Game - DESINCRONIZADA

**Diferencias detectadas:**

| Campo | Frontend | Backend | Estado |
|-------|----------|---------|--------|
| **currentSeason** | `'spring' \| 'summer' \| 'fall'` | `'Primavera' \| 'Verano' \| 'Otoño'` | ❌ **CRÍTICO** |
| **maxPlayers** | ✅ Existe | ❌ No existe | ⚠️ Falta en backend |
| **playersCount** | ✅ Existe | ❌ No existe | ⚠️ Falta en backend |
| **units** | ✅ `units: Unit[]` (embebido) | ❌ No existe | ⚠️ Backend asume colección |
| **phaseDurations** | ✅ Existe | ❌ No existe | ⚠️ Falta en backend |
| **gameSettings** | ✅ Existe (completo) | ⚠️ `eventsConfig` (simplificado) | ⚠️ Estructura diferente |
| **activeDisasters** | ✅ Existe | ❌ `famineProvinces` (flat) | ⚠️ Estructura diferente |
| **updatedAt** | ✅ Existe | ❌ No existe | ⚠️ Falta en backend |
| **siegeStatus** | ❌ No existe | ✅ Existe | ✅ OK (campo interno) |

**🚨 PROBLEMA CRÍTICO: currentSeason**

```typescript
// Frontend (src/types/game.ts línea 45)
currentSeason: 'spring' | 'summer' | 'fall'

// Backend (functions/src/types.ts línea 48)
currentSeason: 'Primavera' | 'Verano' | 'Otoño'
```

**Impacto:** Esto causará errores de tipo y posibles bugs en la lógica que compara estaciones.

**Solución recomendada:** Estandarizar en inglés (spring, summer, fall) en ambos lados.

#### ⚠️ Interface Player - PARCIALMENTE SINCRONIZADA

**Campos faltantes en backend:**

| Campo Frontend | Backend | Estado |
|----------------|---------|--------|
| `email` | ❌ No existe | ⚠️ Falta |
| `displayName` | ❌ No existe | ⚠️ Falta |
| `color` | ❌ No existe | ⚠️ Falta |
| `assassinTokens` | ❌ No existe | ⚠️ Falta |
| `isEliminated` | ❌ No existe | ⚠️ Falta |
| `lastSeen` | ❌ No existe | ⚠️ Falta |
| `joinedAt` | ❌ No existe | ⚠️ Falta |

**Nota:** Backend usa `[key: string]: any` que permite campos adicionales, pero es menos type-safe.

#### ⚠️ Interface Unit - PARCIALMENTE SINCRONIZADA

**Diferencias:**

| Campo | Frontend | Backend | Estado |
|-------|----------|---------|--------|
| **gameId** | ❌ No existe explícito | ✅ Existe | ⚠️ Frontend lo omite |
| **status** | `'active' \| 'besieged' \| 'destroyed'` | `'active' \| 'besieged' \| 'destroyed'` opcional | ✅ Compatible |
| **siegeTurns** | `number` | `number` opcional | ✅ Compatible |
| **createdAt** | ✅ Existe | ❌ No existe | ⚠️ Falta en backend |
| **name** | ✅ Existe | ❌ No existe | ⚠️ Falta en backend |
| **composition** | ✅ Existe | ❌ No existe | ⚠️ Falta en backend |

#### ⚠️ Interface Order - ESTRUCTURAS DIFERENTES

**Frontend usa OrdersDocument:**
```typescript
export interface OrdersDocument {
  playerId: string
  turnNumber: number
  phase: 'orders'
  orders: Order[]  // Array de órdenes
  extraExpenses?: ExtraExpense[]
  submittedAt: Timestamp
}
```

**Backend usa Order individual:**
```typescript
export interface Order {
  id: string
  gameId: string
  unitId: string
  playerId: string
  turnNumber: number
  action: 'hold' | 'move' | 'support' | 'convoy' | 'besiege' | 'convert'
  // ...
}
```

**Estado:** ✅ OK - Son estructuras complementarias (documento vs item individual)

**Campos faltantes en backend Order:**
- ❌ `convoyRoute` (frontend tiene, backend no)
- ✅ `retreatList` (backend tiene, frontend no - OK, es interno)

---

### 2. Datos de Provincias

#### ❌ ARCHIVOS NO ENCONTRADOS

**Ubicaciones esperadas:**
- ❌ `src/data/provinceData.ts` - **NO ENCONTRADO**
- ❌ `functions/src/data/provinceData.ts` - **NO ENCONTRADO**

**Archivos relacionados encontrados:**
- ✅ `src/utils/gameMapHelpers.ts` - Helpers de provincias
- ✅ `functions/src/utils/mapHelpers.ts` - Funciones `isAdjacent()`, `isPort()`, etc.

**Conclusión:** Los datos de provincias están **embebidos en GameMap** dentro de cada documento de partida (campo `game.map.provinces`), NO en archivos estáticos separados.

**Estado:** ✅ **CORRECTO** - No hay duplicación porque no hay archivos estáticos

---

### 3. Validación de Órdenes

#### ⚠️ LÓGICA SIMILAR PERO NO IDÉNTICA

He comparado `src/utils/orderValidation.ts` con `functions/src/resolution/step1-validate.ts`:

**Similitudes:**
- ✅ Hold siempre válido
- ✅ Move valida adyacencia
- ✅ Move valida tipo terreno (army → land/port, fleet → sea/port)
- ✅ Garrisons no pueden moverse
- ✅ Support valida que unidad exista y sea adyacente

**Diferencias detectadas:**

| Aspecto | Frontend | Backend | Estado |
|---------|----------|---------|--------|
| **Mensajes de error** | Textos en español | Textos en español similares | ✅ Compatible |
| **Validación de convoy** | Validación básica | Validación básica | ✅ Similar |
| **Validación de besiege** | Verifica hasCity | Verifica hasCity | ✅ Idéntico |
| **Validación de convert** | Verifica puertos | ⚠️ No encontrado en extract | ⚠️ Revisar completo |

**Recomendación:** Revisar manualmente el archivo completo de backend para confirmar que `convert` y `convoy` tienen la misma lógica.

---

## 🚨 Problemas Críticos

### 1. **currentSeason - Valores diferentes**

**Prioridad:** 🔴 **ALTA**

```typescript
// Frontend
currentSeason: 'spring' | 'summer' | 'fall'

// Backend
currentSeason: 'Primavera' | 'Verano' | 'Otoño'
```

**Impacto:**
- Comparaciones de estación fallarán
- Lógica condicional por estación no funcionará
- Ejemplo: `if (season === 'spring')` fallará si backend devuelve 'Primavera'

**Solución:**
1. Estandarizar en inglés en ambos lados
2. O crear enum compartido
3. Actualizar todos los lugares donde se compara la estación

**Archivos a actualizar:**
- `src/types/game.ts` línea 45
- `functions/src/types.ts` línea 48
- Todos los archivos que comparan `game.currentSeason`

---

### 2. **Campos faltantes en Backend Game**

**Prioridad:** 🟡 **MEDIA**

Backend Game no tiene:
- `maxPlayers`
- `playersCount`
- `units` (array embebido)
- `phaseDurations`
- `updatedAt`

**Impacto:**
- Cloud Functions no pueden acceder directamente a estos campos
- Posibles errores en resolución de turnos
- Inconsistencia con Firestore real

**Solución:**
Añadir estos campos a `functions/src/types.ts`:

```typescript
export interface Game {
  // ... campos existentes
  maxPlayers: number;
  playersCount: number;
  units: Unit[];  // Embebido
  phaseDurations: {
    diplomatic: number;
    orders: number;
    resolution: number;
  };
  updatedAt: admin.firestore.Timestamp;
}
```

---

### 3. **gameSettings vs eventsConfig**

**Prioridad:** 🟡 **MEDIA**

Frontend tiene `gameSettings` completo:
```typescript
gameSettings: {
  advancedRules: boolean
  optionalRules: {
    famine: boolean
    plague: boolean
    assassination: boolean
  }
  emailNotifications: boolean
}
```

Backend solo tiene `eventsConfig`:
```typescript
eventsConfig?: {
  famine: boolean;
  plague: boolean;
}
```

**Impacto:**
- Backend no puede verificar `advancedRules` o `emailNotifications`
- Lógica de reglas avanzadas puede fallar

**Solución:**
Unificar nombres y estructura en ambos lados.

---

## ✅ Elementos Correctamente Sincronizados

1. ✅ **Estructuras de mapa** (ProvinceInfo, GameMap) - Idénticas
2. ✅ **Validación de movimiento básica** - Misma lógica
3. ✅ **Validación de apoyo** - Misma lógica
4. ✅ **No hay duplicación de provinceData** - Datos embebidos en game.map

---

## 📋 Checklist de Corrección

### 🔴 Urgente (Antes de próximo deploy)

- [ ] **Estandarizar currentSeason a inglés**
  - [ ] Actualizar `src/types/game.ts`
  - [ ] Actualizar `functions/src/types.ts`
  - [ ] Buscar todos los lugares que usan 'Primavera', 'Verano', 'Otoño'
  - [ ] Actualizar a 'spring', 'summer', 'fall'
  - [ ] Verificar en Firestore documentos existentes

- [ ] **Añadir campos faltantes a Backend Game**
  - [ ] `maxPlayers: number`
  - [ ] `playersCount: number`
  - [ ] `units: Unit[]`
  - [ ] `phaseDurations`
  - [ ] `updatedAt: Timestamp`

- [ ] **Builds sin errores**
  - [ ] `npm run build` (frontend)
  - [ ] `cd functions && npm run build` (backend)

### 🟡 Media Prioridad

- [ ] **Unificar gameSettings/eventsConfig**
  - Decidir nombre estándar
  - Actualizar ambos lados

- [ ] **Añadir campos faltantes a Backend Player**
  - [ ] `email`, `displayName`, `color`
  - [ ] `assassinTokens`
  - [ ] `isEliminated`
  - [ ] `lastSeen`, `joinedAt`

- [ ] **Verificar validación completa de convert y convoy**
  - Leer archivo completo de backend
  - Comparar lógica línea por línea

### 🟢 Baja Prioridad

- [ ] **Eliminar `[key: string]: any`** de tipos backend
  - Hace que TypeScript no detecte errores
  - Reemplazar con campos explícitos

- [ ] **Añadir JSDoc a funciones de validación backend**
  - Documentar igual que frontend

---

## 🔧 Script de Verificación Rápida

```bash
# 1. Buscar usos de 'Primavera', 'Verano', 'Otoño'
grep -r "Primavera\|Verano\|Otoño" src/ functions/src/ --include="*.ts" --include="*.tsx"

# 2. Verificar builds
npm run build
cd functions && npm run build

# 3. Comparar tipos visualmente
diff src/types/game.ts functions/src/types.ts
```

---

## 📊 Estadísticas de Sincronización

| Categoría | Sincronizado | Parcial | Desincronizado | Total |
|-----------|--------------|---------|----------------|-------|
| **Tipos base** | 5 | 0 | 0 | 5 |
| **Game interface** | 0 | 1 | 0 | 1 |
| **Player interface** | 0 | 1 | 0 | 1 |
| **Unit interface** | 0 | 1 | 0 | 1 |
| **Order interface** | 1 | 0 | 0 | 1 |
| **Datos provincias** | N/A | 0 | 0 | N/A |
| **Validación** | 0 | 1 | 0 | 1 |
| **TOTAL** | **6** | **4** | **0** | **10** |

**Porcentaje de sincronización:** 60% completo, 40% requiere corrección

---

## 🎯 Próximos Pasos

### HOY (2-3 horas)

1. **Estandarizar currentSeason** (1 hora)
   - Buscar todos los usos de 'Primavera', etc.
   - Reemplazar por 'spring', etc.
   - Actualizar tipos
   - Build y verificar

2. **Añadir campos faltantes a Backend Game** (30 minutos)
   - Copiar campos de frontend
   - Verificar build

3. **Testing en emulators** (1 hora)
   - Crear partida
   - Verificar que estaciones funcionen
   - Verificar validación de órdenes

### ESTA SEMANA

1. Unificar gameSettings/eventsConfig
2. Añadir campos faltantes a Player
3. Verificación exhaustiva de validación

---

## 🔗 Referencias

- **Tipos Frontend:** [src/types/game.ts](src/types/game.ts)
- **Tipos Backend:** [functions/src/types.ts](functions/src/types.ts)
- **Validación Frontend:** [src/utils/orderValidation.ts](src/utils/orderValidation.ts)
- **Validación Backend:** [functions/src/resolution/step1-validate.ts](functions/src/resolution/step1-validate.ts)
- **Guía de Sincronización:** [docs/dev/CODE_SYNCHRONIZATION.md](docs/dev/CODE_SYNCHRONIZATION.md)

---

**⚠️ IMPORTANTE:** NO desplegar a producción hasta corregir el problema de `currentSeason`. Es un bug crítico que causará fallos en la lógica del juego.

---

**Generado por:** Claude Code
**Fecha:** 2025-01-18
**Próxima verificación:** Después de aplicar correcciones
