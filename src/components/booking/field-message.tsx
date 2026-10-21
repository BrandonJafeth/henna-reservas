import { CircleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

export const errorId = (id: string) => `${id}-error`
export const hintId = (id: string) => `${id}-hint`

/** Mensaje de error junto al campo. Siempre en el DOM para que aria-describedby no apunte a la nada. */
export function FieldError({ id, message, className }: { id: string; message?: string; className?: string }) {
  return (
    <p id={errorId(id)} className={cn("flex items-start gap-1.5 text-sm text-destructive empty:hidden", className)}>
      {message && (
        <>
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          <span>{message}</span>
        </>
      )}
    </p>
  )
}

export function FieldHint({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <p id={hintId(id)} className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  )
}

export function describedBy(id: string, opts: { hint?: boolean; error?: boolean }) {
  return [opts.hint && hintId(id), opts.error && errorId(id)].filter(Boolean).join(" ") || undefined
}
