import { TZDate } from "@date-fns/tz"
import type { AvailabilityOverride, TimeOfDay, UUID, Weekday, WeeklyAvailability } from "@/types/database"
import { combineCR, TIME_ZONE } from "@/lib/format"

/** Bloque efectivo de trabajo de una artista en una fecha concreta. */
export interface Block {
  artist_id: UUID
  location_id: UUID
  start_time: TimeOfDay
  end_time: TimeOfDay
  /** Origen: horario semanal o excepción de ese día */
  source: { kind: "weekly"; id: UUID } | { kind: "override"; id: UUID }
}

export function weekdayOf(date: string): Weekday {
  return new TZDate(combineCR(date, "12:00"), TIME_ZONE).getDay() as Weekday
}

/**
 * Aplica las excepciones sobre el horario semanal: un día libre borra
 * los bloques, un horario especial los reemplaza.
 */
export function effectiveBlocks(
  date: string,
  src: { weekly: WeeklyAvailability[]; overrides: AvailabilityOverride[] },
): Block[] {
  const weekday = weekdayOf(date)
  const artists = new Set(src.weekly.map((w) => w.artist_id))
  src.overrides.forEach((o) => artists.add(o.artist_id))
  const blocks: Block[] = []
  for (const artist_id of artists) {
    const override = src.overrides.find((o) => o.artist_id === artist_id && o.date === date)
    if (override) {
      if (!override.is_day_off && override.location_id && override.start_time && override.end_time) {
        blocks.push({
          artist_id,
          location_id: override.location_id,
          start_time: override.start_time,
          end_time: override.end_time,
          source: { kind: "override", id: override.id },
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
