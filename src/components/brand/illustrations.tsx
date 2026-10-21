/** Ilustraciones lineales de la marca. Trazo fino, color heredado (usar con text-accent). */

type Props = { className?: string }

function Svg({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 96"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Rama de guaitil con fruto de jagua */
export function JaguaBranch({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M12 84c22-10 44-28 60-52 6-9 10-17 13-24" />
      <path d="M36 70c-8-2-14-8-16-16 9 0 16 6 16 16Z" />
      <path d="M50 58c-2-9 1-17 8-22 3 8 0 17-8 22Z" />
      <path d="M62 46c-9-1-15-6-18-13 8-1 15 4 18 13Z" />
      <path d="M72 32c1-8 6-14 13-16 0 8-5 14-13 16Z" />
      <ellipse cx="88" cy="60" rx="13" ry="15" />
      <path d="M88 45c0-4 2-7 5-9" />
      <path d="M81 55c3-2 7-2 10 0" opacity=".6" />
    </Svg>
  )
}

/** Calendario con hoja */
export function CalendarLeaf({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="22" y="20" width="62" height="58" rx="5" />
      <path d="M22 36h62M38 14v12M68 14v12" />
      <path d="M36 50h8M52 50h8M36 62h8" opacity=".6" />
      <path d="M78 84c4-14 14-24 28-28-2 14-12 25-28 28Z" />
      <path d="M78 84c8-8 15-15 24-24" />
    </Svg>
  )
}

/** Mano con diseño */
export function HandMotif({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M46 88V58c-6-6-12-14-12-20 0-3 4-4 6-1l8 12V18c0-4 6-4 6 0v24V12c0-4 6-4 6 0v30V16c0-4 6-4 6 0v28V24c0-4 6-4 6 0v36c0 12-6 20-12 28" />
      <circle cx="60" cy="64" r="5" />
      <path d="M60 54v-4M60 78v-4M50 64h-4M74 64h-4" opacity=".7" />
    </Svg>
  )
}

/** Libro de caja */
export function Ledger({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M26 26h56a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H26z" />
      <path d="M26 26V18h48v8" />
      <path d="M90 46H72a6 6 0 0 0 0 12h18" />
      <circle cx="74" cy="52" r="1.5" />
      <path d="M36 40h20M36 50h14" opacity=".6" />
    </Svg>
  )
}
