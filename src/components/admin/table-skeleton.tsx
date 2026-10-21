import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton({ rows = 6, filters = true }: { rows?: number; filters?: boolean }) {
  return (
    <div aria-busy aria-label="Cargando" className="flex flex-col gap-4">
      {filters && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      )}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-9 w-14" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
