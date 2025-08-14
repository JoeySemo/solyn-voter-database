import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    console.log('Fetching filter data from Supabase...');

    // Fetch each dimension independently, but do NOT fail the whole request on a single error.
    const [precinctRes, wardRes, townshipRes, partyRes] = await Promise.all([
      supabaseServer.from('Wentzville Voters').select('Precinct'),
      supabaseServer.from('Wentzville Voters').select('Ward'),
      supabaseServer.from('Wentzville Voters').select('Township'),
      supabaseServer.from('Wentzville Voters').select('"Political Party"')
    ]);

    if (precinctRes.error) {
      console.warn('Precinct fetch warning:', precinctRes.error.message);
    }
    if (wardRes.error) {
      console.warn('Ward fetch warning:', wardRes.error.message);
    }
    if (townshipRes.error) {
      console.warn('Township fetch warning:', townshipRes.error.message);
    }
    if (partyRes.error) {
      console.warn('Party fetch warning:', partyRes.error.message);
    }

    const precinctData = precinctRes.data || [];
    const wardData = wardRes.data || [];
    const townshipData = townshipRes.data || [];
    const partyData = partyRes.data || [];

    // Extract unique values and sort them (robust against mixed types)
    const precincts = [...new Set(precinctData.map(item => item?.Precinct).filter(v => v !== null && v !== undefined))]
      .sort((a: any, b: any) => (a ?? '').toString().localeCompare((b ?? '').toString()));

    const splits: string[] = [];

    const wards = [...new Set(wardData.map(item => item?.Ward).filter(ward => typeof ward === 'string' ? ward.trim() !== '' : ward !== null && ward !== undefined))]
      .sort();

    const townships = [...new Set(townshipData.map(item => item?.Township).filter(township => typeof township === 'string' ? township.trim() !== '' : township !== null && township !== undefined))]
      .sort();

    // Clean up party data and add "Unaffiliated" for empty/null values
    // Sanitize parties: exclude dates or malformed entries, normalize blanks to Unaffiliated
    const parties = [...new Set((partyData as any[]).map(item => {
      const raw = (item?.['Political Party'] ?? '').toString().trim();
      if (raw === '') return 'Unaffiliated';
      // Filter out accidental date strings like 6/22/2015
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(raw)) return 'Unaffiliated';
      return raw;
    }))].sort();

    console.log(`Fetched filters: ${precincts.length} precincts, ${splits.length} splits, ${wards.length} wards, ${townships.length} townships, ${parties.length} parties`);

    return NextResponse.json({
      precincts: precincts.map(p => p?.toString?.() ?? ''),
      splits,
      wards,
      townships,
      parties
    });

  } catch (error) {
    console.error('Unexpected error fetching filters:', error);
    // Never fully fail; return safe empty lists so the UI still works
    return NextResponse.json({
      precincts: [],
      splits: [],
      wards: [],
      townships: [],
      parties: []
    });
  }
}
