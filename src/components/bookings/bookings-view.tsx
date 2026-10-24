"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import type { Booking, Location, Profile, SizeOption } from "@/types/database"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/brand/status-badge"
import { EmptyState } from "@/components/brand/states"
import { byId } from "@/lib/domain"
import { capitalize, formatCR, formatCRC, formatCRCRange, formatTimeCR } from "@/lib/format"
import { BookingDetail } from "./booking-detail"

export function BookingsView({
  bookings,
  artists,
  locations,
  sizes,
}: {
  bookings: Booking[]
  artists: Pick<Profile, "id" | "full_name">[]
  locations: Location[]
  sizes: SizeOption[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = bookings.find((b) => b.id === openId) ?? null
  const artist = byId(artists)
  const loc = byId(locations)
  const size = byId(sizes)

  if (bookings.length === 0) {
    return (
      <EmptyState
        illustration="calendar"
        className="rounded-lg border border-dashed border-input"
        title="No hay citas con estos filtros"
        description="Probá con otras fechas o limpiá los filtros para ver todas."
      />
    )
  }

  const price = (b: Booking) =>
    b.final_price != null ? formatCRC(b.final_price) : formatCRCRange(b.estimated_price_min, b.estimated_price_max)

  return (
    <>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {bookings.length} {bookings.length === 1 ? "cita" : "citas"}
      </p>

      {/* Escritorio */}
      <div className="hidden overflow-hidden rounded-lg border border-accent/45 bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tamaño</TableHead>
              <TableHead>Lugar</TableHead>
              <TableHead>Artista</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="pr-5">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id} className="group cursor-pointer" onClick={() => setOpenId(b.id)}>
                <TableCell className="pl-5">
                  <span className="tabular block">{capitalize(formatCR(b.starts_at, "EEE d MMM"))}</span>
                  <span className="tabular text-xs text-muted-foreground">{formatTimeCR(b.starts_at)}</span>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenId(b.id)
                    }}
                    className="min-h-6 text-left font-medium underline-offset-4 group-hover:underline"
                  >
                    {b.client_first_name} {b.client_last_name}
                    <span className="sr-only">, ver detalle</span>
                  </button>
                </TableCell>
                <TableCell>{size[b.size_option_id]?.label ?? "—"}</TableCell>
                <TableCell>{loc[b.location_id]?.name ?? "—"}</TableCell>
                <TableCell>{artist[b.artist_id]?.full_name ?? "—"}</TableCell>
                <TableCell className="tabular text-right">
                  {price(b)}
                  {b.final_price == null && <span className="block text-xs text-muted-foreground">estimado</span>}
                </TableCell>
                <TableCell className="pr-5">
                  <StatusBadge status={b.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Celular */}
      <ul className="flex flex-col gap-2.5 md:hidden">
        {bookings.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setOpenId(b.id)}
              className="flex w-full items-center gap-4 rounded-lg border border-accent/45 bg-card p-4 text-left transition-colors hover:border-primary"
            >
              <span className="flex w-12 shrink-0 flex-col items-center leading-none">
                <span className="text-[0.6875rem] tracking-[0.15em] text-muted-foreground uppercase">{formatCR(b.starts_at, "MMM")}</span>
                <span className="tabular font-display text-[1.75rem]">{formatCR(b.starts_at, "d")}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-medium">
                  {b.client_first_name} {b.client_last_name}
                </span>
                <span className="tabular truncate text-sm text-muted-foreground">
                  {formatTimeCR(b.starts_at)} · {loc[b.location_id]?.name} · {size[b.size_option_id]?.label}
                </span>
                <StatusBadge status={b.status} className="mt-1 w-fit" />
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </li>
        ))}
      </ul>

      <BookingDetail
        booking={open}
        onOpenChange={(o) => !o && setOpenId(null)}
        artists={artists}
        locations={locations}
        sizes={sizes}
      />
    </>
  )
}
