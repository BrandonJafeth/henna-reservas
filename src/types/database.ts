/**
 * Tipos del dominio con la misma forma que las tablas de Supabase.
 * Cuando se generen los tipos oficiales (`supabase gen types`), estos
 * alias pasan a apuntar a `Database["public"]["Tables"][...]["Row"]`.
 */

export type UUID = string
/** Fecha ISO `YYYY-MM-DD` */
export type ISODate = string
/** Hora `HH:mm` (24 h, zona America/Costa_Rica) */
export type TimeOfDay = string
/** Timestamp ISO 8601 con zona */
export type Timestamp = string

export type Role = "admin" | "tatuadora"

export interface Profile {
  id: UUID
  full_name: string
  role: Role
  /** Fracción 0–1 que se lleva la artista de cada cita */
  commission_rate: number
  avatar_url: string | null
  is_active: boolean
}

export interface Location {
  id: UUID
  name: string
  address: string | null
  sort_order: number
  is_active: boolean
}

export interface SizeOption {
  id: UUID
  label: string
  /** null en opciones que no se miden en cm (p. ej. "Mano completa") */
  min_cm: number | null
  max_cm: number | null
  price_min: number
  price_max: number
  duration_minutes: number
  sort_order: number
  is_active: boolean
}

/** 0 = domingo … 6 = sábado (igual que `Date.getDay()` y Postgres `dow`) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface WeeklyAvailability {
  id: UUID
  artist_id: UUID
  weekday: Weekday
  start_time: TimeOfDay
  end_time: TimeOfDay
  location_id: UUID
}

export interface AvailabilityOverride {
  id: UUID
  artist_id: UUID
  date: ISODate
  is_day_off: boolean
  location_id: UUID | null
  start_time: TimeOfDay | null
  end_time: TimeOfDay | null
  note: string | null
}

export type BookingStatus =
  | "pendiente"
  | "confirmada"
  | "completada"
  | "cancelada"
  | "no_show"

export interface Booking {
  id: UUID
  created_at: Timestamp
  status: BookingStatus
  artist_id: UUID
  location_id: UUID
  size_option_id: UUID
  starts_at: Timestamp
  ends_at: Timestamp
  client_first_name: string
  client_last_name: string
  client_whatsapp: string
  client_email: string | null
  allergies: string | null
  notes: string | null
  reference_image_url: string
  estimated_price_min: number
  estimated_price_max: number
  final_price: number | null
  skin_care_consent: boolean
  privacy_consent: boolean
}

export type PaymentMethod = "efectivo" | "sinpe" | "tarjeta"

export interface Payment {
  id: UUID
  booking_id: UUID
  amount: number
  method: PaymentMethod
  paid_at: Timestamp
}

export type CashMovementType = "ingreso" | "egreso"

export interface CashMovement {
  id: UUID
  type: CashMovementType
  concept: string
  amount: number
  date: ISODate
  artist_id: UUID | null
  location_id: UUID | null
  booking_id: UUID | null
}

export interface Settings {
  /** Cuántos días hacia adelante se puede reservar */
  booking_window_days: number
  /** Anticipación mínima en horas */
  min_notice_hours: number
  /** Minutos libres entre citas */
  buffer_minutes: number
  /** Tamaño de la grilla de horas ofrecidas, en minutos */
  slot_interval_minutes: number
  /**
   * Tiempo que la jagua necesita secar sobre la piel, en minutos (rango).
   * Es informativo para la clienta: no ocupa la agenda de la artista,
   * porque la clienta se va con el gel puesto.
   */
  drying_minutes_min: number
  drying_minutes_max: number
}

/** Resultado del RPC `get_available_slots` */
export interface AvailableSlot {
  starts_at: Timestamp
  ends_at: Timestamp
  artist_id: UUID
  location_id: UUID
}

/** Resultado del RPC `get_available_days` (días con al menos un hueco) */
export interface AvailableDay {
  date: ISODate
  has_slots: boolean
}
