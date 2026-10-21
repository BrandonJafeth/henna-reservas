import type { Metadata } from "next"
import { Suspense } from "react"
import { connection } from "next/server"
import {
  getAllArtists,
  getAvailabilityOverrides,
  getBookings,
  getCurrentProfile,
  getLocations,
  getWeeklyAvailability,
} from "@/lib/data"
import { PageHeader } from "@/components/admin/page-header"
import { AvailabilityManager } from "@/components/availability/availability-manager"
import { AvailabilitySkeleton } from "@/components/availability/availability-skeleton"
import { addDaysISO, todayCR } from "@/lib/format"

export const metadata: Metadata = { title: "Disponibilidad" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function DisponibilidadPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Disponibilidad"
        description="Definí cuándo y dónde se puede reservar. El formulario público solo ofrece horas dentro de estos bloques."
      />
      <Suspense fallback={<AvailabilitySkeleton />}>
        <AvailabilityLoader searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function AvailabilityLoader({ searchParams }: { searchParams: SearchParams }) {
  await connection()
  const [sp, profile, artists, locations] = await Promise.all([
    searchParams,
    getCurrentProfile(),
    getAllArtists(),
    getLocations(),
  ])
  const requested = typeof sp.artista === "string" ? sp.artista : undefined
  const artistId =
    profile.role === "admin" && requested && artists.some((a) => a.id === requested) ? requested : profile.id
  const today = todayCR()
  const range = { from: addDaysISO(today, -28), to: addDaysISO(today, 60) }
  // Se traen las de todas las artistas para la vista conjunta del calendario
  // (dos artistas pueden atender en el mismo lugar el mismo día).
  const [allWeekly, allOverrides, allBookings] = await Promise.all([
    getWeeklyAvailability(),
    getAvailabilityOverrides(),
    getBookings(range),
  ])
  const weekly = allWeekly.filter((w) => w.artist_id === artistId)
  const overrides = allOverrides.filter((o) => o.artist_id === artistId)
  const bookings = allBookings.filter((b) => b.artist_id === artistId)
  return (
    <AvailabilityManager
      profile={profile}
      artists={artists}
      artistId={artistId}
      locations={locations}
      weekly={weekly}
      overrides={overrides}
      bookings={bookings}
      team={profile.role === "admin" ? { weekly: allWeekly, overrides: allOverrides, bookings: allBookings } : null}
    />
  )
}
