/**
 * Datos de ejemplo. Solo `src/lib/data/` puede importar este directorio.
 * En producción estas filas vienen de Supabase y las edita la admin.
 */
import type { Location, Profile, Settings, SizeOption } from "@/types/database"

export const mockLocations: Location[] = [
  { id: "loc-nicoya", name: "Nicoya", address: "Centro de Nicoya, Guanacaste", sort_order: 1, is_active: true },
  { id: "loc-hojancha", name: "Hojancha", address: "Hojancha centro, Guanacaste", sort_order: 2, is_active: true },
]

export const mockArtists: Profile[] = [
  {
    id: "art-kimberly",
    full_name: "Kimberly Rojas",
    role: "admin",
    commission_rate: 1,
    avatar_url: null,
    is_active: true,
  },
  {
    id: "art-karla",
    full_name: "Karla Méndez",
    role: "tatuadora",
    commission_rate: 0.6,
    avatar_url: null,
    is_active: true,
  },
]

export const mockSizeOptions: SizeOption[] = [
  { id: "size-xs", label: "Menos de 5 cm", min_cm: 1, max_cm: 4, price_min: 1500, price_max: 2500, duration_minutes: 20, sort_order: 1, is_active: true },
  { id: "size-s", label: "5 a 7 cm", min_cm: 5, max_cm: 7, price_min: 3500, price_max: 4500, duration_minutes: 30, sort_order: 2, is_active: true },
  { id: "size-m", label: "7 a 10 cm", min_cm: 8, max_cm: 10, price_min: 6500, price_max: 7500, duration_minutes: 45, sort_order: 3, is_active: true },
  { id: "size-l", label: "Más de 10 cm", min_cm: 11, max_cm: null, price_min: 8500, price_max: 9500, duration_minutes: 60, sort_order: 4, is_active: true },
  { id: "size-hand", label: "Mano completa", min_cm: null, max_cm: null, price_min: 4000, price_max: 5000, duration_minutes: 60, sort_order: 5, is_active: true },
]

export const mockSettings: Settings = {
  booking_window_days: 30,
  min_notice_hours: 24,
  buffer_minutes: 15,
  slot_interval_minutes: 30,
}
