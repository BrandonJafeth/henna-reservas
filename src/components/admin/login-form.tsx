"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff } from "lucide-react"
import type { z } from "zod"
import { sileo } from "sileo"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { FieldError } from "@/components/booking/field-message"
import { loginSchema } from "@/lib/schemas"

type Values = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [state, setState] = useState<ActionState>("idle")
  const [show, setShow] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } })
  const e = form.formState.errors

  return (
    <form
      noValidate
      className="flex w-full flex-col gap-5"
      onSubmit={form.handleSubmit(async () => {
        setState("loading")
        // Fase de diseño: sesión simulada. Con Supabase: auth.signInWithPassword.
        await new Promise((r) => setTimeout(r, 700))
        setState("success")
        sileo.success({ title: "Bienvenida de nuevo" })
        router.push("/admin")
      })}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">Correo</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          {...form.register("email")}
          aria-invalid={!!e.email || undefined}
          aria-describedby={e.email ? "login-email-error" : undefined}
        />
        <FieldError id="login-email" message={e.email?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-pass">Contraseña</Label>
        <div className="relative">
          <Input
            id="login-pass"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
            {...form.register("password")}
            aria-invalid={!!e.password || undefined}
            aria-describedby={e.password ? "login-pass-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
          </button>
        </div>
        <FieldError id="login-pass" message={e.password?.message} />
      </div>
      <ActionButton type="submit" size="lg" state={state} loadingLabel="Entrando…" successLabel="Adentro" className="mt-2 w-full">
        Entrar
      </ActionButton>
    </form>
  )
}
