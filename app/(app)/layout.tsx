import React from "react"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-6 py-6">{children}</main>
    </div>
  )
}
