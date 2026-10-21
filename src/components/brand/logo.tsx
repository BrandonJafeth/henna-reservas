import { cn } from "@/lib/utils"

/**
 * Logo de K&K Henna Artistry.
 * Mientras llega `public/brand/logo.png`, se muestra el wordmark
 * tipográfico. Para usar el archivo real, reemplazá el contenido por
 * `<Image src="/brand/logo.png" alt="K&K Henna Artistry" … />`.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  return (
    <span
      role="img"
      aria-label="K&K Henna Artistry"
      className={cn("inline-flex flex-col items-center leading-none text-foreground select-none", className)}
    >
      <span
        aria-hidden
        className={cn(
          "font-display font-medium tracking-[0.02em]",
          size === "sm" && "text-[1.75rem]",
          size === "md" && "text-[2.75rem]",
          size === "lg" && "text-[4rem]",
        )}
      >
        K<span className="mx-[0.04em] italic text-primary">&amp;</span>K
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-1 font-sans font-medium uppercase text-muted-foreground",
          size === "sm" && "text-[0.5625rem] tracking-[0.3em]",
          size === "md" && "text-[0.6875rem] tracking-[0.36em]",
          size === "lg" && "text-xs tracking-[0.4em]",
        )}
      >
        Henna Artistry
      </span>
    </span>
  )
}
