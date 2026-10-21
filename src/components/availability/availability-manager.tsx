"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Copy, Plus } from "lucide-react"
import { sileo } from "sileo"
import type { AvailabilityOverride, Booking, Location, Profile, WeeklyAvailability } from "@/types/database"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EmptyState } from "@/components/brand/states"
import { copyPreviousWeekOverrides, deleteOverride, deleteWeeklyBlock } from "@/lib/data/actions"
import { WEEKDAYS } from "@/lib/domain"
import { addDaysISO, capitalize, formatCR, formatTimeOfDay, mondayOf, todayCR } from "@/lib/format"
import { BlockDialog } from "./block-dialog"
import { OverrideDialog } from "./override-dialog"
import { OverridesList } from "./overrides-list"
import { WeekCalendar } from "./week-calendar"
import { WeeklySchedule } from "./weekly-schedule"

type Confirm =
  | { kind: "block"; row: WeeklyAvailability }
  | { kind: "override"; row: AvailabilityOverride }
  | { kind: "copy" }
  | null

export function AvailabilityManager({
  profile,
  artists,
  artistId,
  locations,
  weekly,
  overrides,
  bookings,
}: {
  profile: Profile
  artists: Profile[]
  artistId: string
  locations: Location[]
  weekly: WeeklyAvailability[]
  overrides: AvailabilityOverride[]
  bookings: Booking[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pendingArtist, startArtist] = useTransition()
  const [tab, setTab] = useState("semanal")
  const [blockDialog, setBlockDialog] = useState<Partial<WeeklyAvailability> | null>(null)
  const [overrideDialog, setOverrideDialog] = useState<Partial<AvailabilityOverride> | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

  const thisWeek = mondayOf(todayCR())
  const prevWeekLabel = `${formatCR(addDaysISO(thisWeek, -7), "d MMM")} – ${formatCR(addDaysISO(thisWeek, -1), "d MMM")}`
  const thisWeekLabel = `${formatCR(thisWeek, "d MMM")} – ${formatCR(addDaysISO(thisWeek, 6), "d MMM")}`

  function changeArtist(id: string) {
    const next = new URLSearchParams(params)
    next.set("artista", id)
    startArtist(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
  }

  async function runConfirm() {
    if (!confirm) return
    if (confirm.kind === "block") {
      const r = confirm.row
      await sileo.promise(deleteWeeklyBlock(r.id).then((res) => (res.ok ? res : Promise.reject(res))), {
        loading: { title: "Eliminando bloque…" },
        success: { title: "Bloque eliminado" },
        error: { title: "No se pudo eliminar el bloque" },
      })
    } else if (confirm.kind === "override") {
      await sileo.promise(deleteOverride(confirm.row.id).then((res) => (res.ok ? res : Promise.reject(res))), {
        loading: { title: "Eliminando excepción…" },
        success: { title: "Excepción eliminada" },
        error: { title: "No se pudo eliminar la excepción" },
      })
    } else {
      const res = await copyPreviousWeekOverrides(artistId, thisWeek)
      if (res.ok) {
        if (res.data.copied) sileo.success({ title: `Copiamos ${res.data.copied} ${res.data.copied === 1 ? "excepción" : "excepciones"}` })
        else sileo.info({ title: "No había nada nuevo para copiar", description: "La semana anterior no tenía excepciones o ya estaban copiadas." })
      } else sileo.error({ title: "No se pudo copiar la semana", description: res.message })
    }
  }

  const confirmCopy =
    confirm?.kind === "block"
      ? {
          title: "¿Eliminar este bloque?",
          body: `${WEEKDAYS.find((d) => d.value === confirm.row.weekday)?.label}, ${formatTimeOfDay(confirm.row.start_time)} – ${formatTimeOfDay(confirm.row.end_time)}. Las citas ya agendadas no se borran.`,
          action: "Eliminar",
        }
      : confirm?.kind === "override"
        ? {
            title: "¿Eliminar esta excepción?",
            body: `${capitalize(formatCR(confirm.row.date, "EEEE d 'de' MMMM"))} vuelve al horario semanal.`,
            action: "Eliminar",
          }
        : {
            title: "Copiar semana anterior",
            body: `Copiamos las excepciones del ${prevWeekLabel} a esta semana (${thisWeekLabel}). Las fechas que ya tienen una excepción no se tocan.`,
            action: "Copiar",
          }

  const artistName = artists.find((a) => a.id === artistId)?.full_name

  return (
    <div className="flex flex-col gap-6" aria-busy={pendingArtist || undefined}>
      {profile.role === "admin" && artists.length > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Label htmlFor="disp-artista" className="text-sm text-muted-foreground">
            Horario de
          </Label>
          <Select value={artistId} onValueChange={changeArtist}>
            <SelectTrigger id="disp-artista" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {artists.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {locations.length === 0 ? (
        <EmptyState
          illustration="branch"
          title="Primero agregá un lugar"
          description="Los bloques de horario necesitan un lugar. Podés crearlos en Ajustes."
        />
      ) : (
        <Tabs value={tab} onValueChange={setTab} className={pendingArtist ? "opacity-60 transition-opacity" : undefined}>
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="semanal">Horario semanal</TabsTrigger>
            <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
          </TabsList>

          <TabsContent value="semanal" className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Bloques que se repiten cada semana{artistName ? ` para ${artistName}` : ""}. Las clientas solo ven horas dentro de estos bloques.
            </p>
            <WeeklySchedule
              weekly={weekly}
              locations={locations}
              onAdd={(weekday) => setBlockDialog({ weekday })}
              onEdit={(b) => setBlockDialog(b)}
              onDelete={(b) => setConfirm({ kind: "block", row: b })}
            />
          </TabsContent>

          <TabsContent value="excepciones" className="mt-4">
            <OverridesList
              overrides={overrides}
              locations={locations}
              onEdit={(o) => setOverrideDialog(o)}
              onDelete={(o) => setConfirm({ kind: "override", row: o })}
              actions={
                <>
                  <Button variant="outline" onClick={() => setConfirm({ kind: "copy" })}>
                    <Copy strokeWidth={1.5} />
                    Copiar semana anterior
                  </Button>
                  <Button onClick={() => setOverrideDialog({})}>
                    <Plus strokeWidth={1.5} />
                    Nueva excepción
                  </Button>
                </>
              }
            />
          </TabsContent>

          <TabsContent value="calendario" className="mt-4">
            <WeekCalendar
              weekly={weekly}
              overrides={overrides}
              bookings={bookings}
              locations={locations}
              onEditWeekly={(w) => setBlockDialog(w)}
              onEditOverride={(o) => setOverrideDialog(o)}
              onAddOverride={(date) => setOverrideDialog({ date, is_day_off: false })}
            />
          </TabsContent>
        </Tabs>
      )}

      <BlockDialog
        open={blockDialog !== null}
        onOpenChange={(o) => !o && setBlockDialog(null)}
        artistId={artistId}
        locations={locations}
        initial={blockDialog}
      />
      <OverrideDialog
        open={overrideDialog !== null}
        onOpenChange={(o) => !o && setOverrideDialog(null)}
        artistId={artistId}
        locations={locations}
        initial={overrideDialog}
      />

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-medium">{confirmCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void runConfirm()}
              className={confirm?.kind === "copy" ? undefined : "bg-destructive text-primary-foreground hover:bg-destructive/90"}
            >
              {confirmCopy.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
