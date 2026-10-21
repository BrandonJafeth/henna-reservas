import type { BookingStatus } from "@/types/database"
import { STATUS_LABEL } from "@/lib/domain"
import { cn } from "@/lib/utils"

const tone: Record<BookingStatus, string> = {
  pendiente: "text-warning border-warning/45",
  confirmada: "text-success border-success/45",
  completada: "text-primary border-primary/40",
  cancelada: "text-destructive border-destructive/45",
  no_show: "text-muted-foreground border-input/70",
}

/** Badge de estado. El texto lleva el significado; el punto y el color lo refuerzan. */
export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border bg-transparent px-2 text-xs font-medium",
        tone[status],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "no_show" || status === "cancelada" ? "border border-current" : "bg-current",
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  )
}
