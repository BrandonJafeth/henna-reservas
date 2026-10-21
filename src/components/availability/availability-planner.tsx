"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { BackgroundEvent, CalendarEvent, CalendarType } from "@schedule-x/calendar"
import type { AvailabilityOverride, Booking, Location, Profile, WeeklyAvailability } from "@/types/database"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/brand/states"
import { ScheduleCalendar } from "@/components/calendar/schedule-calendar"
import { dayKind, effectiveBlocks, type Block } from "@/lib/availability"
import { byId, initials, placeTone } from "@/lib/domain"
import { addDaysISO, capitalize, formatCR, formatTimeOfDay, TIME_ZONE, todayCR } from "@/lib/format"
import { DayPanel } from "./day-panel"
import { OccurrenceDialog, type Occurrence } from "./occurrence-dialog"
import { PlaceLegend } from "./shared"

/** "09:00" → "9", "13:30" → "13:30" (compacto para la grilla del mes) */
function shortTime(t: string) {
  const [h, m] = t.split(":")
  return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`
}

const WINDOW_BACK = 35
const WINDOW_AHEAD = 150

/** Colores de Schedule-X a partir de los tokens de lugar (se asignan por orden). */
function placeCalendars(): Record<string, CalendarType> {
  return Object.fromEntries(
    [1, 2, 3].map((n) => [
      `place-${n}`,
      {
        colorName: `place-${n}`,
        lightColors: { main: `var(--place-${n}-ink)`, container: `var(--place-${n})`, onContainer: `var(--place-${n}-ink)` },
      },
    ]),
  )
}

export function AvailabilityPlanner({
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
  /** Todas las artistas (se filtra en cliente para la vista conjunta) */
  weekly: WeeklyAvailability[]
  overrides: AvailabilityOverride[]
  bookings: Booking[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pendingArtist, startArtist] = useTransition()
  const [showTeam, setShowTeam] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [prefill, setPrefill] = useState<{ start: string; end: string } | null>(null)
  const [editing, setEditing] = useState<Occurrence | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const today = todayCR()
  const loc = byId(locations)
  const artistById = byId(artists)
  const isAdmin = profile.role === "admin"
  const visibleArtists = showTeam ? artists.map((a) => a.id) : [artistId]
  const mine = useMemo(
    () => ({
      weekly: weekly.filter((w) => w.artist_id === artistId),
      overrides: overrides.filter((o) => o.artist_id === artistId),
    }),
    [weekly, overrides, artistId],
  )

  // Eventos: un evento por bloque efectivo y por día, dentro de una ventana amplia.
  const { events, backgroundEvents } = useMemo(() => {
    const src = {
      weekly: weekly.filter((w) => visibleArtists.includes(w.artist_id)),
      overrides: overrides.filter((o) => visibleArtists.includes(o.artist_id)),
    }
    const evs: CalendarEvent[] = []
    const bg: BackgroundEvent[] = []
    for (let i = -WINDOW_BACK; i <= WINDOW_AHEAD; i++) {
      const date = addDaysISO(today, i)
      for (const b of effectiveBlocks(date, src)) {
        const place = loc[b.location_id]?.name ?? "Lugar"
        const who = showTeam ? `${initials(artistById[b.artist_id]?.full_name ?? "")} · ` : ""
        evs.push({
          id: `${b.source.id}__${date}`,
          title: `${who}${place}`,
          start: Temporal.ZonedDateTime.from(`${date}T${b.start_time}:00[${TIME_ZONE}]`),
          end: Temporal.ZonedDateTime.from(`${date}T${b.end_time}:00[${TIME_ZONE}]`),
          calendarId: `place-${placeTone(locations, b.location_id)}`,
          timeLabel: `${shortTime(b.start_time)}–${shortTime(b.end_time)}`,
          dashed: b.source.kind === "override",
          block: b,
          date,
        })
      }
      if (dayKind(date, artistId, mine) === "off") {
        bg.push({
          start: Temporal.PlainDate.from(date),
          end: Temporal.PlainDate.from(date),
          title: "Día libre",
          style: {
            backgroundImage: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--muted) 85%, transparent) 0 5px, transparent 5px 11px)",
            opacity: 1,
          },
        })
      }
    }
    return { events: evs, backgroundEvents: bg }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visibleArtists se deriva de showTeam/artistId
  }, [weekly, overrides, showTeam, artistId, locations, today])

  function toggle(date: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function describeDay(date: string) {
    const kind = dayKind(date, artistId, mine)
    if (kind === "off") return "día libre"
    const blocks = effectiveBlocks(date, mine)
    if (!blocks.length) return "sin horario"
    const list = blocks.map((b) => `${formatTimeOfDay(b.start_time)} a ${formatTimeOfDay(b.end_time)} en ${loc[b.location_id]?.name}`)
    return `${kind === "custom" ? "horario solo de este día" : "horario semanal"}: ${list.join("; ")}`
  }

  function changeArtist(id: string) {
    const next = new URLSearchParams(params)
    next.set("artista", id)
    setSelected(new Set())
    startArtist(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
  }

  function focusPanel() {
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }))
  }

  if (locations.length === 0) {
    return (
      <EmptyState
        illustration="branch"
        title="Primero agregá un lugar"
        description="Los horarios necesitan un lugar. Podés crearlo en Ajustes."
      />
    )
  }

  return (
    <div className="flex flex-col gap-5" aria-busy={pendingArtist || undefined}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {isAdmin && artists.length > 1 ? (
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
        ) : (
          <span />
        )}
        {isAdmin && artists.length > 1 && (
          <div className="flex items-center gap-3">
            <Switch id="ver-equipo" checked={showTeam} onCheckedChange={setShowTeam} />
            <Label htmlFor="ver-equipo" className="text-sm">
              Ver a todas las artistas
            </Label>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className={pendingArtist ? "opacity-60 transition-opacity" : undefined}>
          <ScheduleCalendar
            label={`Calendario de disponibilidad de ${artistById[artistId]?.full_name ?? "la artista"}`}
            events={events}
            backgroundEvents={backgroundEvents}
            calendars={placeCalendars()}
            selection={{
              selected,
              toggle: (d) => {
                toggle(d)
                focusPanel()
              },
              isDisabled: (d) => d < today,
              describe: describeDay,
            }}
            onClickDate={(d) => {
              if (d < today) return
              toggle(d)
              focusPanel()
            }}
            onClickDateTime={(d, time) => {
              if (d < today) return
              const [h] = time.split(":").map(Number)
              const start = `${String(h).padStart(2, "0")}:00`
              const end = `${String(Math.min(h! + 3, 21)).padStart(2, "0")}:00`
              setSelected(new Set([d]))
              setPrefill({ start, end })
              focusPanel()
            }}
            onEventClick={(ev) => {
              const block = ev.block as Block | undefined
              if (!block) return
              setEditing({ block, date: ev.date as string })
            }}
          />
          <PlaceLegend locations={locations} className="mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">
            Tocá el número de un día para elegirlo. Tocá un horario para editarlo. En la vista Semana, tocá una hora vacía
            para empezar un horario ahí.
          </p>
        </div>

        <div ref={panelRef} className="scroll-mt-20 xl:sticky xl:top-16">
          <DayPanel
            artistId={artistId}
            artistName={artistById[artistId]?.full_name ?? ""}
            locations={locations}
            selected={[...selected].sort()}
            src={mine}
            bookings={bookings.filter((b) => b.artist_id === artistId)}
            prefill={prefill}
            onRemove={(d) => toggle(d)}
            onClear={() => {
              setSelected(new Set())
              setPrefill(null)
            }}
            onEdit={(o) => setEditing(o)}
          />
        </div>
      </div>

      <OccurrenceDialog
        occurrence={editing}
        artistName={editing ? (artistById[editing.block.artist_id]?.full_name ?? "") : ""}
        locations={locations}
        onClose={() => setEditing(null)}
      />

      <p className="sr-only" aria-live="polite">
        {selected.size === 0
          ? ""
          : `${selected.size} ${selected.size === 1 ? "día elegido" : "días elegidos"}: ${[...selected]
              .sort()
              .map((d) => capitalize(formatCR(d, "EEEE d 'de' MMMM")))
              .join(", ")}`}
      </p>
    </div>
  )
}
