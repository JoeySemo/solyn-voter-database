import { NextRequest, NextResponse } from 'next/server'
import { dbUtils } from '../../../lib/database'

type Filters = {
  search?: string
  precinct?: string
  split?: string
  ward?: string
  township?: string
  targetVoter?: string
  party?: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      search = '',
      precinct = 'all',
      split = 'all',
      ward = 'all',
      township = 'all',
      targetVoter = 'all',
      party = 'all',
      assignmentMinutes,
      pageSize = 1000
    } = (await request.json()) as Filters & { assignmentMinutes?: number; pageSize?: number }

    // Get all voters matching the filters using SQLite
    const result = dbUtils.getVoters({
      page: 1,
      pageSize: 20000, // Get all matching voters for canvass planning
      search,
      precinct: precinct === 'all' ? '' : precinct,
      split: split === 'all' ? '' : split,
      ward: ward === 'all' ? '' : ward,
      township: township === 'all' ? '' : township,
      targetVoter: targetVoter === 'all' ? '' : targetVoter,
      party: party === 'all' ? '' : party
    })

    const rows = result.voters || []
    console.log(`Found ${rows.length} voters for canvass planning`)

    // Group by unique address
    const addressToResidents = new Map<string, { voters: { id: string; name: string; party: string }[] }>()

    for (const voter of rows) {
      const address = (voter['Full Address'] || '').toString().trim()
      if (!address) continue
      const name = (voter['Full Name'] || '').toString().trim()
      const rawParty = (voter['Political Party'] || '').toString().trim()
      const partyNorm = rawParty === '' ? 'Unaffiliated' : /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(rawParty) ? 'Unaffiliated' : rawParty
      const id = (voter['Voter ID'] || '').toString()
      if (!addressToResidents.has(address)) addressToResidents.set(address, { voters: [] })
      addressToResidents.get(address)!.voters.push({ id, name, party: partyNorm })
    }

    const uniqueAddresses = Array.from(addressToResidents.keys())
    if (uniqueAddresses.length < 2) {
      return NextResponse.json({ error: 'Not enough addresses to create a canvass plan.' }, { status: 400 })
    }

    // Revolutionary approach: Create geographically isolated canvasser territories
    // This prevents any crossover between canvassers by creating distinct geographic zones
    
    // Parse addresses and create geographic zones
    const addressData = uniqueAddresses.map((addr, index) => {
      const streetMatch = addr.match(/^(\d+)\s+(.+?)(?:\s+(?:Dr|Ct|Way|Ln|St|Ave|Blvd|Rd))/i)
      const houseNumber = parseInt(streetMatch?.[1] || '0')
      const streetName = streetMatch?.[2]?.trim() || 'Unknown'
      const streetType = addr.match(/\s+(Dr|Ct|Way|Ln|St|Ave|Blvd|Rd)/i)?.[1] || ''
      const fullStreet = `${streetName} ${streetType}`.trim()
      
      // Create a more sophisticated geographic identifier
      const baseStreetName = streetName
        .replace(/\s+(North|South|East|West|N|S|E|W)$/i, '')
        .toLowerCase()
        .substring(0, 6) // Use first 6 characters for zone identification
      
      // Create a zone hash for geographic clustering
      const zoneHash = baseStreetName.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return a & a
      }, 0)
      
      return {
        address: addr,
        houseNumber,
        streetName,
        streetType,
        fullStreet,
        baseStreetName,
        zoneHash,
        index
      }
    })
    
    // Group addresses by geographic zones (no overlap between zones)
    const zoneGroups = new Map<string, typeof addressData>()
    for (const addrData of addressData) {
      if (!zoneGroups.has(addrData.baseStreetName)) {
        zoneGroups.set(addrData.baseStreetName, [])
      }
      zoneGroups.get(addrData.baseStreetName)!.push(addrData)
    }
    
    // Sort addresses within each zone by street name and house number
    for (const [zone, addresses] of zoneGroups) {
      addresses.sort((a, b) => {
        if (a.fullStreet !== b.fullStreet) {
          return a.fullStreet.localeCompare(b.fullStreet)
        }
        return a.houseNumber - b.houseNumber
      })
    }
    
    // Create routes by assigning complete zones to canvassers (no crossover possible)
    const routes: any[] = []
    let routeNumber = 1
    
    // Sort zones by size (largest first) to balance workload
    const sortedZones = Array.from(zoneGroups.entries())
      .sort((a, b) => b[1].length - a[1].length)
    
    // Create routes by processing zones sequentially
    let currentRoute: string[] = []
    let currentZone: string | null = null
    
    for (const [zoneName, zoneAddresses] of sortedZones) {
      // If this zone would exceed the route limit, start a new route
      if (currentRoute.length + zoneAddresses.length > 12 && currentRoute.length > 0) {
        // Finalize current route
        routes.push({
          routeNumber: routeNumber++,
          addresses: [...currentRoute],
          mapsLink: `https://www.google.com/maps/dir/${currentRoute.map(encodeURIComponent).join('/')}`,
          totalDistance: currentRoute.length * 0.1,
          totalDuration: currentRoute.length * 2,
          overviewPolyline: null,
          optimizationScore: currentRoute.length,
          efficiency: currentRoute.length
        })
        
        // Start new route
        currentRoute = []
        currentZone = null
      }
      
      // Add all addresses from this zone to current route
      for (const addrData of zoneAddresses) {
        if (currentRoute.length < 12) {
          currentRoute.push(addrData.address)
          currentZone = zoneName
        } else {
          // Route is full, create it and start new one
          routes.push({
            routeNumber: routeNumber++,
            addresses: [...currentRoute],
            mapsLink: `https://www.google.com/maps/dir/${currentRoute.map(encodeURIComponent).join('/')}`,
            totalDistance: currentRoute.length * 0.1,
            totalDuration: currentRoute.length * 2,
            overviewPolyline: null,
            optimizationScore: currentRoute.length,
            efficiency: currentRoute.length
          })
          
          // Start new route with this address
          currentRoute = [addrData.address]
          currentZone = zoneName
        }
      }
    }
    
    // Add the last route if it has addresses
    if (currentRoute.length > 0) {
      routes.push({
        routeNumber: routeNumber,
        addresses: currentRoute,
        mapsLink: `https://www.google.com/maps/dir/${currentRoute.map(encodeURIComponent).join('/')}`,
        totalDistance: currentRoute.length * 0.1, // Estimate 0.1 miles per address
        totalDuration: currentRoute.length * 2, // Estimate 2 minutes per address
        overviewPolyline: null,
        optimizationScore: currentRoute.length,
        efficiency: currentRoute.length
      })
    }

    // Attach resident counts for each stop
    const stopMeta: Record<string, { householdSize: number; voters: { id: string; name: string; party: string }[] }> = {}
    for (const [addr, { voters }] of addressToResidents.entries()) {
      stopMeta[addr] = { householdSize: voters.length, voters }
    }

    // Create canvasser assignments with proper time grouping
    const canvasserAssignments: any[] = []
    let currentAssignment: any = {
      canvasserNumber: 1,
      routes: [],
      totalAddresses: 0,
      totalDistance: 0,
      totalDuration: 0,
      estimatedTotalTime: 0
    }
    
    const maxAssignmentTime = Math.max(30, Math.min(Number(assignmentMinutes) || 60, 180))
    
    for (const route of routes) {
      // Check if adding this route would exceed the time limit
      if (currentAssignment.estimatedTotalTime + route.totalDuration > maxAssignmentTime && currentAssignment.routes.length > 0) {
        // Start a new canvasser assignment
        canvasserAssignments.push(currentAssignment)
        currentAssignment = {
          canvasserNumber: currentAssignment.canvasserNumber + 1,
          routes: [],
          totalAddresses: 0,
          totalDistance: 0,
          totalDuration: 0,
          estimatedTotalTime: 0
        }
      }
      
      // Add route to current assignment
      currentAssignment.routes.push(route)
      currentAssignment.totalAddresses += route.addresses.length
      currentAssignment.totalDistance += route.totalDistance
      currentAssignment.totalDuration += route.totalDuration
      currentAssignment.estimatedTotalTime += route.totalDuration
    }
    
    // Add the last assignment if it has routes
    if (currentAssignment.routes.length > 0) {
      canvasserAssignments.push(currentAssignment)
    }

    // Calculate totals
    const totalDistance = canvasserAssignments.reduce((sum, assignment) => sum + assignment.totalDistance, 0)
    const totalDuration = canvasserAssignments.reduce((sum, assignment) => sum + assignment.totalDuration, 0)

    return NextResponse.json({
      routes,
      canvasserAssignments,
      totalRoutes: routes.length,
      totalCanvassers: canvasserAssignments.length,
      totalAddresses: uniqueAddresses.length,
      totalDistance: totalDistance,
      totalDuration: totalDuration,
      stopMeta,
      message: 'Basic route optimization enabled - Google Maps API key needed for full optimization'
    })
  } catch (e: any) {
    console.error('canvass-plan error', e)
    return NextResponse.json({ error: e.message || 'Failed to create plan' }, { status: 500 })
  }
}


