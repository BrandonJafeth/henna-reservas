import { TZDate } from "@date-fns/tz"
import type { AvailabilityOverride, TimeOfDay, UUID, Weekday, WeeklyAvailability } from "@/types/database"
import { combineCR, TIME_ZONE } from "@/lib/format"

/*
 * Reglas de disponibilidad (iguales a las que aplicará Postgres):
 *
 * - `weekly_availability` es el horario que se repite cada semana.
 * - `availability_overrides` son cambios para una fecha concreta de una artista:
 *     · si alguna fila de esa fecha es `is_day_off`, la artista no atiende ese día;
 *     · si hay filas con horario, ESAS filas son el horario del día y reemplazan
 *       al semanal (por eso "solo este día" copia primero el semanal a la fecha);
 *     · si no hay filas, rige el semanal.
 */

/** Bloque efectivo de trabajo de una artista en una fecha concreta. */
export interface Block {
  artist_id: UUID
  location_id: UUID
  start_time: TimeOfDay
  end_time: TimeOfDay
  /** Origen: horario semanal o cambio de ese día */
  source: { kind: "weekly"; id: UUID } | { kind: "override"; id: UUID }
}

export function weekdayOf(date: string): Weekday {
  return new TZDate(combineCR(date, "12:00"), TIME_ZONE).getDay() as Weekday
}

export type DayKind = "weekly" | "custom" | "off" | "none"

/** Qué rige un día para una artista. */
export function dayKind(
  date: string,
  artistId: UUID,
  src: { weekly: WeeklyAvailability[]; overrides: AvailabilityOverride[] },
): DayKind {
  const rows = src.overrides.filter((o) => o.artist_id === artistId && o.date === date)
  if (rows.some((o) => o.is_day_off)) return "off"
  if (rows.length) return "custom"
  const weekday = weekdayOf(date)
  return src.weekly.some((w) => w.artist_id === artistId && w.weekday === weekday) ? "weekly" : "none"
}

export function effectiveBlocks(
  date: string,
  src: { weekly: WeeklyAvailability[]; overrides: AvailabilityOverride[] },
): Block[] {
  const weekday = weekdayOf(date)
  const artists = new Set(src.weekly.map((w) => w.artist_id))
  src.overrides.forEach((o) => artists.add(o.artist_id))
  const blocks: Block[] = []
  for (const artist_id of artists) {
    const rows = src.overrides.filter((o) => o.artist_id === artist_id && o.date === date)
    if (rows.some((o) => o.is_day_off)) continue
    if (rows.length) {
      for (const o of rows) {
        if (!o.location_id || !o.start_time || !o.end_time) continue
        blocks.push({
          artist_id,
          location_id: o.location_id,
          start_time: o.start_time,
          end_time: o.end_time,
          source: { kind: "override", id: o.id },
        })
      }
      continue
    }
    src.weekly
      .filter((w) => w.artist_id === artist_id && w.weekday === weekday)
      .forEach((w) =>
        blocks.push({
          artist_id,
          location_id: w.location_id,
          start_time: w.start_time,
          end_time: w.end_time,
          source: { kind: "weekly", id: w.id },
        }),
      )
  }
  return blocks.sort((a, b) => a.start_time.localeCompare(b.start_time))
}

export function overlaps(a: { start_time: string; end_time: string }, b: { start_time: string; end_time: string }) {
  return a.start_time < b.end_time && a.end_time > b.start_time
}
