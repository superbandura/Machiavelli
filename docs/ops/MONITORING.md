# Guía de Monitoreo

Configuración y mejores prácticas para monitorear Machiavelli en producción.

## Tabla de Contenidos

1. [Firebase Console](#firebase-console)
2. [Métricas Clave](#métricas-clave)
3. [Alertas](#alertas)
4. [Logs](#logs)
5. [Performance](#performance)
6. [Costos](#costos)

---

## Firebase Console

### Dashboard Principal

**URL:** https://console.firebase.google.com/project/machiavelli-6ef06

**Secciones importantes:**

1. **Overview** - Vista general del proyecto
2. **Authentication** - Usuarios registrados
3. **Firestore Database** - Datos y uso
4. **Functions** - Ejecuciones y logs
5. **Hosting** - Tráfico y despliegues

---

## Métricas Clave

### 1. Cloud Functions

**Panel:** Functions → Dashboard

#### Invocations (Invocaciones)

**checkDeadlines:**
- **Esperado:** ~43,200 invocaciones/mes (1 cada minuto)
- **Alerta si:** < 40,000/mes (función no ejecutándose)
- **Alerta si:** > 50,000/mes (ejecuciones duplicadas)

**resolveTurn:**
- **Esperado:** Variable según juegos activos
- **Alerta si:** Error rate > 5%

**forcePhaseAdvance:**
- **Esperado:** Bajo (solo testing)
- **Alerta si:** Uso muy alto en producción

#### Execution Time (Tiempo de ejecución)

**checkDeadlines (sin resoluciones):**
- **Normal:** < 5 segundos
- **Advertencia:** 5-10 segundos
- **Crítico:** > 10 segundos

**resolveTurn:**
- **Normal:** 5-30 segundos
- **Advertencia:** 30-60 segundos
- **Crítico:** > 60 segundos (timeout)

#### Error Rate

- **Aceptable:** < 1%
- **Advertencia:** 1-5%
- **Crítico:** > 5%

**Errores comunes:**
- `Permission denied`: Security Rules problema
- `Timeout`: Juego con demasiadas unidades
- `Not found`: Documento eliminado inesperadamente

### 2. Firestore Database

**Panel:** Firestore → Usage

#### Reads/Writes (Lecturas/Escrituras)

**Daily Reads:**
- **Gratis:** 50,000/día
- **Alerta si:** > 40,000/día (acercándose al límite)

**Daily Writes:**
- **Gratis:** 20,000/día
- **Alerta si:** > 15,000/día

**Typical usage (5 juegos activos):**
- Reads: ~5,000-10,000/día
- Writes: ~2,000-5,000/día

#### Storage

**Gratis:** 1 GB
**Typical usage:** 10-50 MB (partidas activas)

**Alerta si:** > 500 MB (posible problema de limpieza)

#### Document Count

**Monitorear crecimiento de:**
- `games`: Debe crecer lentamente
- `players`: ~5-8 por juego
- `units`: ~30-50 por juego
- `turns`: 12+ por juego (aumenta constantemente)

**Limpieza recomendada:**
- Archivar juegos terminados > 30 días
- Eliminar juegos "waiting" > 7 días sin actividad

### 3. Authentication

**Panel:** Authentication → Users

**Métricas:**
- **Total users**: Crecimiento esperado
- **Daily active users (DAU)**: Monitorear engagement
- **Sign-ins per day**: Actividad

**Alerta si:**
- Pico repentino de registros (posible spam)
- Drop repentino de DAU (posible problema técnico)

### 4. Hosting

**Panel:** Hosting → Usage

**Bandwidth:**
- **Gratis:** 360 MB/día (10 GB/mes)
- **Typical:** 50-200 MB/día

**Storage:**
- **Gratis:** 10 GB
- **Typical:** < 100 MB (assets estáticos)

### 5. Performance Monitoring

**Panel:** Performance → Dashboard

**Core Web Vitals:**
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

**Page Load Time:**
- **Good:** < 3s
- **Acceptable:** 3-5s
- **Poor:** > 5s

---

## Alertas

### Configurar Alertas en Firebase

1. **Firebase Console → Alerting**
2. **Create Alert**
3. Configura según métricas

### Alertas Recomendadas

#### 1. Functions Error Rate

```
Metric: Cloud Functions Error Rate
Condition: > 5%
Function: checkDeadlines, resolveTurn
Notification: Email
```

#### 2. Functions Execution Time

```
Metric: Cloud Functions Execution Time
Condition: > 60 seconds
Function: resolveTurn
Notification: Email + SMS
```

#### 3. Firestore Quota

```
Metric: Firestore Reads
Condition: > 40,000 per day
Notification: Email
```

#### 4. Hosting Bandwidth

```
Metric: Hosting Bandwidth
Condition: > 300 MB per day
Notification: Email
```

### Monitoreo Externo

**Recomendado:** Uptime monitoring con servicio externo

**Opciones:**
- **UptimeRobot** (gratis hasta 50 monitores)
- **Pingdom**
- **StatusCake**

**Configuración:**
```
URL: https://machiavelli-6ef06.web.app
Check interval: 5 minutos
Alert if: Down > 2 checks consecutivos
```

---

## Logs

### Cloud Functions Logs

**Ver logs en tiempo real:**
```bash
firebase functions:log --limit 100
```

**Ver logs de función específica:**
```bash
firebase functions:log --only checkDeadlines --limit 50
```

**Ver solo errores:**
```bash
firebase functions:log --only errors
```

### Firebase Console Logs

**Panel:** Functions → Logs

**Filtros útiles:**

**Errores recientes:**
```
severity = ERROR
timestamp > now-1h
```

**Función específica:**
```
resource.labels.function_name = "checkDeadlines"
timestamp > now-24h
```

**Ejecuciones lentas:**
```
execution_time > 30s
timestamp > now-7d
```

### Logs Importantes

#### checkDeadlines

**Normal:**
```
[CheckDeadlines] Checking deadlines for games...
[CheckDeadlines] Found 2 games with expired deadlines
[CheckDeadlines] Processing game: game-xyz
[CheckDeadlines] Completed successfully
```

**Error:**
```
[CheckDeadlines] Error processing game game-xyz: Permission denied
```

#### resolveTurn

**Normal:**
```
[ResolveTurn] Starting turn resolution for game-xyz
[ResolveTurn] Step 1: Validating orders
[ResolveTurn] Step 2: Processing economy
...
[ResolveTurn] Step 9: Advancing phase
[ResolveTurn] Turn resolved successfully
```

**Error:**
```
[ResolveTurn] Error in step 3: Cannot read property 'province' of undefined
```

### Log Retention

**Firebase Console:**
- Logs guardados **30 días** por defecto
- Para retención mayor: Export to BigQuery

**Exportar logs críticos:**
```bash
gcloud logging read "resource.type=cloud_function" \
  --limit 1000 \
  --format json > logs-backup.json
```

---

## Performance

### Frontend Performance

**Panel:** Performance → Dashboard

**Métricas clave:**

#### Page Load Time
- **Target:** < 3 segundos
- **Optimizaciones:**
  - Lazy load de componentes
  - Code splitting
  - Image optimization

#### First Contentful Paint (FCP)
- **Good:** < 1.8s
- **Needs improvement:** 1.8-3s
- **Poor:** > 3s

#### Time to Interactive (TTI)
- **Good:** < 3.8s
- **Needs improvement:** 3.8-7.3s
- **Poor:** > 7.3s

### Backend Performance

**Firestore Query Performance:**

**Panel:** Firestore → Usage → Insights

**Queries lentas:**
- Identifica queries sin índices
- Optimiza queries complejas
- Usa pagination para grandes resultados

**Cloud Functions Performance:**

**Panel:** Functions → Details → Metrics

**Memory Usage:**
- **Default:** 256 MB
- **Increase if:** Consistent memory errors
- **Config:** `firebase functions:config:set memory=512MB`

**Cold Starts:**
- **Normal:** 1-3 segundos
- **Reduce:** Mantén functions "calientes" con pings

---

## Costos

### Firebase Billing

**Panel:** Settings → Usage and billing

### Monitorear Costos

**Daily Budget Alert:**
```
Settings → Billing → Set budget
Amount: $50/month
Alert at: 50%, 90%, 100%
```

### Desglose de Costos Típicos

**Plan Blaze (pay-as-you-go):**

#### Cloud Functions
- **Invocations:** Gratis hasta 2M/mes
- **Compute time:** Gratis hasta 400K GB-seconds/mes
- **Estimado:** $5-10/mes (uso moderado)

#### Firestore
- **Reads:** Gratis hasta 50K/día
- **Writes:** Gratis hasta 20K/día
- **Storage:** Gratis hasta 1 GB
- **Estimado:** $0-5/mes (5-10 juegos activos)

#### Hosting
- **Bandwidth:** Gratis hasta 10 GB/mes
- **Storage:** Gratis hasta 10 GB
- **Estimado:** $0/mes (bajo tráfico)

#### Authentication
- **Email/Password:** Gratis ilimitado
- **Estimado:** $0/mes

**Total estimado:** **$5-20/mes** (uso moderado)

### Optimización de Costos

**Reducir reads de Firestore:**
- Cache en cliente
- Menos listeners real-time
- Pagination en queries grandes

**Reducir invocations de Functions:**
- Batch operations
- Reduce frecuencia de checkDeadlines (2-5 min en vez de 1 min)

**Reducir bandwidth de Hosting:**
- Comprimir assets (gzip)
- CDN caching
- Lazy load de imágenes

---

## Dashboard Recomendado

### Crear Dashboard Custom

**Herramienta:** Google Cloud Console → Monitoring → Dashboards

**Widgets recomendados:**

1. **Functions Invocations** (line chart)
   - checkDeadlines
   - resolveTurn

2. **Functions Error Rate** (stacked area chart)
   - Por función

3. **Functions Execution Time** (heatmap)
   - Percentil 50, 95, 99

4. **Firestore Operations** (line chart)
   - Reads vs Writes

5. **Active Games** (number widget)
   - Query: `status == 'active'`

6. **Daily Active Users** (line chart)
   - Auth metrics

---

## Checklist Diario

- [ ] Ver Firebase Console → Overview
- [ ] Revisar Functions → Logs (últimos errores)
- [ ] Verificar Firestore → Usage (no cerca de límites)
- [ ] Comprobar Hosting → Bandwidth (normal)
- [ ] Revisar Billing (costo acumulado razonable)

---

## Checklist Semanal

- [ ] Analizar Functions performance (execution time)
- [ ] Revisar Security Rules (sin violaciones)
- [ ] Verificar índices de Firestore (sugerencias)
- [ ] Revisar Performance metrics (Core Web Vitals)
- [ ] Limpiar logs antiguos (si exportas)
- [ ] Archivar juegos terminados

---

## Recursos

- **[Firebase Console](https://console.firebase.google.com/)**
- **[Cloud Monitoring](https://console.cloud.google.com/monitoring)**
- **[Firebase Docs - Monitoring](https://firebase.google.com/docs/functions/monitoring)**
- **[Troubleshooting](TROUBLESHOOTING.md)**

---

**Última actualización:** 2025-01-13
