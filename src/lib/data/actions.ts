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
  WeeklyAvailability,
} from "@/types/database"
import {
  bookingRequestSchema,
  cashMovementSchema,
  overrideSchema,
  settingsSchema,
  sizeOptionSchema,
  weeklyBlockSchema,
  type BookingRequest,
  type CashMovementInput,
  type OverrideInput,
  type SizeOptionInput,
  type WeeklyBlockInput,
} from "@/lib/schemas"
import { addDays } from "date-fns"
import { parseISODateCR, toISODateCR } from "@/lib/format"
import { getAvailableDays, getAvailableSlots } from "./queries"
import { db, latency, newId } from "./store"

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

export async function saveWeeklyBlock(input: WeeklyBlockInput): Promise<ActionResult<WeeklyAvailability>> {
  await latency(400)
  const parsed = weeklyBlockSchema.safeParse(input)
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Datos inválidos")
  const v = parsed.data
  const d = db()
  const overlaps = d.weekly_availability.some(
    (w) =>
      w.id !== v.id &&
      w.artist_id === v.artist_id &&
      w.weekday === v.weekday &&
      v.start_time < w.end_time &&
      v.end_time > w.start_time,
  )
  if (overlaps) return fail("VALIDATION", "Ese bloque se cruza con otro del mismo día.")
  const row: WeeklyAvailability = { ...v, weekday: v.weekday as WeeklyAvailability["weekday"], id: v.id ?? newId("wa") }
  const i = d.weekly_availability.findIndex((w) => w.id === row.id)
  if (i >= 0) d.weekly_availability[i] = row
  else d.weekly_availability.push(row)
  refreshAdmin()
  return { ok: true, data: row }
}

export async function deleteWeeklyBlock(id: UUID): Promise<ActionResult<null>> {
  await latency(300)
  const d = db()
  d.weekly_availability = d.weekly_availability.filter((w) => w.id !== id)
  refreshAdmin()
  return { ok: true, data: null }
}

export async function saveOverride(input: OverrideInput): Promise<ActionResult<AvailabilityOverride>> {
  await latency(400)
  const parsed = overrideSchema.safeParse(input)
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Datos inválidos")
  const v = parsed.data
  const d = db()
  const row: AvailabilityOverride = {
    ...v,
    id: v.id ?? newId("ov"),
    location_id: v.is_day_off ? null : v.location_id,
    start_time: v.is_day_off ? null : v.start_time,
    end_time: v.is_day_off ? null : v.end_time,
  }
  const clash = d.availability_overrides.find((o) => o.id !== row.id && o.artist_id === row.artist_id && o.date === row.date)
  if (clash) return fail("VALIDATION", "Ya hay una excepción para esa fecha. Editala en lugar de crear otra.")
  const i = d.availability_overrides.findIndex((o) => o.id === row.id)
  if (i >= 0) d.availability_overrides[i] = row
  else d.availability_overrides.push(row)
  refreshAdmin()
  return { ok: true, data: row }
}

export async function deleteOverride(id: UUID): Promise<ActionResult<null>> {
  await latency(300)
  const d = db()
  d.availability_overrides = d.availability_overrides.filter((o) => o.id !== id)
  refreshAdmin()
  return { ok: true, data: null }
}

/** Copia las excepciones de la semana anterior a `weekStart` (lunes, YYYY-MM-DD). */
export async function copyPreviousWeekOverrides(
  artistId: UUID,
  weekStart: string,
): Promise<ActionResult<{ copied: number }>> {
  await latency(500)
  const d = db()
  const start = parseISODateCR(weekStart)
  const prevDays = Array.from({ length: 7 }, (_, i) => toISODateCR(addDays(start, i - 7)))
  const source = d.availability_overrides.filter((o) => o.artist_id === artistId && prevDays.includes(o.date))
  let copied = 0
  for (const o of source) {
    const date = toISODateCR(addDays(parseISODateCR(o.date), 7))
    if (d.availability_overrides.some((x) => x.artist_id === artistId && x.date === date)) continue
    d.availability_overrides.push({ ...o, id: newId("ov"), date })
    copied++
  }
  refreshAdmin()
  return { ok: true, data: { copied } }
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
