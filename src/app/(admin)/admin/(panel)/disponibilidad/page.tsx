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
  const [weekly, overrides, bookings] = await Promise.all([
    getWeeklyAvailability(artistId),
    getAvailabilityOverrides(artistId),
    getBookings({ artist_id: artistId, from: addDaysISO(today, -28), to: addDaysISO(today, 60) }),
  ])
  return (
    <AvailabilityManager
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
