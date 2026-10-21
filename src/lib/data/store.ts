import "server-only"
import type {
  AvailabilityOverride,
  Booking,
  CashMovement,
  Location,
  Payment,
  Profile,
  Settings,
  SizeOption,
  WeeklyAvailability,
} from "@/types/database"
import { mockArtists, mockLocations, mockSettings, mockSizeOptions } from "@/lib/mock/catalog"
import { buildMockOverrides, mockWeeklyAvailability } from "@/lib/mock/schedule"
import { buildMockBookings, buildMockCashMovements, buildMockPayments } from "@/lib/mock/bookings"

/**
 * Almacén en memoria que imita las tablas de Supabase durante la fase
 * de diseño. Vive en `globalThis` para sobrevivir a recargas en desarrollo.
 * SOLO lo usan las funciones de `src/lib/data/`.
 */
export interface MockDB {
  locations: Location[]
  profiles: Profile[]
  size_options: SizeOption[]
  weekly_availability: WeeklyAvailability[]
  availability_overrides: AvailabilityOverride[]
  bookings: Booking[]
  payments: Payment[]
  cash_movements: CashMovement[]
  settings: Settings
}

const g = globalThis as unknown as { __kkMockDB?: MockDB }

export function db(): MockDB {
  if (!g.__kkMockDB) {
    const today = new Date()
    const bookings = buildMockBookings(today)
    g.__kkMockDB = {
      locations: structuredClone(mockLocations),
      profiles: structuredClone(mockArtists),
      size_options: structuredClone(mockSizeOptions),
      weekly_availability: structuredClone(mockWeeklyAvailability),
      availability_overrides: buildMockOverrides(today),
      bookings,
      payments: buildMockPayments(bookings),
      cash_movements: buildMockCashMovements(today, bookings),
      settings: { ...mockSettings },
    }
  }
  return g.__kkMockDB
}

const LATENCY = Number(process.env.MOCK_LATENCY_MS ?? 250)

/** Simula la latencia de red de Supabase para que los skeletons se vean. */
export function latency(ms = LATENCY): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
