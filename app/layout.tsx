import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Image from "next/image"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://solyn.com"),
  title: "Solyn - Voter Database",
  description: "Voter database with route optimization for canvassing.",
  keywords: [
    "voter database",
    "canvassing",
    "route optimization",
    "volunteer coordination",
  ],
  authors: [{ name: "Solyn", url: "https://solyn.com" }],
  robots: { index: true, follow: true },
  openGraph: {
    url: "https://solyn.com",
    title: "Solyn - Voter Database",
    description: "Voter database with route optimization for canvassing.",
    siteName: "Solyn",
    images: [
      {
        url: "/placeholder.jpg",
        width: 1200,
        height: 630,
        alt: "Neighborhood",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Solyn - Voter Database",
    description: "Voter database with route optimization for canvassing.",
    images: ["/placeholder.jpg"],
    creator: "@solyn",
  },
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://solyn.com" />
      </head>
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
              <div className="container mx-auto px-6 py-10 md:py-20 min-h-[50vh] flex flex-col items-center justify-center text-center">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-sm">Win Wentzville With Smarter Canvassing</h1>
                <p className="mt-3 text-base md:text-lg max-w-2xl">Plan efficient walking routes, target the right doors, and coordinate volunteers in minutes—not hours.</p>
                <div className="mt-6 flex gap-3 flex-wrap justify-center">
                  <a href="/canvassing" className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-5 py-2 font-medium hover:bg-primary/90">Create a canvass plan</a>
                  <a href="/voter-database" className="inline-flex items-center rounded-md border px-5 py-2 font-medium hover:bg-accent">Go to voter database</a>
                </div>
              </div>
            </header>
            <main className="flex-1 container mx-auto px-6 py-6">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
