# Scripts de Migración

## migrate-reinforcements.ts

**Propósito**: Añadir el campo `estimatedArrivalDay` a todos los refuerzos existentes que no lo tengan.

**Problema que soluciona**: Los refuerzos creados antes de implementar el sistema de días de llegada no tienen el campo `estimatedArrivalDay`, lo que causa que los días se recalculen aleatoriamente cada vez que se abre el modal.

**Qué hace**:
1. Busca todas las campañas en Firestore
2. Para cada campaña con refuerzos:
   - Verifica si cada refuerzo tiene `estimatedArrivalDay`
   - Si falta, genera un valor aleatorio (4-10 días desde el turno actual del juego)
   - Actualiza la campaña en Firestore

**Cómo ejecutar**:

### Opción 1: Contra los emuladores (desarrollo)
```bash
# Terminal 1: Iniciar emuladores
firebase emulators:start

# Terminal 2: Ejecutar migración
export FIRESTORE_EMULATOR_HOST="localhost:8080"
npx tsx scripts/migrate-reinforcements.ts
```

### Opción 2: Contra producción (con cuidado)
```bash
# Asegúrate de tener el archivo serviceAccountKey.json en el directorio raíz
npx tsx scripts/migrate-reinforcements.ts
```

**Salida esperada**:
```
🚀 Iniciando migración de refuerzos...

📊 Encontradas 3 campañas

📍 Campaña campaign-123 (Juego: game-456, Turno: 5)
   ✏️  Refuerzo reinforcement-player1-789: añadiendo estimatedArrivalDay = 12 (7d desde turno 5)
   ✅ Campaña actualizada

📍 Campaña campaign-abc (Juego: game-def, Turno: 3)
   ℹ️  Todos los refuerzos ya tienen estimatedArrivalDay

📈 Resumen de migración:
   - Campañas procesadas: 2
   - Campañas actualizadas: 1
   - Sin cambios: 1

✅ Migración completada exitosamente!
```

**Seguridad**:
- ✅ No elimina datos existentes
- ✅ Solo añade el campo faltante
- ✅ Idempotente (se puede ejecutar múltiples veces sin problema)
- ⚠️ Modifica datos en Firestore

**Cuándo ejecutar**:
- Después de desplegar los cambios del sistema de refuerzos
- Antes de que los usuarios empiecen a ver días cambiantes en refuerzos existentes
- Solo necesitas ejecutarlo UNA vez por ambiente (desarrollo/producción)

**Notas**:
- Los nuevos refuerzos creados después del deploy ya tendrán `estimatedArrivalDay` desde el frontend (ReinforcementsTab)
- Esta migración solo es necesaria para datos históricos
