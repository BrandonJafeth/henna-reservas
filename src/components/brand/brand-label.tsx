import { cn } from "@/lib/utils"

/** Etiqueta de marca en mayúsculas con tracking amplio (como "LISTA DE PRECIOS"). */
export function BrandLabel({
  children,
  className,
  as: Tag = "p",
  id,
}: {
  children: React.ReactNode
  className?: string
  as?: "p" | "span" | "h2" | "h3" | "dt"
  id?: string
}) {
  return (
    <Tag
      id={id}
      className={cn("font-sans text-[0.8125rem] font-medium uppercase tracking-[0.25em] text-primary", className)}
    >
      {children}
    </Tag>
  )
}
