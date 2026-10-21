import { cn } from "@/lib/utils"

/** Separador de la marca: —— • —— */
export function Ornament({ className, width = "md" }: { className?: string; width?: "sm" | "md" | "full" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center gap-3 text-accent",
        width === "sm" && "w-24",
        width === "md" && "w-44",
        width === "full" && "w-full",
        className,
      )}
    >
      <span className="h-px flex-1 bg-current opacity-70" />
      <span className="size-1.5 rounded-full bg-current" />
      <span className="h-px flex-1 bg-current opacity-70" />
    </div>
  )
}
