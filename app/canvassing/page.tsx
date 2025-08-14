'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Wand2, Map, Download, Rocket } from 'lucide-react'

type FiltersResponse = { precincts: string[]; splits: string[]; wards: string[]; townships: string[]; parties: string[] }

export default function CanvassingPage() {
  const [filters, setFilters] = useState<FiltersResponse>({ precincts: [], splits: [], wards: [], townships: [], parties: [] })
  const [precinct, setPrecinct] = useState('all')
  // Removed split filter per request
  const [ward, setWard] = useState('all')
  const [township, setTownship] = useState('all')
  const [party, setParty] = useState('all')
  const [targetVoter, setTargetVoter] = useState('true') // default to municipal target voters
  const [maxPerRoute, setMaxPerRoute] = useState(12)
  const [assignmentMinutes, setAssignmentMinutes] = useState(60)
  const [isGenerating, setIsGenerating] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const [error, setError] = useState('')
  const [mapVisible, setMapVisible] = useState(false)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const [isLoadingMap, setIsLoadingMap] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/voters/filters')
        const data = await res.json()
        setFilters({
          precincts: data.precincts || [],
          splits: data.splits || [],
          wards: data.wards || [],
          townships: data.townships || [],
          parties: data.parties || [],
        })
      } catch {}
    }
    load()
  }, [])

  const createPlan = async () => {
    setIsGenerating(true)
    setError('')
    setPlan(null)
    try {
      const res = await fetch('/api/canvass-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: '', precinct, ward, township, targetVoter, party, maxAddressesPerRoute: maxPerRoute, assignmentMinutes })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create plan')
      setPlan(data)
    } catch (e: any) {
      setError(e.message || 'Failed to create plan')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadCSV = () => {
    if (!plan) return
    const header = 'Canvasser,Route,Stop,Address,Household Size,Voter Names,Distance (miles),Walking Time (min)'
    const rows: string[] = []
    ;(plan.canvasserAssignments || []).forEach((assignment: any) => {
      assignment.routes.forEach((route: any) => {
        route.addresses.forEach((addr: string, i: number) => {
          const meta = plan.stopMeta?.[addr] || { householdSize: 1, voters: [] }
          const names = meta.voters.map((v: any) => v.name).join('; ')
          rows.push(`Canvasser ${assignment.canvasserNumber},Route ${route.routeNumber},${i + 1},"${addr}",${meta.householdSize},"${names}",${route.totalDistance},${route.totalDuration}`)
        })
      })
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'canvass_plan.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const openPrintSheets = () => {
    if (!plan) return
    const htmlParts: string[] = []
    htmlParts.push(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Canvass Route Sheets</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; padding: 20px; }
        h1 { font-size: 20px; margin-bottom: 6px; }
        h2 { font-size: 16px; margin: 12px 0 6px; }
        .assignment { page-break-inside: avoid; border: 1px solid #ddd; padding: 12px; margin-bottom: 16px; }
        .route { border: 1px dashed #ccc; padding: 10px; margin: 10px 0; }
        .stop { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
        .stop:last-child { border-bottom: none; }
        .addr { font-weight: 600; }
        .meta { color: #555; font-size: 12px; }
        .voters { margin-left: 26px; font-size: 13px; }
        .box { width: 18px; height: 18px; border: 1px solid #333; display: inline-block; margin-right: 6px; }
        @media print { .noprint { display: none; } }
      </style></head><body>`)
    htmlParts.push(`<div class="noprint" style="margin-bottom:12px;"><button onclick="window.print()">Print</button></div>`)
    htmlParts.push(`<h1>Canvassing Route Sheets</h1>`)

    (plan.canvasserAssignments || []).forEach((assignment: any) => {
      htmlParts.push(`<div class="assignment"><h2>Canvasser ${assignment.canvasserNumber} — ${assignment.totalAddresses} addresses • ${assignment.totalDistance.toFixed(2)} miles • ${assignment.estimatedTotalTime} min</h2>`)
      assignment.routes.forEach((route: any) => {
        htmlParts.push(`<div class="route"><div class="meta">Route ${route.routeNumber} — ${route.addresses.length} stops • ${route.totalDistance.toFixed(2)} miles • ${route.totalDuration} min</div>`)
        route.addresses.forEach((addr: string, idx: number) => {
          const meta = plan.stopMeta?.[addr] || { householdSize: 1, voters: [] }
          const names = (meta.voters || []).map((v: any) => `${v.name}${v.party ? ' (' + v.party + ')' : ''}`).join('; ')
          htmlParts.push(`<div class="stop"><span class="box"></span><div><div class="addr">${idx + 1}. ${addr}</div><div class="meta">Household: ${meta.householdSize}</div><div class="voters">${names}</div></div></div>`)
        })
        htmlParts.push(`</div>`)
      })
      htmlParts.push(`</div>`)
    })

    htmlParts.push(`</body></html>`)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(htmlParts.join(''))
      w.document.close()
      w.focus()
    }
  }

  const loadGoogleMaps = async () => {
    if ((window as any).google?.maps) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Failed to load Google Maps'))
      document.head.appendChild(s)
    })
  }

  const showMapPreview = async () => {
    if (!plan) return
    setMapVisible(true)
    setIsLoadingMap(true)
    try {
      await loadGoogleMaps()
      if (!mapRef.current) return
      const google = (window as any).google
      const map = new google.maps.Map(mapRef.current, { zoom: 12, center: { lat: 38.811, lng: -90.85 } })

      const addresses: string[] = []
      plan.routes?.forEach((route: any) => {
        route.addresses.forEach((addr: string) => addresses.push(addr))
      })

      const bounds = new google.maps.LatLngBounds()
      const geocoder = new google.maps.Geocoder()
      const limit = Math.min(addresses.length, 150)
      for (let i = 0; i < limit; i++) {
        const addr = addresses[i]
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) => {
          geocoder.geocode({ address: addr }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              const loc = results[0].geometry.location
              new google.maps.Marker({ position: loc, map, title: addr })
              bounds.extend(loc)
            }
            resolve()
          })
        })
      }
      if (!bounds.isEmpty()) map.fitBounds(bounds)
    } catch (_) {
      // ignore
    } finally {
      setIsLoadingMap(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-extrabold flex items-center gap-2">
            <Wand2 className="h-6 w-6" /> Canvassing Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <Select value={precinct} onValueChange={setPrecinct}><SelectTrigger><SelectValue placeholder="All Precincts" /></SelectTrigger><SelectContent><SelectItem value="all">All Precincts</SelectItem>{filters.precincts.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select>
            <Select value={ward} onValueChange={setWard}><SelectTrigger><SelectValue placeholder="All Wards" /></SelectTrigger><SelectContent><SelectItem value="all">All Wards</SelectItem>{filters.wards.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent></Select>
            <Select value={township} onValueChange={setTownship}><SelectTrigger><SelectValue placeholder="All Townships" /></SelectTrigger><SelectContent><SelectItem value="all">All Townships</SelectItem>{filters.townships.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select>
            <Select value={targetVoter} onValueChange={setTargetVoter}><SelectTrigger><SelectValue placeholder="All Voters" /></SelectTrigger><SelectContent><SelectItem value="all">All Voters</SelectItem><SelectItem value="true">Target Voters</SelectItem><SelectItem value="false">Non-target</SelectItem></SelectContent></Select>
            <Select value={party} onValueChange={setParty}><SelectTrigger><SelectValue placeholder="All Parties" /></SelectTrigger><SelectContent><SelectItem value="all">All Parties</SelectItem>{filters.parties.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><label className="text-sm font-medium">Max addresses per route (≤ 12)</label><Input type="number" min={2} max={12} value={maxPerRoute} onChange={(e) => setMaxPerRoute(Number(e.target.value))} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Assignment minutes per canvasser</label><Input type="number" min={15} max={240} value={assignmentMinutes} onChange={(e) => setAssignmentMinutes(Number(e.target.value))} /></div>
            <div className="flex items-end"><Button onClick={createPlan} disabled={isGenerating} className="w-full"><Rocket className="h-4 w-4 mr-2" /> {isGenerating ? 'Generating...' : 'Generate Plan'}</Button></div>
          </div>

          {error && <div className="p-3 border border-red-200 bg-red-50 rounded text-sm text-red-700">{error}</div>}

          {plan && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="font-medium">Canvassers:</span> {plan.totalCanvassers}</div>
                <div><span className="font-medium">Routes:</span> {plan.totalRoutes}</div>
                <div><span className="font-medium">Addresses:</span> {plan.totalAddresses}</div>
                <div><span className="font-medium">Distance:</span> {plan.totalDistance.toFixed(2)} miles</div>
              </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadCSV} className="flex items-center gap-2"><Download className="h-4 w-4" /> Download CSV</Button>
            <Button variant="outline" onClick={openPrintSheets} className="flex items-center gap-2">Print Route Sheets</Button>
            <Button variant="outline" onClick={showMapPreview} disabled={isLoadingMap} className="flex items-center gap-2"><Map className="h-4 w-4" /> {isLoadingMap ? 'Loading Map...' : 'Preview Map'}</Button>
          </div>
          {mapVisible && (
            <div>
              <div className="border rounded h-[420px]" ref={mapRef} />
              <div className="text-xs text-muted-foreground mt-2">Note: Map preview geocodes a subset of stops for responsiveness. Use “Open in Maps” per route for full navigation.</div>
            </div>
          )}
              <div className="space-y-2">
                {plan.canvasserAssignments.map((assignment: any, idx: number) => (
                  <Card key={idx}>
                    <CardHeader><CardTitle className="text-lg">Canvasser {assignment.canvasserNumber} • {assignment.totalAddresses} addresses • {assignment.totalDistance.toFixed(2)} miles • {assignment.estimatedTotalTime} min</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {assignment.routes.map((route: any, rIdx: number) => (
                        <div key={rIdx} className="flex items-center justify-between p-2 border rounded">
                          <div className="text-sm"><span className="font-medium mr-2">Route {route.routeNumber}</span>{route.addresses.length} stops • {route.totalDistance.toFixed(2)} miles • {route.totalDuration} min</div>
                          <Button size="sm" variant="outline" onClick={() => window.open(route.mapsLink, '_blank')} className="flex items-center gap-1"><Map className="h-3 w-3"/>Open in Maps</Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

 