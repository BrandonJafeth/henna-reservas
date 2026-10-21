import { addDays } from "date-fns"
import type { Booking, BookingStatus, CashMovement, Payment } from "@/types/database"
import { combineCR, toISODateCR } from "@/lib/format"
import { mockSizeOptions } from "./catalog"

interface Seed {
  day: number
  time: string
  artist: string
  location: string
  size: string
  status: BookingStatus
  first: string
  last: string
  phone: string
  image: number
  final?: number
  allergies?: string
  notes?: string
  email?: string
}

const seeds: Seed[] = [
  { day: -12, time: "09:30", artist: "art-kimberly", location: "loc-nicoya", size: "size-m", status: "completada", first: "Valeria", last: "Chaves", phone: "88124567", image: 1, final: 7000 },
  { day: -10, time: "14:00", artist: "art-katheryn", location: "loc-hojancha", size: "size-s", status: "completada", first: "Daniela", last: "Solano", phone: "87230011", image: 2, final: 4000 },
  { day: -9, time: "10:00", artist: "art-katheryn", location: "loc-nicoya", size: "size-hand", status: "completada", first: "María José", last: "Arias", phone: "86014422", image: 3, final: 5000, notes: "Diseño floral en el dorso" },
  { day: -7, time: "11:00", artist: "art-kimberly", location: "loc-hojancha", size: "size-xs", status: "no_show", first: "Andrea", last: "Villalobos", phone: "84447788", image: 4 },
  { day: -5, time: "15:30", artist: "art-kimberly", location: "loc-nicoya", size: "size-l", status: "completada", first: "Sofía", last: "Guevara", phone: "83310909", image: 1, final: 9000 },
  { day: -3, time: "13:00", artist: "art-katheryn", location: "loc-hojancha", size: "size-m", status: "cancelada", first: "Fernanda", last: "Mora", phone: "85556677", image: 2, notes: "Reprograma después de vacaciones" },
  { day: -2, time: "09:00", artist: "art-katheryn", location: "loc-nicoya", size: "size-s", status: "completada", first: "Camila", last: "Jiménez", phone: "89990011", image: 3, final: 3500 },
  { day: 0, time: "09:30", artist: "art-kimberly", location: "loc-nicoya", size: "size-m", status: "confirmada", first: "Natalia", last: "Quesada", phone: "88882020", image: 4, allergies: "Piel sensible al látex", email: "natalia.q@example.com" },
  { day: 0, time: "14:00", artist: "art-katheryn", location: "loc-hojancha", size: "size-xs", status: "pendiente", first: "Isabella", last: "Rodríguez", phone: "87771212", image: 1 },
  { day: 1, time: "10:00", artist: "art-katheryn", location: "loc-nicoya", size: "size-hand", status: "pendiente", first: "Mariana", last: "Castro", phone: "86663434", image: 2, notes: "Para una boda el sábado" },
  { day: 2, time: "16:00", artist: "art-kimberly", location: "loc-hojancha", size: "size-s", status: "confirmada", first: "Paula", last: "Vega", phone: "85554545", image: 3 },
  { day: 3, time: "09:00", artist: "art-kimberly", location: "loc-hojancha", size: "size-l", status: "pendiente", first: "Gabriela", last: "Salas", phone: "84445656", image: 4, email: "gabi.salas@example.com" },
  { day: 4, time: "13:30", artist: "art-katheryn", location: "loc-hojancha", size: "size-m", status: "confirmada", first: "Luciana", last: "Herrera", phone: "83336767", image: 1 },
  { day: 5, time: "11:00", artist: "art-katheryn", location: "loc-nicoya", size: "size-xs", status: "pendiente", first: "Ximena", last: "Calderón", phone: "82227878", image: 2 },
  { day: 8, time: "09:30", artist: "art-kimberly", location: "loc-nicoya", size: "size-s", status: "pendiente", first: "Antonella", last: "Brenes", phone: "81118989", image: 3 },
]

export function buildMockBookings(today: Date): Booking[] {
  return seeds.map((s, i) => {
    const size = mockSizeOptions.find((o) => o.id === s.size)!
    const date = toISODateCR(addDays(today, s.day))
    const starts = new Date(combineCR(date, s.time))
    const ends = new Date(starts.getTime() + size.duration_minutes * 60_000)
    return {
      id: `bk-${String(i + 1).padStart(3, "0")}`,
      created_at: addDays(starts, -4).toISOString(),
      status: s.status,
      artist_id: s.artist,
      location_id: s.location,
      size_option_id: s.size,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      client_first_name: s.first,
      client_last_name: s.last,
      client_whatsapp: s.phone,
      client_email: s.email ?? null,
      allergies: s.allergies ?? null,
      notes: s.notes ?? null,
      reference_image_url: `/mock/referencia-${s.image}.svg`,
      estimated_price_min: size.price_min,
      estimated_price_max: size.price_max,
      final_price: s.final ?? null,
      skin_care_consent: true,
      privacy_consent: true,
    }
  })
}

export function buildMockPayments(bookings: Booking[]): Payment[] {
  return bookings
    .filter((b) => b.status === "completada" && b.final_price)
    .map((b, i) => ({
      id: `pay-${i + 1}`,
      booking_id: b.id,
      amount: b.final_price!,
      method: i % 2 === 0 ? "sinpe" : "efectivo",
      paid_at: b.ends_at,
    }))
}

export function buildMockCashMovements(today: Date, bookings: Booking[]): CashMovement[] {
  const d = (n: number) => toISODateCR(addDays(today, n))
  const fromBookings: CashMovement[] = bookings
    .filter((b) => b.status === "completada" && b.final_price)
    .map((b, i) => ({
      id: `cm-b${i + 1}`,
      type: "ingreso",
      concept: `Cita · ${b.client_first_name} ${b.client_last_name}`,
      amount: b.final_price!,
      date: toISODateCR(new Date(b.starts_at)),
      artist_id: b.artist_id,
      location_id: b.location_id,
      booking_id: b.id,
    }))
  const manual: CashMovement[] = [
    { id: "cm-1", type: "egreso", concept: "Tinta de jagua (5 frascos)", amount: 18000, date: d(-14), artist_id: null, location_id: null, booking_id: null },
    { id: "cm-2", type: "egreso", concept: "Alquiler espacio Hojancha", amount: 25000, date: d(-11), artist_id: null, location_id: "loc-hojancha", booking_id: null },
    { id: "cm-3", type: "ingreso", concept: "Evento cumpleaños (8 piezas)", amount: 32000, date: d(-8), artist_id: "art-kimberly", location_id: "loc-nicoya", booking_id: null },
    { id: "cm-4", type: "egreso", concept: "Aplicadores y conos", amount: 6500, date: d(-6), artist_id: "art-katheryn", location_id: null, booking_id: null },
    { id: "cm-5", type: "egreso", concept: "Publicidad en redes", amount: 10000, date: d(-4), artist_id: null, location_id: null, booking_id: null },
    { id: "cm-6", type: "ingreso", concept: "Venta de kit de cuidado", amount: 4500, date: d(-1), artist_id: "art-katheryn", location_id: "loc-hojancha", booking_id: null },
  ]
  return [...fromBookings, ...manual].sort((a, b) => b.date.localeCompare(a.date))
}
