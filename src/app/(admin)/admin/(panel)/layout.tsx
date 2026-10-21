import { Suspense } from "react"
import { getCurrentProfile } from "@/lib/data"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminBottomNav, AdminSidebar, AdminTopBar } from "@/components/admin/admin-shell"

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:outline-2 focus:outline-ring"
      >
        Saltar al contenido
      </a>
      <Suspense fallback={<ChromeSkeleton />}>
        <Chrome />
      </Suspense>
      <SidebarInset className="min-w-0 bg-background">
        <Suspense fallback={<div className="h-14 md:h-12" />}>
          <TopBar />
        </Suspense>
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 md:pt-4 md:pb-16 lg:px-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

async function Chrome() {
  const profile = await getCurrentProfile()
  return (
    <>
      <AdminSidebar profile={profile} />
      <AdminBottomNav profile={profile} />
    </>
  )
}

async function TopBar() {
  const profile = await getCurrentProfile()
  return <AdminTopBar profile={profile} />
}

function ChromeSkeleton() {
  return (
    <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-border bg-sidebar p-4 md:flex">
      <Skeleton className="mx-auto h-12 w-28" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
