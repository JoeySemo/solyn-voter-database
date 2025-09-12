import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Image from "next/image"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Wentzville School Board Canvasing",
  description: "Voter database with route optimization for canvassing.",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <header className="relative overflow-hidden">
              <div className="absolute inset-0 -z-10 opacity-80">
                <Image src="/placeholder.jpg" alt="Neighborhood" fill priority className="object-cover" />
              </div>
              <div className="container mx-auto px-6 py-6 md:py-10 min-h-[30vh] flex flex-col items-center justify-center text-center">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-sm">Wentzville School Board Canvasing</h1>
                <p className="mt-3 text-base md:text-lg max-w-2xl">Plan Routes, Target the Right Doors, and Coordinate Volunteers</p>
              </div>
            </header>
            <main className="flex-1 -mt-8">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
