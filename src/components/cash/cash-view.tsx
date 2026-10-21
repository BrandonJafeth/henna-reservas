"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react"
import { sileo } from "sileo"
import type { CashMovement, CashMovementType, Location, Profile } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { BrandLabel } from "@/components/brand/brand-label"
import { EmptyState } from "@/components/brand/states"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { AnimatedCRC } from "@/components/shared/animated-money"
import { FieldError } from "@/components/booking/field-message"
import { createCashMovement } from "@/lib/data/actions"
import { byId } from "@/lib/domain"
import { cashMovementSchema, type CashMovementInput } from "@/lib/schemas"
import { capitalize, formatCR, formatCRC, todayCR } from "@/lib/format"
import { cn } from "@/lib/utils"

const NONE = "ninguno"

export function CashView({
  movements,
  artists,
  locations,
}: {
  movements: CashMovement[]
  artists: Pick<Profile, "id" | "full_name">[]
  locations: Location[]
}) {
  const [filter, setFilter] = useState<"todos" | CashMovementType>("todos")
  const [dialog, setDialog] = useState(false)
  const artist = byId(artists)
  const loc = byId(locations)

  const ingresos = movements.filter((m) => m.type === "ingreso").reduce((s, m) => s + m.amount, 0)
  const egresos = movements.filter((m) => m.type === "egreso").reduce((s, m) => s + m.amount, 0)
  const rows = filter === "todos" ? movements : movements.filter((m) => m.type === filter)

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-accent/45 bg-card p-5">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowDownLeft aria-hidden className="size-4 text-success" strokeWidth={1.5} />
            Ingresos
          </dt>
          <dd className="mt-2 font-display text-[1.75rem] leading-none sm:text-[2rem]">
            <AnimatedCRC amount={ingresos} />
          </dd>
        </div>
        <div className="rounded-lg border border-accent/45 bg-card p-5">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUpRight aria-hidden className="size-4 text-destructive" strokeWidth={1.5} />
            Egresos
          </dt>
          <dd className="mt-2 font-display text-[1.75rem] leading-none sm:text-[2rem]">
            <AnimatedCRC amount={egresos} />
          </dd>
        </div>
        <div className="col-span-2 rounded-lg border border-primary/50 bg-muted/50 p-5 lg:col-span-1">
          <dt>
            <BrandLabel as="span" className="text-[0.75rem]">
              Saldo de caja
            </BrandLabel>
          </dt>
          <dd className={cn("mt-2 font-display text-[2.25rem] leading-none", ingresos - egresos < 0 && "text-destructive")}>
            <AnimatedCRC amount={ingresos - egresos} />
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList aria-label="Tipo de movimiento">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="ingreso">Ingresos</TabsTrigger>
            <TabsTrigger value="egreso">Egresos</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setDialog(true)}>
          <Plus strokeWidth={1.5} />
          Nuevo movimiento
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          illustration="ledger"
          className="rounded-lg border border-dashed border-input"
          title="Todavía no hay movimientos"
          description="Registrá ingresos y egresos para ver el saldo de caja."
          action={
            <Button variant="outline" onClick={() => setDialog(true)}>
              <Plus strokeWidth={1.5} />
              Nuevo movimiento
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-accent/45 bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Artista</TableHead>
                  <TableHead>Lugar</TableHead>
                  <TableHead className="pr-5 text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tabular pl-5">{capitalize(formatCR(m.date, "d MMM"))}</TableCell>
                    <TableCell className="max-w-72 truncate">{m.concept}</TableCell>
                    <TableCell>
                      <TypeTag type={m.type} />
                    </TableCell>
                    <TableCell>{m.artist_id ? artist[m.artist_id]?.full_name : "—"}</TableCell>
                    <TableCell>{m.location_id ? loc[m.location_id]?.name : "—"}</TableCell>
                    <TableCell className={cn("tabular pr-5 text-right font-medium", m.type === "egreso" && "text-destructive")}>
                      {m.type === "egreso" ? "−" : "+"}
                      {formatCRC(m.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-accent/45 bg-card md:hidden">
            {rows.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate">{m.concept}</span>
                  <span className="tabular text-xs text-muted-foreground">
                    {capitalize(formatCR(m.date, "d MMM"))}
                    {m.artist_id && ` · ${artist[m.artist_id]?.full_name}`}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn("tabular font-medium", m.type === "egreso" && "text-destructive")}>
                    {m.type === "egreso" ? "−" : "+"}
                    {formatCRC(m.amount)}
                  </span>
                  <TypeTag type={m.type} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <MovementDialog open={dialog} onOpenChange={setDialog} artists={artists} locations={locations} />
    </div>
  )
}

function TypeTag({ type }: { type: CashMovementType }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm border px-2 text-xs font-medium",
        type === "ingreso" ? "border-success/45 text-success" : "border-destructive/45 text-destructive",
      )}
    >
      {type === "ingreso" ? "Ingreso" : "Egreso"}
    </span>
  )
}

function MovementDialog({
  open,
  onOpenChange,
  artists,
  locations,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  artists: Pick<Profile, "id" | "full_name">[]
  locations: Location[]
}) {
  const [state, setState] = useState<ActionState>("idle")
  const blank = (): CashMovementInput => ({
    type: "ingreso",
    concept: "",
    amount: "" as unknown as number,
    date: todayCR(),
    artist_id: null,
    location_id: null,
  })
  const form = useForm<CashMovementInput>({ resolver: zodResolver(cashMovementSchema), defaultValues: blank() })

  // Reiniciar al abrir: el estado del botón se ajusta en render, el formulario en efecto.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setState("idle")
  }
  useEffect(() => {
    if (open) form.reset(blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reiniciar solo al abrir
  }, [open])

  async function onSubmit(values: CashMovementInput) {
    setState("loading")
    const res = await createCashMovement(values)
    if (!res.ok) {
      setState("idle")
      sileo.error({ title: "No se guardó el movimiento", description: res.message })
      return
    }
    setState("success")
    sileo.success({
      title: res.data.type === "ingreso" ? "Ingreso registrado" : "Egreso registrado",
      description: `${res.data.concept} · ${formatCRC(res.data.amount)}`,
    })
    setTimeout(() => onOpenChange(false), 500)
  }

  const e = form.formState.errors
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-medium">Nuevo movimiento</DialogTitle>
            <DialogDescription>Registrá un ingreso o un egreso de la caja.</DialogDescription>
          </DialogHeader>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Tipo</legend>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(["ingreso", "egreso"] as const).map((t) => (
                    <label
                      key={t}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                        field.value === t ? "border-primary bg-muted/60" : "border-input bg-card",
                      )}
                    >
                      <input
                        type="radio"
                        name="mov-tipo"
                        value={t}
                        checked={field.value === t}
                        onChange={() => field.onChange(t)}
                        className="size-4 accent-primary"
                      />
                      {t === "ingreso" ? "Ingreso" : "Egreso"}
                    </label>
                  ))}
                </div>
              )}
            />
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mov-concepto">Concepto</Label>
            <Input
              id="mov-concepto"
              placeholder="Tinta de jagua, cita, alquiler…"
              {...form.register("concept")}
              aria-invalid={!!e.concept || undefined}
              aria-describedby={e.concept ? "mov-concepto-error" : undefined}
            />
            <FieldError id="mov-concepto" message={e.concept?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mov-monto">Monto (₡)</Label>
              <Input
                id="mov-monto"
                inputMode="numeric"
                className="tabular"
                {...form.register("amount")}
                aria-invalid={!!e.amount || undefined}
                aria-describedby={e.amount ? "mov-monto-error" : undefined}
              />
              <FieldError id="mov-monto" message={e.amount?.message} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mov-fecha">Fecha</Label>
              <Input id="mov-fecha" type="date" {...form.register("date")} />
              <FieldError id="mov-fecha" message={e.date?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { name: "artist_id", id: "mov-artista", label: "Artista", options: artists.map((a) => ({ v: a.id, l: a.full_name })) },
                { name: "location_id", id: "mov-lugar", label: "Lugar", options: locations.map((l) => ({ v: l.id, l: l.name })) },
              ] as const
            ).map((f) => (
              <div key={f.id} className="flex flex-col gap-2">
                <Label htmlFor={f.id}>
                  {f.label} <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Controller
                  control={form.control}
                  name={f.name}
                  render={({ field }) => (
                    <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                      <SelectTrigger id={f.id} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Ninguno</SelectItem>
                        {f.options.map((o) => (
                          <SelectItem key={o.v} value={o.v}>
                            {o.l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
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
