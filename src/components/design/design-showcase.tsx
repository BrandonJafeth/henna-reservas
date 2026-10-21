"use client"

import { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { sileo } from "sileo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/brand/logo"
import { Ornament } from "@/components/brand/ornament"
import { BrandLabel } from "@/components/brand/brand-label"
import { StatusBadge } from "@/components/brand/status-badge"
import { EmptyState, ErrorState } from "@/components/brand/states"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { AnimatedCRC, AnimatedCRCRange } from "@/components/shared/animated-money"
import { ThemeToggle } from "@/components/admin/theme-toggle"
import { STATUS_ORDER } from "@/lib/domain"

/* ---------- contraste calculado sobre los tokens resueltos ---------- */

function parse(color: string): [number, number, number] | null {
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return null
  ctx.fillStyle = color
  const hex = ctx.fillStyle as string
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function lum([r, g, b]: [number, number, number]) {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function ratio(a: string, b: string) {
  const pa = parse(a)
  const pb = parse(b)
  if (!pa || !pb) return null
  const [x, y] = [lum(pa), lum(pb)].sort((p, q) => q - p)
  return (x! + 0.05) / (y! + 0.05)
}

const PAIRS: { fg: string; bg: string; use: string; min: number; decorative?: boolean }[] = [
  { fg: "--foreground", bg: "--background", use: "Texto principal", min: 4.5 },
  { fg: "--foreground", bg: "--card", use: "Texto en tarjetas", min: 4.5 },
  { fg: "--muted-foreground", bg: "--background", use: "Texto secundario", min: 4.5 },
  { fg: "--muted-foreground", bg: "--card", use: "Secundario en tarjeta", min: 4.5 },
  { fg: "--primary", bg: "--background", use: "Etiquetas y enlaces", min: 4.5 },
  { fg: "--primary-foreground", bg: "--primary", use: "Botón primario", min: 4.5 },
  { fg: "--success", bg: "--background", use: "Confirmada / ingreso", min: 4.5 },
  { fg: "--warning", bg: "--background", use: "Pendiente", min: 4.5 },
  { fg: "--destructive", bg: "--background", use: "Cancelada / egreso", min: 4.5 },
  { fg: "--input", bg: "--card", use: "Borde de campos", min: 3 },
  { fg: "--ring", bg: "--background", use: "Foco", min: 3 },
  { fg: "--accent", bg: "--background", use: "Cobre decorativo (nunca texto)", min: 0, decorative: true },
  { fg: "--border", bg: "--background", use: "Divisiones (decorativo)", min: 0, decorative: true },
]

function Palette() {
  const [rows, setRows] = useState<{ fg: string; bg: string; r: number | null }[]>([])
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement)
      setRows(PAIRS.map((p) => ({ fg: s.getPropertyValue(p.fg).trim(), bg: s.getPropertyValue(p.bg).trim(), r: ratio(s.getPropertyValue(p.fg).trim(), s.getPropertyValue(p.bg).trim()) })))
    }
    read()
    const o = new MutationObserver(read)
    o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => o.disconnect()
  }, [])

  return (
    <div className="overflow-x-auto rounded-lg border border-accent/45 bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Pares de color y su razón de contraste</caption>
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">Muestra</th>
            <th scope="col" className="px-4 py-3 font-medium">Tokens</th>
            <th scope="col" className="px-4 py-3 font-medium">Uso</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Contraste</th>
          </tr>
        </thead>
        <tbody>
          {PAIRS.map((p, i) => {
            const r = rows[i]?.r
            const pass = p.decorative || (r != null && r >= p.min)
            return (
              <tr key={p.fg + p.bg} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <span className="flex h-10 w-24 items-center justify-center rounded-md border border-border text-base font-medium" style={{ background: `var(${p.bg})`, color: `var(${p.fg})` }}>
                    Aa ₡
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {p.fg}
                  <br />
                  <span className="text-muted-foreground">sobre {p.bg}</span>
                </td>
                <td className="px-4 py-3">{p.use}</td>
                <td className="tabular px-4 py-3 text-right whitespace-nowrap">
                  {r ? `${r.toFixed(2)}:1` : "…"}{" "}
                  <span className={pass ? "text-success" : "text-destructive"}>
                    {p.decorative ? "· decorativo" : pass ? `· AA (${p.min}:1)` : "· no pasa"}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 border-t border-border pt-10">
      <h2 id={id} className="font-display text-[2rem] leading-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function DesignShowcase() {
  const [n, setN] = useState(6500)
  const [state, setState] = useState<ActionState>("idle")
  const [size, setSize] = useState([2])

  function demoAction() {
    setState("loading")
    setTimeout(() => setState("success"), 1200)
    setTimeout(() => setState("idle"), 2600)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-14 sm:px-6">
      <header className="flex flex-col items-center gap-5 text-center">
        <Logo size="lg" />
        <Ornament />
        <h1 className="font-display text-5xl">Sistema de diseño</h1>
        <p className="max-w-lg text-muted-foreground">Tokens, tipografía y componentes de K&amp;K Henna Artistry. Página solo para desarrollo.</p>
        <ThemeToggle showLabel />
      </header>

      <Section id="s-paleta" title="Paleta y contraste">
        <p className="text-sm text-muted-foreground">Calculado en vivo sobre los tokens del tema actual. Cambiá el tema para revisar el modo oscuro.</p>
        <div className="flex flex-wrap gap-3">
          {["--background", "--card", "--muted", "--foreground", "--muted-foreground", "--primary", "--accent", "--border", "--input", "--success", "--warning", "--destructive", "--place-1", "--place-2"].map((t) => (
            <div key={t} className="flex w-28 flex-col gap-1.5">
              <span className="h-14 rounded-md border border-border" style={{ background: `var(${t})` }} />
              <span className="font-mono text-[0.6875rem] text-muted-foreground">{t}</span>
            </div>
          ))}
        </div>
        <Palette />
      </Section>

      <Section id="s-tipo" title="Tipografía">
        <div className="flex flex-col gap-4 rounded-lg border border-accent/45 bg-card p-6">
          <BrandLabel>Lista de precios</BrandLabel>
          <p className="font-display text-6xl leading-none">Arte en la piel</p>
          <p className="font-display text-4xl">Cormorant Garamond 500 · títulos</p>
          <p className="font-display text-2xl italic">con tinta de jagua</p>
          <Ornament width="sm" />
          <p className="max-w-prose text-base">
            Jost 400 para cuerpo e interfaz. Dura de 1 a 2 semanas y oscurece en las primeras 24–48 h. Para todo servicio es necesario enviar el diseño previamente.
          </p>
          <p className="text-sm text-muted-foreground">Jost 400 · 14 px · texto secundario</p>
        </div>
      </Section>

      <Section id="s-botones" title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primario</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="link">Enlace</Button>
          <Button variant="destructive">Eliminar</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeño · 36 px</Button>
          <Button>Normal · 44 px</Button>
          <Button size="lg">Grande · 48 px</Button>
          <ActionButton state={state} onClick={demoAction} loadingLabel="Reservando…" successLabel="¡Listo!" className="min-w-40">
            Reservar
          </ActionButton>
        </div>
      </Section>

      <Section id="s-campos" title="Campos">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="d-in">Nombre</Label>
            <Input id="d-in" placeholder="Valeria" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="d-err">Con error</Label>
            <Input id="d-err" aria-invalid defaultValue="8888" aria-describedby="d-err-msg" />
            <p id="d-err-msg" className="text-sm text-destructive">Escribí un número de 8 dígitos.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="d-sel">Lugar</Label>
            <Select defaultValue="a">
              <SelectTrigger id="d-sel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Opción A</SelectItem>
                <SelectItem value="b">Opción B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="d-ta">Notas</Label>
            <Textarea id="d-ta" rows={2} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Checkbox id="d-cb" defaultChecked />
              <Label htmlFor="d-cb">Checkbox animado</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="d-sw" defaultChecked />
              <Label htmlFor="d-sw">Switch animado</Label>
            </div>
          </div>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Radio group animado</legend>
            <RadioGroup defaultValue="1">
              {["Primera", "Segunda"].map((l, i) => (
                <div key={l} className="flex items-center gap-3">
                  <RadioGroupItem id={`d-r${i}`} value={String(i + 1)} />
                  <Label htmlFor={`d-r${i}`}>{l}</Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="flex flex-col gap-3 sm:col-span-2">
            <Label id="d-sl-l">Slider</Label>
            <Slider aria-labelledby="d-sl-l" value={size} onValueChange={setSize} max={3} step={1} />
          </div>
        </div>
      </Section>

      <Section id="s-estados" title="Estados de cita">
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section id="s-tarjetas" title="Tarjetas y separador">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tarjeta marfil</CardTitle>
              <CardDescription>Borde fino cobre, sin sombra, radio 8 px.</CardDescription>
            </CardHeader>
            <CardContent>
              <Ornament width="full" />
            </CardContent>
          </Card>
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-accent/45 bg-card p-6">
            <BrandLabel as="span">Precio de referencia</BrandLabel>
            <AnimatedCRCRange min={n} max={n + 1000} className="font-display text-4xl" />
          </div>
        </div>
      </Section>

      <Section id="s-animate" title="Animate UI">
        <Tabs defaultValue="uno">
          <TabsList>
            <TabsTrigger value="uno">Horario semanal</TabsTrigger>
            <TabsTrigger value="dos">Excepciones</TabsTrigger>
          </TabsList>
          <TabsContent value="uno" className="mt-3 text-muted-foreground">Tabs animados de Animate UI.</TabsContent>
          <TabsContent value="dos" className="mt-3 text-muted-foreground">Respetan prefers-reduced-motion.</TabsContent>
        </Tabs>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setN((v) => Math.max(0, v - 1000))} aria-label="Restar ₡1 000">
            <Minus strokeWidth={1.5} />
          </Button>
          <span className="font-display text-4xl">
            <AnimatedCRC amount={n} />
          </span>
          <Button variant="outline" size="icon" onClick={() => setN((v) => v + 1000)} aria-label="Sumar ₡1 000">
            <Plus strokeWidth={1.5} />
          </Button>
        </div>
      </Section>

      <Section id="s-toasts" title="Toasts (Sileo)">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => sileo.success({ title: "Bloque agregado", description: "Lunes · 9:00 a. m. – 1:00 p. m." })}>Éxito</Button>
          <Button variant="outline" onClick={() => sileo.error({ title: "No se guardó", description: "Revisá tu conexión e intentá de nuevo." })}>Error</Button>
          <Button variant="outline" onClick={() => sileo.warning({ title: "Ese horario acaba de ocuparse, elegí otro" })}>Conflicto</Button>
          <Button variant="outline" onClick={() => sileo.info({ title: "Nada nuevo para copiar" })}>Info</Button>
          <Button
            variant="outline"
            onClick={() =>
              void sileo.promise(new Promise((r) => setTimeout(r, 1500)), {
                loading: { title: "Guardando…" },
                success: { title: "Guardado" },
                error: { title: "No se guardó" },
              })
            }
          >
            Promesa
          </Button>
        </div>
      </Section>

      <Section id="s-vacios" title="Vacío, error y carga">
        <div className="grid gap-4 md:grid-cols-3">
          <EmptyState className="rounded-lg border border-dashed border-input" illustration="calendar" title="Sin citas" description="Un día tranquilo." />
          <ErrorState onRetry={() => sileo.info({ title: "Reintentando…" })} />
          <div aria-hidden className="flex flex-col gap-3 rounded-lg border border-border p-5">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="mt-3 h-11 w-32" />
          </div>
        </div>
      </Section>
    </div>
  )
}
