import { Skeleton } from "@/components/ui/skeleton"
import { Logo } from "@/components/brand/logo"

export function BookingSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Cargando el formulario de reserva"
      className="mx-auto grid w-full max-w-6xl gap-x-16 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-10"
    >
      <div className="flex flex-col items-center gap-4 pt-8 pb-6 lg:h-dvh lg:items-start lg:justify-center">
        <Logo size="sm" className="lg:hidden" />
        <Logo size="lg" className="hidden lg:inline-flex" />
        <Skeleton className="mt-4 h-10 w-56 lg:h-14 lg:w-80" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-8 hidden h-64 w-full max-w-sm lg:block" />
      </div>
      <div className="flex flex-col gap-6 lg:py-16">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="mt-4 h-10 w-48" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    </div>
  )
}
