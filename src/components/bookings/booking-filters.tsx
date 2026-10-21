"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { X } from "lucide-react"
import type { Location, Profile } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DATE_PRESETS, STATUS_LABEL, STATUS_ORDER, type DatePreset } from "@/lib/domain"

export function BookingFilters({
  artists,
  locations,
  values,
}: {
  artists: Pick<Profile, "id" | "full_name">[]
  locations: Location[]
  values: { estado: string; artista: string; lugar: string; fecha: DatePreset }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()

  function set(key: string, value: string, fallback: string) {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    const q = next.toString()
    start(() => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false }))
  }

  const dirty = values.estado !== "todas" || values.artista !== "todas" || values.lugar !== "todos" || values.fecha !== "proximas"

  const fields = [
    {
      id: "f-estado",
      label: "Estado",
      value: values.estado,
      onChange: (v: string) => set("estado", v, "todas"),
      options: [{ value: "todas", label: "Todos los estados" }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))],
    },
    {
      id: "f-artista",
      label: "Artista",
      value: values.artista,
      onChange: (v: string) => set("artista", v, "todas"),
      options: [{ value: "todas", label: "Todas las artistas" }, ...artists.map((a) => ({ value: a.id, label: a.full_name }))],
    },
    {
      id: "f-lugar",
      label: "Lugar",
      value: values.lugar,
      onChange: (v: string) => set("lugar", v, "todos"),
      options: [{ value: "todos", label: "Todos los lugares" }, ...locations.map((l) => ({ value: l.id, label: l.name }))],
    },
    {
      id: "f-fecha",
      label: "Fecha",
      value: values.fecha,
      onChange: (v: string) => set("fecha", v, "proximas"),
      options: DATE_PRESETS.map((d) => ({ value: d.value, label: d.label })),
    },
  ]

  return (
    <div role="search" aria-label="Filtrar citas" aria-busy={pending || undefined} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
        {fields.map((f) => (
          <div key={f.id} className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={f.id} className="text-xs text-muted-foreground">
              {f.label}
            </Label>
            <Select value={f.value} onValueChange={f.onChange}>
              <SelectTrigger id={f.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {dirty && (
          <Button
            variant="ghost"
            className="col-span-2 justify-self-start lg:col-span-1"
            onClick={() => start(() => router.replace(pathname, { scroll: false }))}
          >
            <X strokeWidth={1.5} />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
