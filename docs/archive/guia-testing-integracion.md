# Guía de Testing de Integración

## 📋 Descripción

Este documento describe cómo ejecutar el **testing de integración completo** del juego Machiavelli. El script `test-integration-game.ts` simula una partida completa desde el inicio hasta el final, verificando que todos los sistemas funcionen correctamente juntos.

---

## 🎯 ¿Qué se Testea?

El script de integración verifica:

### 1. ✅ Creación de Partida y Jugadores
- Creación de documento de partida en Firestore
- Creación de 5 jugadores con facciones diferentes
- Configuración inicial correcta

### 2. ✅ Fase Diplomática
- Envío de órdenes diplomáticas
- Tracking de jugadores que han enviado órdenes
- Estado de la partida durante la fase

### 3. ✅ Avance de Fase
- Transición de diplomatic → orders
- Reset de flags de jugadores
- Notificaciones de cambio de fase

### 4. ✅ Fase de Órdenes Militares
- Envío de órdenes militares
- Verificación de que todos los jugadores participan
- Estado actualizado correctamente

### 5. ✅ Avance de Turno
- Incremento del turnNumber
- Retorno a fase diplomática
- Nueva deadline configurada

### 6. ✅ Sistema de Recordatorios
- Configuración de deadline 24h en el futuro
- Verificación de que el sistema puede detectarlo
- Tracking de recordatorios enviados

### 7. ✅ Sistema de Inactividad
- Incremento de strikes de inactividad
- Notificaciones de advertencia (1/3, 2/3, 3/3)
- Manejo de jugadores inactivos

### 8. ✅ Finalización de Partida
- Declaración de ganador
- Actualización de status a 'finished'
- Notificaciones de fin de partida a todos

---

## 🚀 Cómo Ejecutar el Testing

### Opción 1: Con Firebase Emulator (Recomendado)

**Ventajas**:
- No afecta datos reales
- Más rápido
- Se puede ejecutar offline
- Datos se limpian automáticamente

**Pasos**:

1. **Terminal 1 - Iniciar Emulator**:
```bash
cd "C:\Users\Usuario\Documents\Adrián\Machiavelli"
firebase emulators:start
```

Esto iniciará:
- Firestore Emulator en `localhost:8080`
- Functions Emulator en `localhost:5001`
- Auth Emulator en `localhost:9099`
- Emulator UI en `localhost:4000`

2. **Terminal 2 - Ejecutar Tests**:
```bash
cd "C:\Users\Usuario\Documents\Adrián\Machiavelli\functions"
npx ts-node src/test-integration-game.ts
```

3. **Ver Resultados**:
- Los resultados se mostrarán en la terminal
- Puedes ver los datos en Emulator UI: http://localhost:4000

---

### Opción 2: Con Firestore Real (No Recomendado)

**⚠️ ADVERTENCIA**: Esto afectará tus datos reales en Firestore.

**Solo usar si**:
- Quieres probar en un entorno real
- Tienes un proyecto de desarrollo separado

**Pasos**:

1. Editar `test-integration-game.ts` línea 29:
```typescript
const USE_EMULATOR = false; // Cambiar a false
```

2. Asegurarte de tener credenciales de Firebase Admin configuradas

3. Ejecutar:
```bash
cd "C:\Users\Usuario\Documents\Adrián\Machiavelli\functions"
npx ts-node src/test-integration-game.ts
```

---

## 📊 Salida Esperada

### Ejemplo de Output Exitoso

```
============================================================
🎮 TESTING DE INTEGRACIÓN - PARTIDA COMPLETA
============================================================
Modo: EMULATOR
============================================================

🧹 Limpiando datos de prueba...
✅ Todos los datos de prueba limpiados

============================================================
🧪 TEST 1: CREACIÓN DE PARTIDA Y JUGADORES
============================================================

📝 Creando partida de prueba...
✅ Partida creada: abc123xyz
  ✅ Jugador 1: Marco_Polo (Venecia)
  ✅ Jugador 2: Ludovico_Sforza (Milán)
  ✅ Jugador 3: Lorenzo_Medici (Florencia)
  ✅ Jugador 4: Papa_Alessandro (Estados Papales)
  ✅ Jugador 5: Alfonso_V (Nápoles)

📊 Estado de la partida:
  - Fase actual: diplomatic
  - Turno: 1
  - Estado: active
  - Deadline: 13/10/2025 15:30:00

👥 Jugadores (5 total):
  ✅ ⏳ Marco_Polo (Venecia)
  ✅ ⏳ Ludovico_Sforza (Milán)
  ✅ ⏳ Lorenzo_Medici (Florencia)
  ✅ ⏳ Papa_Alessandro (Estados Papales)
  ✅ ⏳ Alfonso_V (Nápoles)

✅ Test 1 completado: Partida creada correctamente

============================================================
🧪 TEST 2: FASE DIPLOMÁTICA
============================================================

📧 Verificando que todos los jugadores reciban notificación de fase...
   (En modo desarrollo, las notificaciones se simulan en logs)

📝 Simulando envío de órdenes diplomáticas...
  ✅ Marco_Polo envió órdenes
  ✅ Ludovico_Sforza envió órdenes
  ✅ Lorenzo_Medici envió órdenes
  ⏳ Papa_Alessandro no envió órdenes
  ⏳ Alfonso_V no envió órdenes

👥 Jugadores (5 total):
  ✅ 📝 Marco_Polo (Venecia)
  ✅ 📝 Ludovico_Sforza (Milán)
  ✅ 📝 Lorenzo_Medici (Florencia)
  ✅ ⏳ Papa_Alessandro (Estados Papales)
  ✅ ⏳ Alfonso_V (Nápoles)

✅ Test 2 completado: Fase diplomática funciona correctamente

... (continúa con los demás tests)

============================================================
✅ TODOS LOS TESTS PASARON EXITOSAMENTE
============================================================

📋 Resumen de Tests:
  ✅ Test 1: Creación de partida
  ✅ Test 2: Fase diplomática
  ✅ Test 3: Avance a fase de órdenes
  ✅ Test 4: Fase de órdenes militares
  ✅ Test 5: Avance de turno
  ✅ Test 6: Sistema de recordatorios
  ✅ Test 7: Inactividad de jugadores
  ✅ Test 8: Finalización de partida

📧 Verificación de Emails:
  - Notificaciones de cambio de fase: ✅
  - Recordatorios de deadline: ✅
  - Advertencias de inactividad: ✅
  - Notificación de fin de partida: ✅

💡 Nota: En modo desarrollo, los emails se simulan con logs.
   Para ver emails reales, configura SendGrid en producción.

🧹 Limpiando datos de prueba...
✅ Datos limpiados

🎉 Testing de integración completado!
```

---

## 🔍 Verificación de Emails

Durante el testing, el sistema **NO envía emails reales** porque está en modo desarrollo. En su lugar:

1. **Logs en la consola**: Verás mensajes como:
   ```
   === EMAIL SIMULATION (Development Mode) ===
   To: marco.polo@venezia.it
   Subject: [Machiavelli] Nueva fase: Diplomacia - Test Game
   HTML length: 3207 characters
   === END EMAIL SIMULATION ===
   ```

2. **Logs de Firebase Functions** (si corres las functions reales):
   - checkDeadlines se ejecutará cada 1 minuto
   - Verás logs de notificaciones enviadas

3. **Para activar emails reales**:
   - Configura SendGrid según `docs/testing-emails-resultados.md`
   - Descomentar código en `emailService.ts` líneas 42-55

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'firebase-admin'"
**Solución**: Instalar dependencias
```bash
cd functions
npm install
```

### Error: "ECONNREFUSED localhost:8080"
**Problema**: El emulator no está corriendo

**Solución**: Iniciar el emulator en otra terminal
```bash
firebase emulators:start
```

### Error: "Top-level 'await' expressions are only allowed..."
**Problema**: Versión incorrecta de Node.js

**Solución**: Asegurarte de usar Node.js 20+
```bash
node --version  # Debe ser >= 20.0.0
```

### Error: "Permission denied"
**Problema**: No tienes permisos en Firestore real

**Solución**: Usar el emulator (opción 1)

---

## 📝 Modificar el Script de Testing

### Cambiar los Jugadores de Prueba
Editar `test-integration-game.ts` líneas 52-58:

```typescript
const TEST_PLAYERS_DATA = [
  { username: 'Tu_Usuario', email: 'tu@email.com', faction: 'venice' },
  // ... más jugadores
];
```

### Cambiar el Número de Turnos
Añadir un loop en la función principal:

```typescript
// Simular 3 turnos completos
for (let i = 0; i < 3; i++) {
  await test2_DiplomaticPhase(testGame);
  await test3_AdvanceToOrders(testGame);
  await test4_OrdersPhase(testGame);
  await test5_AdvanceTurn(testGame);
}
```

### Simular Más Scenarios
Añadir nuevas funciones de test:

```typescript
async function test9_PlayerElimination(gameData: TestGameData): Promise<void> {
  console.log('\n🪦 TEST 9: ELIMINACIÓN DE JUGADOR');

  const player = gameData.players[0];
  await db.collection('players').doc(player.id).update({
    isAlive: false
  });

  console.log(`✅ ${player.username} ha sido eliminado`);
}
```

---

## 🎯 Siguiente Paso: Testing con Usuarios Reales

Una vez que los tests automatizados pasen, el siguiente paso es:

### 1. Deploy a Producción
```bash
firebase deploy
```

### 2. Crear Partida de Prueba Beta
- Invitar a 3-5 personas de confianza
- Jugar una partida completa
- Recopilar feedback sobre bugs y UX

### 3. Monitorear Logs
```bash
firebase functions:log
```

### 4. Verificar Emails Reales
- Configurar SendGrid
- Verificar que lleguen correctamente
- Revisar spam/carpetas

---

## 📚 Archivos Relacionados

- `functions/src/test-integration-game.ts` - Script de testing (578 líneas)
- `functions/src/checkDeadlines.ts` - Cloud Scheduler principal
- `functions/src/email/notificationService.ts` - Sistema de notificaciones
- `firebase.json` - Configuración del emulator

---

## ✅ Checklist de Testing Completo

Antes de considerar el sistema listo para producción:

- [ ] Test de integración automatizado pasa 100%
- [ ] Emails simulados aparecen en logs correctamente
- [ ] Emulator funciona sin errores
- [ ] Compilation de TypeScript sin errores (0 warnings)
- [ ] Firebase Emulator UI muestra datos correctos
- [ ] Sistema de recordatorios funciona (24h antes)
- [ ] Sistema de inactividad incrementa strikes correctamente
- [ ] Limpieza de datos funciona correctamente
- [ ] Documentación está actualizada
- [ ] SendGrid configurado (opcional, para producción)
- [ ] Partida beta con usuarios reales exitosa
- [ ] Logs de producción monitoreados durante 1 semana

---

**Última actualización**: Octubre 2025
**Versión del sistema**: Fase 8 completada
**Autor**: Testing de Integración - Machiavelli
