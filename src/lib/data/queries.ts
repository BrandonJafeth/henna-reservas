import "server-only"
import { cache } from "react"
import { connection } from "next/server"
import type {
  AvailabilityOverride,
  AvailableDay,
  AvailableSlot,
  Booking,
  BookingStatus,
  CashMovement,
  CashMovementType,
  ISODate,
  Location,
  Profile,
  Settings,
  SizeOption,
  UUID,
  WeeklyAvailability,
} from "@/types/database"
import { computeDays, computeSlots, type SlotQuery } from "@/lib/mock/slots"
import { toISODateCR } from "@/lib/format"
import { db, latency } from "./store"

/*
 * Lecturas. Hoy devuelven mocks; mañana cada una será una consulta
 * a Supabase con la misma firma, sin tocar la UI.
 * `connection()` marca la lectura como dinámica (por solicitud), igual
 * que lo será con Supabase y las cookies de sesión.
 */

async function read<T>(fn: () => T): Promise<T> {
  await connection()
  await latency()
  return structuredClone(fn())
}

export function getLocations(): Promise<Location[]> {
  return read(() =>
    db().locations.filter((l) => l.is_active).sort((a, b) => a.sort_order - b.sort_order),
  )
}

export function getAllLocations(): Promise<Location[]> {
  return read(() => [...db().locations].sort((a, b) => a.sort_order - b.sort_order))
}

export function getArtists(): Promise<Profile[]> {
  return read(() => db().profiles.filter((p) => p.is_active))
}

export function getAllArtists(): Promise<Profile[]> {
  return read(() => db().profiles)
}

export function getSizeOptions(): Promise<SizeOption[]> {
  return read(() =>
    db().size_options.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
  )
}

export function getAllSizeOptions(): Promise<SizeOption[]> {
  return read(() => [...db().size_options].sort((a, b) => a.sort_order - b.sort_order))
}

export function getSettings(): Promise<Settings> {
  return read(() => db().settings)
}

export function getWeeklyAvailability(artistId?: UUID): Promise<WeeklyAvailability[]> {
  return read(() =>
    db()
      .weekly_availability.filter((w) => !artistId || w.artist_id === artistId)
      .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)),
  )
}

export function getAvailabilityOverrides(artistId?: UUID): Promise<AvailabilityOverride[]> {
  return read(() =>
    db()
      .availability_overrides.filter((o) => !artistId || o.artist_id === artistId)
      .sort((a, b) => a.date.localeCompare(b.date)),
  )
}

/** RPC `get_available_slots` */
export async function getAvailableSlots(q: SlotQuery): Promise<AvailableSlot[]> {
  return read(() => {
    const d = db()
    return computeSlots(q, {
      now: new Date(),
      weekly: d.weekly_availability,
      overrides: d.availability_overrides,
      bookings: d.bookings,
      settings: d.settings,
    })
  })
}

/** RPC `get_available_days` */
export async function getAvailableDays(q: Omit<SlotQuery, "date">): Promise<AvailableDay[]> {
  return read(() => {
    const d = db()
    return computeDays(q, {
      now: new Date(),
      weekly: d.weekly_availability,
      overrides: d.availability_overrides,
      bookings: d.bookings,
      settings: d.settings,
    })
  })
}

/** Artistas con algún bloque en ese lugar (semanal o excepción futura). */
export function getArtistIdsByLocation(): Promise<Record<UUID, UUID[]>> {
  return read(() => {
    const d = db()
    const today = toISODateCR(new Date())
    const map: Record<UUID, UUID[]> = {}
    const add = (loc: UUID, artist: UUID) => {
      map[loc] ??= []
      if (!map[loc].includes(artist)) map[loc].push(artist)
    }
    d.weekly_availability.forEach((w) => add(w.location_id, w.artist_id))
    d.availability_overrides
      .filter((o) => o.date >= today && o.location_id && !o.is_day_off)
      .forEach((o) => add(o.location_id!, o.artist_id))
    return map
  })
}

export interface BookingFilters {
  status?: BookingStatus | "todas"
  artist_id?: UUID | "todas"
  location_id?: UUID | "todos"
  from?: ISODate
  to?: ISODate
}

export function getBookings(f: BookingFilters = {}): Promise<Booking[]> {
  return read(() =>
    db()
      .bookings.filter((b) => {
        if (f.status && f.status !== "todas" && b.status !== f.status) return false
        if (f.artist_id && f.artist_id !== "todas" && b.artist_id !== f.artist_id) return false
        if (f.location_id && f.location_id !== "todos" && b.location_id !== f.location_id) return false
        const day = toISODateCR(new Date(b.starts_at))
        if (f.from && day < f.from) return false
        if (f.to && day > f.to) return false
        return true
      })
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  )
}

export interface CashFilters {
  type?: CashMovementType | "todos"
  from?: ISODate
  to?: ISODate
}

export function getCashMovements(f: CashFilters = {}): Promise<CashMovement[]> {
  return read(() =>
    db().cash_movements.filter((m) => {
      if (f.type && f.type !== "todos" && m.type !== f.type) return false
      if (f.from && m.date < f.from) return false
      if (f.to && m.date > f.to) return false
      return true
    }),
  )
}

export interface DashboardSummary {
  today_count: number
  pending_count: number
  month_income: number
  cash_balance: number
  by_artist: { artist_id: UUID; completed: number; income: number }[]
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return read(() => {
    const d = db()
    const today = toISODateCR(new Date())
    const month = today.slice(0, 7)
    const incomeMonth = d.cash_movements
      .filter((m) => m.type === "ingreso" && m.date.startsWith(month))
      .reduce((s, m) => s + m.amount, 0)
    const balance = d.cash_movements.reduce(
      (s, m) => s + (m.type === "ingreso" ? m.amount : -m.amount),
      0,
    )
    return {
      today_count: d.bookings.filter(
        (b) => toISODateCR(new Date(b.starts_at)) === today && b.status !== "cancelada",
      ).length,
      pending_count: d.bookings.filter((b) => b.status === "pendiente").length,
      month_income: incomeMonth,
      cash_balance: balance,
      by_artist: d.profiles.map((p) => ({
        artist_id: p.id,
        completed: d.bookings.filter((b) => b.artist_id === p.id && b.status === "completada").length,
        income: d.cash_movements
          .filter((m) => m.type === "ingreso" && m.artist_id === p.id && m.date.startsWith(month))
          .reduce((s, m) => s + m.amount, 0),
      })),
    }
  })
}

/** Sesión simulada. Con Supabase: `auth.getUser()` + fila de `profiles`. */
export const getCurrentProfile = cache(function getCurrentProfile(): Promise<Profile> {
  return read(() => db().profiles.find((p) => p.role === "admin")!)
})
