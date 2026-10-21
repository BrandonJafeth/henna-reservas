import { CalendarClock, CalendarDays, Home, Settings2, Wallet, type LucideIcon } from "lucide-react"
import type { Role } from "@/types/database"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: Home, roles: ["admin", "tatuadora"] },
  { href: "/admin/citas", label: "Citas", icon: CalendarDays, roles: ["admin", "tatuadora"] },
  { href: "/admin/disponibilidad", label: "Disponibilidad", icon: CalendarClock, roles: ["admin", "tatuadora"] },
  { href: "/admin/caja", label: "Caja", icon: Wallet, roles: ["admin", "tatuadora"] },
  { href: "/admin/ajustes", label: "Ajustes", icon: Settings2, roles: ["admin"] },
]

export function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
}
