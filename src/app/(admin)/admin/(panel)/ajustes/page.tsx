import type { Metadata } from "next"
import { Suspense } from "react"
import { getAllArtists, getAllLocations, getAllSizeOptions, getCurrentProfile, getSettings } from "@/lib/data"
import { PageHeader } from "@/components/admin/page-header"
import { TableSkeleton } from "@/components/admin/table-skeleton"
import { EmptyState } from "@/components/brand/states"
import { SettingsView } from "@/components/settings/settings-view"

export const metadata: Metadata = { title: "Ajustes" }

export default function AjustesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ajustes" description="Precios, lugares, artistas y reglas del formulario de reserva." />
      <Suspense fallback={<TableSkeleton filters={false} rows={5} />}>
        <AjustesLoader />
      </Suspense>
    </div>
  )
}

async function AjustesLoader() {
  const profile = await getCurrentProfile()
  if (profile.role !== "admin") {
    return (
      <EmptyState
        illustration="branch"
        title="Solo la admin puede cambiar ajustes"
        description="Si necesitás cambiar un precio o un lugar, pedíselo a la admin."
      />
    )
  }
  const [sizes, locations, artists, settings] = await Promise.all([
    getAllSizeOptions(),
    getAllLocations(),
    getAllArtists(),
    getSettings(),
  ])
  return <SettingsView sizes={sizes} locations={locations} artists={artists} settings={settings} />
}
