import { z } from "zod"
import { defineStepper } from "@stepperize/react"
import type { Location, Profile, Settings, SizeOption, UUID } from "@/types/database"
import { bookingDetailsSchema, IMAGE_TYPES, MAX_IMAGE_BYTES, type BookingRequest } from "@/lib/schemas"

/** Todo lo que el asistente necesita, recibido por props desde `src/lib/data`. */
export interface BookingCatalog {
  sizes: SizeOption[]
  locations: Location[]
  artists: Pick<Profile, "id" | "full_name">[]
  artistsByLocation: Record<UUID, UUID[]>
  settings: Settings
}

export const wizardSchema = bookingDetailsSchema.extend({
  reference_image: z
    .custom<File | null>((v) => v instanceof File, "Subí una foto de tu diseño para continuar")
    .refine((f) => !!f && (IMAGE_TYPES as readonly string[]).includes(f.type), "La foto debe ser JPG, PNG o WEBP")
    .refine((f) => !!f && f.size <= MAX_IMAGE_BYTES, "La foto pesa más de 5 MB. Probá con una más liviana"),
  notes: z.string().max(800, "Máximo 800 caracteres"),
  size_option_id: z.string().min(1, "Elegí un tamaño"),
  location_id: z.string().min(1, "Elegí dónde querés tu cita"),
  artist_id: z.string().min(1, "Elegí una artista"),
  date: z.string().min(1, "Elegí un día"),
  starts_at: z.string().min(1, "Elegí una hora"),
  skin_care_consent: z.boolean().refine(Boolean, "Necesitamos que aceptes los cuidados de la piel"),
  privacy_consent: z.boolean().refine(Boolean, "Necesitamos que aceptes el aviso de privacidad"),
})

export type WizardInput = z.input<typeof wizardSchema>
export type WizardOutput = z.output<typeof wizardSchema>
export type WizardField = keyof WizardInput

/*
 * Esquema por paso. Cada uno es el contrato de datos de ese paso:
 * Stepperize lo usa para tipar `stepper.data` y validar con `validate()`,
 * y al pasar a Supabase cada bloque se mapea a sus columnas de `bookings`.
 */
const designStep = wizardSchema.pick({ reference_image: true, notes: true })
const sizeStep = wizardSchema.pick({ size_option_id: true })
const placeStep = wizardSchema.pick({ location_id: true, artist_id: true })
const dateStep = wizardSchema.pick({ date: true, starts_at: true })
const detailsStep = wizardSchema.pick({
  first_name: true,
  last_name: true,
  whatsapp: true,
  email: true,
  allergies: true,
  skin_care_consent: true,
  privacy_consent: true,
})

/** Campos de un esquema de paso, en orden: sirven para validar con RHF y enfocar el primer error. */
function fieldsOf(schema: z.ZodObject): WizardField[] {
  return Object.keys(schema.shape) as WizardField[]
}

export const bookingStepper = defineStepper([
  { id: "diseno", title: "Diseño", heading: "Tu diseño", schema: designStep, fields: fieldsOf(designStep) },
  { id: "tamano", title: "Tamaño", heading: "¿De qué tamaño?", schema: sizeStep, fields: fieldsOf(sizeStep) },
  { id: "lugar", title: "Lugar", heading: "Lugar y artista", schema: placeStep, fields: fieldsOf(placeStep) },
  { id: "fecha", title: "Fecha", heading: "Día y hora", schema: dateStep, fields: fieldsOf(dateStep) },
  { id: "datos", title: "Tus datos", heading: "Tus datos", schema: detailsStep, fields: fieldsOf(detailsStep) },
  { id: "resumen", title: "Resumen", heading: "Revisá tu reserva", fields: [] as WizardField[] },
])

export type BookingStepper = ReturnType<typeof bookingStepper.useStepper>
export type StepId = BookingStepper["id"]
export type FlowSnapshot = ReturnType<BookingStepper["data"]["all"]>

/** Valores del formulario que pertenecen a un paso. */
export function pickStepValues(values: WizardInput, id: StepId): Partial<WizardInput> {
  const fields: readonly WizardField[] = bookingStepper.steps.find((s) => s.id === id)?.fields ?? []
  return Object.fromEntries(fields.map((f) => [f, values[f]]))
}

/**
 * Arma la solicitud para el servidor a partir de los datos guardados por
 * paso. Es el único punto que conoce la forma de `bookings`: al migrar a
 * Supabase se cambia aquí (p. ej. subir la foto a Storage y guardar la ruta).
 */
export function toBookingRequest(flow: FlowSnapshot): BookingRequest {
  const design = flow.diseno as z.input<typeof designStep>
  const size = flow.tamano as z.input<typeof sizeStep>
  const place = flow.lugar as z.input<typeof placeStep>
  const date = flow.fecha as z.input<typeof dateStep>
  const details = flow.datos as z.input<typeof detailsStep>
  return {
    first_name: details.first_name,
    last_name: details.last_name,
    whatsapp: details.whatsapp,
    email: details.email,
    allergies: details.allergies,
    skin_care_consent: details.skin_care_consent === true,
    privacy_consent: details.privacy_consent === true,
    size_option_id: size.size_option_id,
    location_id: place.location_id,
    artist_id: place.artist_id,
    starts_at: date.starts_at,
    notes: design.notes,
    reference_image_name: design.reference_image?.name ?? "",
  } as BookingRequest
}

export const DEFAULT_VALUES: WizardInput = {
  reference_image: null,
  notes: "",
  size_option_id: "",
  location_id: "",
  artist_id: "",
  date: "",
  starts_at: "",
  first_name: "",
  last_name: "",
  whatsapp: "",
  email: "",
  allergies: "",
  skin_care_consent: false,
  privacy_consent: false,
}

/** id del elemento enfocable de cada campo, para mover el foco al primer error. */
export const fieldId = (name: WizardField) => `campo-${name}`
