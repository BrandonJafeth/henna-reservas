import { Skeleton } from "@/components/ui/skeleton"

export function AvailabilitySkeleton() {
  return (
    <div aria-busy aria-label="Cargando disponibilidad" className="flex flex-col gap-4">
      <Skeleton className="h-11 w-full max-w-md" />
      <Skeleton className="h-4 w-80" />
      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-5 px-5 py-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
