import { Cormorant_Garamond, Jost } from "next/font/google"

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
})

export const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jost",
  display: "swap",
})

export const fontVariables = `${cormorant.variable} ${jost.variable}`
