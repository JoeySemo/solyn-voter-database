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
      maxAddressesPerRoute,
      assignmentMinutes,
      pageSize = 1000
    } = (await request.json()) as Filters & { maxAddressesPerRoute?: number; assignmentMinutes?: number; pageSize?: number }

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

    // Improved geographic clustering to reduce route overlap
    const maxAddressesPerRouteActual = Math.max(2, Math.min(Number(maxAddressesPerRoute) || 12, 12))
    
    // Parse addresses to extract geographic information
    const addressData = uniqueAddresses.map(addr => {
      const streetMatch = addr.match(/^(\d+)\s+(.+?)(?:\s+(?:Dr|Ct|Way|Ln|St|Ave|Blvd|Rd))/i)
      const houseNumber = parseInt(streetMatch?.[1] || '0')
      const streetName = streetMatch?.[2]?.trim() || 'Unknown'
      const streetType = addr.match(/\s+(Dr|Ct|Way|Ln|St|Ave|Blvd|Rd)/i)?.[1] || ''
      
      return {
        address: addr,
        houseNumber,
        streetName,
        streetType,
        fullStreet: `${streetName} ${streetType}`.trim()
      }
    })
    
    // Group by full street name (including type) for better geographic separation
    const streetGroups = new Map<string, typeof addressData>()
    for (const addrData of addressData) {
      if (!streetGroups.has(addrData.fullStreet)) {
        streetGroups.set(addrData.fullStreet, [])
      }
      streetGroups.get(addrData.fullStreet)!.push(addrData)
    }
    
    // Sort each street's addresses by house number
    for (const [street, addresses] of streetGroups) {
      addresses.sort((a, b) => a.houseNumber - b.houseNumber)
    }
    
    // Convert to sorted array of streets with their addresses
    let sortedStreets = Array.from(streetGroups.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) // Sort streets alphabetically for consistent ordering
    
    // Additional optimization: Group streets by similar names to reduce overlap
    // This helps group streets like "Oak Street" and "Oak Avenue" together
    const streetNameGroups = new Map<string, typeof sortedStreets>()
    
    for (const [fullStreet, addresses] of sortedStreets) {
      // Extract base street name (without type and common variations)
      const baseName = fullStreet
        .replace(/\s+(Dr|Ct|Way|Ln|St|Ave|Blvd|Rd)$/i, '')
        .replace(/\s+(Street|Avenue|Drive|Court|Way|Lane|Boulevard|Road)$/i, '')
        .replace(/\s+(North|South|East|West|N|S|E|W)$/i, '')
        .toLowerCase()
        .trim()
      
      if (!streetNameGroups.has(baseName)) {
        streetNameGroups.set(baseName, [])
      }
      streetNameGroups.get(baseName)!.push([fullStreet, addresses])
    }
    
    // Rebuild sorted streets with grouped similar names
    sortedStreets = []
    for (const [baseName, streetGroup] of streetNameGroups) {
      // Sort within each group by full street name
      streetGroup.sort((a, b) => a[0].localeCompare(b[0]))
      sortedStreets.push(...streetGroup)
    }
    
    // Create routes with improved geographic clustering
    const routes: any[] = []
    let routeNumber = 1
    let currentRoute: string[] = []
    let currentRouteStreets = new Set<string>()
    
    for (const [streetName, streetAddresses] of sortedStreets) {
      // Check if adding this street would exceed the route limit
      if (currentRoute.length + streetAddresses.length > maxAddressesPerRouteActual && currentRoute.length > 0) {
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
        currentRouteStreets.clear()
      }
      
      // Add all addresses from this street to current route
      for (const addrData of streetAddresses) {
        if (currentRoute.length < maxAddressesPerRouteActual) {
          currentRoute.push(addrData.address)
          currentRouteStreets.add(streetName)
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
          currentRouteStreets = new Set([streetName])
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


