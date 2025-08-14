'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Download, Map, Rocket, Wand2 } from 'lucide-react'

type FiltersResponse = {
  precincts: string[]
  splits: string[]
  wards: string[]
  townships: string[]
  parties: string[]
}

export default function CanvassingPage() {
  const [filters, setFilters] = useState<FiltersResponse>({ precincts: [], splits: [], wards: [], townships: [], parties: [] })
  const [precinct, setPrecinct] = useState('all')
  const [split, setSplit] = useState('all')
  const [ward, setWard] = useState('all')
  const [township, setTownship] = useState('all')
  const [party, setParty] = useState('all')
  const [targetVoter, setTargetVoter] = useState('all')
  const [maxPerRoute, setMaxPerRoute] = useState(12)
  const [assignmentMinutes, setAssignmentMinutes] = useState(60)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

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
      } catch {
        // keep defaults
      }
    }
    load()
  }, [])

  const fetchAddresses = useCallback(async (): Promise<string[]> => {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '500',
      search: '',
      precinct,
      split,
      ward,
      township,
      party,
      targetVoter,
    })
    const res = await fetch(`/api/voters?${params}`)
    const data = await res.json()
    const voters = data?.voters || []
    return voters.map((v: any) => v['Full Address']).filter((s: string) => !!s)
  }, [precinct, split, ward, township, party, targetVoter])

  const generatePlan = async () => {
    setIsGenerating(true)
    setError('')
    setResult(null)
    try {
      const addresses = await fetchAddresses()
      if (addresses.length < 2) {
        throw new Error('Not enough addresses matched your filters.')
      }
      const res = await fetch('/api/route-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses, maxAddressesPerRoute: maxPerRoute, assignmentMinutes })
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Failed to generate plan')
      }
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setError(e.message || 'Failed to generate plan')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadCSV = () => {
    if (!result) return
    const csvHeader = 'Canvasser,Route,Stop,Address,Distance (miles),Walking Time (min)'
    const rows: string[] = []
    ;(result.canvasserAssignments || []).forEach((assignment: any) => {
      assignment.routes.forEach((route: any) => {
        route.addresses.forEach((addr: string, idx: number) => {
          rows.push(`Canvasser ${assignment.canvasserNumber},Route ${route.routeNumber},${idx + 1},"${addr}",${route.totalDistance},${route.totalDuration}`)
        })
      })
    })
    const blob = new Blob([[csvHeader, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'canvass_plan.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-extrabold flex items-center gap-2">
            <Wand2 className="h-6 w-6" /> Create a canvass plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Select value={precinct} onValueChange={setPrecinct}>
              <SelectTrigger><SelectValue placeholder="All Precincts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Precincts</SelectItem>
                {filters.precincts.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={split} onValueChange={setSplit}>
              <SelectTrigger><SelectValue placeholder="All Splits" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Splits</SelectItem>
                {filters.splits.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={ward} onValueChange={setWard}>
              <SelectTrigger><SelectValue placeholder="All Wards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {filters.wards.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={township} onValueChange={setTownship}>
              <SelectTrigger><SelectValue placeholder="All Townships" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Townships</SelectItem>
                {filters.townships.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={targetVoter} onValueChange={setTargetVoter}>
              <SelectTrigger><SelectValue placeholder="All Voters" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Voters</SelectItem>
                <SelectItem value="true">Target Voters</SelectItem>
                <SelectItem value="false">Non-target</SelectItem>
              </SelectContent>
            </Select>
            <Select value={party} onValueChange={setParty}>
              <SelectTrigger><SelectValue placeholder="All Parties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parties</SelectItem>
                {filters.parties.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max addresses per route (<= 12)</label>
              <Input type="number" min={2} max={12} value={maxPerRoute} onChange={(e) => setMaxPerRoute(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment minutes per canvasser</label>
              <Input type="number" min={15} max={240} value={assignmentMinutes} onChange={(e) => setAssignmentMinutes(Number(e.target.value))} />
            </div>
            <div className="flex items-end">
              <Button onClick={generatePlan} disabled={isGenerating} className="w-full">
                <Rocket className="h-4 w-4 mr-2" /> {isGenerating ? 'Generating...' : 'Generate Plan'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 border border-red-200 bg-red-50 rounded text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="font-medium">Canvassers:</span> {result.totalCanvassers}</div>
                <div><span className="font-medium">Routes:</span> {result.totalRoutes}</div>
                <div><span className="font-medium">Addresses:</span> {result.totalAddresses}</div>
                <div><span className="font-medium">Distance:</span> {result.totalDistance.toFixed(2)} miles</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadCSV} className="flex items-center gap-2"><Download className="h-4 w-4" /> Download CSV</Button>
              </div>
              <div className="space-y-2">
                {result.canvasserAssignments.map((assignment: any, idx: number) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-lg">Canvasser {assignment.canvasserNumber} • {assignment.totalAddresses} addresses • {assignment.totalDistance.toFixed(2)} miles • {assignment.estimatedTotalTime} min</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {assignment.routes.map((route: any, rIdx: number) => (
                        <div key={rIdx} className="flex items-center justify-between p-2 border rounded">
                          <div className="text-sm">
                            <span className="font-medium mr-2">Route {route.routeNumber}</span>
                            {route.addresses.length} stops • {route.totalDistance.toFixed(2)} miles • {route.totalDuration} min
                          </div>
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


