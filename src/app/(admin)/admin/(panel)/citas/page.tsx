import type { Metadata } from "next"
import { Suspense } from "react"
import { connection } from "next/server"
import type { BookingStatus } from "@/types/database"
import { getAllArtists, getAllSizeOptions, getBookings, getLocations, type BookingFilters as Filters } from "@/lib/data"
import { PageHeader } from "@/components/admin/page-header"
import { BookingFilters } from "@/components/bookings/booking-filters"
import { BookingsView } from "@/components/bookings/bookings-view"
import { TableSkeleton } from "@/components/admin/table-skeleton"
import { DATE_PRESETS, STATUS_ORDER, type DatePreset } from "@/lib/domain"
import { addDaysISO, mondayOf, todayCR } from "@/lib/format"

export const metadata: Metadata = { title: "Citas" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function CitasPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Citas" description="Confirmá por WhatsApp, fijá el precio final y llevá el estado de cada cita." />
      <Suspense fallback={<TableSkeleton />}>
        <CitasLoader searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined
}

function dateRange(preset: DatePreset): Pick<Filters, "from" | "to"> {
  const today = todayCR()
  switch (preset) {
    case "hoy":
      return { from: today, to: today }
    case "semana": {
      const monday = mondayOf(today)
      return { from: monday, to: addDaysISO(monday, 6) }
    }
    case "pasadas":
      return { to: addDaysISO(today, -1) }
    case "todas":
      return {}
    default:
      return { from: today }
  }
}

async function CitasLoader({ searchParams }: { searchParams: SearchParams }) {
  await connection()
  const sp = await searchParams
  const estado = STATUS_ORDER.includes(str(sp.estado) as BookingStatus) ? (str(sp.estado) as BookingStatus) : "todas"
  const artista = str(sp.artista) ?? "todas"
  const lugar = str(sp.lugar) ?? "todos"
  const fecha = (DATE_PRESETS.find((d) => d.value === str(sp.fecha))?.value ?? "proximas") as DatePreset

  const [bookings, artists, locations, sizes] = await Promise.all([
    getBookings({ status: estado, artist_id: artista, location_id: lugar, ...dateRange(fecha) }),
    getAllArtists(),
    getLocations(),
    getAllSizeOptions(),
  ])
  const slimArtists = artists.map(({ id, full_name }) => ({ id, full_name }))

  return (
    <>
      <BookingFilters artists={slimArtists} locations={locations} values={{ estado, artista, lugar, fecha }} />
      <BookingsView
        bookings={fecha === "pasadas" ? [...bookings].reverse() : bookings}
        artists={slimArtists}
        locations={locations}
        sizes={sizes}
      />
    </>
  )
}
