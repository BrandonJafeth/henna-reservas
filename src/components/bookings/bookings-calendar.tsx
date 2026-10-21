"use client"

import { useMemo, useState } from "react"
import type { CalendarEvent, CalendarType } from "@schedule-x/calendar"
import type { Booking, BookingStatus, Location, Profile, SizeOption } from "@/types/database"
import { ScheduleCalendar } from "@/components/calendar/schedule-calendar"
import { StatusBadge } from "@/components/brand/status-badge"
import { byId, STATUS_LABEL, STATUS_ORDER } from "@/lib/domain"
import { TIME_ZONE, timeOfCR } from "@/lib/format"
import { BookingDetail } from "./booking-detail"

const STATUS_TOKEN: Record<BookingStatus, string> = {
  pendiente: "--warning",
  confirmada: "--success",
  completada: "--primary",
  cancelada: "--destructive",
  no_show: "--muted-foreground",
}

/**
 * Color por estado: franja del color del estado y texto oscuro sobre un
 * tinte muy suave (contraste del texto siempre ≥ 4.5:1). El estado también
 * va escrito en el título, así no depende solo del color.
 */
const STATUS_CALENDARS: Record<string, CalendarType> = Object.fromEntries(
  STATUS_ORDER.map((s) => [
    s,
    {
      colorName: s,
      label: STATUS_LABEL[s],
      lightColors: {
        main: `var(${STATUS_TOKEN[s]})`,
        container: `color-mix(in oklab, var(${STATUS_TOKEN[s]}) 10%, var(--card))`,
        onContainer: "var(--foreground)",
      },
    },
  ]),
)

export function BookingsCalendar({
  bookings,
  artists,
  locations,
  sizes,
}: {
  bookings: Booking[]
  artists: Pick<Profile, "id" | "full_name">[]
  locations: Location[]
  sizes: SizeOption[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = bookings.find((b) => b.id === openId) ?? null
  const loc = byId(locations)
  const size = byId(sizes)

  const events = useMemo<CalendarEvent[]>(
    () =>
      bookings.map((b) => ({
        id: b.id,
        title: `${b.client_first_name} ${b.client_last_name.charAt(0)}. · ${STATUS_LABEL[b.status]}`,
        start: Temporal.Instant.from(b.starts_at).toZonedDateTimeISO(TIME_ZONE),
        end: Temporal.Instant.from(b.ends_at).toZonedDateTimeISO(TIME_ZONE),
        calendarId: b.status,
        location: loc[b.location_id]?.name,
        description: size[b.size_option_id]?.label,
        timeLabel: timeOfCR(b.starts_at).replace(/^0/, ""),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loc/size derivan de locations/sizes
    [bookings, locations, sizes],
  )

  return (
    <div className="flex flex-col gap-3">
      <ScheduleCalendar
        label="Calendario de citas"
        defaultView="week"
        dayBoundaries={{ start: "08:00", end: "19:00" }}
        events={events}
        calendars={STATUS_CALENDARS}
        onEventClick={(ev) => setOpenId(String(ev.id))}
      />
      <ul aria-label="Leyenda de estados" className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => (
          <li key={s}>
            <StatusBadge status={s} />
          </li>
        ))}
      </ul>
      <BookingDetail
        booking={open}
        onOpenChange={(o) => !o && setOpenId(null)}
        artists={artists}
        locations={locations}
        sizes={sizes}
      />
    </div>
  )
}
