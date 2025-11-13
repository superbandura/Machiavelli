# Sistema de Fases - Visión General

## Introducción

El juego se desarrolla en ciclos de turnos con fases bien definidas. El sistema utiliza un **modelo asíncrono basado en deadlines temporales**, donde los jugadores NO necesitan estar conectados simultáneamente.

---

## Orden Completo de Fases (Timing Definitivo)

### Estructura de un Turno Completo

**ORDEN NUMERADO (sin ambigüedad):**

1. **Fase de Eventos** (solo turnos específicos)
2. **Fase de Mantenimiento** (solo Primavera)
3. **Fase Diplomática** (todos los turnos)
4. **Fase de Órdenes** (todos los turnos)
5. **Fase de Resolución** (todos los turnos)
6. **Verificación de Victoria** (todos los turnos de Otoño)

### IMPORTANTE: Orden para Primavera con Hambre

**Turno de Primavera (Ejemplo):**
```
1. EVENTOS: Hambre aparece → Marcadores colocados
2. MANTENIMIENTO:
   a. Calcular ingresos (ciudades sin hambre producen)
   b. Pagar mantenimiento de tropas
   c. Licenciar si fondos insuficientes
3. ELIMINACIÓN POR HAMBRE: Unidades en provincias con hambre eliminadas
4. DIPLOMÁTICA: Jugadores negocian (48h)
5. ÓRDENES: Jugadores dan órdenes (48h)
6. RESOLUCIÓN: Ejecución automática
```

**CLARIFICACIÓN CRÍTICA:**
- Hambre aparece ANTES del mantenimiento (Paso 1)
- Ingresos se calculan DURANTE mantenimiento (Paso 2a)
- Provincias con hambre NO producen ingresos (Paso 2a)
- Unidades se eliminan DESPUÉS del mantenimiento (Paso 3)
- **Consecuencia:** Pagas mantenimiento de tropas que luego mueren
- **Mitigación:** Puedes pagar 3d por provincia durante Fase de Órdenes del turno ANTERIOR para prevenir

---

## Referencias a Otros Documentos

- **Fase Diplomática:** Ver [fase-diplomatica.md](./fase-diplomatica.md)
- **Fase de Órdenes:** Ver [fase-ordenes.md](./fase-ordenes.md)
- **Fase de Resolución:** Ver [fase-resolucion.md](./fase-resolucion.md)
- **Eventos Especiales:** Ver [eventos-especiales.md](./eventos-especiales.md)
- **Órdenes Militares:** Ver [ordenes-militares.md](./ordenes-militares.md)
- **Jugadores Inactivos:** Ver [jugadores-inactivos.md](./jugadores-inactivos.md)
- **Casos Límite:** Ver [casos-limite.md](./casos-limite.md)
- **Ejemplo Completo:** Ver [ejemplo-turno.md](./ejemplo-turno.md)
- **Escenarios:** Ver [escenarios.md](./escenarios.md) para configuración Italia 1454
- **Glosario:** Ver [glosario.md](./glosario.md) para términos oficiales
- **Database:** Ver [database.md](./database.md) para estructura Firestore
- **Transferencias:** Ver [sistema-transferencias.md](./sistema-transferencias.md) para UI
- **Arquitectura:** Ver [arquitectura.md](./arquitectura.md) para flujo técnico
