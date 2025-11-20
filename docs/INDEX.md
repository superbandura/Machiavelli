# Machiavelli - Documentación

Bienvenido a la documentación de **Machiavelli**, un juego de estrategia por turnos asíncrono ambientado en el Renacimiento italiano.

## Navegación Rápida

### 👤 Para Jugadores

- **[Manual del Usuario](user/MANUAL.md)** - Guía completa para jugar Machiavelli
- **[Inicio Rápido](user/QUICK_START.md)** - Comienza a jugar en 5 minutos
- **[Preguntas Frecuentes](user/FAQ.md)** - Respuestas a dudas comunes

### 💻 Para Desarrolladores

- **[Guía de Contribución](dev/CONTRIBUTING.md)** - Cómo contribuir al proyecto
- **[Guía de Despliegue](dev/DEPLOYMENT.md)** - Despliegue a producción paso a paso
- **[Referencia API](dev/API_REFERENCE.md)** - Documentación de Cloud Functions (12/12 documentadas)
- **[Guía de Testing](dev/TESTING.md)** - Estrategia y ejecución de pruebas
- **[Sincronización de Código](dev/CODE_SYNCHRONIZATION.md)** - Guía de sync frontend/backend 🆕
- **[Documentación de Componentes](dev/COMPONENTS.md)** - JSDoc de componentes React principales 🆕

### 🔧 Para Operaciones

- **[Monitoreo](ops/MONITORING.md)** - Configuración de monitoreo y alertas
- **[Troubleshooting](ops/TROUBLESHOOTING.md)** - Solución de problemas comunes

### 📚 Documentación de Referencia

#### Arquitectura y Sistema
- **[Arquitectura del Sistema](reference/arquitectura.md)** - Diseño técnico completo 🆕
- **[Base de Datos](reference/database.md)** - Esquema de Firestore y consultas 🆕
- **[Fases del Juego](reference/GAME_PHASES.md)** - Sistema de turnos y fases
- **[Glosario](reference/glosario.md)** - Términos oficiales del juego 🆕

#### Mecánicas de Juego
- **[Órdenes Militares](reference/ordenes-militares.md)** - Todas las órdenes detalladas
- **[Eventos Especiales](reference/eventos-especiales.md)** - Hambruna, Peste, Asesinato
- **[Sistema de Transferencias](reference/sistema-transferencias.md)** - Transferencias de ducados
- **[Jugadores Inactivos](reference/jugadores-inactivos.md)** - Gestión de inactividad
- **[Casos Límite](reference/casos-limite.md)** - Algoritmos y casos especiales

#### Escenarios y Ejemplos
- **[Escenarios](reference/escenarios.md)** - Italia 1454, Italia 1494, Tutorial
- **[Ejemplo de Turno](reference/ejemplo-turno.md)** - Turno completo paso a paso

#### Diseño y Desarrollo
- **[Documento de Diseño](reference/Machiavelli.md)** - Visión general del juego
- **[Plan de Desarrollo](reference/plan-desarrollo.md)** - Roadmap de 8 fases
- **[Soluciones Aplicadas](reference/SOLUCIONES-APLICADAS.md)** - 36+ problemas resueltos

### 📦 Archivo

Documentación histórica y notas de sesiones:
- **[Archivo](archive/)** - Changelogs antiguos y notas de sesiones

---

## Información del Proyecto

**Estado actual:** 98% completo - MVP funcional
**Tech Stack:** React 19, TypeScript, Firebase, Tailwind CSS v4
**Modelo:** Asíncrono basado en deadlines (estilo "play-by-mail")

### Enlaces Rápidos

- **Repositorio:** [GitHub](https://github.com/tu-repo/machiavelli)
- **Instalación:** Ver [Inicio Rápido para Desarrolladores](dev/CONTRIBUTING.md#setup)
- **Reporte de Bugs:** [Issues](https://github.com/tu-repo/machiavelli/issues)

---

## Estructura del Proyecto

```
Machiavelli/
├── src/                  # Frontend (React + TypeScript)
│   ├── components/       # Componentes UI
│   ├── pages/           # Páginas (Lobby, Game)
│   ├── types/           # Definiciones TypeScript
│   ├── data/            # Datos estáticos (facciones, provincias)
│   └── utils/           # Utilidades y validación
├── functions/           # Cloud Functions (Firebase)
│   └── src/
│       ├── resolution/  # Lógica de resolución (9 pasos)
│       ├── events/      # Hambruna y Peste
│       └── email/       # Servicio de emails
├── docs/                # Documentación (estás aquí)
└── public/              # Recursos estáticos
```

---

## Comenzar Ahora

### Si eres jugador:
1. Lee el [Manual del Usuario](user/MANUAL.md)
2. Sigue el [Inicio Rápido](user/QUICK_START.md)
3. ¡Juega!

### Si eres desarrollador:
1. Lee la [Guía de Contribución](dev/CONTRIBUTING.md)
2. Revisa la [Arquitectura](reference/arquitectura.md)
3. Configura tu entorno local
4. Contribuye

### Si eres administrador:
1. Lee la [Guía de Despliegue](dev/DEPLOYMENT.md)
2. Configura [Monitoreo](ops/MONITORING.md)
3. Familiarízate con [Troubleshooting](ops/TROUBLESHOOTING.md)

---

**Última actualización:** 2025-01-20
