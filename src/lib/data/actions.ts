"use server"

import { revalidatePath } from "next/cache"
import type {
  AvailabilityOverride,
  AvailableDay,
  AvailableSlot,
  Booking,
  BookingStatus,
  CashMovement,
  Location,
  Profile,
  Settings,
  SizeOption,
  UUID,
} from "@/types/database"
import {
  bookingRequestSchema,
  availabilityRangeSchema,
  cashMovementSchema,
  settingsSchema,
  sizeOptionSchema,
  type AvailabilityRangeInput,
  type BookingRequest,
  type CashMovementInput,
  type SizeOptionInput,
} from "@/lib/schemas"
import { toISODateCR } from "@/lib/format"
import { overlaps, weekdayOf, type Block } from "@/lib/availability"
import { getAvailableDays, getAvailableSlots } from "./queries"
import { db, latency, newId, type MockDB } from "./store"

/**
 * Mutaciones y lecturas que el cliente pide de forma interactiva.
 * Firma estable: al migrar a Supabase solo cambia el cuerpo.
 */

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: "VALIDATION" | "SLOT_TAKEN" | "NOT_FOUND" | "UNKNOWN"; message: string }

const fail = (code: Exclude<ActionResult<never>, { ok: true }>["code"], message: string) =>
  ({ ok: false, code, message }) as const

function refreshAdmin() {
  revalidatePath("/admin", "layout")
}

/* ------------------------------ Público ------------------------------ */

export async function fetchAvailableDays(q: {
  location_id: UUID
  artist_id: UUID | null
  duration_minutes: number
}): Promise<ActionResult<AvailableDay[]>> {
  return { ok: true, data: await getAvailableDays(q) }
}

export async function fetchAvailableSlots(q: {
  date: string
  location_id: UUID
  artist_id: UUID | null
  duration_minutes: number
}): Promise<ActionResult<AvailableSlot[]>> {
  return { ok: true, data: await getAvailableSlots(q) }
}

export async function createBookingRequest(input: BookingRequest): Promise<ActionResult<{ id: string }>> {
  const parsed = bookingRequestSchema.safeParse(input)
  if (!parsed.success) return fail("VALIDATION", "Revisá los datos del formulario.")
  const v = parsed.data
  const d = db()
  const size = d.size_options.find((s) => s.id === v.size_option_id)
  if (!size) return fail("NOT_FOUND", "Ese tamaño ya no está disponible.")

  const date = toISODateCR(new Date(v.starts_at))
  const free = await getAvailableSlots({
    date,
    location_id: v.location_id,
    artist_id: v.artist_id,
    duration_minutes: size.duration_minutes,
  })
  if (!free.some((s) => new Date(s.starts_at).getTime() === new Date(v.starts_at).getTime())) {
    return fail("SLOT_TAKEN", "Ese horario acaba de ocuparse, elegí otro.")
  }

  const starts = new Date(v.starts_at)
  const booking: Booking = {
    id: newId("bk"),
    created_at: new Date().toISOString(),
    status: "pendiente",
    artist_id: v.artist_id,
    location_id: v.location_id,
    size_option_id: size.id,
    starts_at: starts.toISOString(),
    ends_at: new Date(starts.getTime() + size.duration_minutes * 60_000).toISOString(),
    client_first_name: v.first_name,
    client_last_name: v.last_name,
    client_whatsapp: v.whatsapp,
    client_email: v.email || null,
    allergies: v.allergies || null,
    notes: v.notes || null,
    // En producción: subida a Supabase Storage y URL firmada.
    reference_image_url: "/mock/referencia-1.svg",
    estimated_price_min: size.price_min,
    estimated_price_max: size.price_max,
    final_price: null,
    skin_care_consent: true,
    privacy_consent: true,
  }
  d.bookings.push(booking)
  refreshAdmin()
  return { ok: true, data: { id: booking.id } }
}

/* --------------------------- Disponibilidad --------------------------- */

const WEEKDAY_NAME = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]

/**
 * Convierte el horario semanal de esa fecha en filas propias de la fecha,
 * para poder cambiar "solo este día" sin tocar las demás semanas.
 * Si la fecha ya tiene filas propias, no hace nada. Quita el "día libre".
 */
function materializeDay(d: MockDB, artistId: UUID, date: string): AvailabilityOverride[] {
  d.availability_overrides = d.availability_overrides.filter(
    (o) => !(o.artist_id === artistId && o.date === date && o.is_day_off),
  )
  const existing = d.availability_overrides.filter((o) => o.artist_id === artistId && o.date === date)
  if (existing.length) return existing
  const weekday = weekdayOf(date)
  const copies = d.weekly_availability
    .filter((w) => w.artist_id === artistId && w.weekday === weekday)
    .map<AvailabilityOverride>((w) => ({
      id: newId("ov"),
      artist_id: artistId,
      date,
      is_day_off: false,
      location_id: w.location_id,
      start_time: w.start_time,
      end_time: w.end_time,
      note: null,
    }))
  d.availability_overrides.push(...copies)
  return copies
}

/** Asigna un horario a uno o varios días: solo esas fechas, o repetido cada semana. */
export async function applyAvailability(input: AvailabilityRangeInput): Promise<ActionResult<{ created: number; customDays: number }>> {
  await latency(400)
  const parsed = availabilityRangeSchema.safeParse(input)
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Datos inválidos")
  const v = parsed.data
  const d = db()
  const block = { start_time: v.start_time, end_time: v.end_time }

  if (v.repeat === "weekly") {
    const weekdays = [...new Set(v.dates.map(weekdayOf))]
    for (const wd of weekdays) {
      const clash = d.weekly_availability.find((w) => w.artist_id === v.artist_id && w.weekday === wd && overlaps(w, block))
      if (clash) return fail("VALIDATION", `Los ${WEEKDAY_NAME[wd]} ya tienen un horario que se cruza (${clash.start_time}–${clash.end_time}).`)
    }
    for (const wd of weekdays) {
      d.weekly_availability.push({ id: newId("wa"), artist_id: v.artist_id, weekday: wd, location_id: v.location_id, ...block })
    }
    // Días con horario propio no muestran el semanal: se informa para que la admin decida.
    const customDays = v.dates.filter((date) => d.availability_overrides.some((o) => o.artist_id === v.artist_id && o.date === date)).length
    refreshAdmin()
    return { ok: true, data: { created: weekdays.length, customDays } }
  }

  for (const date of v.dates) {
    const rows = d.availability_overrides.filter((o) => o.artist_id === v.artist_id && o.date === date && !o.is_day_off)
    const base = rows.length
      ? rows
      : d.weekly_availability.filter((w) => w.artist_id === v.artist_id && w.weekday === weekdayOf(date))
    const clash = base.find((b) => b.start_time && b.end_time && overlaps({ start_time: b.start_time, end_time: b.end_time }, block))
    if (clash) return fail("VALIDATION", `El ${date} ya tiene un horario que se cruza (${clash.start_time}–${clash.end_time}).`)
  }
  for (const date of v.dates) {
    materializeDay(d, v.artist_id, date)
    d.availability_overrides.push({
      id: newId("ov"),
      artist_id: v.artist_id,
      date,
      is_day_off: false,
      location_id: v.location_id,
      start_time: v.start_time,
      end_time: v.end_time,
      note: null,
    })
  }
  refreshAdmin()
  return { ok: true, data: { created: v.dates.length, customDays: 0 } }
}

/** Marca días como libres (reemplaza cualquier horario de esas fechas). */
export async function markDaysOff(input: { artist_id: UUID; dates: string[] }): Promise<ActionResult<{ count: number }>> {
  await latency(400)
  if (!input.dates.length) return fail("VALIDATION", "Elegí al menos un día.")
  const d = db()
  const set = new Set(input.dates)
  d.availability_overrides = d.availability_overrides.filter((o) => !(o.artist_id === input.artist_id && set.has(o.date)))
  for (const date of set) {
    d.availability_overrides.push({
      id: newId("ov"),
      artist_id: input.artist_id,
      date,
      is_day_off: true,
      location_id: null,
      start_time: null,
      end_time: null,
      note: null,
    })
  }
  refreshAdmin()
  return { ok: true, data: { count: set.size } }
}

/** Quita los cambios de esas fechas: vuelven al horario semanal. */
export async function resetDays(input: { artist_id: UUID; dates: string[] }): Promise<ActionResult<{ count: number }>> {
  await latency(300)
  const d = db()
  const set = new Set(input.dates)
  const before = d.availability_overrides.length
  d.availability_overrides = d.availability_overrides.filter((o) => !(o.artist_id === input.artist_id && set.has(o.date)))
  refreshAdmin()
  return { ok: true, data: { count: before - d.availability_overrides.length } }
}

type OccurrenceRef = { artist_id: UUID; date: string; source: Block["source"]; scope: "day" | "weekly" }

/** Edita un bloque de un día: solo ese día, o el horario semanal (todas las semanas). */
export async function updateOccurrence(
  input: OccurrenceRef & { start_time: string; end_time: string; location_id: UUID },
): Promise<ActionResult<null>> {
  await latency(400)
  if (input.end_time <= input.start_time) return fail("VALIDATION", "La hora de fin debe ser después del inicio.")
  const d = db()
  const block = { start_time: input.start_time, end_time: input.end_time }

  if (input.scope === "weekly") {
    if (input.source.kind !== "weekly") return fail("VALIDATION", "Este horario es solo de ese día.")
    const row = d.weekly_availability.find((w) => w.id === input.source.id)
    if (!row) return fail("NOT_FOUND", "No encontramos ese horario.")
    const clash = d.weekly_availability.find((w) => w.id !== row.id && w.artist_id === row.artist_id && w.weekday === row.weekday && overlaps(w, block))
    if (clash) return fail("VALIDATION", `Se cruza con ${clash.start_time}–${clash.end_time} del mismo día.`)
    Object.assign(row, block, { location_id: input.location_id })
    refreshAdmin()
    return { ok: true, data: null }
  }

  // Solo este día: si viene del semanal, se copia el día y se edita la copia.
  let targetId = input.source.id
  if (input.source.kind === "weekly") {
    const weekly = d.weekly_availability.find((w) => w.id === input.source.id)
    const copies = materializeDay(d, input.artist_id, input.date)
    targetId = copies.find((c) => c.start_time === weekly?.start_time && c.end_time === weekly?.end_time)?.id ?? ""
  }
  const row = d.availability_overrides.find((o) => o.id === targetId)
  if (!row) return fail("NOT_FOUND", "No encontramos ese horario.")
  const clash = d.availability_overrides.find(
    (o) => o.id !== row.id && o.artist_id === row.artist_id && o.date === row.date && o.start_time && o.end_time && overlaps({ start_time: o.start_time, end_time: o.end_time }, block),
  )
  if (clash) return fail("VALIDATION", `Se cruza con ${clash.start_time}–${clash.end_time} de ese día.`)
  Object.assign(row, block, { location_id: input.location_id })
  refreshAdmin()
  return { ok: true, data: null }
}

/** Quita un bloque: solo de ese día, o del horario semanal. */
export async function deleteOccurrence(input: OccurrenceRef): Promise<ActionResult<null>> {
  await latency(300)
  const d = db()
  if (input.scope === "weekly") {
    if (input.source.kind !== "weekly") return fail("VALIDATION", "Este horario es solo de ese día.")
    d.weekly_availability = d.weekly_availability.filter((w) => w.id !== input.source.id)
    refreshAdmin()
    return { ok: true, data: null }
  }
  let targetId = input.source.id
  if (input.source.kind === "weekly") {
    const weekly = d.weekly_availability.find((w) => w.id === input.source.id)
    const copies = materializeDay(d, input.artist_id, input.date)
    targetId = copies.find((c) => c.start_time === weekly?.start_time && c.end_time === weekly?.end_time)?.id ?? ""
  }
  d.availability_overrides = d.availability_overrides.filter((o) => o.id !== targetId)
  // Si el día quedó sin bloques propios, se marca libre (si no, volvería el semanal).
  const left = d.availability_overrides.some((o) => o.artist_id === input.artist_id && o.date === input.date)
  if (!left) {
    d.availability_overrides.push({
      id: newId("ov"),
      artist_id: input.artist_id,
      date: input.date,
      is_day_off: true,
      location_id: null,
      start_time: null,
      end_time: null,
      note: null,
    })
  }
  refreshAdmin()
  return { ok: true, data: null }
}

/* -------------------------------- Citas -------------------------------- */

export async function updateBooking(
  id: UUID,
  patch: { status?: BookingStatus; final_price?: number | null },
): Promise<ActionResult<Booking>> {
  await latency(400)
  const d = db()
  const b = d.bookings.find((x) => x.id === id)
  if (!b) return fail("NOT_FOUND", "No encontramos esa cita.")
  if (patch.final_price != null && (patch.final_price < 0 || !Number.isInteger(patch.final_price)))
    return fail("VALIDATION", "El precio final debe ser un monto entero en colones.")
  Object.assign(b, patch)
  refreshAdmin()
  return { ok: true, data: structuredClone(b) }
}

/* -------------------------------- Caja -------------------------------- */

export async function createCashMovement(input: CashMovementInput): Promise<ActionResult<CashMovement>> {
  await latency(400)
  const parsed = cashMovementSchema.safeParse(input)
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Datos inválidos")
  const row: CashMovement = { ...parsed.data, id: newId("cm"), booking_id: null }
  db().cash_movements.unshift(row)
  refreshAdmin()
  return { ok: true, data: row }
}

/* ------------------------------- Ajustes ------------------------------- */

export async function saveSizeOption(input: SizeOptionInput): Promise<ActionResult<SizeOption>> {
  await latency(400)
  const parsed = sizeOptionSchema.safeParse(input)
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Datos inválidos")
  const d = db()
  const v = parsed.data
  const existing = d.size_options.find((s) => s.id === v.id)
  const row: SizeOption = {
    ...v,
    id: v.id ?? newId("size"),
    sort_order: existing?.sort_order ?? d.size_options.length + 1,
  }
  if (existing) Object.assign(existing, row)
  else d.size_options.push(row)
  refreshAdmin()
  return { ok: true, data: row }
}

export async function saveLocation(input: Pick<Location, "name" | "address" | "is_active"> & { id?: UUID }): Promise<ActionResult<Location>> {
  await latency(400)
  if (input.name.trim().length < 2) return fail("VALIDATION", "Escribí el nombre del lugar.")
  const d = db()
  const existing = d.locations.find((l) => l.id === input.id)
  const row: Location = {
    id: input.id ?? newId("loc"),
    name: input.name.trim(),
    address: input.address,
    is_active: input.is_active,
    sort_order: existing?.sort_order ?? d.locations.length + 1,
  }
  if (existing) Object.assign(existing, row)
  else d.locations.push(row)
  refreshAdmin()
  return { ok: true, data: row }
}

export async function saveArtist(input: Pick<Profile, "id" | "commission_rate" | "is_active">): Promise<ActionResult<Profile>> {
  await latency(400)
  if (input.commission_rate < 0 || input.commission_rate > 1) return fail("VALIDATION", "La comisión va de 0 % a 100 %.")
  const p = db().profiles.find((x) => x.id === input.id)
  if (!p) return fail("NOT_FOUND", "No encontramos a esa artista.")
  Object.assign(p, input)
  refreshAdmin()
  return { ok: true, data: structuredClone(p) }
}

export async function saveSettings(input: Settings): Promise<ActionResult<Settings>> {
  await latency(400)
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Datos inválidos")
  db().settings = parsed.data
  refreshAdmin()
  return { ok: true, data: parsed.data }
}
