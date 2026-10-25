# Plan · Reemplazar mocks por Supabase

**Estado:** propuesta. Espera tu aprobación de las decisiones de la sección 6.
**Rama:** `claude/nifty-knuth-lrfte5`. Al cerrar cada etapa hago commit y push y me detengo para que revisés.

La UI ya está hecha. Solo cambian la capa de datos, la autenticación y las acciones. Las únicas piezas de UI nuevas son las que el pedido exige y hoy no existen (sección 3, "UI nueva"). Esas siguen los componentes y tokens actuales.

---

## 0. Lo que encontré al investigar

| Hallazgo | Consecuencia |
|---|---|
| `supabase/migrations/20261024000000_init.sql` **no existía** en ninguna rama | Lo creé con tu script tal cual. Solo cambié "clientas" por "clientes" en comentarios, que no se guardan en la base, así que el archivo coincide con lo aplicado. |
| La migración aplica **sin errores** en Postgres 16 con un shim mínimo de Supabase (roles, `auth.users`, `auth.uid()`) | Sirve como base para los tests SQL en este contenedor. |
| El proyecto de Henna **existe en otra cuenta** y ya tiene el script aplicado. Las credenciales las tiene el dueño. | Las migraciones nuevas (M1…) se escriben y prueban aquí; vos las aplicás. Si corriste la inicial desde el SQL Editor, antes del primer `supabase db push` hay que correr `supabase migration repair --status applied 20261024000000`. |
| `get_public_artists` y `get_available_slots` exigen `role = 'tatuadora'`. Lo probé: la admin con horario **no aparece** en el formulario. | En los mocks y los e2e, Kimberly es admin **y** artista. Ver M1. |
| `create_booking` hace un upsert por teléfono que **sobrescribe** nombre y correo. Lo probé. | Cualquiera que sepa un teléfono puede cambiarle los datos a un cliente. Ver M1. |
| `supabase start` no corre en este contenedor. La red bloquea las imágenes (public.ecr.aws responde 403 por política y Docker Hub responde 429). | Los tests SQL corren aquí contra Postgres 16 + shim. Los e2e contra Supabase local los dejo listos para que corran en tu máquina (sección 4). |
| `supabase gen types --db-url` sí funciona sin Docker | Puedo generar `src/types/database.ts` aquí, desde las mismas migraciones. |
| `.gitignore` ignora `.env*` | Hay que agregar `!.env.example` o el archivo de ejemplo nunca se sube. |
| Next 16.4: `middleware` pasó a llamarse **`proxy.ts`**. Corre en Node. `cacheComponents: true` está activo, así que leer cookies obliga a estar dentro de `<Suspense>`. | Las páginas ya cargan datos en componentes dentro de `Suspense`, así que el patrón calza. El proxy usa el `updateSession` actual de `@supabase/ssr` 0.12 (`getClaims()` y `setAll(cookies, headers)`). |

---

## 1. Comparación mocks ↔ esquema

Campos que la UI usa y que no existen igual en la base. **Front** significa que se resuelve en `src/lib/data` sin tocar el esquema.

| Tipo UI | Campo UI | En la base | Propuesta |
|---|---|---|---|
| Profile | `commission_rate` (0–1) | `commission_rate` (0–100) | **Front**: usar el porcentaje directo. La UI ya lo muestra en %. |
| Profile | `avatar_url` | no existe | **Front**: se elimina del tipo. Ningún componente lo usa (se muestran iniciales). |
| Profile | iniciales | — | **Front**: ya se calculan con `initials(full_name)`. |
| Location | `sort_order` | no existe | **Front**: ordenar por nombre (Hojancha queda primero y cambian los tonos de lugar), o **migración** con `sort_order`. Pregunta 7. |
| SizeOption | `duration_minutes` mínimo 5 (Zod) | check 15–480 | **Front**: alinear el Zod a 15–480. |
| WeeklyAvailability / Override | `start_time` "HH:mm" | `time` → "HH:mm:ss" | **Front**: recortar a HH:mm al leer. |
| Booking | `client_first_name`, `client_last_name`, `client_whatsapp`, `client_email` | tabla `clients` (`first_name`, `last_name`, `phone`, `email`) | **Front**: join `clients(...)`. El teléfono se guarda como `+506XXXXXXXX` y la UI recibe los 8 dígitos, porque `formatWhatsApp` y `wa.me/506…` esperan eso. |
| Booking | `reference_image_url` | `reference_image_public_id` | **Front (servidor)**: URL firmada de Cloudinary generada en el servidor. El `public_id` nunca llega al cliente. |
| Booking | `skin_care_consent` / `privacy_consent` | `consent_health` / `consent_privacy` | **Front**: renombrar en la UI a los nombres de la base (pregunta 6). |
| Booking | — | `cancel_token`, `artist_commission_rate`, `google_event_id` | **Nunca** se mandan al cliente. |
| Payment | `method: "tarjeta"` | enum `sinpe \| efectivo \| transferencia` | **Front**: usar el enum de la base. Hoy no hay UI de pagos. |
| Payment | — | `type` (anticipo/saldo), `receipt_public_id` | UI nueva en etapa 5. |
| CashMovement | `date` (fecha) | `occurred_at` (timestamptz) | **Front**: fecha de CR al leer. Al guardar: hoy → `now()`, otra fecha → 12:00 de CR. |
| Settings | `slot_interval_minutes` (10–120) | `slot_step_minutes` (solo 15/30/60) | **Front**: renombrar y validar 15/30/60 con mensaje claro. |
| Settings | `drying_minutes_min/max` | `drying_min_minutes/max` | **Front**: renombrar. |
| Settings | — | `deposit_amount`, `max_pending_per_phone` | Dos campos más en el formulario "Reservas", con el mismo estilo (pregunta 8). |
| AvailableSlot | `starts_at`, `ends_at`, `artist_id`, `location_id` | `slot_start`, `slot_end` | **Front**: mapear. Artista y lugar vienen de la consulta. |
| AvailableDay | `get_available_days` | **no existe** | **Migración M2**, o N llamadas a `get_available_slots` (pregunta 3). |
| `artistsByLocation` | mapa lugar → artistas | `get_public_artists(lugar)` | **Front**: una llamada por lugar activo en el Server Component. |
| DashboardSummary | conteos e ingresos | — | **Migración M5** (agregados en la base). |

---

## 2. Migraciones propuestas

Ninguna se escribe en el remoto sin tu OK. Cada una va en su propio archivo `supabase/migrations/<timestamp>_<nombre>.sql` y se prueba con `pnpm db:test`. **No creo, cambio ni desactivo políticas RLS** en ninguna.

| Id | Etapa | Qué hace | Por qué |
|---|---|---|---|
| **M1** `fixes` | 1 | **(a)** `get_public_artists` y `get_available_slots` aceptan cualquier perfil activo con horario, no solo `tatuadora`. **(b)** El upsert de `create_booking` solo **rellena campos vacíos** y no pisa nombre ni correo existentes. **(c)** `TOO_MANY_PENDING` cuenta solo pendientes **futuras**. **(d)** `pg_advisory_xact_lock` por artista dentro de `create_booking`. **(e)** Trigger que fija `recorded_by := auth.uid()` en `payments` y `cash_movements` cuando hay sesión. **(f)** Revoca `execute` de `anon` en `is_admin()` e `is_active_staff()`. | **(a)** La admin también atiende. **(b)** Es una vulnerabilidad del formulario público. **(c)** Las pendientes viejas bloquean para siempre. **(d)** Cierra la carrera que puede saltarse el buffer y el límite de pendientes. **(e)** Hoy se puede registrar a nombre de otra persona. **(f)** Lo marca el linter de Supabase (0028). |
| **M2** `available_days` | 4 | `get_available_days(artista, lugar, tamaño)` devuelve las fechas de la ventana que tienen algún espacio, reutilizando `get_available_slots`. Se puede ejecutar como `anon`. | Una sola llamada por calendario en vez de ~29. Usa la misma regla, sin duplicar lógica. |
| **M3** `set_day_schedule` | 3 | `set_day_schedule(artista, días jsonb)`. Por cada fecha borra sus excepciones e inserta los bloques nuevos, o marca el día libre, **en una transacción**. Es `security invoker`, así que RLS sigue mandando. | Hoy "Solo este día" son 2–3 pasos (copiar el semanal, borrar el día libre, insertar). Por PostgREST quedarían a medias si uno falla. "Copiar semana anterior" lo usa también, en una sola acción. |
| **M4** `payment_to_cash` | 5 | Trigger: al registrar un pago se crea un `ingreso` en caja con `booking_id`, `artist_id` y `location_id` de la cita. | La artista puede registrar pagos, pero RLS no la deja insertar en caja. Sin esto, Caja y Pagos quedan desconectados y habría doble registro. |
| **M5** `summaries` | 5 | Funciones `security invoker` `dashboard_summary(mes)` y `cash_totals()`. Hacen los agregados en la base sobre `v_booking_earnings` y `cash_movements`. | Lo pediste: nada de traer todas las filas al servidor ni al cliente. |
| *(M0 condicional)* `grants` | 1 | `grant` explícitos a `anon` / `authenticated` en tablas y vista. | Solo si tu proyecto no otorga privilegios por defecto en `public`. Lo verifico con una consulta cuando exista el proyecto. |

---

## 3. Etapas

Las reglas de seguridad de tu pedido valen para todas. Las verifican el ESLint, `check:secrets` y los tests.

### Etapa 1 · Configuración

1. Instalar versiones fijas: `@supabase/supabase-js@2.118.0`, `@supabase/ssr@0.12.7`, y como dev `supabase@2.122.0` (CLI) y `pg` (tests de base).
2. `src/lib/env.ts` (`server-only`): Zod para `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`. Falla con un mensaje claro si falta alguna. `src/instrumentation.ts` lo importa para que falle **al arrancar**. Ninguna variable de Supabase lleva `NEXT_PUBLIC_`.
3. Clientes, todos `server-only`:
   - `src/lib/supabase/server.ts`: cookies, `setAll` en try/catch.
   - `src/lib/supabase/service.ts`: llave secreta, sin persistir sesión.
   - `src/lib/supabase/proxy.ts` + `src/proxy.ts`: `updateSession` con `getClaims()`. El proxy lee env directo, sin el guard de `server-only`, si Next no lo permite ahí.
4. ESLint: prohibir `@supabase/*` y `@/lib/supabase/*` en `src/components/**`.
5. `scripts/check-secrets.mjs` + `pnpm check:secrets`. Busca en `.next/static` **y** en el HTML/RSC prerenderado de `.next/server/app` el host del proyecto y los prefijos `sb_publishable_`, `sb_secret_` y el inicio de la anon key. Tiene autoprueba: con un valor plantado tiene que fallar.
6. Tipos:
   - `pnpm db:types`: usa `--db-url` si existe `DATABASE_URL`, si no `--local`, y escribe `src/types/database.ts`.
   - Los modelos de la UI pasan a `src/types/domain.ts`, derivados de `Tables<'…'>` y `Enums<'…'>`, más los campos de join (`client_*`, `reference_image_url`).
   - Los `import type` de los componentes se actualizan. Es un cambio mecánico, sin tocar diseño.
   - Los mocks se adaptan a los nombres nuevos para que la app siga funcionando mientras las etapas siguientes reemplazan cada parte.
7. `supabase/config.toml` (`supabase init`), `supabase/seed.sql`, `.env.example`, y `!.env.example` en `.gitignore`.
8. **M1** (y M0 si hace falta).
9. Tests de base: `tests/db/` (sección 4).

**Verificación:** `pnpm lint`, `npx tsc --noEmit`, `pnpm build`, `pnpm check:secrets` (más su autoprueba), `pnpm db:test`, y `test:e2e` + `test:a11y` todavía sobre mocks.
**Lo que necesito de vos:** el proyecto y sus llaves (pregunta 1).

### Etapa 2 · Autenticación y roles
*Bloqueada por:* etapa 1 y un proyecto con las llaves configuradas.

1. `src/lib/auth.ts` (`server-only`):
   - `getSessionProfile()` con `cache()`: `getClaims()` + fila de `profiles`.
   - `requireStaff()`: sin sesión → `/admin/login`; inactiva → `/admin/pendiente`.
   - `requireAdmin()`: en páginas muestra el estado vacío de siempre ("Solo la admin…"); en acciones devuelve `FORBIDDEN`.
2. Server Actions en `src/lib/actions/auth.ts`: `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`.
3. `src/app/auth/confirm/route.ts`: `verifyOtp({ type, token_hash })`. Con `invite` redirige a `/admin/contrasena?tipo=invitacion`; con `recovery`, a `?tipo=recuperacion`; con error, a `/admin/login?error=enlace`. Nunca deja el token en la URL final.
4. Proxy:
   - Protege `/admin/*` salvo `/admin/login` y `/admin/recuperar`.
   - Si ya hay sesión, `/admin/login` redirige a `/admin`.
   - Además, cada página y cada acción del admin llama `requireStaff()` o `requireAdmin()`.
5. Ajustes → Artistas: invitar (correo y nombre), activar/desactivar, rol y comisión.
   - `inviteUserByEmail` va con el cliente de servicio, detrás de `requireAdmin()`.
   - El resto va con la sesión de la admin, así que RLS y el trigger `protect_profile_fields` hacen su trabajo.
   - La admin no puede quitarse su propio rol ni desactivarse.
6. Sidebar y menú de cuenta: "Cerrar sesión" pasa de enlace a botón de formulario (`signOut`). Las secciones ya se filtran por rol.
7. **Instrucciones para el panel de Supabase:**
   - Plantillas Invite user / Reset password con `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite` / `…&type=recovery`.
   - Site URL y Redirect URLs para local y producción.
   - Registro público desactivado.
   - Nota sobre SMTP propio: el correo integrado tiene un límite muy bajo por hora.

**UI nueva** (con la misma tarjeta del login): `/admin/recuperar`, `/admin/contrasena`, `/admin/pendiente`, el enlace "¿Olvidaste tu contraseña?", y en Ajustes → Artistas el botón y modal "Invitar artista", el switch Activa y el select Rol.
**Verificación:** lint/build/secrets. Tests SQL de `protect_profile_fields`. e2e de login, logout, recuperación e inactiva (corren en tu máquina).

### Etapa 3 · Disponibilidad (prioridad)
*Bloqueada por:* etapa 2.

1. `src/lib/data/queries.ts`: horario semanal, excepciones y citas de la ventana leídos con la sesión. RLS limita a la artista a lo suyo.
2. Server Actions con `requireStaff()`:
   - Actualizar `applyAvailability`, `markDaysOff`, `resetDays`, `updateOccurrence` y `deleteOccurrence`, y agregar la nueva `copyPreviousWeek`.
   - Para la artista, el `artist_id` sale **siempre de la sesión**. La admin puede elegir artista (validado con Zod y contra `profiles`).
   - Lo semanal es una sola sentencia. Lo de "solo este día" y copiar semana van por **M3**.
3. "Copiar semana anterior": botón junto al selector de artista que abre un modal para elegir la semana destino (las próximas 6).
   - Copia solo los días de la semana anterior que tenían cambios propios.
   - Los días destino que ya tienen cambios **no se tocan**. Se listan como conflicto en el toast.
   - Si no hay nada que copiar: "Nada nuevo para copiar" (ese toast ya está en `/design`).
4. Después de cada cambio se calculan las citas `pendiente`/`confirmada` futuras de esa artista que quedaron fuera de su horario. **No se borran**: toast de advertencia de Sileo con la lista (cliente, día y hora).
5. Errores: `23P01` → "Ese bloque se cruza con otro horario tuyo."; `42501` → "No tenés permiso para cambiar eso."; cualquier otro se registra en el servidor y se muestra un mensaje amable. `revalidatePath` de `/admin/disponibilidad` y `/admin`.

**Verificación:** `db:test` (M3 atómica, traslapes, RLS de horarios), `disponibilidad.spec.ts` contra Supabase local, a11y.

### Etapa 4 · Formulario público
*Bloqueada por:* etapa 1 (no depende de la 2 ni de la 3).

1. Tamaños, lugares, ajustes y `artistsByLocation` se leen en el Server Component de `/reservar`.
2. Route Handlers `GET`:
   - `src/app/api/reservas/dias/route.ts` (M2) y `…/horas/route.ts` (`get_available_slots`).
   - Validan los parámetros con Zod: `artist_id`, `location_id`, `size_option_id` y `date` (UUIDs y fecha). El cliente **ya no manda la duración**: la calcula la base.
   - Rate limit por IP.
   - El cliente guarda en memoria lo ya pedido por artista, lugar y tamaño, y no repite consultas.
3. Reserva:
   - La Server Action valida con Zod, aplica rate limit por IP y verifica Turnstile en el servidor.
   - Luego llama `create_booking` con el cliente de servicio.
   - Mapeo de errores:
     - `SLOT_UNAVAILABLE` → toast "Ese horario acaba de ocuparse. Elegí otro." y vuelve al paso Fecha (ya existe).
     - `TOO_MANY_PENDING` → toast "Ya tenés varias solicitudes pendientes. Te contactaremos pronto."
     - `INVALID_PHONE` y `CONSENT_REQUIRED` → mensaje en su campo.
4. Turnstile: widget en el espacio reservado `[data-turnstile-slot]`. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` es pública por diseño y no es de Supabase. `TURNSTILE_SECRET_KEY` vive solo en el servidor. En desarrollo uso las llaves de prueba oficiales.
5. Cloudinary:
   - Un endpoint firma la subida con un `public_id` que **genera el servidor** en `kk-henna/referencias/`, tipo `authenticated`, solo jpg/png/webp.
   - El navegador sube directo a Cloudinary.
   - Antes de `create_booking`, el servidor comprueba con la Admin API que el `public_id` existe, está en esa carpeta y pesa 5 MB o menos.
   - En la base solo se guarda el `public_id`.
   - Todo queda detrás de `CLOUDINARY_UPLOADS_ENABLED`. Si está apagado, la reserva se guarda sin foto y te aviso.

**Verificación:** `reserva.spec.ts` contra Supabase local con la llave de prueba de Turnstile, test de doble reserva (sección 4), `check:secrets`.

### Etapa 5 · Citas, pagos y caja
*Bloqueada por:* etapa 2.

1. Citas:
   - La lista se pagina en el servidor (20 por página, `?pagina=`), con filtros de estado, artista, lugar y fecha.
   - El calendario carga una ventana fija (−60 / +180 días) en lugar de todo.
   - El detalle cambia estado y precio final. La artista solo puede hacerlo sobre sus citas (RLS + trigger).
   - La foto se ve con URL firmada.
2. Pagos: sección en el detalle de la cita para registrar anticipo o saldo, método, monto y comprobante opcional (Cloudinary `kk-henna/comprobantes`). **M4** lo refleja en Caja.
3. Caja:
   - Movimientos `ingreso | egreso`, los últimos primero y paginados.
   - Totales con **M5**.
   - La admin ve todo y la artista solo lo suyo.
   - "Nuevo movimiento" se oculta para la artista, porque RLS no le permite insertar (pregunta 10).
4. Dashboard: **M5** sobre `v_booking_earnings`. La barra por artista muestra lo cobrado en el mes. La tabla "Ver datos en tabla" suma las columnas "Para la artista" y "Para el estudio" (pregunta 11).
5. Limpieza final: se borran `src/lib/mock/`, `src/lib/data/store.ts`, `MOCK_LATENCY_MS` y la regla de ESLint de mocks. `seed.sql` pasa a ser la única fuente de datos de ejemplo.
6. `supabase db lint` / advisors de seguridad y rendimiento.

**UI nueva:** la paginación ("Anterior / Siguiente"), la sección Pagos del detalle y las dos columnas del dashboard.
**Verificación:** todo lo anterior + `pnpm db:test` completo + advisors.

---

## 4. Pruebas

- **`pnpm db:test`** (`node --test`, con `pg`):
  - Aplica las migraciones y `seed.sql` en una base nueva y prueba:
    - RLS: una artista no ve citas ni caja de la otra, no puede cambiarse la comisión ni reasignar citas; `anon` no lee `bookings` ni `clients` ni ejecuta `create_booking`.
    - Doble reserva: **dos conexiones simultáneas** al mismo horario, una falla con `SLOT_UNAVAILABLE`.
    - Las funciones M1–M5.
  - Corre contra Supabase local (`DATABASE_URL` de `supabase start`) **o** contra Postgres 16 + el shim (`--shim`), que es lo que puedo correr en este contenedor.
- **`supabase/seed.sql`**: tiene auth.users, perfiles, horarios en Nicoya y Hojancha, y citas relativas a `now()`.
  - Admin: Kimberly Rojas, que también atiende.
  - Artista activa: Katheryn Mendez.
  - Una artista activa más y una inactiva.
  - Los usuarios de prueba tienen contraseña fija para los e2e.
- **e2e (Playwright)**:
  - `reserva`, `disponibilidad` y `a11y` corren contra Supabase local + seed, con un login de prueba en `tests/helpers`.
  - Se agrega `auth.spec.ts`.
  - **En este contenedor no puedo levantar Supabase local**, así que te los dejo corriendo en tu máquina con `supabase start && pnpm test:e2e`. Aquí verifico lo que sí puedo: lint, build, tipos, secretos y los tests SQL.

---

## 5. Supuestos

Si alguno está mal, corregime ahora. Si no, sigo con ellos.

1. Lo de "clientas → clientes" aplica a la interfaz y la documentación sobre el **público**. Los textos sobre el equipo ("tatuadora", "Bienvenida de nuevo", "usuaria") quedan como están.
2. Se usa el enum de pagos de la base (`transferencia`, no `tarjeta`).
3. El teléfono se guarda como `+506` + 8 dígitos. El formulario sigue aceptando solo números de Costa Rica.
4. Los movimientos de caja cargados a mano por la admin no cambian. M4 solo agrega los de pagos.
5. El enlace de cancelación para el cliente (`cancel_booking_by_token`) queda **fuera** de estas etapas: la función queda lista, pero sin página.
6. Google Calendar (fase 4 del esquema) queda fuera.
7. Commit y push al cerrar cada etapa. No abro PR salvo que me lo pidás.

---

## 6. Decisiones

Cada una lleva mi recomendación. Con "sí a todo", sigo así.

1. **Proyecto de Supabase.** ✅ Ya existe y tiene la migración inicial aplicada. Las credenciales quedan en tu poder: yo trabajo contra una copia local de la base y vos probás contra el proyecto real con tu `.env.local`.
2. **M1 (correcciones):** ¿la aplico con los seis puntos (a–f)? Recomiendo que sí.
3. **M2 `get_available_days`:** ¿una función en la base en vez de ~29 llamadas por calendario? Recomiendo que sí.
4. **M3 `set_day_schedule`:** ¿cambios por día atómicos en la base? Recomiendo que sí.
5. **M4 y M5:** ¿cada pago crea su ingreso en caja (trigger), y los agregados de inicio y caja van en funciones de la base? Recomiendo que sí a las dos.
6. **Nombres de campos:** ¿la UI adopta los nombres de la base (`consent_health`, `slot_step_minutes`, `drying_min_minutes`, etc.) en vez de mapearlos? Recomiendo que sí: un solo vocabulario y menos código de traducción.
7. **Orden de lugares:** ¿por nombre, sin migración? Hojancha quedaría primero y cambiarían sus tonos en el calendario. La alternativa es una migración con `sort_order`. Recomiendo ordenar por nombre.
8. **Ajustes → Reservas:** ¿agrego los campos "Anticipo" (`deposit_amount`) y "Pendientes por WhatsApp" (`max_pending_per_phone`) con el mismo estilo de los demás? Recomiendo que sí.
9. **Invitación:** ¿la artista queda **activa** al invitarla, ya que la admin lo decide en ese momento? Si se desactiva después, ve "Tu cuenta está pendiente de activación". Recomiendo que sí. La alternativa es que nazca inactiva y la admin la active con el switch.
10. **Caja para artistas:** ¿oculto "Nuevo movimiento" a las artistas, ya que RLS solo deja a la admin? Recomiendo que sí. Si querés que ellas registren egresos, hace falta una política nueva y te la propondría aparte.
11. **Dashboard:** ¿la barra por artista muestra lo cobrado en el mes (`final_price` de las completadas) y la tabla suma "Para la artista" y "Para el estudio"? Recomiendo que sí.
12. **Rate limiting:** ¿dónde vas a desplegar? Recomiendo un limitador en memoria detrás de una interfaz, porque alcanza en un solo servidor Node. Si va a Vercel, conviene Upstash Redis después: lo dejo preparado, pero no lo instalo ahora.
13. **Turnstile:** ¿uso `@marsidev/react-turnstile` con versión fija para el widget? Recomiendo que sí. La alternativa es un componente propio que cargue el script.
14. **Cloudinary:** ¿tenés `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`? Si no, la subida queda apagada con `CLOUDINARY_UPLOADS_ENABLED=false` y las reservas se guardan sin foto hasta que lleguen. Recomiendo seguir así.
15. **Versiones:** ¿fijo versiones exactas de las dependencias nuevas (las de la etapa 1, `cloudinary@2.11.0` y la de Turnstile)? Recomiendo que sí.

**Fuera de alcance:** página de cancelación para clientes, Google Calendar, notificaciones por WhatsApp o correo a clientes, CI en GitHub Actions, cambios de diseño fuera de la "UI nueva" listada, y políticas RLS nuevas.

---

## 7. Siempre / Nunca

- **Siempre:**
  - Zod en el servidor antes de tocar la base.
  - `requireStaff()` o `requireAdmin()` en cada página y acción del admin.
  - El cliente de sesión para el admin.
  - Errores técnicos solo en el log del servidor.
  - "Egreso", nunca "gasto".
  - Fechas convertidas con `America/Costa_Rica`.
  - `check:secrets` en cada etapa.
- **Nunca:**
  - `createBrowserClient` ni `@supabase/*` en archivos `'use client'`.
  - Variables de Supabase con `NEXT_PUBLIC_`.
  - `getSession()` para autorizar en el servidor.
  - Mandar desde el cliente precio, duración, comisión o el `artist_id` de la sesión.
  - Aplicar migraciones al remoto sin tu OK.
  - Políticas RLS nuevas o desactivadas.

---

## 8. Progreso

| Etapa | Estado | Notas |
|---|---|---|
| 0 · clientas → clientes + migración inicial en el repo | ✅ hecho | Migración probada en Postgres 16 + shim |
| 1 · Configuración | ⏳ espera aprobación | |
| 2 · Autenticación y roles | — | Necesita el proyecto y las llaves |
| 3 · Disponibilidad | — | |
| 4 · Formulario público | — | |
| 5 · Citas, pagos y caja | — | |
