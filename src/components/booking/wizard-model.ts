import { z } from "zod"
import type { Location, Profile, Settings, SizeOption, UUID } from "@/types/database"
import { bookingDetailsSchema, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/schemas"

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

export const STEPS = [
  { key: "diseno", title: "Diseño", heading: "Tu diseño", fields: ["reference_image", "notes"] },
  { key: "tamano", title: "Tamaño", heading: "¿De qué tamaño?", fields: ["size_option_id"] },
  { key: "lugar", title: "Lugar", heading: "Lugar y artista", fields: ["location_id", "artist_id"] },
  { key: "fecha", title: "Fecha", heading: "Día y hora", fields: ["date", "starts_at"] },
  {
    key: "datos",
    title: "Tus datos",
    heading: "Tus datos",
    fields: ["first_name", "last_name", "whatsapp", "email", "allergies", "skin_care_consent", "privacy_consent"],
  },
  { key: "resumen", title: "Resumen", heading: "Revisá tu reserva", fields: [] },
] as const satisfies readonly { key: string; title: string; heading: string; fields: readonly WizardField[] }[]

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
