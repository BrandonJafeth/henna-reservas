"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { CalendarDays, List } from "lucide-react"
import { cn } from "@/lib/utils"

export type BookingsViewMode = "lista" | "calendario"

/** Cambia entre lista y calendario. Es navegación (cambia ?vista=), por eso son enlaces. */
export function BookingsViewSwitch({ value }: { value: BookingsViewMode }) {
  const pathname = usePathname()
  const params = useSearchParams()

  const href = (v: BookingsViewMode) => {
    const next = new URLSearchParams(params)
    if (v === "lista") next.delete("vista")
    else next.set("vista", v)
    const q = next.toString()
    return q ? `${pathname}?${q}` : pathname
  }

  const items = [
    { v: "lista" as const, label: "Lista", icon: List },
    { v: "calendario" as const, label: "Calendario", icon: CalendarDays },
  ]

  return (
    <nav aria-label="Forma de ver las citas" className="inline-flex h-11 w-fit items-center rounded-lg bg-muted p-[3px]">
      {items.map(({ v, label, icon: Icon }) => {
        const on = v === value
        return (
          <Link
            key={v}
            href={href(v)}
            scroll={false}
            replace
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md border px-4 text-[0.9375rem] font-medium transition-colors",
              on ? "border-accent/45 bg-card text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-4" strokeWidth={1.5} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
