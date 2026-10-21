"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus } from "lucide-react"
import { sileo } from "sileo"
import type { Location, Profile, Settings, SizeOption } from "@/types/database"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/brand/states"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { FieldError } from "@/components/booking/field-message"
import { saveArtist, saveLocation, saveSettings, saveSizeOption } from "@/lib/data/actions"
import { ROLE_LABEL } from "@/lib/domain"
import { formatCRCRange, formatDuration } from "@/lib/format"
import { sizeOptionSchema, type SizeOptionInput } from "@/lib/schemas"
import { cn } from "@/lib/utils"

function useAction() {
  const [state, setState] = useState<ActionState>("idle")
  async function run<T>(fn: () => Promise<{ ok: true; data: T } | { ok: false; message: string }>, success: string) {
    setState("loading")
    const res = await fn()
    if (!res.ok) {
      setState("idle")
      sileo.error({ title: "No se guardó", description: res.message })
      return false
    }
    setState("success")
    sileo.success({ title: success })
    setTimeout(() => setState("idle"), 1200)
    return true
  }
  return { state, run }
}

export function SettingsView({
  sizes,
  locations,
  artists,
  settings,
}: {
  sizes: SizeOption[]
  locations: Location[]
  artists: Profile[]
  settings: Settings
}) {
  return (
    <Tabs defaultValue="tamanos">
      <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
        <TabsTrigger value="tamanos">Tamaños y precios</TabsTrigger>
        <TabsTrigger value="lugares">Lugares</TabsTrigger>
        <TabsTrigger value="artistas">Artistas</TabsTrigger>
        <TabsTrigger value="reservas">Reservas</TabsTrigger>
      </TabsList>
      <TabsContent value="tamanos" className="mt-5">
        <SizesSettings sizes={sizes} />
      </TabsContent>
      <TabsContent value="lugares" className="mt-5">
        <LocationsSettings locations={locations} />
      </TabsContent>
      <TabsContent value="artistas" className="mt-5">
        <ArtistsSettings artists={artists} />
      </TabsContent>
      <TabsContent value="reservas" className="mt-5">
        <BookingRules settings={settings} />
      </TabsContent>
    </Tabs>
  )
}

/* ------------------------------ Tamaños ------------------------------ */

function cmLabel(s: SizeOption) {
  if (s.min_cm == null && s.max_cm == null) return "Sin medida"
  if (s.max_cm == null) return `${s.min_cm}+ cm`
  return `${s.min_cm ?? 0}–${s.max_cm} cm`
}

function SizesSettings({ sizes }: { sizes: SizeOption[] }) {
  const [editing, setEditing] = useState<Partial<SizeOption> | null>(null)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Los tamaños con cm forman el control deslizante del formulario. Los que no tienen cm (como “Mano completa”) aparecen como opción aparte.
        </p>
        <Button onClick={() => setEditing({})}>
          <Plus strokeWidth={1.5} />
          Nuevo tamaño
        </Button>
      </div>
      {sizes.length === 0 ? (
        <EmptyState illustration="hand" className="rounded-lg border border-dashed border-input" title="Sin tamaños" description="Agregá el primero para abrir las reservas." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-accent/45 bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Tamaño</TableHead>
                <TableHead>Medida</TableHead>
                <TableHead>Precio de referencia</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-5 text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((s) => (
                <TableRow key={s.id} className={cn(!s.is_active && "text-muted-foreground")}>
                  <TableCell className="pl-5 font-medium">{s.label}</TableCell>
                  <TableCell className="tabular">{cmLabel(s)}</TableCell>
                  <TableCell className="tabular">{formatCRCRange(s.price_min, s.price_max)}</TableCell>
                  <TableCell className="tabular">{formatDuration(s.duration_minutes)}</TableCell>
                  <TableCell>{s.is_active ? "Activo" : "Oculto"}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label={`Editar ${s.label}`}>
                      <Pencil strokeWidth={1.5} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <SizeDialog initial={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function SizeDialog({ initial, onClose }: { initial: Partial<SizeOption> | null; onClose: () => void }) {
  const { state, run } = useAction()
  const open = initial !== null
  const blank = (): SizeOptionInput => ({
    id: initial?.id,
    label: initial?.label ?? "",
    min_cm: initial?.min_cm ?? null,
    max_cm: initial?.max_cm ?? null,
    price_min: initial?.price_min ?? 0,
    price_max: initial?.price_max ?? 0,
    duration_minutes: initial?.duration_minutes ?? 30,
    is_active: initial?.is_active ?? true,
  })
  const form = useForm<SizeOptionInput>({ resolver: zodResolver(sizeOptionSchema), defaultValues: blank() })
  useEffect(() => {
    if (open) form.reset(blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reiniciar solo al abrir
  }, [open])
  const e = form.formState.errors
  const num = (name: "min_cm" | "max_cm" | "price_min" | "price_max" | "duration_minutes", nullable = false) =>
    form.register(name, { setValueAs: (v) => (v === "" || v == null ? (nullable ? null : 0) : Number(v)) })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={form.handleSubmit(async (v) => {
            if (await run(() => saveSizeOption(v), initial?.id ? "Tamaño actualizado" : "Tamaño agregado")) setTimeout(onClose, 500)
          })}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-medium">{initial?.id ? "Editar tamaño" : "Nuevo tamaño"}</DialogTitle>
            <DialogDescription>Los cambios se ven al instante en el formulario de reserva.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="t-nombre">Nombre visible</Label>
            <Input id="t-nombre" placeholder="7 a 10 cm" {...form.register("label")} aria-invalid={!!e.label || undefined} />
            <FieldError id="t-nombre" message={e.label?.message} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Medida en cm</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-min" className="text-xs text-muted-foreground">Desde</Label>
                <Input id="t-min" inputMode="numeric" {...num("min_cm", true)} aria-describedby="t-cm-hint" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-max" className="text-xs text-muted-foreground">Hasta</Label>
                <Input id="t-max" inputMode="numeric" {...num("max_cm", true)} aria-describedby="t-cm-hint" />
              </div>
            </div>
            <p id="t-cm-hint" className="text-xs text-muted-foreground">
              Dejá ambos vacíos para una opción sin medida. Dejá “Hasta” vacío para “más de”.
            </p>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-pmin">Precio mínimo (₡)</Label>
              <Input id="t-pmin" inputMode="numeric" className="tabular" {...num("price_min")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-pmax">Precio máximo (₡)</Label>
              <Input
                id="t-pmax"
                inputMode="numeric"
                className="tabular"
                {...num("price_max")}
                aria-invalid={!!e.price_max || undefined}
                aria-describedby={e.price_max ? "t-pmax-error" : undefined}
              />
              <FieldError id="t-pmax" message={e.price_max?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-dur">Duración (min)</Label>
              <Input id="t-dur" inputMode="numeric" className="tabular" {...num("duration_minutes")} />
              <FieldError id="t-dur" message={e.duration_minutes?.message} />
            </div>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <div className="flex h-11 items-center gap-3">
                  <Switch id="t-activo" checked={field.value} onCheckedChange={field.onChange} />
                  <Label htmlFor="t-activo">Visible al público</Label>
                </div>
              )}
            />
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancelar</Button>
            </DialogClose>
            <ActionButton type="submit" state={state} successLabel="Guardado" className="min-w-32">
              Guardar
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------ Lugares ------------------------------ */

function LocationsSettings({ locations }: { locations: Location[] }) {
  const [editing, setEditing] = useState<Partial<Location> | null>(null)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string>()
  const { state, run } = useAction()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronizar el formulario al abrir
    setName(editing?.name ?? "")
    setAddress(editing?.address ?? "")
    setError(undefined)
  }, [editing])

  async function toggle(l: Location, is_active: boolean) {
    await sileo.promise(
      saveLocation({ id: l.id, name: l.name, address: l.address, is_active }).then((r) => (r.ok ? r : Promise.reject(r))),
      {
        loading: { title: "Guardando…" },
        success: { title: is_active ? `${l.name} visible` : `${l.name} oculto` },
        error: { title: "No se pudo cambiar el lugar" },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">Un lugar oculto no aparece en el formulario, pero conserva sus citas.</p>
        <Button onClick={() => setEditing({})}>
          <Plus strokeWidth={1.5} />
          Nuevo lugar
        </Button>
      </div>
      {locations.length === 0 ? (
        <EmptyState illustration="branch" className="rounded-lg border border-dashed border-input" title="Sin lugares" description="Agregá dónde atienden para poder abrir horarios." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-accent/45 bg-card">
          {locations.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl">{l.name}</p>
                <p className="text-sm text-muted-foreground">{l.address ?? "Sin dirección"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch id={`lugar-${l.id}`} checked={l.is_active} onCheckedChange={(v) => void toggle(l, v)} />
                <Label htmlFor={`lugar-${l.id}`} className="text-sm">Visible</Label>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing(l)} aria-label={`Editar ${l.name}`}>
                <Pencil strokeWidth={1.5} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={async (ev) => {
              ev.preventDefault()
              if (name.trim().length < 2) {
                setError("Escribí el nombre del lugar")
                document.getElementById("l-nombre")?.focus()
                return
              }
              const ok = await run(
                () => saveLocation({ id: editing?.id, name, address: address || null, is_active: editing?.is_active ?? true }),
                editing?.id ? "Lugar actualizado" : "Lugar agregado",
              )
              if (ok) setTimeout(() => setEditing(null), 500)
            }}
          >
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-medium">{editing?.id ? "Editar lugar" : "Nuevo lugar"}</DialogTitle>
              <DialogDescription>Aparece como opción en el paso “Lugar y artista”.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="l-nombre">Nombre</Label>
              <Input
                id="l-nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? "l-nombre-error" : undefined}
              />
              <FieldError id="l-nombre" message={error} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="l-dir">
                Dirección <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="l-dir" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <ActionButton type="submit" state={state} successLabel="Guardado" className="min-w-32">
                Guardar
              </ActionButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------ Artistas ------------------------------ */

function ArtistsSettings({ artists }: { artists: Profile[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-xl text-sm text-muted-foreground">
        La comisión es el porcentaje de cada cita que le corresponde a la artista. Se usa en Caja para calcular pagos.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-accent/45 bg-card">
        {artists.map((a) => (
          <ArtistRow key={a.id} artist={a} />
        ))}
      </ul>
    </div>
  )
}

function ArtistRow({ artist }: { artist: Profile }) {
  const [pct, setPct] = useState(String(Math.round(artist.commission_rate * 100)))
  const [error, setError] = useState<string>()
  const { state, run } = useAction()
  const id = `com-${artist.id}`
  return (
    <li className="flex flex-wrap items-end gap-4 px-5 py-4">
      <div className="min-w-48 flex-1">
        <p className="font-display text-xl">{artist.full_name}</p>
        <p className="text-sm text-muted-foreground">{ROLE_LABEL[artist.role]}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id} className="text-xs text-muted-foreground">Comisión</Label>
        <div className="flex h-11 w-28 items-stretch overflow-hidden rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <input
            id={id}
            inputMode="numeric"
            value={pct}
            onChange={(e) => setPct(e.target.value.replace(/\D/g, "").slice(0, 3))}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="tabular min-w-0 flex-1 bg-transparent px-3 text-right text-base outline-none"
          />
          <span aria-hidden className="flex items-center border-l border-border bg-muted/60 px-3 text-muted-foreground">%</span>
        </div>
      </div>
      <ActionButton
        variant="outline"
        state={state}
        successLabel="Guardado"
        className="min-w-28"
        onClick={async () => {
          const n = Number(pct)
          if (!pct || n > 100) {
            setError("Escribí un porcentaje entre 0 y 100")
            return
          }
          setError(undefined)
          await run(() => saveArtist({ id: artist.id, commission_rate: n / 100, is_active: artist.is_active }), `Comisión de ${artist.full_name.split(" ")[0]} actualizada`)
        }}
      >
        Guardar
      </ActionButton>
      <FieldError id={id} message={error} className="w-full" />
    </li>
  )
}

/* --------------------------- Reglas de reserva --------------------------- */

function BookingRules({ settings }: { settings: Settings }) {
  const [values, setValues] = useState(settings)
  const { state, run } = useAction()
  const fields: { key: keyof Settings; label: string; unit: string; hint: string }[] = [
    { key: "booking_window_days", label: "Ventana de reserva", unit: "días", hint: "Hasta cuántos días hacia adelante se puede reservar." },
    { key: "min_notice_hours", label: "Anticipación mínima", unit: "horas", hint: "Tiempo mínimo entre la solicitud y la cita." },
    { key: "buffer_minutes", label: "Espacio entre citas", unit: "min", hint: "Minutos libres para limpiar y preparar." },
    { key: "slot_interval_minutes", label: "Intervalo de horas", unit: "min", hint: "Cada cuánto se ofrecen horas (p. ej. cada 30 min)." },
  ]
  return (
    <form
      noValidate
      className="flex max-w-2xl flex-col gap-6 rounded-lg border border-accent/45 bg-card p-5 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault()
        await run(() => saveSettings(values), "Reglas de reserva guardadas")
      }}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-2">
            <Label htmlFor={`r-${f.key}`}>{f.label}</Label>
            <div className="flex h-11 items-stretch overflow-hidden rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <input
                id={`r-${f.key}`}
                inputMode="numeric"
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: Number(e.target.value.replace(/\D/g, "") || 0) })}
                aria-describedby={`r-${f.key}-hint`}
                className="tabular min-w-0 flex-1 bg-transparent px-3.5 text-base outline-none"
              />
              <span aria-hidden className="flex items-center border-l border-border bg-muted/60 px-3 text-sm text-muted-foreground">
                {f.unit}
              </span>
            </div>
            <p id={`r-${f.key}-hint`} className="text-xs text-muted-foreground">
              {f.hint}
            </p>
          </div>
        ))}
      </div>
      <ActionButton type="submit" state={state} successLabel="Guardado" className="min-w-32 self-start">
        Guardar
      </ActionButton>
    </form>
  )
}
