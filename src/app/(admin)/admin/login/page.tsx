import type { Metadata } from "next"
import { Logo } from "@/components/brand/logo"
import { Ornament } from "@/components/brand/ornament"
import { LoginForm } from "@/components/admin/login-form"

export const metadata: Metadata = { title: "Entrar" }

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center">
        <Logo size="md" />
        <Ornament width="sm" className="mt-6" />
        <h1 className="mt-6 font-display text-[2.25rem] leading-tight">Panel de artistas</h1>
        <p className="mt-2 mb-9 text-center text-[0.9375rem] text-muted-foreground">Entrá para ver tus citas y tu horario.</p>
        <div className="w-full rounded-lg border border-accent/45 bg-card p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
