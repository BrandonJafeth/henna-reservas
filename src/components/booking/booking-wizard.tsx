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
  DEFAULT_VALUES,
  fieldId,
  STEPS,
  wizardSchema,
  type BookingCatalog,
  type WizardInput,
  type WizardOutput,
} from "./wizard-model"

const LAST = STEPS.length - 1

export function BookingWizard({ catalog }: { catalog: BookingCatalog }) {
  const methods = useForm<WizardInput, unknown, WizardOutput>({
    resolver: zodResolver(wizardSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
    shouldFocusError: false,
  })
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [direction, setDirection] = useState(1)
  const [submitState, setSubmitState] = useState<ActionState>("idle")
  const [slotsKey, setSlotsKey] = useState(0)
  const [done, setDone] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Un error ya visible se borra mientras se corrige (no recién en el blur),
  // así el layout no salta bajo el puntero. Los errores nuevos siguen
  // apareciendo en blur o al tocar "Continuar".
  useEffect(() => {
    return methods.subscribe({
      formState: { values: true },
      callback: ({ name }) => {
        const field = name as keyof WizardInput | undefined
        if (field && methods.getFieldState(field).error) void methods.trigger(field)
      },
    })
  }, [methods])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [step])

  function go(to: number) {
    setDirection(to > step ? 1 : -1)
    setStep(to)
    setFurthest((f) => Math.max(f, to))
  }

  function focusFirstError(fields: readonly (keyof WizardInput)[]) {
    for (const f of fields) {
      if (methods.getFieldState(f).error) {
        const el = document.getElementById(fieldId(f))
        el?.focus()
        el?.scrollIntoView({ block: "center", behavior: "smooth" })
        return
      }
    }
  }

  async function next() {
    const fields = STEPS[step]!.fields
    const ok = fields.length ? await methods.trigger(fields) : true
    if (!ok) {
      focusFirstError(fields)
      return
    }
    go(step + 1)
  }

  async function onValid(v: WizardOutput) {
    setSubmitState("loading")
    try {
      const res = await createBookingRequest({
        first_name: v.first_name,
        last_name: v.last_name,
        whatsapp: v.whatsapp,
        email: v.email,
        allergies: v.allergies,
        skin_care_consent: true,
        privacy_consent: true,
        size_option_id: v.size_option_id,
        location_id: v.location_id,
        artist_id: v.artist_id,
        starts_at: v.starts_at,
        notes: v.notes,
        reference_image_name: v.reference_image?.name ?? "",
      })
      if (!res.ok) {
        setSubmitState("idle")
        if (res.code === "SLOT_TAKEN") {
          sileo.warning({
            title: "Ese horario acaba de ocuparse, elegí otro",
            description: "Guardamos todo lo demás que escribiste.",
          })
          methods.setValue("starts_at", "")
          setSlotsKey((k) => k + 1)
          go(3)
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

  function onInvalid() {
    // Algún paso anterior quedó incompleto: volvemos al primero con error.
    const errors = methods.formState.errors
    const target = STEPS.findIndex((s) => s.fields.some((f) => errors[f as keyof WizardInput]))
    if (target >= 0) {
      go(target)
      setTimeout(() => focusFirstError(STEPS[target]!.fields), 50)
    }
  }

  if (done) {
    return (
      <FormProvider {...methods}>
        <BookingDone
          catalog={catalog}
          onRestart={() => {
            methods.reset(DEFAULT_VALUES)
            setSubmitState("idle")
            setStep(0)
            setFurthest(0)
            setDone(false)
          }}
        />
      </FormProvider>
    )
  }

  const current = STEPS[step]!

  return (
    <FormProvider {...methods}>
      <div className="mx-auto grid w-full max-w-6xl gap-x-16 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-10">
        <BookingAside catalog={catalog} step={step} />

        <form
          noValidate
          aria-labelledby="paso-titulo"
          onSubmit={(e) => {
            if (step < LAST) {
              e.preventDefault()
              void next()
              return
            }
            void methods.handleSubmit(onValid, onInvalid)(e)
          }}
          className="flex min-w-0 flex-col pb-28 lg:py-16 lg:pb-16"
        >
          <WizardProgress current={step} furthest={furthest} onGo={go} />

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.section
              key={current.key}
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

              {step === 0 && <StepDesign />}
              {step === 1 && <StepSize sizes={catalog.sizes} />}
              {step === 2 && (
                <StepPlace
                  locations={catalog.locations}
                  artists={catalog.artists}
                  artistsByLocation={catalog.artistsByLocation}
                />
              )}
              {step === 3 && <StepDateTime sizes={catalog.sizes} refreshKey={slotsKey} />}
              {step === 4 && <StepDetails />}
              {step === 5 && <StepSummary catalog={catalog} onEdit={go} />}
            </motion.section>
          </AnimatePresence>

          <WizardNav
            catalog={catalog}
            step={step}
            onBack={() => go(step - 1)}
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
  step,
  onBack,
  onNext,
  submitState,
}: {
  catalog: BookingCatalog
  step: number
  onBack: () => void
  onNext: () => void
  submitState: ActionState
}) {
  const { size } = useSummary(catalog)
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-6",
        "lg:static lg:mt-12 lg:border-t lg:bg-transparent lg:px-0 lg:pt-8 lg:pb-0 lg:backdrop-blur-none",
      )}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 lg:max-w-none">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={onBack} className="shrink-0" disabled={submitState !== "idle"}>
            <ArrowLeft strokeWidth={1.5} />
            <span className="max-[359px]:sr-only">Atrás</span>
          </Button>
        ) : (
          <span />
        )}
        <div className="min-w-0 flex-1 text-right lg:hidden">
          {size && step > 0 && step < LAST && (
            <span className="flex flex-col items-end leading-tight">
              <span className="text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">Referencia</span>
              <AnimatedCRCRange min={size.price_min} max={size.price_max} className="text-sm font-medium" />
            </span>
          )}
        </div>
        <div className="hidden flex-1 lg:block" />
        {step < LAST ? (
          <Button type="button" onClick={onNext} className="shrink-0">
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
