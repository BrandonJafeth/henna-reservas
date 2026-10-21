import { z } from "zod"

/** Esquemas compartidos entre cliente (react-hook-form) y servidor (acciones). */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

const time = z.string().regex(/^\d{2}:\d{2}$/, "Usá el formato HH:mm")

export const bookingDetailsSchema = z.object({
  first_name: z.string().trim().min(2, "Escribí tu nombre"),
  last_name: z.string().trim().min(2, "Escribí tu apellido"),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^[245678]\d{7}$/, "Escribí un número de 8 dígitos, por ejemplo 8888 8888")),
  email: z.union([z.literal(""), z.email("Revisá el correo, parece incompleto")]),
  allergies: z.string().max(500, "Máximo 500 caracteres"),
  skin_care_consent: z.literal(true, "Necesitamos que aceptes los cuidados de la piel"),
  privacy_consent: z.literal(true, "Necesitamos que aceptes el aviso de privacidad"),
})

export const bookingRequestSchema = bookingDetailsSchema.extend({
  size_option_id: z.string().min(1),
  location_id: z.string().min(1),
  artist_id: z.string().min(1),
  starts_at: z.iso.datetime({ offset: true }),
  notes: z.string().max(800),
  reference_image_name: z.string().min(1, "Falta la foto de referencia"),
})
export type BookingRequest = z.infer<typeof bookingRequestSchema>

export const weeklyBlockSchema = z
  .object({
    id: z.string().optional(),
    artist_id: z.string().min(1),
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: time,
    end_time: time,
    location_id: z.string().min(1, "Elegí un lugar"),
  })
  .refine((v) => v.end_time > v.start_time, {
    path: ["end_time"],
    message: "La hora de fin debe ser después del inicio",
  })
export type WeeklyBlockInput = z.input<typeof weeklyBlockSchema>

export const overrideSchema = z
  .object({
    id: z.string().optional(),
    artist_id: z.string().min(1),
    date: z.iso.date("Elegí una fecha"),
    is_day_off: z.boolean(),
    location_id: z.string().nullable(),
    start_time: time.nullable(),
    end_time: time.nullable(),
    note: z.string().max(140).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.is_day_off) return
    if (!v.location_id) ctx.addIssue({ code: "custom", path: ["location_id"], message: "Elegí un lugar" })
    if (!v.start_time || !v.end_time || v.end_time <= v.start_time)
      ctx.addIssue({ code: "custom", path: ["end_time"], message: "La hora de fin debe ser después del inicio" })
  })
export type OverrideInput = z.input<typeof overrideSchema>

export const cashMovementSchema = z.object({
  type: z.enum(["ingreso", "egreso"]),
  concept: z.string().trim().min(3, "Describí el movimiento"),
  amount: z.coerce.number({ error: "Escribí un monto" }).int("Sin decimales").positive("El monto debe ser mayor a cero"),
  date: z.iso.date("Elegí una fecha"),
  artist_id: z.string().nullable(),
  location_id: z.string().nullable(),
})
export type CashMovementInput = z.input<typeof cashMovementSchema>

export const sizeOptionSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().trim().min(2, "Escribí un nombre"),
    min_cm: z.coerce.number().int().positive().nullable(),
    max_cm: z.coerce.number().int().positive().nullable(),
    price_min: z.coerce.number().int().nonnegative(),
    price_max: z.coerce.number().int().nonnegative(),
    duration_minutes: z.coerce.number().int().min(5, "Mínimo 5 minutos"),
    is_active: z.boolean(),
  })
  .refine((v) => v.price_max >= v.price_min, { path: ["price_max"], message: "Debe ser mayor o igual al mínimo" })
export type SizeOptionInput = z.input<typeof sizeOptionSchema>

export const settingsSchema = z.object({
  booking_window_days: z.coerce.number().int().min(1).max(180),
  min_notice_hours: z.coerce.number().int().min(0).max(168),
  buffer_minutes: z.coerce.number().int().min(0).max(120),
  slot_interval_minutes: z.coerce.number().int().min(10).max(120),
})

export const loginSchema = z.object({
  email: z.email("Escribí un correo válido"),
  password: z.string().min(6, "La contraseña tiene al menos 6 caracteres"),
})
