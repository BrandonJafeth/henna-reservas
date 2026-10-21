"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { Booking, Location, Profile } from "@/types/database"
import type { DashboardSummary } from "@/lib/data/queries"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/brand/status-badge"
import { EmptyState } from "@/components/brand/states"
import { Ornament } from "@/components/brand/ornament"
import { AnimatedCRC } from "@/components/shared/animated-money"
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number"
import { byId } from "@/lib/domain"
import { formatCRC, formatTimeCR } from "@/lib/format"
import { cn } from "@/lib/utils"

function Count({ n }: { n: number }) {
  return (
    <>
      <span className="sr-only">{n}</span>
      <span aria-hidden className="kk-slide inline-flex">
        <SlidingNumber number={n} initiallyStable />
      </span>
    </>
  )
}

export function DashboardView({
  summary,
  today,
  artists,
  locations,
}: {
  summary: DashboardSummary
  today: Booking[]
  artists: Pick<Profile, "id" | "full_name">[]
  locations: Location[]
}) {
  const artist = byId(artists)
  const loc = byId(locations)
  const stats = [
    { label: "Citas de hoy", value: <Count n={summary.today_count} />, href: "/admin/citas?fecha=hoy" },
    { label: "Por confirmar", value: <Count n={summary.pending_count} />, href: "/admin/citas?estado=pendiente&fecha=todas", accent: summary.pending_count > 0 },
    { label: "Ingresos del mes", value: <AnimatedCRC amount={summary.month_income} />, href: "/admin/caja" },
    { label: "Saldo de caja", value: <AnimatedCRC amount={summary.cash_balance} />, href: "/admin/caja" },
  ]
  const max = Math.max(1, ...summary.by_artist.map((a) => a.income))

  return (
    <div className="flex flex-col gap-10">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="relative rounded-lg border border-accent/45 bg-card p-5 transition-colors focus-within:border-primary hover:border-primary">
            <dt className="text-sm text-muted-foreground">
              <Link href={s.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                {s.label}
              </Link>
            </dt>
            <dd className={cn("mt-3 font-display text-[1.75rem] leading-none sm:text-[2.25rem]", s.accent && "text-warning")}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section aria-labelledby="hoy-titulo" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="hoy-titulo" className="font-display text-[1.75rem]">
              Hoy
            </h2>
            <Link href="/admin/citas" className="inline-flex min-h-6 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
              Ver todas las citas
              <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
            </Link>
          </div>
          {today.length === 0 ? (
            <EmptyState
              illustration="branch"
              className="rounded-lg border border-dashed border-input"
              title="Un día tranquilo"
              description="No hay citas para hoy. Buen momento para preparar tinta o diseños."
            />
          ) : (
            <ol className="flex flex-col divide-y divide-border rounded-lg border border-accent/45 bg-card">
              {today.map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="tabular w-20 shrink-0 font-display text-xl">{formatTimeCR(b.starts_at)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {b.client_first_name} {b.client_last_name}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {loc[b.location_id]?.name} · {artist[b.artist_id]?.full_name}
                    </span>
                  </span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="artistas-titulo" className="flex flex-col gap-4">
          <h2 id="artistas-titulo" className="font-display text-[1.75rem]">
            Ingresos por artista
          </h2>
          <figure className="rounded-lg border border-accent/45 bg-card p-5">
            <figcaption className="mb-5 text-sm text-muted-foreground">Este mes, en colones</figcaption>
            <div aria-hidden className="flex flex-col gap-5">
              {summary.by_artist.map((a, i) => (
                <div key={a.artist_id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{artist[a.artist_id]?.full_name}</span>
                    <span className="tabular font-medium">{formatCRC(a.income)}</span>
                  </div>
                  <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-2.5 w-full overflow-visible">
                    <rect x="0" y="0" width="100" height="6" rx="1.5" className="fill-muted" />
                    <rect
                      x="0"
                      y="0"
                      width={Math.max(1.5, (a.income / max) * 100)}
                      height="6"
                      rx="1.5"
                      className={i % 2 === 0 ? "fill-chart-1" : "fill-chart-2"}
                    />
                  </svg>
                </div>
              ))}
            </div>
            <Ornament width="full" className="my-5" />
            <details>
              <summary className="min-h-6 cursor-pointer text-sm text-primary">Ver datos en tabla</summary>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Artista</TableHead>
                    <TableHead className="text-right">Completadas</TableHead>
                    <TableHead className="text-right">Ingresos del mes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.by_artist.map((a) => (
                    <TableRow key={a.artist_id}>
                      <TableCell>{artist[a.artist_id]?.full_name}</TableCell>
                      <TableCell className="tabular text-right">{a.completed}</TableCell>
                      <TableCell className="tabular text-right">{formatCRC(a.income)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </details>
          </figure>
        </section>
      </div>
    </div>
  )
}
