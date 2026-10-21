# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Clientas (público):** personas de Nicoya, Hojancha y alrededores (Guanacaste, Costa Rica) que quieren un tatuaje temporal con tinta de jagua. Reservan casi siempre desde el celular, a menudo después de ver el trabajo en redes sociales y con una foto de referencia ya guardada en el teléfono.
- **Artistas (admin):** dos artistas que diseñan y aplican cada pieza a mano. Usan el panel desde el celular entre citas y desde escritorio para planificar: confirman citas por WhatsApp, fijan el precio final, gestionan su disponibilidad semanal y registran movimientos de caja. Roles: `admin` (todo, incluidos ajustes) y `tatuadora`.

## Product Purpose

Sistema de reservas de K&K Henna Artistry. Reemplaza la coordinación manual por mensajes: la clienta envía su diseño, tamaño, lugar, artista, fecha y hora en un solo flujo; las artistas confirman por WhatsApp. Éxito = solicitudes completas (con diseño adjunto) y menos ida y vuelta de mensajes.

## Positioning

Arte artesanal hecho a mano por dos artistas locales con tinta de jagua natural (fruto del guaitil). No es un estudio de tatuaje permanente ni una cadena: es un emprendimiento cálido y cercano.

## Operating Context

- Dos lugares: Nicoya y Hojancha. Ambas artistas pueden trabajar en ambos lugares, e incluso en el **mismo lugar el mismo día y a la misma hora**; cada una tiene su propia agenda. La disponibilidad semanal y sus excepciones deciden quién está dónde.
- Artistas: **Katheryn Mendez** y una segunda artista (nombre por confirmar; en el mock figura como Kimberly Rojas).
- **Secado de la jagua: 2 a 3 horas.** Es informativo para la clienta (configurable en Ajustes) y no ocupa la agenda de la artista.
- Confirmación final de cada cita ocurre por WhatsApp (+506).
- Precio de referencia por tamaño; el precio final lo fija la artista según el detalle del diseño.
- Caja con movimientos de tipo **Ingreso / Egreso** (nunca "gasto"), por artista y lugar; comisión por artista.

## Capabilities and Constraints

- Stack: Next.js 16 (App Router) + TypeScript estricto + Tailwind v4, pnpm, código en `src/`. shadcn/ui, Sileo (toasts), Animate UI (moderado), lucide-react.
- Calendarios del panel: **Schedule-X v4** (vistas Mes/Semana/Día, plugins gratuitos: events-service y calendar-controls; sin arrastrar porque es premium y todo se hace con clic). Disponibilidad se maneja eligiendo días en el calendario; Citas tiene vista Lista y Calendario. El selector de día del formulario público sigue siendo react-day-picker.
- Disponibilidad: `weekly_availability` es lo que se repite cada semana; `availability_overrides` admite varias filas por fecha (día libre, o los horarios de ese día, que reemplazan al semanal). "Solo este día" copia el semanal a la fecha antes de cambiarlo.
- Formulario de reserva: **Stepperize v8** (`@stepperize/react`) para la navegación entre pasos, con un esquema Zod por paso, y react-hook-form para los campos. Cada paso guarda sus datos tipados en `stepper.data`. El envío se arma en un único lugar (`toBookingRequest` en `src/components/booking/wizard-model.ts`), que es lo que se adapta al migrar a Supabase.
- Backend futuro: Supabase (tablas `profiles`, `locations`, `size_options`, `weekly_availability`, `availability_overrides`, `bookings`, `cash_movements`). Fase actual: solo UI con datos mock tipados.
- Español de Costa Rica, colones (`₡6 500`, `Intl.NumberFormat('es-CR', CRC, 0 decimales)`), zona horaria `America/Costa_Rica`, `date-fns` locale `es`.
- Foto de referencia obligatoria (JPG/PNG/WEBP ≤ 5 MB). WhatsApp obligatorio; correo opcional.
- Consentimiento de cuidado de la piel con jagua y aviso de privacidad (Ley 8968) obligatorios. Cloudflare Turnstile previsto.
- Precios de referencia:
  - Menos de 5 cm: ₡1 500 – ₡2 500, 20 min
  - 5 a 7 cm: ₡3 500 – ₡4 500, 30 min
  - 7 a 10 cm: ₡6 500 – ₡7 500, 45 min
  - Más de 10 cm: ₡8 500 – ₡9 500, 60 min
  - Mano completa: ₡4 000 – ₡5 000, 60 min
- Estados de cita: pendiente, confirmada, completada, cancelada, no_show ("No asistió").
- **Todos los datos de negocio son dinámicos** (Supabase, editados por la admin en Ajustes): tamaños/cm/precios/duraciones (`size_options`), lugares (`locations`), artistas y comisión (`profiles`), horarios y excepciones, horas disponibles (RPC `get_available_slots`), citas (`bookings`), pagos y caja (`payments`, `cash_movements`), ventana/anticipación/buffer (`settings`). Los valores de precios listados arriba son solo la carga inicial del mock.
- Fijo en código: solo logo, paleta, tipografía, textos de interfaz y textos de marca.
- Componentes reciben datos por props tipadas y nunca importan mocks; acceso a datos vía `src/lib/data/` (funciones async que hoy devuelven mocks). El slider de tamaños se arma desde filas con cm; "Mano completa" desde filas sin cm. Cada lista tiene estados de carga, vacío y error.

## Brand Commitments

- Nombre: **K&K Henna Artistry**. Logo en `public/brand/logo.png` (pendiente de recibir; usar wordmark tipográfico mientras tanto), `alt="K&K Henna Artistry"`.
- Piezas de marca (lista de precios, bienvenida) son referencia visual, no assets para insertar.
- Estilo pedido por la marca: minimalista, artesanal, elegante, **neutro (beige, blanco hueso, gris cálido), sin cobre ni terracota, solo modo claro**. Tarjetas con borde fino arena, etiquetas en mayúsculas con tracking amplio, separadores `—— • ——`. Títulos Cormorant Garamond, cuerpo Jost.
- Textos reutilizables: "Arte en la piel con tinta de jagua"; dura de 1 a 2 semanas; oscurece en las primeras 24–48 h; "Para todo servicio es necesario enviar el diseño previamente."
- Voz: cercana, cálida, tuteo costarricense, sin tecnicismos.

## Evidence on Hand

- Precios y duraciones arriba (confirmados por la marca).
- Sin testimonios ni fotos de trabajos: no inventarlos. Nombre real confirmado: Katheryn Mendez.

## Product Principles

1. El diseño de la clienta es el centro: sin foto de referencia no hay reserva.
2. Precio honesto: siempre "de referencia", nunca prometer precio final.
3. Celular primero en ambos lados: clienta reserva y artista gestiona desde el teléfono.
4. Calidez artesanal en los detalles, claridad en las tareas.

## Accessibility & Inclusion

WCAG 2.2 AA obligatorio: contraste verificado, foco visible, objetivos táctiles ≥ 24 px (ideal 44), teclado completo, alternativa con clics a todo arrastre (2.5.7), `prefers-reduced-motion` respetado, `lang="es-CR"`, texto de inputs ≥ 16 px, gráficas con tabla alternativa.
