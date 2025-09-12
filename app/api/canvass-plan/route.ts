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

    // Alternative approach: Minimize overlap by creating compact geographic clusters
    const maxAddressesPerRouteActual = Math.max(2, Math.min(Number(maxAddressesPerRoute) || 12, 12))
    
    // Create a grid-based clustering system
    const gridSize = Math.ceil(Math.sqrt(uniqueAddresses.length / maxAddressesPerRouteActual))
    
    // Parse addresses and assign to grid cells
    const addressData = uniqueAddresses.map((addr, index) => {
      const streetMatch = addr.match(/^(\d+)\s+(.+?)(?:\s+(?:Dr|Ct|Way|Ln|St|Ave|Blvd|Rd))/i)
      const houseNumber = parseInt(streetMatch?.[1] || '0')
      const streetName = streetMatch?.[2]?.trim() || 'Unknown'
      const streetType = addr.match(/\s+(Dr|Ct|Way|Ln|St|Ave|Blvd|Rd)/i)?.[1] || ''
      const fullStreet = `${streetName} ${streetType}`.trim()
      
      // Create a hash-based grid assignment
      const streetHash = fullStreet.toLowerCase().split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return a & a
      }, 0)
      
      // Assign to grid cell based on hash
      const gridX = Math.abs(streetHash % gridSize)
      const gridY = Math.abs((streetHash >> 8) % gridSize)
      const gridCell = `${gridX},${gridY}`
      
      return {
        address: addr,
        houseNumber,
        streetName,
        streetType,
        fullStreet,
        gridCell,
        gridX,
        gridY,
        streetHash,
        index
      }
    })
    
    // Group addresses by grid cells
    const gridGroups = new Map<string, typeof addressData>()
    for (const addrData of addressData) {
      if (!gridGroups.has(addrData.gridCell)) {
        gridGroups.set(addrData.gridCell, [])
      }
      gridGroups.get(addrData.gridCell)!.push(addrData)
    }
    
    // Sort addresses within each grid cell by street name and house number
    for (const [cell, addresses] of gridGroups) {
      addresses.sort((a, b) => {
        if (a.fullStreet !== b.fullStreet) {
          return a.fullStreet.localeCompare(b.fullStreet)
        }
        return a.houseNumber - b.houseNumber
      })
    }
    
    // Create routes by processing grid cells in a logical order
    const routes: any[] = []
    let routeNumber = 1
    
    // Sort grid cells by position (top-to-bottom, left-to-right)
    const sortedGridCells = Array.from(gridGroups.entries())
      .sort((a, b) => {
        const [x1, y1] = a[0].split(',').map(Number)
        const [x2, y2] = b[0].split(',').map(Number)
        if (y1 !== y2) return y1 - y2 // Sort by row first
        return x1 - x2 // Then by column
      })
    
    // Create routes with grid-based clustering
    let currentRoute: string[] = []
    let currentGridCells = new Set<string>()
    
    for (const [gridCell, addresses] of sortedGridCells) {
      const [gridX, gridY] = gridCell.split(',').map(Number)
      
      // Check if we should start a new route
      const wouldExceedLimit = currentRoute.length + addresses.length > maxAddressesPerRouteActual
      const tooFarFromCurrent = currentGridCells.size > 0 && 
        Array.from(currentGridCells).some(cell => {
          const [currX, currY] = cell.split(',').map(Number)
          const distance = Math.abs(gridX - currX) + Math.abs(gridY - currY)
          return distance > 1 // Only allow adjacent or same cells
        })
      
      if ((wouldExceedLimit || tooFarFromCurrent) && currentRoute.length > 0) {
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
        currentGridCells.clear()
      }
      
      // Add addresses from this grid cell to current route
      for (const addrData of addresses) {
        if (currentRoute.length < maxAddressesPerRouteActual) {
          currentRoute.push(addrData.address)
          currentGridCells.add(gridCell)
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
          currentGridCells = new Set([gridCell])
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


