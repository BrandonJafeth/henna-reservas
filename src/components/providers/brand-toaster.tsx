"use client"

import { useEffect, useState } from "react"
import { Toaster, type SileoPosition } from "sileo"

/**
 * Sileo pinta el fondo del toast como `fill` de SVG, que no acepta
 * `var()`. Leemos el token `--card` ya resuelto y lo actualizamos al
 * cambiar de tema, así el color sigue saliendo de globals.css.
 */
function readToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function BrandToaster({ position }: { position: SileoPosition }) {
  const [fill, setFill] = useState<string | undefined>(undefined)

  useEffect(() => {
    const update = () => setFill(readToken("--card"))
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <Toaster
      position={position}
      offset={{ top: 16, right: 16, left: 16, bottom: 16 }}
      options={{
        fill,
        roundness: 8,
        styles: {
          title: "font-sans",
          description: "font-sans",
          button: "font-sans",
        },
      }}
    />
  )
}
