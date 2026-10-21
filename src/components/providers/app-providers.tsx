"use client"

import { MotionConfig } from "motion/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { BrandToaster } from "./brand-toaster"
import type { SileoPosition } from "sileo"

export function AppProviders({
  children,
  toastPosition = "top-center",
}: {
  children: React.ReactNode
  toastPosition?: SileoPosition
}) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        {children}
        <BrandToaster position={toastPosition} />
      </TooltipProvider>
    </MotionConfig>
  )
}
