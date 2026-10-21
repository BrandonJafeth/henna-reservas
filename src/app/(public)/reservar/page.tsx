import type { Metadata } from "next"
import { Suspense } from "react"
import { getArtistIdsByLocation, getArtists, getLocations, getSettings, getSizeOptions } from "@/lib/data"
import { BookingWizard } from "@/components/booking/booking-wizard"
import { BookingSkeleton } from "@/components/booking/booking-skeleton"

export const metadata: Metadata = {
  title: "Reservá tu cita",
}

export default function ReservarPage() {
  return (
    <main id="contenido" className="min-h-dvh">
      <Suspense fallback={<BookingSkeleton />}>
        <BookingLoader />
      </Suspense>
    </main>
  )
}

async function BookingLoader() {
  const [sizes, locations, artists, artistsByLocation, settings] = await Promise.all([
    getSizeOptions(),
    getLocations(),
    getArtists(),
    getArtistIdsByLocation(),
    getSettings(),
  ])
  return (
    <BookingWizard
      catalog={{
        sizes,
        locations,
        artists: artists.map(({ id, full_name }) => ({ id, full_name })),
        artistsByLocation,
        settings,
      }}
    />
  )
}
