import type { BookingStatus, Location, SizeOption, UUID, Weekday } from "@/types/database"
import { formatCRCRange, speakCRCRange } from "@/lib/format"

/** Tamaños medidos en cm (van al slider), ordenados por cm. */
export function measuredSizes(options: SizeOption[]): SizeOption[] {
  return options
    .filter((o) => o.min_cm != null || o.max_cm != null)
    .sort((a, b) => (a.min_cm ?? 0) - (b.min_cm ?? 0) || a.sort_order - b.sort_order)
}

/** Opciones sin cm (p. ej. "Mano completa"), se muestran como chips aparte. */
export function namedSizes(options: SizeOption[]): SizeOption[] {
  return options
    .filter((o) => o.min_cm == null && o.max_cm == null)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function sizeValueText(o: SizeOption): string {
  return `${o.label}, ${speakCRCRange(o.price_min, o.price_max)}`
}

export function sizePriceLabel(o: SizeOption): string {
  return formatCRCRange(o.price_min, o.price_max)
}

/** Texto corto para la escala del slider: la etiqueta sin la unidad final. */
export function sizeTick(o: SizeOption): string {
  return o.label.replace(/\s*cm\.?$/i, "")
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
  no_show: "No asistió",
}

export const STATUS_ORDER: BookingStatus[] = ["pendiente", "confirmada", "completada", "cancelada", "no_show"]

export const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 0, label: "Domingo", short: "Dom" },
]

export const ROLE_LABEL = { admin: "Admin", tatuadora: "Artista" } as const

/** Índice de tono (1–3) para un lugar según su orden, nunca por nombre. */
export function placeTone(locations: Location[], id: UUID | null | undefined): 1 | 2 | 3 {
  const i = locations.findIndex((l) => l.id === id)
  return (((i < 0 ? 0 : i) % 3) + 1) as 1 | 2 | 3
}

export function byId<T extends { id: UUID }>(rows: T[]): Record<UUID, T> {
  return Object.fromEntries(rows.map((r) => [r.id, r]))
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

/** Filtros rápidos de fecha en Citas. */
export const DATE_PRESETS = [
  { value: "proximas", label: "Próximas" },
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "pasadas", label: "Pasadas" },
  { value: "todas", label: "Todas las fechas" },
] as const

export type DatePreset = (typeof DATE_PRESETS)[number]["value"]
