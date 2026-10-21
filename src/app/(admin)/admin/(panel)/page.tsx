import type { Metadata } from "next"
import { Suspense } from "react"
import { connection } from "next/server"
import { getAllArtists, getBookings, getCurrentProfile, getDashboardSummary, getLocations } from "@/lib/data"
import { PageHeader } from "@/components/admin/page-header"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { Skeleton } from "@/components/ui/skeleton"
import { capitalize, formatCR, todayCR } from "@/lib/format"

export const metadata: Metadata = { title: "Inicio" }

export default function InicioPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <InicioLoader />
    </Suspense>
  )
}

async function InicioLoader() {
  await connection()
  const today = todayCR()
  const [profile, summary, todays, artists, locations] = await Promise.all([
    getCurrentProfile(),
    getDashboardSummary(),
    getBookings({ from: today, to: today }),
    getAllArtists(),
    getLocations(),
  ])
  const firstName = profile.full_name.split(" ")[0]
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Hola, ${firstName}`} description={capitalize(formatCR(today, "EEEE d 'de' MMMM"))} />
      <DashboardView
        summary={summary}
        today={todays.filter((b) => b.status !== "cancelada")}
        artists={artists.map(({ id, full_name }) => ({ id, full_name }))}
        locations={locations}
      />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-busy aria-label="Cargando inicio" className="flex flex-col gap-8">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-10 lg:grid-cols-[7fr_5fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}
