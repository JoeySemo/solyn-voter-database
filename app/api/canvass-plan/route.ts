import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

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

    // Build base query function to apply filters consistently per page
    const buildQuery = () => {
      let q = supabaseServer.from('Wentzville Voters').select('*', { count: 'exact' })

      if (search) {
        const asNumber = parseInt(search)
        if (!Number.isNaN(asNumber)) {
          q = q.eq('"Voter ID"', asNumber)
        } else {
          const terms = search.split(' ').filter(Boolean)
          if (terms.length > 1) {
            q = q.filter('"First Name"', 'ilike', `%${terms[0]}%`).filter('"Last Name"', 'ilike', `%${terms[1]}%`)
          } else {
            q = q.or(`"First Name".ilike.%${search}%.,"Last Name".ilike.%${search}%.,"Full Address".ilike.%${search}%.,"Political Party".ilike.%${search}%`)
          }
        }
      }

      if (precinct && precinct !== 'all') q = q.eq('Precinct', parseInt(precinct))
      if (split && split !== 'all') q = q.eq('Split', parseInt(split))
      if (ward && ward !== 'all') q = q.eq('Ward', ward)
      if (township && township !== 'all') q = q.eq('Township', township)

      if (targetVoter === 'true') {
        q = q.eq('"Voted in at least 1 of the last 5 municipal elections"', 'Yes')
      } else if (targetVoter === 'false') {
        q = q.eq('"Voted in at least 1 of the last 5 municipal elections"', 'No')
      }

      if (party && party !== 'all') {
        if (party === 'Unaffiliated') {
          q = q.or('"Political Party".is.null,"Political Party".eq. ,"Political Party".eq. ,"Political Party".eq.Unaffiliated')
        } else {
          q = q.eq('"Political Party"', party)
        }
      }

      return q.order('"Voter ID"', { ascending: true })
    }

    // Page through results and group by unique address
    const addressToResidents = new Map<string, { voters: { id: string; name: string; party: string }[] }>()

    let page = 1
    let totalFetched = 0
    const MAX_FETCH = 20000 // safety guard: up to 20k rows

    while (totalFetched < MAX_FETCH) {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error } = await buildQuery().range(from, to)
      if (error) {
        console.error('Supabase error (canvass-plan):', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const rows = data || []
      if (rows.length === 0) break

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

      totalFetched += rows.length
      page += 1
      if (rows.length < pageSize) break
    }

    const uniqueAddresses = Array.from(addressToResidents.keys())
    if (uniqueAddresses.length < 2) {
      return NextResponse.json({ error: 'Not enough addresses to create a canvass plan.' }, { status: 400 })
    }

    // Call our optimizer route
    const optimizerUrl = new URL('/api/route-optimizer', request.url).toString()
    const optimizerRes = await fetch(optimizerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: uniqueAddresses, maxAddressesPerRoute, assignmentMinutes })
    })
    const optimizerData = await optimizerRes.json()
    if (!optimizerRes.ok) {
      return NextResponse.json({ error: optimizerData.error || 'Route optimization failed' }, { status: 500 })
    }

    // Attach resident counts for each stop
    const stopMeta: Record<string, { householdSize: number; voters: { id: string; name: string; party: string }[] }> = {}
    for (const [addr, { voters }] of addressToResidents.entries()) {
      stopMeta[addr] = { householdSize: voters.length, voters }
    }

    return NextResponse.json({
      ...optimizerData,
      stopMeta,
    })
  } catch (e: any) {
    console.error('canvass-plan error', e)
    return NextResponse.json({ error: e.message || 'Failed to create plan' }, { status: 500 })
  }
}


