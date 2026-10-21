"use client"

import { useEffect, useState } from "react"
import { MessageCircle } from "lucide-react"
import { sileo } from "sileo"
import type { Booking, BookingStatus, Location, Profile, SizeOption } from "@/types/database"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BrandLabel } from "@/components/brand/brand-label"
import { StatusBadge } from "@/components/brand/status-badge"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { FieldError } from "@/components/booking/field-message"
import { updateBooking } from "@/lib/data/actions"
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/domain"
import { capitalize, formatCR, formatCRCRange, formatTimeCR, formatWhatsApp } from "@/lib/format"

export function BookingDetail({
  booking,
  onOpenChange,
  artists,
  locations,
  sizes,
}: {
  booking: Booking | null
  onOpenChange: (open: boolean) => void
  artists: Pick<Profile, "id" | "full_name">[]
  locations: Location[]
  sizes: SizeOption[]
}) {
  const [status, setStatus] = useState<BookingStatus>("pendiente")
  const [price, setPrice] = useState("")
  const [error, setError] = useState<string>()
  const [state, setState] = useState<ActionState>("idle")

  useEffect(() => {
    if (!booking) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronizar el formulario con la cita abierta
    setStatus(booking.status)
    setPrice(booking.final_price?.toString() ?? "")
    setError(undefined)
    setState("idle")
  }, [booking])

  async function save() {
    const digits = price.replace(/\D/g, "")
    const final_price = digits ? Number(digits) : null
    if (status === "completada" && final_price == null) {
      setError("Para marcarla como completada, escribí el precio final.")
      document.getElementById("detalle-precio")?.focus()
      return
    }
    setError(undefined)
    setState("loading")
    const res = await updateBooking(booking!.id, { status, final_price })
    if (!res.ok) {
      setState("idle")
      sileo.error({ title: "No se guardó la cita", description: res.message })
      return
    }
    setState("success")
    sileo.success({ title: "Cita actualizada", description: `${booking!.client_first_name} · ${STATUS_LABEL[status]}` })
    setTimeout(() => setState("idle"), 1200)
  }

  const b = booking
  const size = sizes.find((s) => s.id === b?.size_option_id)
  return (
    <Sheet open={!!b} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {b && (
          <>
            <SheetHeader className="border-b border-border px-5 pt-6 pb-5">
              <div className="flex items-center gap-2">
                <StatusBadge status={b.status} />
              </div>
              <SheetTitle className="font-display text-[1.75rem] leading-tight font-medium">
                {b.client_first_name} {b.client_last_name}
              </SheetTitle>
              <SheetDescription>
                {capitalize(formatCR(b.starts_at, "EEEE d 'de' MMMM"))} · {formatTimeCR(b.starts_at)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-5 py-6">
              <figure className="overflow-hidden rounded-lg border border-accent/45 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- en producción será una URL firmada de Storage */}
                <img src={b.reference_image_url} alt={`Diseño de referencia de ${b.client_first_name}`} className="aspect-square w-full object-cover" />
                {b.notes && <figcaption className="border-t border-border bg-card px-4 py-3 text-sm">{b.notes}</figcaption>}
              </figure>

              <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[0.9375rem]">
                <dt className="text-muted-foreground">WhatsApp</dt>
                <dd>
                  <a
                    href={`https://wa.me/506${b.client_whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tabular inline-flex items-center gap-1.5 text-primary underline underline-offset-4 hover:no-underline"
                  >
                    <MessageCircle aria-hidden className="size-4" strokeWidth={1.5} />
                    {formatWhatsApp(b.client_whatsapp)}
                    <span className="sr-only"> (abre WhatsApp)</span>
                  </a>
                </dd>
                {b.client_email && (
                  <>
                    <dt className="text-muted-foreground">Correo</dt>
                    <dd className="break-all">{b.client_email}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Lugar</dt>
                <dd>{locations.find((l) => l.id === b.location_id)?.name ?? "—"}</dd>
                <dt className="text-muted-foreground">Artista</dt>
                <dd>{artists.find((a) => a.id === b.artist_id)?.full_name ?? "—"}</dd>
                <dt className="text-muted-foreground">Tamaño</dt>
                <dd>{size?.label ?? "—"}</dd>
                <dt className="text-muted-foreground">Piel</dt>
                <dd>{b.allergies ?? "Sin alergias indicadas"}</dd>
              </dl>

              <div className="rounded-lg border border-accent/45 bg-card p-4">
                <BrandLabel as="span" className="text-[0.75rem]">
                  Rango estimado
                </BrandLabel>
                <p className="tabular mt-1 font-display text-2xl">{formatCRCRange(b.estimated_price_min, b.estimated_price_max)}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="detalle-estado">Estado</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
                    <SelectTrigger id="detalle-estado" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="detalle-precio">Precio final</Label>
                  <div className="flex h-11 items-stretch overflow-hidden rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
                    <span aria-hidden className="flex items-center border-r border-border bg-muted/60 px-3 text-muted-foreground">
                      ₡
                    </span>
                    <input
                      id="detalle-precio"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder={String(b.estimated_price_min)}
                      aria-invalid={!!error || undefined}
                      aria-describedby={error ? "detalle-precio-error" : undefined}
                      className="tabular min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <FieldError id="detalle-precio" message={error} className="sm:col-span-2" />
              </div>
            </div>

            <SheetFooter className="sticky bottom-0 border-t border-border bg-card px-5 py-4">
              <ActionButton state={state} onClick={() => void save()} successLabel="Guardado" className="w-full">
                Guardar cambios
              </ActionButton>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
