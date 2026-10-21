import type { Metadata } from "next"
import { Suspense } from "react"
import { getAllArtists, getCashMovements, getLocations } from "@/lib/data"
import { PageHeader } from "@/components/admin/page-header"
import { TableSkeleton } from "@/components/admin/table-skeleton"
import { CashView } from "@/components/cash/cash-view"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = { title: "Caja" }

export default function CajaPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Caja" description="Ingresos y egresos del emprendimiento, por artista y lugar." />
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="col-span-2 h-28 lg:col-span-1" />
            </div>
            <TableSkeleton filters={false} />
          </div>
        }
      >
        <CajaLoader />
      </Suspense>
    </div>
  )
}

async function CajaLoader() {
  const [movements, artists, locations] = await Promise.all([getCashMovements(), getAllArtists(), getLocations()])
  return (
    <CashView
      movements={movements}
      artists={artists.map(({ id, full_name }) => ({ id, full_name }))}
      locations={locations}
    />
  )
}
