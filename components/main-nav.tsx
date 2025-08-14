"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/voter-database", label: "Voter Database" },
    { href: "/canvassing", label: "Canvassing" },
  ]

  return (
    <nav className="flex items-center justify-center space-x-8 lg:space-x-12 flex-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-lg font-semibold transition-colors hover:text-primary px-4 py-2 rounded-md hover:bg-accent",
            pathname === item.href ? "text-primary bg-accent" : "text-muted-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
