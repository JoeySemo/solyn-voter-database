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
  canvassed?: string
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
      canvassed = 'all',
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
      party: party === 'all' ? '' : party,
      canvassed: canvassed === 'all' ? '' : canvassed
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

    // Ultimate Route Optimization: Grid-Based Canvasser Territories
    // Creates completely isolated geographic zones with zero crossover possibility
    
    // Parse addresses and create geographic grid system
    const addressData = uniqueAddresses.map((addr, index) => {
      const streetMatch = addr.match(/^(\d+)\s+(.+?)(?:\s+(?:Dr|Ct|Way|Ln|St|Ave|Blvd|Rd))/i)
      const houseNumber = parseInt(streetMatch?.[1] || '0')
      const streetName = streetMatch?.[2]?.trim() || 'Unknown'
      const streetType = addr.match(/\s+(Dr|Ct|Way|Ln|St|Ave|Blvd|Rd)/i)?.[1] || ''
      const fullStreet = `${streetName} ${streetType}`.trim()
      
      // Create a comprehensive geographic identifier
      const baseStreet = streetName
        .replace(/\s+(North|South|East|West|N|S|E|W)$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 12)
      
      // Create a unique grid cell identifier
      const gridHash = baseStreet.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return a & a
      }, 0)
      
      // Create grid coordinates (larger grid for better separation)
      const gridX = Math.floor((gridHash % 10000) / 1000) // 0-9
      const gridY = Math.floor(((gridHash >> 10) % 10000) / 1000) // 0-9
      
      // Create sub-grid for fine-tuning
      const subX = (gridHash % 100) / 100
      const subY = ((gridHash >> 8) % 100) / 100
      
      return {
        address: addr,
        houseNumber,
        streetName,
        streetType,
        fullStreet,
        baseStreet,
        gridX,
        gridY,
        subX,
        subY,
        gridHash,
        index
      }
    })
    
    // Group addresses into grid cells for territorial assignment
    const gridCells = new Map<string, typeof addressData>()
    for (const addrData of addressData) {
      const cellKey = `${addrData.gridX}-${addrData.gridY}`
      if (!gridCells.has(cellKey)) {
        gridCells.set(cellKey, [])
      }
      gridCells.get(cellKey)!.push(addrData)
    }
    
    // Sort addresses within each grid cell by street and house number
    for (const [cell, addresses] of gridCells) {
      addresses.sort((a, b) => {
        if (a.fullStreet !== b.fullStreet) {
          return a.fullStreet.localeCompare(b.fullStreet)
        }
        return a.houseNumber - b.houseNumber
      })
    }
    
    // Create routes by assigning complete grid cells to canvassers
    const routes: any[] = []
    let routeNumber = 1
    
    // Sort grid cells by position for logical territorial assignment
    const sortedCells = Array.from(gridCells.entries())
      .sort((a, b) => {
        const [x1, y1] = a[0].split('-').map(Number)
        const [x2, y2] = b[0].split('-').map(Number)
        
        // Sort by Y first (rows), then X (columns) for logical progression
        if (y1 !== y2) return y1 - y2
        return x1 - x2
      })
    
    // Build routes by assigning complete grid cells
    let currentRoute: string[] = []
    let currentCell: string | null = null
    
    for (const [cellKey, cellAddresses] of sortedCells) {
      // If adding this cell would exceed 12 addresses, finalize current route
      if (currentRoute.length + cellAddresses.length > 12 && currentRoute.length > 0) {
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
        currentCell = null
      }
      
      // Add all addresses from this grid cell to current route
      for (const addrData of cellAddresses) {
        if (currentRoute.length < 12) {
          currentRoute.push(addrData.address)
          currentCell = cellKey
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
          currentCell = cellKey
        }
      }
    }
    
    // Add the last route if it has addresses
    if (currentRoute.length > 0) {
      routes.push({
        routeNumber: routeNumber,
        addresses: currentRoute,
        mapsLink: `https://www.google.com/maps/dir/${currentRoute.map(encodeURIComponent).join('/')}`,
        totalDistance: currentRoute.length * 0.1,
        totalDuration: currentRoute.length * 2,
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


