"use client"

import { useEffect, useRef, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { sileo } from "sileo"
import { Button } from "@/components/ui/button"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { AnimatedCRCRange } from "@/components/shared/animated-money"
import { createBookingRequest } from "@/lib/data/actions"
import { cn } from "@/lib/utils"
import { BookingAside } from "./booking-aside"
import { BookingDone } from "./booking-done"
import { WizardProgress } from "./progress"
import { StepDateTime } from "./step-datetime"
import { StepDesign } from "./step-design"
import { StepDetails } from "./step-details"
import { StepPlace } from "./step-place"
import { StepSize } from "./step-size"
import { StepSummary, useSummary } from "./step-summary"
import {
  bookingStepper,
  DEFAULT_VALUES,
  fieldId,
  pickStepValues,
  toBookingRequest,
  wizardSchema,
  type BookingCatalog,
  type BookingStepper,
  type StepId,
  type WizardField,
  type WizardInput,
  type WizardOutput,
} from "./wizard-model"

export function BookingWizard({ catalog }: { catalog: BookingCatalog }) {
  // Un solo formulario para todo el flujo: el panel lateral y el resumen
  // leen los valores en vivo. Stepperize maneja la navegación y guarda una
  // copia tipada de los datos de cada paso al salir de él.
  const methods = useForm<WizardInput, unknown, WizardOutput>({
    resolver: zodResolver(wizardSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
    shouldFocusError: false,
  })
  const [direction, setDirection] = useState(1)
  const [submitState, setSubmitState] = useState<ActionState>("idle")
  const [slotsKey, setSlotsKey] = useState(0)
  const [done, setDone] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  /** Paso que bloqueó la última navegación, para llevar el foco a su error. */
  const blockedBy = useRef<StepId | null>(null)

  const stepper = bookingStepper.useStepper({
    // Antes de avanzar (con "Continuar" o saltando desde el progreso) se
    // validan con RHF todos los pasos que se dejan atrás. Volver siempre se permite.
    beforeStepChange: async (ctx) => {
      if (ctx.toIndex <= ctx.fromIndex) return true
      for (const step of bookingStepper.steps.slice(ctx.fromIndex, ctx.toIndex)) {
        if (!step.fields.length) continue
        if (!(await methods.trigger(step.fields))) {
          blockedBy.current = step.id
          return false
        }
      }
      return true
    },
    onStepChange: (_step, ctx) => setDirection(ctx.toIndex >= ctx.fromIndex ? 1 : -1),
  })

  // Un error ya visible se borra mientras se corrige (no recién en el blur),
  // así el layout no salta bajo el puntero.
  useEffect(() => {
    return methods.subscribe({
      formState: { values: true },
      callback: ({ name }) => {
        const field = name as WizardField | undefined
        if (field && methods.getFieldState(field).error) void methods.trigger(field)
      },
    })
  }, [methods])

  // Foco al título de cada paso nuevo.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [stepper.id])

  function focusFirstError(fields: readonly WizardField[]) {
    for (const f of fields) {
      if (methods.getFieldState(f).error) {
        const el = document.getElementById(fieldId(f))
        el?.focus()
        el?.scrollIntoView({ block: "center", behavior: "smooth" })
        return
      }
    }
  }

  /** Navega guardando los datos del paso actual; si un paso no valida, lleva a él y a su primer error. */
  async function move(action: (payload: { data: Partial<WizardInput>; complete?: boolean }) => ReturnType<BookingStepper["next"]>, forward: boolean) {
    blockedBy.current = null
    const data = pickStepValues(methods.getValues(), stepper.id)
    const result = await action(forward ? { data, complete: true } : { data })
    if (result.accepted || result.reason !== "guard" || !blockedBy.current) return
    const target = blockedBy.current
    if (target !== stepper.id) {
      await stepper.goTo(target, { data, bypassPolicy: true })
    }
    const fields = bookingStepper.steps.find((s) => s.id === target)?.fields ?? []
    setTimeout(() => focusFirstError(fields), 60)
  }

  const next = () => move((p) => stepper.next(p), true)
  const back = () => move((p) => stepper.prev(p), false)
  const goTo = (id: StepId) => {
    const forward = bookingStepper.steps.findIndex((s) => s.id === id) > stepper.index
    return move((p) => stepper.goTo(id, { ...p, bypassPolicy: true }), forward)
  }

  async function submit() {
    // Validación final contra el contrato de cada paso guardado en Stepperize.
    for (const step of bookingStepper.steps) {
      const res = await stepper.validate(step.id)
      if (!res.success) {
        await stepper.goTo(step.id, { bypassPolicy: true })
        await methods.trigger(step.fields)
        setTimeout(() => focusFirstError(step.fields), 60)
        return
      }
    }

    setSubmitState("loading")
    try {
      const res = await createBookingRequest(toBookingRequest(stepper.data.all()))
      if (!res.ok) {
        setSubmitState("idle")
        if (res.code === "SLOT_TAKEN") {
          sileo.warning({
            title: "Ese horario acaba de ocuparse, elegí otro",
            description: "Guardamos todo lo demás que escribiste.",
          })
          methods.setValue("starts_at", "")
          stepper.setComplete("fecha", false)
          setSlotsKey((k) => k + 1)
          await stepper.goTo("fecha", { bypassPolicy: true })
          return
        }
        sileo.error({ title: "No pudimos enviar tu solicitud", description: res.message })
        return
      }
      setSubmitState("success")
      setTimeout(() => setDone(true), 900)
    } catch {
      setSubmitState("idle")
      sileo.error({
        title: "No pudimos enviar tu solicitud",
        description: "Revisá tu conexión e intentá de nuevo.",
      })
    }
  }

  if (done) {
    return (
      <FormProvider {...methods}>
        <BookingDone
          catalog={catalog}
          onRestart={() => {
            methods.reset(DEFAULT_VALUES)
            void stepper.reset()
            setSubmitState("idle")
            setDone(false)
          }}
        />
      </FormProvider>
    )
  }

  const current = stepper.current

  return (
    <FormProvider {...methods}>
      <div className="mx-auto grid w-full max-w-6xl gap-x-16 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-10">
        <BookingAside catalog={catalog} />

        <form
          noValidate
          aria-labelledby="paso-titulo"
          aria-busy={stepper.isPending || undefined}
          onSubmit={(e) => {
            e.preventDefault()
            if (stepper.isLast) void submit()
            else void next()
          }}
          className="flex min-w-0 flex-col pb-28 lg:py-16 lg:pb-16"
        >
          <WizardProgress stepper={stepper} onGo={(id) => void goTo(id)} />

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.section
              key={current.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -16 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 scroll-mt-6"
            >
              <h2
                id="paso-titulo"
                ref={headingRef}
                tabIndex={-1}
                className="mb-7 scroll-mt-6 font-display text-[2.125rem] leading-tight outline-none sm:text-[2.5rem]"
              >
                {current.heading}
              </h2>

              {stepper.match({
                diseno: () => <StepDesign />,
                tamano: () => <StepSize sizes={catalog.sizes} settings={catalog.settings} />,
                lugar: () => (
                  <StepPlace
                    locations={catalog.locations}
                    artists={catalog.artists}
                    artistsByLocation={catalog.artistsByLocation}
                  />
                ),
                fecha: () => <StepDateTime sizes={catalog.sizes} refreshKey={slotsKey} />,
                datos: () => <StepDetails settings={catalog.settings} />,
                resumen: () => <StepSummary catalog={catalog} onEdit={(id) => void goTo(id)} />,
              })}
            </motion.section>
          </AnimatePresence>

          <WizardNav
            catalog={catalog}
            stepper={stepper}
            onBack={() => void back()}
            onNext={() => void next()}
            submitState={submitState}
          />
        </form>
      </div>
    </FormProvider>
  )
}

function WizardNav({
  catalog,
  stepper,
  onBack,
  onNext,
  submitState,
}: {
  catalog: BookingCatalog
  stepper: BookingStepper
  onBack: () => void
  onNext: () => void
  submitState: ActionState
}) {
  const { size } = useSummary(catalog)
  const busy = submitState !== "idle" || stepper.isPending
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-6",
        "lg:static lg:mt-12 lg:border-t lg:bg-transparent lg:px-0 lg:pt-8 lg:pb-0 lg:backdrop-blur-none",
      )}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 lg:max-w-none">
        {!stepper.isFirst ? (
          <Button type="button" variant="outline" onClick={onBack} className="shrink-0" disabled={busy}>
            <ArrowLeft strokeWidth={1.5} />
            <span className="max-[359px]:sr-only">Atrás</span>
          </Button>
        ) : (
          <span />
        )}
        <div className="min-w-0 flex-1 text-right lg:hidden">
          {size && !stepper.isFirst && !stepper.isLast && (
            <span className="flex flex-col items-end leading-tight">
              <span className="text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">Referencia</span>
              <AnimatedCRCRange min={size.price_min} max={size.price_max} className="text-sm font-medium" />
            </span>
          )}
        </div>
        <div className="hidden flex-1 lg:block" />
        {!stepper.isLast ? (
          <Button type="button" onClick={onNext} className="shrink-0" aria-disabled={stepper.isPending || undefined}>
            Continuar
            <ArrowRight strokeWidth={1.5} />
          </Button>
        ) : (
          <ActionButton
            type="submit"
            size="lg"
            state={submitState}
            loadingLabel="Enviando…"
            successLabel="¡Enviada!"
            className="min-w-40 shrink-0"
          >
            Reservar
          </ActionButton>
        )}
      </div>
    </div>
  )
}
