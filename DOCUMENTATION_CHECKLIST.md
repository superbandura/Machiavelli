# Checklist de Documentación Pendiente

**Generado por:** Claude Code (comando /documenta)
**Fecha:** 2025-01-13

---

## Alta Prioridad

### Documentación Técnica

- [ ] **Verificar diagramas Mermaid**
  - Revisar que los 5 diagramas en arquitectura.md rendericen correctamente
  - Verificar que el diagrama ER en database.md sea preciso
  - Confirmar que los diagramas reflejen la arquitectura real

- [ ] **Sincronizar tipos frontend/backend**
  - Comparar `src/types/game.ts` vs `functions/src/types.ts`
  - Verificar que Game, Player, Unit, Order estén sincronizados
  - Documentar diferencias intencionales (Admin SDK vs SDK web)

- [ ] **Validar sincronización de provinceData.ts**
  - `diff src/data/provinceData.ts functions/src/data/provinceData.ts`
  - Confirmar que PROVINCE_ADJACENCIES sean idénticas
  - Verificar que las 74 provincias estén presentes en ambos archivos

- [ ] **Testing de validación dual**
  - Confirmar que orderValidation.ts (cliente) y step1-validate.ts (servidor) tengan misma lógica
  - Testing manual de órdenes inválidas en emulators
  - Verificar que órdenes inválidas se rechacen en ambos lados

- [ ] **Validar glosario**
  - Confirmar que términos de juego usen nomenclatura oficial
  - Revisar con equipo/jugadores si terminología es clara
  - Añadir términos faltantes si se identifican

---

## Media Prioridad

### Mejoras de Código

- [ ] **Añadir JSDoc a componentes principales**
  - `GameBoard.tsx` - Componente del mapa SVG
  - `OrdersPanel.tsx` - Panel de órdenes militares
  - `DiplomaticChat.tsx` - Chat entre jugadores
  - `TurnHistory.tsx` - Historial de turnos
  - `TreasuryPanel.tsx` - Panel económico
  - `ProvinceInfoPanel.tsx` - Info de provincias
  - `UnitMarker.tsx` - Marcadores de unidades

  **Formato recomendado:**
  ```typescript
  /**
   * [Descripción del componente]
   *
   * @component
   * @example
   * <ComponentName prop1="value" />
   */

  /**
   * Props para [ComponentName]
   */
  interface ComponentNameProps {
    /** [Descripción de prop1] */
    prop1: string
  }
  ```

- [ ] **Documentar utilidades con JSDoc**
  - `src/utils/orderValidation.ts` - Validación de órdenes
  - `src/utils/provinceHelpers.ts` - Helpers de provincias
  - `src/utils/gameMapHelpers.ts` - Helpers del mapa

  **Formato:**
  ```typescript
  /**
   * [Descripción de la función]
   *
   * @param param1 - [Descripción]
   * @param param2 - [Descripción]
   * @returns [Qué devuelve]
   * @throws {Error} [Cuándo lanza error]
   * @example
   * validateOrder(order, context)
   */
  ```

- [ ] **Mejorar comentarios en tipos complejos**
  - `src/types/game.ts` - Añadir comentarios a interfaces Game, Player, Unit
  - Explicar campos no obvios (visibleTo, assassinTokens, etc.)

### Documentación Existente

- [ ] **Consolidar documentos de fases**
  - Actualmente hay 5 documentos: fase-diplomatica.md, fase-ordenes.md, fase-resolucion.md, fases-overview.md, GAME_PHASES.md
  - **Decisión pendiente:** ¿Mantener separados o consolidar?
  - **Recomendación:** Mantener GAME_PHASES.md como fuente única, deprecar otros o convertirlos en referencias

- [ ] **Añadir ejemplos de código a arquitectura.md**
  - Ejemplos más detallados de listeners
  - Ejemplos de batch writes
  - Ejemplos de queries complejas

- [ ] **Revisar API_REFERENCE.md**
  - Verificar que todas las funciones exportadas en `functions/src/index.ts` estén documentadas
  - Añadir ejemplos de uso para cada función callable
  - Documentar parámetros y retornos

- [ ] **Actualizar CONTRIBUTING.md**
  - Añadir referencias a arquitectura.md y database.md
  - Incluir checklist de sincronización de código
  - Mencionar CODE_SYNCHRONIZATION.md en sección de desarrollo

---

## Baja Prioridad

### Herramientas y Automatización

- [ ] **Crear script de verificación de sincronización**
  - `scripts/verify-sync.ts`
  - Comparar tipos frontend vs backend
  - Verificar que provinceData.ts sean idénticos
  - Lanzar warnings si hay diferencias
  - Integrar en CI/CD (futuro)

- [ ] **Configurar TypeDoc (generación automática de API docs)**
  - Instalar TypeDoc: `npm install --save-dev typedoc`
  - Configurar typedoc.json
  - Generar docs automáticas desde JSDoc
  - Publicar en /docs/api (opcional)

- [ ] **Considerar Storybook para componentes UI**
  - Documentación visual de componentes
  - Testing de componentes aislados
  - Catálogo de UI components
  - **Decisión:** ¿Vale la pena el overhead?

- [ ] **Migrar diagramas Mermaid a PlantUML (opcional)**
  - PlantUML ofrece más control sobre diseño
  - Requiere más setup
  - **Decisión:** Solo si Mermaid no es suficiente

### Contenido

- [ ] **Capturas de pantalla para manuales de usuario**
  - MANUAL.md necesita screenshots del juego
  - QUICK_START.md necesita tutorial visual
  - Mostrar UI del lobby, mapa, panel de órdenes

- [ ] **Video tutorial (futuro lejano)**
  - Tutorial de 5-10 minutos en YouTube
  - Mostrar creación de partida, envío de órdenes, resolución

- [ ] **Internacionalización de documentación**
  - Traducir documentación clave al inglés
  - Mantener versión española como principal
  - **Decisión:** Solo si proyecto crece internacionalmente

---

## Seguimiento y Calidad

### Revisión de Calidad

- [ ] **Revisar todos los diagramas Mermaid**
  - Verificar sintaxis correcta
  - Confirmar que renderizan en GitHub
  - Asegurar que son comprensibles

- [ ] **Spell check completo**
  - Revisar ortografía en todos los .md
  - Verificar consistencia de terminología
  - Corregir typos

- [ ] **Verificar todos los enlaces internos**
  - Confirmar que todos los `[texto](./archivo.md)` funcionen
  - Verificar enlaces entre docs/
  - Asegurar que no hay links rotos

- [ ] **Probar documentación con nuevo desarrollador**
  - Pedir a alguien nuevo que siga CONTRIBUTING.md
  - Identificar puntos confusos
  - Mejorar documentación basándose en feedback

### Mantenimiento

- [ ] **Actualizar CHANGELOG.md**
  - Documentar cambios en documentación
  - Añadir entrada para creación de arquitectura.md, database.md, glosario.md

- [ ] **Crear commit específico para documentación**
  - Commit message: "docs: Add comprehensive technical documentation"
  - Incluir todos los nuevos archivos
  - No mezclar con cambios de código

- [ ] **Review con equipo**
  - Revisar nuevos docs con otros desarrolladores
  - Recoger feedback sobre claridad
  - Identificar gaps o confusiones

---

## Inconsistencias Detectadas

### ⚠️ Tipos Frontend vs Backend

**Diferencias encontradas:**

1. **Game interface:**
   - Frontend tiene `currentSeason: 'spring' | 'summer' | 'fall'`
   - Backend tiene `currentSeason: 'Primavera' | 'Verano' | 'Otoño'`
   - **Acción:** Verificar cuál se usa en Firestore y sincronizar

2. **Player interface:**
   - Frontend más completo (email, displayName, color, cities)
   - Backend más simple
   - **Acción:** Documentar diferencia intencional

3. **Order structure:**
   - Frontend usa `OrdersDocument` (agrupa órdenes por jugador)
   - Backend usa `Order` individual
   - **Acción:** Explicar en CODE_SYNCHRONIZATION.md

### ⚠️ Documentos de Fases Duplicados

**Archivos conflictivos:**
- `docs/reference/fase-diplomatica.md`
- `docs/reference/fase-ordenes.md`
- `docs/reference/fase-resolucion.md`
- `docs/reference/fases-overview.md`
- `docs/reference/GAME_PHASES.md` ← **Más completo**

**Acción recomendada:**
- Mantener GAME_PHASES.md como fuente única
- Mover otros a `docs/archive/` o eliminar
- Actualizar enlaces en INDEX.md

### ⚠️ Nomenclatura de Estaciones

**Inconsistencia:**
- Código usa: `'spring' | 'summer' | 'fall'` (inglés)
- Backend types usa: `'Primavera' | 'Verano' | 'Otoño'` (español)
- Documentación usa ambos

**Acción:**
- Definir estándar (recomendación: inglés en código, español en UI)
- Actualizar todos los archivos para ser consistentes
- Documentar decisión

---

## Métricas de Documentación

### Archivos Creados

**Total: 4 archivos**

1. **docs/reference/arquitectura.md** - 850+ líneas, 5 diagramas Mermaid
2. **docs/reference/database.md** - 1100+ líneas, 1 diagrama ER
3. **docs/reference/glosario.md** - 450+ líneas, 120+ términos
4. **docs/dev/CODE_SYNCHRONIZATION.md** - 700+ líneas

### Archivos Analizados

**Total: 50+ archivos**

**Frontend (25 archivos):**
- Todos los componentes .tsx
- Tipos en src/types/
- Utilidades en src/utils/
- Datos en src/data/

**Backend (15 archivos):**
- Functions en functions/src/
- Resolución en functions/src/resolution/
- Eventos en functions/src/events/

**Configuración (5 archivos):**
- firestore.rules
- firestore.indexes.json
- package.json
- vite.config.ts
- firebase.json

**Documentación (20+ archivos):**
- docs/reference/
- docs/dev/
- docs/user/
- docs/ops/

### Diagramas Generados

**Total: 6 diagramas Mermaid**

1. Arquitectura General (graph TB)
2. Flujo Asíncrono (sequenceDiagram)
3. Frontend Architecture (graph LR)
4. Backend Architecture (graph TD)
5. Ciclo de Vida de Turno (stateDiagram-v2)
6. Diagrama ER de Base de Datos (erDiagram)

### Líneas de Documentación

**Estimación:**
- arquitectura.md: ~850 líneas
- database.md: ~1100 líneas
- glosario.md: ~450 líneas
- CODE_SYNCHRONIZATION.md: ~700 líneas

**Total añadido: ~3100 líneas de documentación**

---

## Próximos Pasos Inmediatos

1. **Revisar y aprobar nuevos documentos**
   - Leer arquitectura.md completo
   - Verificar database.md contra esquema real
   - Validar glosario con equipo

2. **Actualizar docs/INDEX.md**
   - Añadir enlaces a nuevos documentos
   - Reorganizar si necesario

3. **Crear commit de documentación**
   ```bash
   git add docs/
   git commit -m "docs: Add comprehensive technical documentation

   - Add architecture.md with system design and 5 Mermaid diagrams
   - Add database.md with Firestore schema and ER diagram
   - Add glosario.md with 120+ game and technical terms
   - Add CODE_SYNCHRONIZATION.md with sync guidelines

   Generated with Claude Code"
   ```

4. **Priorizar tareas de Alta Prioridad**
   - Verificar diagramas Mermaid
   - Sincronizar tipos
   - Testing de validación

---

## Notas

**Documentación omitida intencionalmente:**

1. **JSDoc en componentes:** Requiere edición de 20+ archivos, alto riesgo de introducir errores. Mejor hacerlo incrementalmente.

2. **Modificación de docs/user/:** Por restricción explícita del comando /documenta.

3. **Modificación de docs/archive/:** Por restricción explícita del comando /documenta.

4. **Actualización exhaustiva de API_REFERENCE.md:** Requiere análisis profundo de cada función. Pendiente para siguiente sesión.

**Decisiones de diseño:**

- Usar Mermaid en vez de PlantUML por simplicidad
- Mantener arquitectura flat de Firestore (no migrar a nested)
- Sincronización manual de código (no monorepo aún)
- Documentación en español (código en inglés)

---

**Creado:** 2025-01-13
**Por:** Claude Code (comando /documenta)
**Próxima revisión:** Después de implementar Alta Prioridad
