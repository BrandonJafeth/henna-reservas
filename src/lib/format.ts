import { format as dfFormat } from "date-fns"
import { es } from "date-fns/locale"
import { tz, TZDate } from "@date-fns/tz"

export const TIME_ZONE = "America/Costa_Rica"
/** Costa Rica no usa horario de verano: UTC−6 todo el año. */
export const TZ_OFFSET = "-06:00"

const crc = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
})

/** ₡6 500 (con espacio fino de agrupación, como en es-CR) */
export function formatCRC(amount: number): string {
  return crc.format(amount)
}

export function formatCRCRange(min: number, max: number): string {
  return min === max ? formatCRC(min) : `${formatCRC(min)} – ${formatCRC(max)}`
}

/** Para lectores de pantalla: "₡6 500 a ₡7 500" */
export function speakCRCRange(min: number, max: number): string {
  return min === max ? formatCRC(min) : `${formatCRC(min)} a ${formatCRC(max)}`
}

const crContext = tz(TIME_ZONE)

/** Formatea un timestamp o fecha en la zona de Costa Rica con locale es. */
export function formatCR(value: Date | string | number, pattern: string): string {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseISODateCR(value)
    : new Date(value)
  return dfFormat(date, pattern, { locale: es, in: crContext })
}

/** `2026-10-20` → Date a medianoche de Costa Rica */
export function parseISODateCR(iso: string): Date {
  return new Date(`${iso}T00:00:00${TZ_OFFSET}`)
}

/** Date → `YYYY-MM-DD` según el calendario de Costa Rica */
export function toISODateCR(date: Date): string {
  return dfFormat(new TZDate(date, TIME_ZONE), "yyyy-MM-dd")
}

/** Combina fecha y hora locales de Costa Rica en un timestamp ISO */
export function combineCR(date: string, time: string): string {
  return `${date}T${time}:00${TZ_OFFSET}`
}

/** Hora `HH:mm` de un timestamp, en Costa Rica */
export function timeOfCR(value: Date | string): string {
  return formatCR(value, "HH:mm")
}

/** "9:00 a. m." legible para la clienta (misma forma que formatTimeOfDay) */
export function formatTimeCR(value: Date | string): string {
  return formatTimeOfDay(formatCR(value, "HH:mm"))
}

export function formatTimeOfDay(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const suffix = h < 12 ? "a. m." : "p. m."
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`
}

export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "+506 8888 8888" */
export function formatWhatsApp(digits: string): string {
  const clean = digits.replace(/\D/g, "").replace(/^506/, "")
  return clean.length === 8 ? `+506 ${clean.slice(0, 4)} ${clean.slice(4)}` : `+506 ${clean}`
}

/** Suma días a una fecha ISO según el calendario de Costa Rica. */
export function addDaysISO(iso: string, days: number): string {
  return toISODateCR(new Date(parseISODateCR(iso).getTime() + days * 86_400_000))
}

/** Lunes de la semana de `iso` (semana de lunes a domingo). */
export function mondayOf(iso: string): string {
  const weekday = new TZDate(combineCR(iso, "12:00"), TIME_ZONE).getDay()
  return addDaysISO(iso, -((weekday + 6) % 7))
}

export function todayCR(): string {
  return toISODateCR(new Date())
}
