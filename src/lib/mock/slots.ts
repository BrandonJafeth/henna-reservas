/**
 * Implementación de ejemplo de los RPC `get_available_slots` y
 * `get_available_days`. En producción la calcula Postgres.
 */
import { addDays } from "date-fns"
import type {
  AvailabilityOverride,
  AvailableDay,
  AvailableSlot,
  Booking,
  Settings,
  UUID,
  WeeklyAvailability,
} from "@/types/database"
import { combineCR, toISODateCR } from "@/lib/format"
import { effectiveBlocks } from "@/lib/availability"

export interface SlotQuery {
  date: string
  location_id: UUID
  artist_id?: UUID | null
  duration_minutes: number
}

interface Sources {
  now: Date
  weekly: WeeklyAvailability[]
  overrides: AvailabilityOverride[]
  bookings: Booking[]
  settings: Settings
}

export function computeSlots(q: SlotQuery, src: Sources): AvailableSlot[] {
  const { settings, now } = src
  const earliest = now.getTime() + settings.min_notice_hours * 3_600_000
  const lastDay = toISODateCR(addDays(now, settings.booking_window_days))
  if (q.date > lastDay || q.date < toISODateCR(now)) return []

  const step = settings.slot_interval_minutes * 60_000
  const dur = q.duration_minutes * 60_000
  const buffer = settings.buffer_minutes * 60_000
  const busy = src.bookings.filter((b) => b.status === "pendiente" || b.status === "confirmada")

  const slots: AvailableSlot[] = []
  for (const block of effectiveBlocks(q.date, src)) {
    if (block.location_id !== q.location_id) continue
    if (q.artist_id && block.artist_id !== q.artist_id) continue
    const blockStart = new Date(combineCR(q.date, block.start_time)).getTime()
    const blockEnd = new Date(combineCR(q.date, block.end_time)).getTime()
    for (let t = blockStart; t + dur <= blockEnd; t += step) {
      if (t < earliest) continue
      const clash = busy.some((b) => {
        if (b.artist_id !== block.artist_id) return false
        const bs = new Date(b.starts_at).getTime() - buffer
        const be = new Date(b.ends_at).getTime() + buffer
        return t < be && t + dur > bs
      })
      if (clash) continue
      slots.push({
        starts_at: new Date(t).toISOString(),
        ends_at: new Date(t + dur).toISOString(),
        artist_id: block.artist_id,
        location_id: block.location_id,
      })
    }
  }
  return slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

export function computeDays(q: Omit<SlotQuery, "date">, src: Sources): AvailableDay[] {
  const days: AvailableDay[] = []
  for (let i = 0; i <= src.settings.booking_window_days; i++) {
    const date = toISODateCR(addDays(src.now, i))
    days.push({ date, has_slots: computeSlots({ ...q, date }, src).length > 0 })
  }
  return days
}
