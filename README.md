# Machiavelli - Renaissance Strategy Game

## 🎮 Proyecto

Machiavelli es un juego de estrategia por turnos ambientado en el Renacimiento italiano, inspirado en Diplomacy. El juego presenta un **mapa detallado de Italia con 74 provincias**, mecánicas de diplomacia asíncrona, combate militar y gestión económica.

## 🗺️ Características Principales

### Mapa Detallado de Italia
- **74 provincias** históricamente precisas
- **55 ciudades** con valores económicos (1-5 ducados)
- **9 zonas marítimas** independientes
- **3 tipos de provincias**: Terrestres, Puertos y Zonas marítimas
- Sistema de adyacencias bidireccionales validado

### Escenarios de Juego
- **ITALIA_1454 - Paz de Lodi**: 5-6 jugadores, escenario clásico
- **TUTORIAL**: 3-4 jugadores, versión simplificada para aprender
- **ITALIA_1494** (próximamente): 6-8 jugadores con España y Austria

### Mecánicas de Juego
- **Modelo asíncrono**: Los jugadores no necesitan estar conectados simultáneamente
- **Fases con deadlines**: Diplomacia (2-3 días) → Órdenes (2-3 días) → Resolución automática
- **Diplomacia secreta**: Mensajes privados entre jugadores
- **Combate automático**: Cloud Functions procesan batallas y movimientos
- **Eventos especiales**: Hambre, peste, asesinatos

## 📋 Estado del Proyecto

**Versión 2.0: Mapa Detallado - ✅ COMPLETADA**

### ✅ Fase 1: Fundamentos
- [x] Inicializar proyecto React + Vite + TypeScript
- [x] Instalar dependencias principales (React Router, Tailwind, Zustand)
- [x] Configurar Firebase SDK
- [x] Crear estructura de carpetas del proyecto
- [x] Definir tipos TypeScript base (Game, Player, Unit, Order)
- [x] Implementar componentes de autenticación (Login/Register)
- [x] Crear página de lobby básica
- [x] Configurar Firebase Hosting

### ✅ Fase 2: Mapa Detallado (Octubre 2025)
- [x] Integrar mapa SVG con 74 provincias
- [x] Crear sistema de provinceData.ts con adyacencias
- [x] Implementar provinceCoordinates.ts para posicionamiento
- [x] Actualizar escenarios (ITALIA_1454, TUTORIAL)
- [x] Validación de integridad del sistema
- [x] Actualizar documentación completa
- [x] Sincronizar datos client-server

## 🚀 Configuración e Instalación

### 1. Obtener credenciales de Firebase

Necesitas obtener las credenciales de Firebase Console:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `machiavelli-6ef06`
3. Ve a **Project Settings** (⚙️) > **General**
4. En la sección **Your apps**, selecciona la app web (o crea una si no existe)
5. Copia las credenciales de configuración

### 2. Configurar variables de entorno

Edita el archivo `.env` y reemplaza los valores:

```bash
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=machiavelli-6ef06.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=machiavelli-6ef06
VITE_FIREBASE_STORAGE_BUCKET=machiavelli-6ef06.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=687381647623
VITE_FIREBASE_APP_ID=tu_app_id_aqui
```

### 3. Activar Firebase Authentication

1. En Firebase Console, ve a **Authentication**
2. Click en **Get Started**
3. Activa **Email/Password** como proveedor de autenticación

### 4. Configurar Firestore Database

1. En Firebase Console, ve a **Firestore Database**
2. Click en **Create database**
3. Selecciona **Start in test mode** (por ahora)
4. Elige la región más cercana

## 💻 Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de producción
npm run preview
```

## 🌐 Deploy a Firebase Hosting

### Primera vez (Autenticación):

```bash
firebase login
```

### Deploy:

```bash
# Compilar el proyecto
npm run build

# Deploy a Firebase Hosting
firebase deploy --only hosting
```

## 📁 Estructura del Proyecto

```
machiavelli/
├── src/
│   ├── components/        # Componentes React
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/             # Páginas principales
│   │   └── Lobby.tsx
│   ├── types/             # Tipos TypeScript
│   │   ├── game.ts
│   │   ├── auth.ts
│   │   └── index.ts
│   ├── lib/               # Configuración de servicios
│   │   └── firebase.ts
│   ├── store/             # Estado global (Zustand)
│   │   └── authStore.ts
│   ├── assets/            # Assets estáticos
│   ├── App.tsx            # Componente principal
│   ├── main.tsx           # Entry point
│   └── index.css          # Estilos globales
├── docs/                  # Documentación del proyecto
├── dist/                  # Build de producción
├── public/                # Assets públicos
└── firebase.json          # Configuración de Firebase
```

## 📚 Documentación

Toda la documentación técnica se encuentra en la carpeta `docs/`:

### Documentación Principal
- **`escenarios.md`** - Configuraciones de ITALIA_1454, TUTORIAL e ITALIA_1494
- **`CHANGELOG-MAPA-DETALLADO.md`** - Changelog completo del nuevo sistema de mapa
- **`arquitectura.md`** - Arquitectura del sistema y flujo de datos
- **`database.md`** - Estructura de Firestore
- **`fases-overview.md`** - Mecánicas de fases y turnos
- **`ordenes-militares.md`** - Reglas de movimiento y combate
- **`eventos-especiales.md`** - Hambre, peste y eventos aleatorios

### Datos del Mapa
- **`src/data/provinceData.ts`** - 74 provincias con adyacencias validadas
- **`src/data/provinceCoordinates.ts`** - Coordenadas X,Y para renderizado
- **`src/data/scenarios.ts`** - Setup inicial de escenarios
- **`validate-provinces.ts`** - Script de validación de integridad

### Validar Mapa
```bash
npx tsx validate-provinces.ts
```

## 🎯 Próximos Pasos (Fase 3)

### En Progreso
- [ ] Testing completo en navegador del nuevo mapa
- [ ] Ajuste fino de coordenadas de unidades si es necesario
- [ ] Deploy a producción con nuevo mapa

### Planificado
- [ ] Implementar escenario ITALIA_1494 (8 jugadores)
- [ ] Sistema de chat diplomático mejorado
- [ ] Notificaciones por email automatizadas
- [ ] Panel de estadísticas y historial de partidas
- [ ] Modo espectador para partidas en curso

## 📝 Notas Importantes

- El archivo `.env` contiene credenciales sensibles y NO debe subirse a git
- Las Security Rules de Firestore deben configurarse en producción
- El proyecto usa Tailwind CSS v4 con PostCSS

## 🤝 Contribuir

Este proyecto está en desarrollo activo. Sigue el plan de desarrollo en `docs/plan-desarrollo.md`.

