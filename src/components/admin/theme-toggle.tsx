"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leer el tema ya aplicado por ThemeScript
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem("kk-theme", next ? "dark" : "light")
    } catch {
      /* almacenamiento no disponible: el tema dura solo esta visita */
    }
  }

  const label = dark ? "Usar tema claro" : "Usar tema oscuro"
  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      onClick={toggle}
      aria-label={showLabel ? undefined : label}
      className={cn(showLabel && "justify-start", className)}
    >
      {dark ? <Sun strokeWidth={1.5} /> : <Moon strokeWidth={1.5} />}
      {showLabel && <span>{dark ? "Tema claro" : "Tema oscuro"}</span>}
    </Button>
  )
}
