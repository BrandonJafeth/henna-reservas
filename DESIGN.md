# DESIGN · K&K Henna Artistry

Estudio artesanal sobre papel: blanco hueso, beige y gris cálido, líneas finas color arena, mucho aire y títulos con serifa clásica. Neutro y elegante. **Solo modo claro.** Nada de sombras pesadas, degradados, tonos cobre o terracota, ni esquinas muy redondeadas.

Fuente de verdad: `src/app/globals.css`, que tiene los tokens y las razones de contraste comentadas. Muestrario vivo en `/design` (solo en desarrollo).

## Paleta

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#F6F3EE` | Fondo blanco hueso |
| `--card` | `#FCFBF8` | Tarjetas |
| `--muted` | `#EEE9E1` | Superficies secundarias |
| `--foreground` | `#2B2825` | Texto principal (13,24:1) |
| `--muted-foreground` | `#6A645D` | Texto secundario (5,28:1) |
| `--button` / `--button-hover` | `#E6DACA` / `#DCCDB9` | **Botones principales beige**, con texto `--button-foreground` `#2B2825` (10,64:1) y borde `--button-border` `#BFAE97` |
| `--primary` | `#5E564D` | Gris cálido oscuro: etiquetas, enlaces, foco, pista del slider (6,51:1) |
| `--accent` | `#CDBFAD` | **Solo decorativo**: borde de tarjeta, separadores, ilustraciones |
| `--border` | `#E4DDD3` | Divisiones (decorativo) |
| `--input` | `#8C8277` | Borde de campos (3,40:1, WCAG 1.4.11) |
| `--success` | `#4F6B4C` | Confirmada, ingreso |
| `--warning` | `#8C6220` | Pendiente |
| `--destructive` | `#A03E3E` | Cancelada, egreso, eliminar |
| `--place-1…3` (+`-ink`) | beige · salvia · gris | Tonos de lugar en el calendario; se asignan por orden, nunca por nombre |

Los estados seleccionados (hora, tamaño, artista) usan el mismo beige del botón, con borde oscuro para que se distingan.

## Tipografía

- **Cormorant Garamond 500/600** (`font-display`) para títulos, precios y el wordmark. Los números animados usan lining (`lnum`) para que Sliding Number no recorte los dígitos.
- **Jost 400/500** (`font-sans`) para el cuerpo y la interfaz.
- **Etiqueta de marca** (`<BrandLabel>`): Jost 13 px, mayúsculas, `tracking-[0.25em]`, color `--primary`. Se usa solo como rótulo de bloque ("PRECIO DE REFERENCIA", "TU RESERVA"), nunca encima de un h1.
- Escala: h1 36–60 px · h2 28–40 px · cuerpo 15–17 px · secundario 14 px · mínimo 11 px (solo en metadatos).
- Los inputs siempre van a 16 px o más, para que iOS no haga zoom.

## Espaciado y forma

- Radio de 8 px en tarjetas, botones e inputs, 6 px en chips y 4 px en badges. La excepción son las píldoras de opción (`rounded-full`).
- Tarjeta: `bg-card` con `border border-accent/45` y sin sombra.
- Detalles y formularios secundarios se abren en **modales centrados** (`Dialog`), no en paneles laterales.
- Gutter de 16 px en celular y de 24 a 40 px en escritorio. Las secciones se separan con 32 a 40 px y los campos con 24 px.
- Áreas táctiles: 44 px para botón, input, día del calendario y hora. El mínimo absoluto es 24 px, para enlaces en línea.
- Separador de marca `<Ornament>` (—— • ——): se usa en cabeceras, recibos y pantallas finales. No va entre cada sección.

## Calendarios (Schedule-X)

- Tema mapeado a los tokens en `globals.css` bajo `.sx-kk`; nunca los violetas por defecto.
- El número de cada día del mes es un `<button>` propio (`monthGridDate`) con `aria-pressed`: así se eligen días con teclado. Seleccionado = círculo `--foreground` y celda beige.
- Horarios: color del lugar; los de "solo ese día" con borde punteado; días libres con rayado suave.
- Citas: franja del color del estado sobre tinte casi blanco y texto oscuro; el estado también va escrito en el título.
- Parches de accesibilidad sobre la librería (contraste de horas, objetivos de 24 px, `role="group"`) viven en `schedule-calendar.tsx` y `globals.css`.

## Movimiento

- Animate UI está en Tabs, Checkbox, Radio y Switch. Sliding Number se usa en precios y totales.
- `ActionButton` muestra la transición carga → confirmación (Motion), con salida ease-out-quint de 280 ms.
- Al cambiar de paso, el contenido entra con un desplazamiento lateral de 24 px y opacidad.
- `MotionConfig reducedMotion="user"` y un bloque global de `prefers-reduced-motion` desactivan las animaciones. Sileo trae su propio manejo.

## Reglas

1. **Solo modo claro.** No hay tema oscuro ni selector de tema.
2. **Ningún color literal en los componentes.** Todo va por tokens. La única excepción documentada es Sileo: su `fill` lee `--card` en tiempo de ejecución.
3. **Ningún dato de negocio en el código.** Precios, tamaños, lugares, artistas, horarios y ajustes llegan por props desde `src/lib/data/`. ESLint bloquea importar `src/lib/mock/` desde la UI.
4. El slider de tamaños se arma con las filas de `size_options` que tienen cm. Las que no tienen cm se muestran como chip aparte.
5. El estado nunca se indica solo con color. Los badges llevan texto y punto (relleno o hueco), y los bloques de lugar llevan el nombre del lugar.
6. El vocabulario es fijo: "egreso", nunca "gasto". "Precio de referencia", nunca un precio final prometido.
7. Toda lista tiene estado de carga (skeleton), estado vacío (ilustración lineal y texto cálido) y estado de error (reintentar).
8. Todo lo que se hace en el calendario se hace con clics (WCAG 2.5.7). No hay arrastre.
9. La voz es tuteo costarricense ("Elegí", "Revisá") y cálido. Los errores dicen qué pasó y cómo arreglarlo.

## Pendiente

- El logo real (`public/brand/logo.png`) todavía no llegó. Mientras tanto, `<Logo>` es un wordmark tipográfico, y está preparado para cambiarse por `next/image` en un solo archivo.
- Cloudflare Turnstile: hay un espacio reservado en el paso "Tus datos" (`[data-turnstile-slot]`).
