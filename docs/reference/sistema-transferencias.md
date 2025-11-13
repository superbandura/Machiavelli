# Sistema de Transferencias Económicas - Interfaz de Usuario

## Visión General

El sistema de transferencias permite a los jugadores enviar ducados a otros jugadores durante la **Fase de Órdenes** para cumplir acuerdos diplomáticos negociados previamente. Las transferencias se procesan automáticamente durante la **Fase de Resolución**.

---

## 1. Ubicación en la Interfaz

### Panel de Órdenes - Pestaña "Tesorería y Gastos"

```
┌─────────────────────────────────────────────────────────┐
│ ⚔️ ÓRDENES MILITARES │ 💰 TESORERÍA Y GASTOS │ 📜 RESUMEN │
└─────────────────────────────────────────────────────────┘
                              ↑ ACTIVA
┌─────────────────────────────────────────────────────────┐
│                                                          │
│ 💰 SALDO ACTUAL: 45 ducados                             │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│ 💸 TRANSFERENCIAS DE DINERO                             │
│                                                          │
│ Envía ducados a otros jugadores para cumplir acuerdos   │
│ diplomáticos. Las transferencias se procesan durante     │
│ la resolución (no son reversibles).                      │
│                                                          │
│ [+ Nueva Transferencia]                                  │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Transferencia #1                                    │ │
│ │                                                     │ │
│ │ Para: [Venecia ▼]                                   │ │
│ │ Cantidad: [10] ducados                              │ │
│ │ Nota: [Pago por apoyo militar acordado]             │ │
│ │       (opcional, máx. 100 caracteres)               │ │
│ │                                                     │ │
│ │ [❌ Eliminar]                                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│ 💊 OTROS GASTOS                                          │
│                                                          │
│ [ ] Retirar Hambre (3 ducados)                          │
│ [ ] Retirar Peste (12 ducados)                          │
│ [ ] Asesinato (10 ducados + 1 ficha) → [Objetivo ▼]     │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│ 📊 RESUMEN DE GASTOS:                                    │
│ • Transferencia a Venecia: -10 ducados                  │
│ ────────────────────────────────────                    │
│ Total gastos: -10 ducados                               │
│ Saldo proyectado: 35 ducados ✓                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Flujo de Usuario Completo

### **Paso 1: Negociación en Fase Diplomática**

```
┌─────────────────────────────────────────────────────────┐
│ 💬 Conversación con Venecia                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [Tú - Florencia] 10:30                                  │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Necesito tu apoyo para atacar Módena. ¿Qué      │    │
│ │ quieres a cambio?                                │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│                      [Venecia] 10:35                     │
│    ┌──────────────────────────────────────────────────┐ │
│    │ Te apoyo si me pagas 10 ducados. Y que no      │ │
│    │ ataques mis territorios en 2 turnos.            │ │
│    └──────────────────────────────────────────────────┘ │
│                                                          │
│ [Tú - Florencia] 10:37                                  │
│ ┌──────────────────────────────────────────────────┐    │
│ │ De acuerdo. Te enviaré el pago en la fase de    │    │
│ │ órdenes. Pacto de no agresión aceptado.          │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│                      [Venecia] 10:40                     │
│    ┌──────────────────────────────────────────────────┐ │
│    │ Perfecto. Tenemos un trato. 🤝                  │ │
│    └──────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **Paso 2: Fase de Órdenes - Florencia cumple el acuerdo**

**A. Introducir órdenes militares:**
```
⚔️ ÓRDENES MILITARES:
✅ Ejército 1 (Toscana) → Avanzar a Módena
✅ Ejército 2 (Pisa) → Mantener
```

**B. Añadir transferencia:**
```
💰 TESORERÍA Y GASTOS:
Saldo actual: 45 ducados

[Click en "+ Nueva Transferencia"]

→ Formulario se expande:
  Para: [Seleccionar Venecia del dropdown]
  Cantidad: [Escribir "10"]
  Nota: [Escribir "Pago por apoyo en Módena"]

[Click en "Guardar"]

→ Transferencia añadida
→ Saldo proyectado actualizado: 35 ducados
```

### **Paso 3: Fase de Órdenes - Venecia decide**

**Opción A: Venecia cumple (honorable 🤝):**
```
⚔️ ÓRDENES MILITARES:
✅ Ejército 2 (Padua) → Apoyar Ejército 1 de Florencia
```

**Opción B: Venecia traiciona (maquiavélica 😈):**
```
⚔️ ÓRDENES MILITARES:
✅ Ejército 2 (Padua) → Mantener (NO apoya)
✅ Ejército 3 (Verona) → Avanzar a Mantua (ataca territorio de Florencia)
```

### **Paso 4: Resolución Automática**

```
⚙️ PROCESANDO TURNO 5 - VERANO...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Paso 1: Validación de órdenes ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Paso 2: Transacciones Económicas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Procesando transferencias...

✅ Florencia → Venecia: 10 ducados
   Florencia: 45 → 35 ducados
   Venecia: 20 → 30 ducados
   Nota: "Pago por apoyo en Módena"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Paso 3: Resolución de Movimientos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ Ejército 1 (Florencia) avanza a Módena
→ Ejército 2 (Venecia) apoya a Ejército 1 ← Cumplió

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Paso 4: Batallas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Módena:
Atacante: Florencia (1) + Venecia apoyo (1) = 2
Defensor: Milán (1) = 1
🏆 Victoria: Florencia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TURNO RESUELTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### **Paso 5: Visualización del Historial**

```
┌─────────────────────────────────────────────────────────┐
│ 📜 HISTORIAL - TURNO 5 - VERANO                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 💰 TRANSACCIONES ECONÓMICAS                             │
│                                                          │
│ ✅ Florencia transfirió 10 ducados a Venecia            │
│    💬 "Pago por apoyo en Módena"                        │
│    📊 Florencia: 45 → 35 ducados                        │
│    📊 Venecia: 20 → 30 ducados                          │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│ ⚔️ MOVIMIENTOS MILITARES                                │
│                                                          │
│ → Ejército 1 (Florencia): Toscana → Módena             │
│ → Ejército 2 (Venecia): Apoyó a Ejército 1              │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│ ⚔️ BATALLAS                                              │
│                                                          │
│ 📍 Módena                                                │
│ • Atacante: Florencia (fuerza 2)                        │
│ • Defensor: Milán (fuerza 1)                            │
│ • 🏆 Victoria: Florencia                                │
│ • Milán retiró a Mantua                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Validaciones y Mensajes de Error

### **Error 1: Fondos Insuficientes**

```
❌ Error al guardar transferencia

No tienes suficientes ducados para esta transferencia.

Saldo disponible: 8 ducados
Transferencia solicitada: 10 ducados
Déficit: 2 ducados

[Ajustar cantidad] [Cancelar]
```

### **Error 2: Transferencia a sí mismo**

```
❌ Error al guardar transferencia

No puedes transferir dinero a ti mismo.
Selecciona otro jugador como receptor.

[Entendido]
```

### **Error 3: Cantidad inválida**

```
❌ Error al guardar transferencia

La cantidad debe ser mayor a 0 y menor o igual a 999.

[Corregir]
```

### **Advertencia: Riesgo de Traición**

```
⚠️ Confirmar Transferencia

Estás a punto de transferir 10 ducados a Venecia.

IMPORTANTE:
• La transferencia NO es reversible
• Se procesará automáticamente durante la resolución
• El receptor puede NO cumplir los acuerdos diplomáticos

¿Estás seguro de que confías en Venecia?

[Sí, enviar] [No, cancelar]
```

---

## 4. Casos Especiales

### **Caso 1: Transferencia Fallida en Resolución**

Si el jugador gastó más dinero del disponible entre la orden y la resolución:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Paso 2: Transacciones Económicas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Florencia intentó transferir 10 ducados a Venecia
   Motivo: Fondos insuficientes (saldo: 5 ducados)
   Venecia NO recibió el dinero
```

### **Caso 2: Múltiples Transferencias**

```
💰 TESORERÍA Y GASTOS:
Saldo actual: 50 ducados

Transferencias:
┌─────────────────────────────────────────────────────────┐
│ #1: Venecia → 10 ducados                                 │
│     "Pago por apoyo militar"                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #2: Papado → 5 ducados                                   │
│     "Préstamo a devolver en 2 turnos"                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #3: Francia → 15 ducados                                 │
│     "Pago por pacto de no agresión"                      │
└─────────────────────────────────────────────────────────┘

Total transferencias: -30 ducados
Saldo proyectado: 20 ducados ✓
```

### **Caso 3: Traición Descubierta en el Historial**

```
📜 HISTORIAL - TURNO 6 - OTOÑO

💰 TRANSACCIONES:
✅ Florencia transfirió 10 ducados a Venecia

⚔️ MOVIMIENTOS:
→ Ejército 2 (Venecia): MANTUVO posición
   ⚠️ NO apoyó a Florencia como prometió

⚔️ BATALLAS:
📍 Módena:
• Florencia atacó SIN apoyo (fuerza 1)
• Milán defendió (fuerza 1)
• ⚔️ Standoff: Ninguno ganó

💬 COMENTARIO:
¡Venecia traicionó el acuerdo! Recibió el dinero pero
no cumplió su promesa de apoyo militar. 😈
```

---

## 5. Integración con Chat Diplomático

### **Botón Rápido en el Chat**

```
┌─────────────────────────────────────────────────────────┐
│ 💬 Conversación con Venecia                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [Venecia] "Acepto el trato. Envíame los 10 ducados"    │
│                                                          │
│ [💸 Enviar Dinero] [Escribir mensaje...]                │
│         ↑                                                │
│         └─ Click aquí                                    │
│                                                          │
│ → Se abre modal:                                         │
│   ┌─────────────────────────────────────────┐          │
│   │ Enviar dinero a Venecia                 │          │
│   │                                         │          │
│   │ Cantidad: [10] ducados                  │          │
│   │ Saldo actual: 45 ducados                │          │
│   │                                         │          │
│   │ Nota (opcional):                        │          │
│   │ [Pago acordado por apoyo militar]       │          │
│   │                                         │          │
│   │ ⚠️ Se procesará en la fase de órdenes  │          │
│   │                                         │          │
│   │ [Confirmar] [Cancelar]                  │          │
│   └─────────────────────────────────────────┘          │
│                                                          │
│ → Al confirmar:                                          │
│   ✅ Transferencia añadida a tus órdenes                │
│   💬 Mensaje automático enviado:                        │
│      "He programado la transferencia de 10 ducados"     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Notificaciones

### **Email de Transferencia Recibida**

```
Asunto: [Machiavelli] Has recibido ducados - Italia 1454

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TURNO 5 - VERANO - RESUELTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 TRANSFERENCIA RECIBIDA

Florencia te ha enviado 10 ducados

💬 Mensaje: "Pago por apoyo militar acordado"

📊 Tu tesorería:
Saldo anterior: 20 ducados
Recibido: +10 ducados
Saldo actual: 30 ducados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Ver Historial Completo]

Nueva fase diplomática en curso.
Deadline: Domingo 16/03 a las 18:00
```

---

## 7. Consideraciones de Seguridad

### **Security Rules en Firestore**

```javascript
// Solo el propietario puede crear transferencias en sus órdenes
match /games/{gameId}/orders/{playerId}/turns/{turnId} {
  allow create, update: if request.auth.uid == playerId &&
    // Validar que está en fase de órdenes
    getGame(gameId).currentPhase == 'orders' &&
    // Validar transferencias
    validateTransfers(request.resource.data.extraExpenses);
}

function validateTransfers(expenses) {
  // No puede transferir a sí mismo
  // Cantidad debe ser positiva
  // Target debe ser un jugador válido de la partida
  return expenses.where(e => e.type == 'transfer')
    .all(t => t.target != request.auth.uid &&
              t.amount > 0 &&
              t.amount <= 999);
}
```

---

## 8. Resumen del Flujo Técnico

```
┌─────────────────────────────────────────────────────────┐
│ FASE DIPLOMÁTICA (Frontend)                              │
│ • Jugadores negocian en chat secreto                     │
│ • Acuerdan términos de transferencia                     │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ FASE DE ÓRDENES (Frontend)                               │
│ • Componente <TransferMoneyForm>                         │
│ • Validación cliente: fondos, cantidad, receptor         │
│ • Guardar en Firestore: /orders/{playerId}/extraExpenses│
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ DEADLINE EXPIRA (Cloud Scheduler)                        │
│ • checkDeadlines() corre cada minuto                     │
│ • Detecta deadline expirado                              │
│ • Dispara resolveTurn(gameId)                            │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ RESOLUCIÓN (Cloud Function)                              │
│ Paso 2: processTransfers(gameId, turnNumber)             │
│   1. Leer todas las órdenes del turno                    │
│   2. Extraer extraExpenses tipo 'transfer'               │
│   3. Para cada transferencia:                            │
│      • Validar fondos del emisor                         │
│      • Actualizar treasury de emisor (-amount)           │
│      • Actualizar treasury de receptor (+amount)         │
│      • Registrar en historial                            │
│   4. Continuar con siguientes pasos...                   │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ NOTIFICACIONES (Cloud Function)                          │
│ • sendTurnResolvedEmail(allPlayers)                      │
│ • Email incluye resumen de transferencias                │
│ • Frontend actualiza en tiempo real (onSnapshot)         │
└─────────────────────────────────────────────────────────┘
```

---

## Referencias

- Ver [database.md](./database.md) para estructura de `ExtraExpense` en Firestore
- Ver [fases-y-turnos.md](./fases-y-turnos.md) para mecánicas de resolución
- Ver [plan-desarrollo.md](./plan-desarrollo.md) Fase 6 para implementación
