# Manual del Usuario - Machiavelli

Guía completa para jugar Machiavelli, un juego de estrategia por turnos asíncrono ambientado en el Renacimiento italiano.

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Objetivo del Juego](#objetivo-del-juego)
3. [Conceptos Básicos](#conceptos-básicos)
4. [Cómo Jugar](#cómo-jugar)
5. [Órdenes Militares](#órdenes-militares)
6. [Diplomacia](#diplomacia)
7. [Economía](#economía)
8. [Eventos Especiales](#eventos-especiales)
9. [Victoria](#victoria)
10. [Consejos y Estrategias](#consejos-y-estrategias)

---

## Introducción

**Machiavelli** es un juego de estrategia inspirado en Diplomacy, donde controlas una facción italiana durante el Renacimiento. A diferencia de los juegos en tiempo real, Machiavelli es **asíncrono**: cada fase tiene un plazo de varios días, y puedes conectarte cuando quieras para dar órdenes.

### Características Clave

- **Asíncrono**: No necesitas estar conectado al mismo tiempo que otros jugadores
- **Turnos automáticos**: El servidor procesa los turnos cuando expira el plazo
- **Diplomacia secreta**: Envía mensajes privados para negociar alianzas
- **74 provincias**: Mapa detallado de Italia con ciudades, puertos y mares
- **Múltiples escenarios**: Italia 1454 (clásico), Italia 1494 (avanzado), Tutorial

---

## Objetivo del Juego

**Ganar mediante control territorial:**

Conquista y controla un número específico de **ciudades** para proclamarte vencedor:

| Jugadores | Ciudades Necesarias |
|-----------|---------------------|
| 3-4       | 12 ciudades         |
| 5-6       | 15 ciudades         |
| 7-8       | 18 ciudades         |

**Ciudades vs Provincias:**
- **Provincias**: 74 territorios en el mapa (61 tierra, 13 puertos, 9 mares)
- **Ciudades**: 31 provincias especiales que valen para la victoria (Florencia, Venecia, Roma, etc.)
- Solo las **ciudades** cuentan para ganar

**Victoria por tiempo límite:**
- Si nadie alcanza el objetivo tras 12 turnos (4 años), gana quien controle más ciudades
- Desempate: Mayor valor total de ciudades (valor 1-5 ducados)

---

## Conceptos Básicos

### Facciones

Controlas una de las 7 facciones italianas:

1. **República de Florencia** (Rojo) - Rica, cultural
2. **República de Venecia** (Azul) - Potencia naval
3. **Ducado de Milán** (Verde) - Potencia militar
4. **Estados Pontificios** (Amarillo) - Influencia religiosa
5. **Reino de Nápoles** (Naranja) - Sur de Italia
6. **República de Génova** (Morado) - Potencia naval
7. **Ducado de Saboya** (Cian) - Noroeste de Italia

Cada facción comienza con:
- **4-6 unidades** (ejércitos y flotas)
- **2-3 ciudades**
- **10-20 ducados** en el tesoro

### Unidades

Hay 3 tipos de unidades:

1. **Ejército (Army)**
   - Se mueve por tierra
   - Puede sitiar guarniciones
   - Puede convertir provincias neutrales

2. **Flota (Fleet)**
   - Se mueve por mar y puertos
   - Puede transportar ejércitos (convoy)
   - No puede sitiar ni convertir

3. **Guarnición (Garrison)**
   - Defiende ciudades
   - No se mueve
   - Requiere 2 turnos de asedio para ser capturada

### Turnos y Fases

**Un año = 3 turnos:**
- **Primavera** → **Verano** → **Otoño**

**Cada turno tiene 3 fases:**

1. **Fase Diplomática** (ej. 48 horas)
   - Envía mensajes privados
   - Negocia alianzas
   - Planea estrategias

2. **Fase de Órdenes** (ej. 48 horas)
   - Envía órdenes militares
   - Gasta ducados en acciones especiales
   - Puedes modificar órdenes antes del plazo

3. **Fase de Resolución** (~1 minuto, automática)
   - El servidor procesa todas las órdenes simultáneamente
   - Resuelve batallas, asedios, conversiones
   - Actualiza el mapa
   - Avanza a la siguiente fase

**Importante:** Las fases avanzan automáticamente cuando expira el plazo, ¡no esperes!

---

## Cómo Jugar

### 1. Únete a una Partida

1. Regístrate con email y contraseña
2. En el lobby, ve **"Partidas Disponibles"**
3. Haz clic en **"Ver Detalles"** de una partida
4. Selecciona una facción disponible
5. Haz clic en **"Unirse"**

### 2. Fase Diplomática

Durante esta fase:

- **Envía mensajes privados** a otros jugadores
- **Negocia alianzas** (¡pero cuidado con las traiciones!)
- **Planea movimientos coordinados** con aliados
- **Observa el mapa** para detectar amenazas

**Consejo:** La diplomacia es clave. Una buena alianza vale más que un ejército.

### 3. Fase de Órdenes

Ahora das órdenes a tus unidades:

1. **Haz clic en una provincia** que controles
2. **Selecciona una unidad**
3. **Elige una orden** (Mover, Mantener, Apoyar, etc.)
4. **Selecciona el destino** (si aplica)
5. **Confirma la orden**

**Tipos de órdenes:**
- **Mover**: Mueve la unidad a una provincia adyacente
- **Mantener**: La unidad se queda defendiendo
- **Apoyar**: Ayuda a otra unidad (tuya o aliada)
- **Convoy**: Flota transporta un ejército
- **Sitiar**: Ataca una guarnición (requiere 2 turnos)
- **Convertir**: Toma control de una provincia neutral

**Importante:**
- Puedes modificar órdenes antes de que expire el plazo
- Las órdenes son **secretas** hasta la resolución
- Todas las unidades deben tener órdenes (o darán "mantener" automáticamente)

### 4. Fase de Resolución

El servidor procesa automáticamente:

1. **Validación**: Comprueba que las órdenes sean legales
2. **Economía**: Procesa ingresos, gastos, transferencias
3. **Movimientos**: Resuelve movimientos y batallas
4. **Retiradas**: Unidades desalojadas retiran
5. **Asedios**: Actualiza contadores de asedio
6. **Conversiones**: Convierte provincias neutrales
7. **Actualización**: Actualiza el estado del juego
8. **Historia**: Guarda registro del turno
9. **Avance**: Pasa a la siguiente fase

**Recibirás notificaciones** sobre:
- Batallas ganadas/perdidas
- Unidades destruidas
- Provincias conquistadas
- Eventos especiales (hambruna, peste)

---

## Órdenes Militares

### Mover (Move)

Mueve una unidad a una provincia adyacente.

**Ejemplo:**
- Ejército en Florencia → Mueve a Pisa

**Restricciones:**
- Solo a provincias adyacentes
- Ejércitos solo por tierra, flotas solo por mar/puertos
- Si hay oposición, se resuelve con fuerza

### Mantener (Hold)

La unidad se queda en su posición defendiendo.

**Ejemplo:**
- Ejército en Roma → Mantener

**Cuándo usar:**
- Para defender una provincia importante
- Cuando no quieres arriesgarte
- Para dar apoyo sin moverte (Hold + Support)

### Apoyar (Support)

Ayuda a otra unidad (tuya o aliada) en su acción.

**Tipos de apoyo:**

1. **Apoyo a Movimiento:**
   - Ejemplo: "Ejército en Pisa apoya Ejército Florencia → Siena"
   - Aumenta la fuerza del movimiento

2. **Apoyo a Mantener:**
   - Ejemplo: "Ejército en Pisa apoya Ejército en Florencia"
   - Aumenta la fuerza defensiva

**Cómo funciona:**
- Cada apoyo suma +1 de fuerza
- El apoyo se corta si la unidad que apoya es atacada

### Convoy (Convoy)

Una flota transporta un ejército a través del mar.

**Ejemplo:**
- Ejército en Génova → Convoy a Córcega (vía Flota en Mar de Liguria)

**Requisitos:**
- Necesitas una flota en el mar entre origen y destino
- El ejército debe estar en un puerto
- El destino debe ser un puerto

### Sitiar (Besiege)

Ataca una guarnición enemiga.

**Cómo funciona:**
- **Turno 1**: Ejército asedia → Contador 1/2
- **Turno 2**: Ejército asedia (sin ser desalojado) → Contador 2/2 → Guarnición destruida

**Importante:**
- Si el ejército es desalojado, el contador se reinicia
- Solo ejércitos pueden sitiar (no flotas)

### Convertir (Convert)

Toma control de una provincia neutral.

**Requisitos:**
- La provincia debe ser neutral
- Debes mantener un ejército allí 1 turno completo
- Solo en otoño se completa la conversión

**Ejemplo:**
- Primavera: Ejército → Provincia Neutral
- Verano: Ejército mantiene posición
- Otoño: Provincia se convierte a tu facción

---

## Diplomacia

### Mensajes Privados

Envía mensajes secretos a otros jugadores:

1. Abre el **Chat Diplomático**
2. Selecciona un destinatario
3. Escribe tu mensaje
4. Envía

**Solo el destinatario puede leer el mensaje.**

### Mensajes Públicos

Envía anuncios a todos los jugadores:

1. Selecciona **"Todos"** como destinatario
2. Escribe tu mensaje
3. Todos los jugadores lo verán

### Estrategias Diplomáticas

**Alianzas:**
- Coordina movimientos con aliados
- Usa **apoyos mutuos** para avanzar juntos
- Divide el mapa en zonas de influencia

**Traiciones:**
- Rompe alianzas en el momento oportuno
- Ataca cuando tu aliado esté vulnerable
- ¡Pero cuidado! Tu reputación importa

**Negociación:**
- Ofrece no agresión
- Propón repartir provincias
- Amenaza con atacar para disuadir

---

## Economía

### Tesoro

Cada facción tiene un tesoro en **ducados**.

**Ingresos (cada Primavera):**
- +1d por cada ciudad valor 1
- +2d por cada ciudad valor 2
- ... hasta +5d por ciudad valor 5

**Gastos (cada Primavera):**
- -1d por cada ejército
- -1d por cada flota
- -0d por guarniciones (gratis)

**Saldo mínimo:**
- Si llegas a 0 ducados, no puedes hacer gastos extra
- Si tienes ducados negativos, pierdes unidades al azar

### Transferencias

Envía ducados a otros jugadores:

1. En la **Fase de Órdenes**, abre **Panel de Economía**
2. Selecciona **"Transferir Ducados"**
3. Elige destinatario y cantidad
4. Confirma

**Usos:**
- Pagar tributos
- Ayudar a aliados
- Sobornos

### Gastos Especiales

**Mitigar Hambruna (3 ducados):**
- Elimina marcador de hambruna de una provincia
- Previene destrucción de unidades

**Asesinato (6-18 ducados + token):**
- Intenta asesinar líder enemigo
- Requiere token de asesino
- 16.7%-50% de éxito según gasto

**Soborno (15 ducados):**
- Intenta sobornar a otro jugador
- Efectos según reglas avanzadas

---

## Eventos Especiales

### Hambruna (Primavera)

**Qué pasa:**
- Provincias aleatorias reciben marcadores de hambruna
- Al final de Primavera, unidades en provincias con hambruna son destruidas

**Cómo mitigar:**
- Paga **3 ducados** para eliminar el marcador
- Hazlo en la Fase de Órdenes

### Peste (Verano)

**Qué pasa:**
- Provincias aleatorias sufren peste
- Unidades en esas provincias son destruidas **inmediatamente**

**Cómo mitigar:**
- **No se puede mitigar**
- Es un evento aleatorio e inevitable

### Asesinato

**Cómo funciona:**

1. Compras un intento con **ducados + token de asesino**
2. Eliges un objetivo (otro jugador)
3. Al resolver el turno, se calcula probabilidad:
   - 6 ducados: 16.7% de éxito
   - 12 ducados: 33.3% de éxito
   - 18 ducados: 50% de éxito

**Si tiene éxito:**
- El jugador objetivo pierde su turno siguiente
- Sus unidades dan "mantener" automáticamente

**Tokens de asesino:**
- Cada jugador comienza con 0-2 tokens (según escenario)
- Puedes robar tokens asesinando exitosamente

---

## Victoria

### Condiciones de Victoria

**Victoria estándar:**
- Controla el número requerido de **ciudades** (12, 15 o 18 según jugadores)
- Se comprueba al final de cada turno

**Victoria por tiempo límite:**
- Tras 12 turnos (4 años), gana quien controle más ciudades
- Desempate: Mayor valor total de ciudades

### Pantalla de Victoria

Cuando alguien gana:

1. Se muestra **Pantalla de Victoria**
2. Se listan las posiciones finales
3. Se muestran estadísticas del juego
4. La partida pasa a estado **"Terminada"**

---

## Consejos y Estrategias

### Para Principiantes

1. **Protege tus ciudades**: Son tu objetivo de victoria
2. **Haz alianzas tempranas**: No puedes ganar solo
3. **Comunica constantemente**: Negocia cada turno
4. **No te expandas demasiado rápido**: Mantén tus líneas de suministro
5. **Lee las órdenes después de cada turno**: Aprende de los resultados

### Estrategias Avanzadas

**Control de choke points:**
- Controla pasos estrechos y puertos clave
- Bloquea avances enemigos

**Pinzas coordinadas:**
- Ataca desde dos direcciones con un aliado
- Usa apoyos cruzados

**Diplomacia flexible:**
- Cambia de aliados según la situación
- Mantén a todos adivinando

**Gestión económica:**
- Planea ingresos futuros
- No gastes todos tus ducados
- Usa transferencias para comprar lealtad

**Fog of war:**
- Solo ves unidades en tus provincias y adyacentes
- Usa exploradores para recopilar información
- Pide información a aliados

### Errores Comunes

❌ **Atacar a todos a la vez**: Harás enemigos de todos
❌ **Confiar ciegamente**: Las traiciones son parte del juego
❌ **Ignorar la economía**: Los ducados son poder
❌ **No comunicar**: La diplomacia es el 50% del juego
❌ **Olvidar dar órdenes**: Darás "mantener" automáticamente

---

## Preguntas Frecuentes

### ¿Cuánto tiempo dura una partida?

Depende de los plazos configurados:
- Plazos de 24h: ~1 semana
- Plazos de 48h: ~2-3 semanas
- Plazos de 72h: ~3-4 semanas

### ¿Qué pasa si no doy órdenes?

Tus unidades darán "mantener" automáticamente. Si fallas en dar órdenes múltiples veces, serás marcado como inactivo.

### ¿Puedo modificar mis órdenes?

Sí, puedes modificar órdenes tantas veces como quieras durante la Fase de Órdenes, hasta que expire el plazo.

### ¿Los aliados pueden ver mis órdenes?

No, las órdenes son secretas hasta la resolución. Debes comunicar tus planes por chat.

### ¿Cómo funcionan las batallas?

Se compara la **fuerza**:
- Fuerza = 1 (base) + apoyos recibidos
- Mayor fuerza gana
- Empate = nadie avanza (standoff)

### ¿Qué es el fog of war?

Solo ves unidades en:
- Provincias que controlas
- Provincias adyacentes a las que controlas
- El resto del mapa está oculto

---

## Soporte

¿Necesitas ayuda?

- **[FAQ](FAQ.md)** - Preguntas frecuentes adicionales
- **[Referencia de Órdenes](../reference/ordenes-militares.md)** - Detalles técnicos
- **Reportar bugs**: [GitHub Issues](https://github.com/tu-repo/machiavelli/issues)

---

**¡Buena suerte, y que la astucia de Maquiavelo te acompañe!**
