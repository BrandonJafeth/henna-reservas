"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import type { Profile } from "@/types/database"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Logo } from "@/components/brand/logo"
import { initials, ROLE_LABEL } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { isActive, NAV_ITEMS } from "./nav"
import { ThemeToggle } from "./theme-toggle"

function Monogram() {
  return (
    <span aria-hidden className="font-display text-xl leading-none">
      K<span className="text-primary italic">&amp;</span>K
    </span>
  )
}

function UserChip({ profile, compact }: { profile: Profile; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-accent/60 font-display text-base text-primary"
      >
        {initials(profile.full_name)}
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col text-left leading-tight">
          <span className="truncate text-sm font-medium">{profile.full_name}</span>
          <span className="text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</span>
        </span>
      )}
    </span>
  )
}

export function AdminSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const items = NAV_ITEMS.filter((i) => i.roles.includes(profile.role))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="items-center gap-4 px-3 pt-6 pb-4">
        {state === "collapsed" ? <Monogram /> : <Logo size="md" />}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup role="navigation" aria-label="Secciones">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className="h-10 text-[0.9375rem] data-active:text-primary"
                    >
                      <Link href={item.href} aria-current={active ? "page" : undefined}>
                        <item.icon strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 border-t border-sidebar-border p-3">
        <div className={cn("flex items-center", state === "collapsed" ? "flex-col gap-2" : "justify-between gap-2")}>
          <UserChip profile={profile} compact={state === "collapsed"} />
          <ThemeToggle />
        </div>
        {state !== "collapsed" && (
          <Link
            href="/admin/login"
            className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="size-4" strokeWidth={1.5} />
            Cerrar sesión
          </Link>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/** Barra superior: en celular muestra logo y cuenta; en escritorio, el botón para colapsar. */
export function AdminTopBar({ profile }: { profile: Profile }) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm md:h-12 md:border-0 md:bg-transparent md:px-6 md:backdrop-blur-none">
      <SidebarTrigger className="hidden size-9 md:inline-flex" aria-label="Mostrar u ocultar menú" />
      <Link href="/admin" className="md:hidden" aria-label="K&K Henna Artistry, ir a inicio">
        <Monogram />
      </Link>
      <div className="flex-1" />
      <div className="flex items-center gap-1 md:hidden">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full">
            <UserChip profile={profile} compact />
            <span className="sr-only">Cuenta de {profile.full_name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span>{profile.full_name}</span>
              <span className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[profile.role]}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/login">
                <LogOut strokeWidth={1.5} />
                Cerrar sesión
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/** Menú inferior para celular. */
export function AdminBottomNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((i) => i.roles.includes(profile.role))
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                <item.icon className="size-5" strokeWidth={1.5} />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
