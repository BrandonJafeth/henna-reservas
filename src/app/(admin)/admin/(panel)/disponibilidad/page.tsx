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
import { AvailabilityPlanner } from "@/components/availability/availability-planner"
import { AvailabilitySkeleton } from "@/components/availability/availability-skeleton"
import { addDaysISO, todayCR } from "@/lib/format"

export const metadata: Metadata = { title: "Disponibilidad" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function DisponibilidadPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Disponibilidad"
        description="Elegí días en el calendario y dales horario. El formulario público solo ofrece horas dentro de estos horarios."
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
  // La admin recibe a todas las artistas para la vista conjunta
  // (dos artistas pueden atender en el mismo lugar el mismo día).
  const scope = profile.role === "admin" ? undefined : artistId
  const [weekly, overrides, bookings] = await Promise.all([
    getWeeklyAvailability(scope),
    getAvailabilityOverrides(scope),
    getBookings({ from: addDaysISO(today, -35), to: addDaysISO(today, 150), artist_id: scope }),
  ])
  return (
    <AvailabilityPlanner
      profile={profile}
      artists={artists}
      artistId={artistId}
      locations={locations}
      weekly={weekly}
      overrides={overrides}
      bookings={bookings}
    />
  )
}
