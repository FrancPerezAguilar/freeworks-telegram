# Free Works Telegram — Contexto completo para IA

> **Mini App de Telegram** para Free Works. Ejecuta dentro de Telegram (WebApp SDK),
> con Appwrite como backend. Conectada al mismo proyecto Appwrite que la web app de
> `~/free-works/` (database `freeworks`).
>
> **Propietario:** Franc Pérez (autónomo electricista). **chat_id:** 6341670106.

---

## 📋 Resumen ejecutivo

Free Works Telegram es una **Mini App de Telegram** (no es una webapp independiente):
se abre desde un bot de Telegram y se renderiza dentro del WebView nativo del cliente
de Telegram. Su propósito es dar a Franc acceso móvil, rápido y siempre a mano, a su
gestor de trabajos.

**Diferencia clave con la web app:**
- La web app (`~/free-works/web/`) usa API key del servidor hardcodeada en el cliente
  (`setDevKey`). Esto es un antipatrón que la web app arrastra.
- La Mini App usa **sesión de usuario real** vía Telegram initData → Appwrite JWT.
  Más correcto, pero requiere auth.

**Funcionalidades implementadas:**
- Dashboard con stats y eventos de hoy
- Lista de trabajos (vista lista + kanban con scroll horizontal)
- Vista detalle de trabajo (Info + Comentarios + Adjuntos + Tiempos + Materiales + Checklist)
- Agenda semanal (eventos calendario + tareas con fecha)
- "Mis Tareas" (todas las pendientes agrupadas por trabajo)
- Clientes: lista + detalle editable + crear nuevo
- Crear/editar/borrar tareas con fecha opcional
- Crear/borrar comentarios
- Subir/eliminar adjuntos (fotos, PDFs, documentos) a Appwrite Storage

**Funcionalidades pendientes / no implementadas:**
- Crear/eliminar trabajos desde la Mini App (sólo se listan)
- Crear/eliminar eventos de calendario desde la Mini App (sólo se leen)
- Crear/eliminar presupuestos/facturas
- Sistema de técnicos (asignar técnicos al trabajo)

---

## 🏗️ Arquitectura

```
┌─────────────────────────┐
│  Telegram (móvil/escritorio) │
│  Bot → botón "Abrir app"  │
└────────┬────────────────┘
         │ WebView (telegram.org/js/telegram-web-app.js)
         ▼
┌────────────────────────────────────────┐
│  Free Works Telegram Mini App (SPA)    │
│  React 19 + Vite 8 + Tailwind 4        │
│  URL: https://freeworks-t.appwrite.network/ │
└────────┬───────────────────────────────┘
         │ HTTPS + Appwrite SDK
         ▼
┌────────────────────────────────────────┐
│  Appwrite Cloud (proyecto shared)      │
│  DB: freeworks                         │
│  Bucket Storage: adjuntos              │
│  Auth: Telegram initData → JWT user    │
└────────────────────────────────────────┘
```

### Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript | React 19.2 / TS 6.0 |
| Build | Vite | 8.x |
| Styling | Tailwind CSS | 4.3 |
| Data | @tanstack/react-query | 5.100 |
| Backend SDK | appwrite | 26.0 |
| Iconos | lucide-react | 1.17 |

### Estructura del repositorio

```
freeworks-telegram/
├── src/
│   ├── api/
│   │   └── trabajos.ts          # Único módulo de API: CRUD de TODO (435 LOC)
│   ├── lib/
│   │   ├── appwrite.ts          # Doble cliente (server + sesión) + normalizeDoc
│   │   ├── telegramAuth.ts      # Auth Telegram → Appwrite JWT
│   │   ├── TelegramContext.tsx  # Provider del SDK Telegram (theme, user, backBtn)
│   │   └── constants.tsx        # ESTADOS, PRIORIDADES, TIPOS_EVENTO, fmtDate/Time
│   ├── pages/
│   │   ├── DashboardView.tsx    # Stats + eventos hoy + trabajos recientes
│   │   ├── AgendaView.tsx       # Vista semanal: eventos + tareas con fecha
│   │   ├── TrabajosListView.tsx # Lista + Kanban de trabajos
│   │   ├── TrabajoView.tsx      # Detalle trabajo (4 tabs + comentarios + adjuntos)
│   │   ├── MisTareasView.tsx    # Todas las tareas pendientes agrupadas
│   │   ├── ClientesListView.tsx # Lista de clientes
│   │   ├── ClienteDetailView.tsx# Detalle editable
│   │   └── ClienteFormView.tsx  # Crear nuevo cliente
│   ├── App.tsx                  # Router por estado (sin react-router) + auth
│   ├── main.tsx                 # Bootstrap: TelegramProvider → App
│   ├── config.ts                # APPWRITE_CONFIG + COLLECTIONS map
│   ├── index.css                # Tailwind + CSS vars del tema Telegram
│   └── vite-env.d.ts
├── index.html                   # Carga telegram-web-app.js
├── vite.config.ts               # Tailwind plugin + puerto 5174
├── package.json                 # Build: tsc -b && vite build
└── AGENTS.md                    # ← Este documento
```

---

## 🔐 Autenticación — flujo crítico

**Es el flujo más delicado de toda la app.** Si falla, no se muestra nada.

### Flujo (en orden)

1. **Carga la página** → `main.tsx` monta `<TelegramProvider>` que detecta
   `window.Telegram.WebApp` y lee `initDataUnsafe.user`.

2. **`App.tsx` ve `isTelegram`** → llama a `authenticateWithTelegram(tgUser)`.

3. **`telegramAuth.ts` ejecuta:**
   ```
   a) account.deleteSessions()      // limpia sesión previa
   b) Busca en colección user_telegram por telegram_id
      └ Si existe: lee appwrite_user_id
      └ Si no:    crea user en Appwrite (POST /users con API key)
                  + crea doc en user_telegram (mapping)
   c) Crea token de sesión: POST /users/{userId}/tokens
   d) account.createSession(userId, secret)
      → activa JWT en el sessionClient
   ```

4. **A partir de aquí**, `db` y `storage` actúan con permisos del usuario
   (NO con API key). Esto es crítico para que `documentSecurity: true`
   funcione — los docs solo son visibles para su dueño + admin.

### IDs importantes

| Recurso | Valor |
|---------|-------|
| Appwrite Project | `6a3a9bfd00036f813523` |
| Database | `freeworks` |
| Bucket Storage | `adjuntos` |
| Colección mapping auth | `user_telegram` |
| Admin (Franc) | `6a3abbe6001bea1b9386` |
| Telegram ID Franc | `6341670106` |

### ⚠️ Lo que NO debes cambiar

- La `apiKey` del config (`standard_...`). Es API key de servidor, se usa solo
  para `users.*` (REST directo) y `serverDb` (Database server-side).
  **El cliente de la Mini App no debería llevarla**, pero está aquí para
  acelerar el desarrollo. La intención es migrar a Cloud Function en producción.

- El email sintético `tg_{telegramId}@freeworks.app`. Es el patrón para
  relacionar Telegram users con Appwrite users.

---

## 📊 Modelo de datos (Appwrite)

**Todas las colecciones tienen `documentSecurity: true`** → cada doc tiene su
propia lista de `$permissions`. Las queries con sesión de usuario SOLO devuelven
docs cuyo `permissions` incluye al usuario actual (o `any`/`guests`).

### Colecciones que USA la Mini App

| Colección | Atributos clave | Permisos en create |
|-----------|----------------|---------------------|
| `clientes` | `nombre`, `apellidos`, `telefono_principal`, `email`, `direccion_*`, `notas_internas`, `activo` | `getUserPerms()` |
| `trabajos` | `titulo`, `descripcion`, `cliente_id`, `cliente_nombre`, `estado`, `prioridad`, `obra_*`, `fecha_inicio/fin_*`, `total_horas`, `coste_total` | (sólo lectura desde Mini App) |
| `trabajo_checklist` | `trabajo_id`, `descripcion`, `completado`, `fecha`, `hora` | `getUserPerms()` |
| `trabajo_tiempos` | `trabajo_id`, `horas`, `descripcion`, `fecha` | `getUserPerms()` |
| `trabajo_materiales` | `trabajo_id`, `material_id`, `nombre`, `cantidad`, `precio_unitario`, `importe` | `getUserPerms()` |
| `materiales` | `nombre`, `precio_unitario`, `unidad_medida`, `categoria`, `stock_actual`, `fabricante` | (lectura; creación inline) |
| `comentarios` | `entity_type`, `entity_id`, `contenido`, `autor`, `fecha` | `getUserPerms()` |
| `calendario` | `titulo`, `fecha_evento`, `hora_evento`, `tipo`, `cliente_nombre`, `ubicacion` | (sólo lectura desde Mini App) |
| `tecnicos` | `nombre`, `email`, `telefono`, `especialidad`, `activo` | (referencia, no se usa activamente) |
| `adjuntos` | `entity_type`, `entity_id`, `nombre`, `tipo`, `tamano`, `bucket_file_id` | `getUserPerms()` |
| `user_telegram` | `telegram_id`, `appwrite_user_id` | server-side (API key) |

### `getUserPerms()` — la función más importante

```ts
async function getUserPerms(): Promise<string[]> {
  const userId = await getCurrentUserId();
  const base = userId ? [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ] : [
    Permission.read(Role.any()),
    Permission.update(Role.any()),
    Permission.delete(Role.any()),
  ];
  // Añadir a Franc como admin en todos los docs
  base.push(Permission.read(Role.user("6a3abbe6001bea1b9386")));
  base.push(Permission.update(Role.user("6a3abbe6001bea1b9386")));
  base.push(Permission.delete(Role.user("6a3abbe6001bea1b9386")));
  return base;
}
```

Sin esto, los docs creados no serían visibles para el propio creador (porque
`documentSecurity: true` exige permisos explícitos). SIEMPRE llamar a
`getUserPerms()` al crear documentos.

### Estados y prioridades

```ts
ESTADOS_TRABAJO = ["pendiente", "en_curso", "completado", "cancelado"]
PRIORIDADES     = ["baja", "media", "alta", "urgente"]
TIPOS_EVENTO    = ["cita", "visita_obra", "instalacion", "mantenimiento", "presupuesto", "llamada", "otro"]
```

---

## 🧠 Vistas — qué hace cada una

### DashboardView (171 LOC)
- Header con fecha actual en español
- Grid 2×2 con stats: pendientes / en curso / tareas / clientes
- Sección "Hoy" con eventos del día (si hay)
- Lista de 5 trabajos recientes (click → `TrabajoView`)

### AgendaView (173 LOC)
- Vista semanal (lunes a domingo)
- Mezcla eventos del calendario + tareas del checklist con fecha
- Cabecera sticky por día con badge "HOY" si aplica
- Click en tarea → navegar al trabajo (manejado por App.tsx)
- Query: `getEventos(lunes, domingo)` + `getChecklistConFecha()`

### TrabajosListView (253 LOC)
- Toggle vista: Lista ↔ Kanban
- Búsqueda client-side sobre título/cliente/municipio
- Kanban: 3 columnas (Pendiente / En curso / Completado) con scroll horizontal
  snap-mandatory. Dots de navegación entre columnas.

### TrabajoView (1001 LOC) — LA MÁS GRANDE
Es la vista con más subcomponentes. 4 tabs:
1. **Info** — campos editables click-to-edit, comentarios, adjuntos
2. **Tiempos** — lista de registros de horas con totales
3. **Materiales** — lista de materiales usados con importe total
4. **Checklist** — tareas con fecha opcional, edición inline

Componentes internos:
- `Field` / `SelectField` — inputs click-to-edit con auto-save debounced (600ms)
- `ClienteSelector` — autocomplete + crear on-the-fly
- `MaterialSelector` — autocomplete + crear on-the-fly
- `AddressAutocomplete` — Photon/OSM API para autocompletar direcciones
- `ComentariosSection` — chat-style lista + input
- `AdjuntosSection` — grid de thumbnails con lightbox para imágenes
- `TiemposSection`, `MaterialesSection`, `ChecklistSection` — sub-tab content

### MisTareasView (141 LOC)
- Agrupa TODAS las tareas pendientes por trabajo
- Click en tarea → marca como completada
- Click en trabajo header → abre detalle

### ClientesListView (84 LOC)
- Búsqueda + lista con avatar circular
- Botón "+" para crear nuevo

### ClienteDetailView (212 LOC)
- Vista editable estilo click-to-edit
- 4 secciones: Datos personales, Contacto, Dirección, Notas
- Lista de trabajos vinculados al final

### ClienteFormView (185 LOC)
- Form de creación con validación
- Pantalla de éxito con auto-redirect

---

## 🔄 Navegación — `App.tsx`

**La Mini App NO usa react-router.** Es state-based routing:

```ts
type View = "dashboard" | "agenda" | "trabajos" | "mistareas"
          | "trabajo" | "clientes" | "cliente" | "nuevoCliente";
```

El router está en `App.tsx` con `useState<View>`. Navegación por callbacks
(`onTrabajoClick`, `onClienteClick`, etc.) que cada vista recibe por props.

**Deep links:** la app soporta query params:
- `?trabajo_id=XXX` → abre directamente el trabajo
- `?tab=agenda` o `?tab=trabajos` → cambia tab al cargar

---

## 📁 Archivos críticos y patrones

### `src/api/trabajos.ts` (435 LOC)

**El módulo monolítico de API.** Contiene TODAS las llamadas a Appwrite
agrupadas por dominio (trabajos, clientes, checklist, materiales, calendario,
adjuntos, comentarios, tiempos). Exporta también los tipos TypeScript.

Funciones principales:
- Trabajos: `getTrabajos`, `getTrabajo`, `updateTrabajo`
- Checklist: `getChecklistPendiente`, `getChecklistConFecha`,
  `addChecklistItem`, `updateChecklistItem`, `deleteChecklistItem`
- Tiempos/Materiales: CRUD análogo
- Clientes: `getClientes`, `getCliente`, `createCliente`, `updateCliente`,
  `getTrabajosDeCliente`
- Comentarios/Adjuntos: `getComentarios`, `addComentario`, `deleteComentario`,
  `getAdjuntos`, `uploadAdjunto`, `deleteAdjunto`
- Calendario: `getEventos(fechaDesde, fechaHasta)` (sólo lectura)
- Materiales (catálogo): `getMateriales`, `createMaterial`

**Patrón clave:** todas las funciones de escritura usan
`getUserPerms()` como cuarto parámetro de `createDocument()`.

### `src/lib/appwrite.ts` (60 LOC)

Doble cliente:
- `serverClient` + `serverDb` → con API key (server-side)
- `sessionClient` + `db`, `storage`, `account` → con sesión de usuario

Función `normalizeDoc` que convierte docs Appwrite:
- `$id` → `appwrite_id` (string)
- `$id` → `id` (number, via `hashId()` — estable, no persistente)
- `$createdAt` → `fecha_creacion`
- `$updatedAt` → `fecha_modificacion`

### `src/lib/telegramAuth.ts` (133 LOC)

Lógica completa de auth. Usa `serverDb` para `user_telegram` y `fetch` directo
a `/users` REST API (porque `account.create` no está disponible en SDK web).

### `src/lib/TelegramContext.tsx` (146 LOC)

Provider que:
- Detecta `window.Telegram.WebApp`
- Llama a `webApp.ready()`, `webApp.expand()`
- Aplica CSS vars del tema Telegram al `<html>`
- Suscribe cambios de tema (`themeChanged` event)
- Configura el botón back nativo de Telegram

Hook exportado: `useTelegram()`, `useTelegramBackButton(enabled)`

### `src/lib/constants.tsx` (71 LOC)

Constantes compartidas y helpers:
- `ESTADOS`, `PRIORIDADES`, `TIPOS_EVENTO` (con label + color)
- `fmtDate(d)` → "5 jun 2026"
- `fmtTime(t)` → "10:30"
- `lunesEstaSemana()`, `domingoEstaSemana()`, `hoyISO()`

---

## ⚠️ Pitfalls conocidos (lecciones aprendidas)

### 1. Doble cliente Appwrite
NO uses solo `db` para todo. `account.get()` y todo lo de `users.*` necesita
API key (`serverDb` o `fetch` REST directo). El SDK web NO expone `users.create()`.

### 2. `documentSecurity: true`
Si creas un doc SIN `permissions`, Appwrite lo crea con `$permissions: []` y
NADIE lo ve. **SIEMPRE** pasar `getUserPerms()` como 4º parámetro.

### 3. IDs como string
Todos los IDs de Appwrite son string (`$id`). La Mini App usa directamente el
string en URLs/queries — no hay capa de mapeo numérico como la web app
(la web app usa `idMap` para mantener compatibilidad con PostgreSQL legacy;
la Mini App no tiene esa herencia).

### 4. Query attribute types
Appwrite es estricto con tipos en queries:
- `Query.equal("trabajo_id", "string-id")` ✓
- `Query.equal("fecha", "2026-07-15")` ✓ (string ISO)
- `Query.equal("completado", false)` ✓ (boolean)
- `Query.equal("entity_id", 5)` ✗ — debe ser string

### 5. Búsqueda fulltext
`Query.search("titulo", "...")` requiere índice fulltext en el atributo.
Si no está, la query devuelve 0 resultados. La Mini App evita esto haciendo
búsqueda **client-side** con `.filter()` y `.includes()`.

### 6. `setDevKey` vs sesión
La web app usa `setDevKey()` que bypass `documentSecurity`. La Mini App NO
usa esto (salvo para `serverDb` que se usa solo para auth). Todo lo demás
va con sesión → respeta los permisos.

### 7. Tema Telegram
La Mini App integra el tema Telegram vía CSS vars (`--tg-theme-*`). Nunca
uses colores hardcoded — siempre `var(--tg-theme-text_color)` etc.

### 8. BackButton nativo
Cuando la Mini App está dentro de Telegram, el back nativo (`tg.BackButton`)
aparece y debe estar sincronizado con la navegación interna. Hook
`useTelegramBackButton(true)` para mostrar, `false` para ocultar.

### 9. Deep links con query params
`?trabajo_id=XXX` se procesa una sola vez al montar `App.tsx`. No hay
listener para cambios de URL.

### 10. Tipos `entity_type`
Los comentarios y adjuntos son polimórficos: `entity_type = "trabajo" | "cliente"`.
El código actual solo usa `"trabajo"`. Si añades comentarios a clientes, hay
que migrar la query del listado.

---

## 🛠️ Comandos

```bash
# Dev server (puerto 5174)
cd ~/freeworks-telegram && npm run dev

# Build (tsc + vite)
cd ~/freeworks-telegram && npm run build

# Preview local del build
cd ~/freeworks-telegram && npm run preview
```

## 🚀 Despliegue

| Destino | URL |
|---------|-----|
| Producción | `https://freeworks-t.appwrite.network/` (Appwrite static hosting) |
| Build output | `dist/` (subir a Appwrite → `freeworks-t.appwrite.network`) |

Para redesplegar:
```bash
cd ~/freeworks-telegram
npm ci && npm run build
# Subir contenido de dist/ a Appwrite hosting (manual desde consola)
```

---

## 🔗 Relaciones con otros proyectos

| Proyecto | Relación |
|---------|----------|
| `~/free-works/web/` | Comparte database Appwrite (mismas colecciones). La web app está siendo abandonada. |
| `~/free-works/db/` (FastAPI) | PostgreSQL local legacy — NO se usa en runtime desde la Mini App. El schema es referencia histórica. |
| Bot Telegram | Aprovisiona el `WebAppInfo` button → abre esta Mini App. |

---

## 📝 Convenciones del código

- **Lenguaje:** código en inglés, comentarios en español
- **Imports:** paths relativos con extensión implícita (Vite resuelve)
- **Estilos:** Tailwind utilities + CSS vars inline para tema Telegram.
  NO usar `bg-blue-500` para colores de marca — usar `var(--tg-theme-button_color)`.
- **Componentes:** funciones exportadas con nombre, archivos en PascalCase
- **Tipos:** definidos en `api/trabajos.ts` para entidades, en cada vista para props
- **Mutations:** siempre usar `useMutation` + `queryClient.invalidateQueries`
- **No hay tests.** No hay framework de tests configurado.

---

## 🆘 Debug rápido

### "La app se queda cargando"
→ Auth falló. Mira la consola: `auth.error` te dice qué.
Causas comunes: API key expirada, Telegram WebApp mock en navegador normal,
o `initData` corrupto.

### "No veo ningún trabajo"
→ Permisos. Los docs tienen `documentSecurity: true` y `$permissions: []`.
Solución: o crear docs nuevos (con `getUserPerms()`), o añadir admin en
permisos via Appwrite console.

### "Las tareas no aparecen en Agenda"
→ Las tareas necesitan `fecha` no nula. `getChecklistConFecha()` filtra
por `Query.isNotNull("fecha")`. Si la fecha no se guardó, revisar
`addChecklistItem` y verificar que se pasa el parámetro.

### "Pantalla en blanco sin errores"
→ Generalmente error en build no detectado. Mira consola del navegador.
Si TypeScript falla, `npm run build` lo muestra.

### "El tema Telegram no se aplica"
→ Asegúrate de que `<TelegramProvider>` envuelve la app en `main.tsx`.
Si abres la URL en un navegador normal (no Telegram), se aplican los
defaults de `index.css`.

---

## 🎯 Próximas features típicas (orden de prioridad)

1. **Crear trabajo desde la Mini App** (hoy solo se listan/leen)
2. **Crear evento calendario desde la Mini App** (idem)
3. **Botón "Marcar como hecho" en eventos próximos** (recordatorios)
4. **Notificaciones push** cuando se acerque una tarea
5. **Búsqueda fulltext** en Trabajos (ahora es client-side)
6. **Vista de materiales del catálogo** (hoy se listan pero no se editan)
7. **Asistente IA / chat** (JARVIS) integrado en la Mini App

---

*Documento mantenido por IA. Si encuentras algo desactualizado o incorrecto,
edítalo directamente — esto es contexto compartido, no código.*