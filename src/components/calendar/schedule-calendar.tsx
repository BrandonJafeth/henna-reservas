"use client"

import "temporal-polyfill/global"
import "@schedule-x/theme-default/dist/index.css"
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react"
import {
  createViewDay,
  createViewMonthGrid,
  createViewWeek,
  type BackgroundEvent,
  type CalendarEvent,
  type CalendarType,
} from "@schedule-x/calendar"
import { createEventsServicePlugin } from "@schedule-x/events-service"
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { TIME_ZONE } from "@/lib/format"
import { cn } from "@/lib/utils"

/*
 * Envoltorio de Schedule-X con la marca y accesible por teclado.
 * Schedule-X dibuja el día del mes como un div clicable; aquí cada número
 * de día se reemplaza por un <button> real (aria-pressed) cuando hay
 * selección de días, y los eventos ya son enfocables por la librería.
 */

export type CalendarView = "month-grid" | "week" | "day"

export interface DaySelection {
  selected: ReadonlySet<string>
  toggle: (date: string) => void
  isDisabled?: (date: string) => boolean
  /** Texto extra por día para lectores de pantalla (p. ej. "horario semanal en Nicoya"). */
  describe?: (date: string) => string | undefined
}

const SelectionContext = createContext<DaySelection | null>(null)

const iso = (d: Date) => format(d, "yyyy-MM-dd")

function MonthDate({ date, jsDate }: { date: number; jsDate: Date }) {
  const selection = useContext(SelectionContext)
  if (!selection) return <span className="sx-kk-date">{date}</span>
  const day = iso(jsDate)
  const on = selection.selected.has(day)
  const disabled = selection.isDisabled?.(day) ?? false
  const extra = selection.describe?.(day)
  return (
    <button
      type="button"
      className="sx-kk-date"
      data-selected={on || undefined}
      aria-pressed={on}
      disabled={disabled}
      aria-label={[format(jsDate, "EEEE d 'de' MMMM", { locale: es }), extra, on ? "elegido" : null].filter(Boolean).join(", ")}
      onClick={(e) => {
        e.stopPropagation()
        selection.toggle(day)
      }}
    >
      {date}
    </button>
  )
}

type MonthEventProps = { calendarEvent: CalendarEvent }

function MonthEvent({ calendarEvent }: MonthEventProps) {
  return (
    <span className={cn("sx-kk-event", calendarEvent.dashed && "is-dashed")}>
      <span className="sx-kk-event__time">{calendarEvent.timeLabel}</span>
      <span className="sx-kk-event__title">{calendarEvent.title}</span>
    </span>
  )
}

export function ScheduleCalendar({
  events,
  backgroundEvents = [],
  calendars,
  defaultView = "month-grid",
  dayBoundaries = { start: "07:00", end: "20:00" },
  selection,
  onClickDate,
  onClickDateTime,
  onEventClick,
  className,
  label,
}: {
  events: CalendarEvent[]
  backgroundEvents?: BackgroundEvent[]
  calendars: Record<string, CalendarType>
  defaultView?: CalendarView
  dayBoundaries?: { start: string; end: string }
  selection?: DaySelection
  onClickDate?: (date: string) => void
  onClickDateTime?: (date: string, time: string) => void
  onEventClick?: (event: CalendarEvent) => void
  className?: string
  /** Nombre accesible de la región del calendario */
  label: string
}) {
  // Schedule-X lee la configuración una sola vez: los handlers van por ref
  // para que siempre usen el estado actual del componente padre.
  const handlers = useRef({ onClickDate, onClickDateTime, onEventClick })
  useEffect(() => {
    handlers.current = { onClickDate, onClickDateTime, onEventClick }
  })
  const [eventsService] = useState(() => createEventsServicePlugin())
  const [controls] = useState(() => createCalendarControlsPlugin())

  // En pantallas chicas la semana (7 columnas) no se lee: se abre en Día.
  const [initialView] = useState<CalendarView>(() =>
    defaultView === "week" && typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
      ? "day"
      : defaultView,
  )

  const calendar = useNextCalendarApp(
    {
      views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
      defaultView: initialView,
      locale: "es-ES",
      firstDayOfWeek: 1,
      timezone: TIME_ZONE,
      isResponsive: false,
      dayBoundaries,
      weekOptions: { gridHeight: 780, eventWidth: 96, timeAxisFormatOptions: { hour: "numeric" } },
      monthGridOptions: { nEventsPerDay: 3 },
      calendars,
      events,
      backgroundEvents,
      callbacks: {
        onClickDate: (date) => handlers.current.onClickDate?.(date.toString()),
        onClickDateTime: (dt) =>
          handlers.current.onClickDateTime?.(dt.toPlainDate().toString(), dt.toPlainTime().toString().slice(0, 5)),
        onEventClick: (event) => handlers.current.onEventClick?.(event),
      },
    },
    [eventsService, controls],
  )

  // Mantener eventos sincronizados con los datos del servidor.
  useEffect(() => {
    if (!calendar) return
    eventsService.set(events)
    eventsService.setBackgroundEvents(backgroundEvents)
  }, [calendar, eventsService, events, backgroundEvents])

  useEffect(() => {
    if (calendar) controls.setCalendars(calendars)
  }, [calendar, controls, calendars])

  // Parches de accesibilidad sobre el DOM de Schedule-X (se reaplican al re-renderizar).
  const regionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const root = regionRef.current
    if (!root) return
    const patch = () => {
      root.querySelectorAll("div[aria-label]:not([role])").forEach((el) => el.setAttribute("role", "group"))
      const view = root.querySelector(".sx__view-selection-selected-item")
      const text = view?.textContent?.trim()
      if (view && text && view.getAttribute("aria-label") !== `Vista: ${text}`) view.setAttribute("aria-label", `Vista: ${text}`)
    }
    patch()
    const observer = new MutationObserver(patch)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [calendar])

  const customComponents = useMemo(() => ({ monthGridDate: MonthDate, monthGridEvent: MonthEvent }), [])

  return (
    <SelectionContext.Provider value={selection ?? null}>
      <section ref={regionRef} aria-label={label} className={cn("sx-kk", className)}>
        <ScheduleXCalendar calendarApp={calendar} customComponents={customComponents} />
      </section>
    </SelectionContext.Provider>
  )
}
