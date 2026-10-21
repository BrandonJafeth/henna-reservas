import { addDays } from "date-fns"
import type { AvailabilityOverride, WeeklyAvailability } from "@/types/database"
import { toISODateCR } from "@/lib/format"

export const mockWeeklyAvailability: WeeklyAvailability[] = [
  // Kimberly
  { id: "wa-1", artist_id: "art-kimberly", weekday: 1, start_time: "09:00", end_time: "13:00", location_id: "loc-nicoya" },
  { id: "wa-2", artist_id: "art-kimberly", weekday: 3, start_time: "09:00", end_time: "13:00", location_id: "loc-nicoya" },
  { id: "wa-3", artist_id: "art-kimberly", weekday: 3, start_time: "15:00", end_time: "18:00", location_id: "loc-hojancha" },
  { id: "wa-4", artist_id: "art-kimberly", weekday: 5, start_time: "13:00", end_time: "18:00", location_id: "loc-nicoya" },
  { id: "wa-5", artist_id: "art-kimberly", weekday: 6, start_time: "09:00", end_time: "16:00", location_id: "loc-hojancha" },
  // Karla
  { id: "wa-6", artist_id: "art-karla", weekday: 2, start_time: "13:00", end_time: "18:00", location_id: "loc-hojancha" },
  { id: "wa-7", artist_id: "art-karla", weekday: 4, start_time: "13:00", end_time: "18:00", location_id: "loc-hojancha" },
  { id: "wa-8", artist_id: "art-karla", weekday: 4, start_time: "09:00", end_time: "12:00", location_id: "loc-nicoya" },
  { id: "wa-9", artist_id: "art-karla", weekday: 6, start_time: "09:00", end_time: "14:00", location_id: "loc-nicoya" },
]

export function buildMockOverrides(today: Date): AvailabilityOverride[] {
  const d = (n: number) => toISODateCR(addDays(today, n))
  return [
    { id: "ov-1", artist_id: "art-kimberly", date: d(6), is_day_off: true, location_id: null, start_time: null, end_time: null, note: "Feria artesanal" },
    { id: "ov-2", artist_id: "art-karla", date: d(9), is_day_off: false, location_id: "loc-nicoya", start_time: "10:00", end_time: "16:00", note: "Horario extendido" },
    { id: "ov-3", artist_id: "art-karla", date: d(13), is_day_off: true, location_id: null, start_time: null, end_time: null, note: null },
  ]
}
