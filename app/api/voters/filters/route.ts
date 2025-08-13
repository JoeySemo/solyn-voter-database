import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    console.log('Fetching filter data from Supabase...');

    // Fetch unique precincts
    const { data: precinctData, error: precinctError } = await supabaseServer
      .from('Wentzville Voters')
      .select('Precinct');
      // Removed .not('Precinct', 'is', null) to include all precincts

    if (precinctError) {
      console.error('Error fetching precincts:', precinctError);
      return NextResponse.json({ error: 'Failed to fetch precincts' }, { status: 500 });
    }

    // Fetch unique splits
    const { data: splitData, error: splitError } = await supabaseServer
      .from('Wentzville Voters')
      .select('Split')
      .not('Split', 'is', null);

    if (splitError) {
      console.error('Error fetching splits:', splitError);
      return NextResponse.json({ error: 'Failed to fetch splits' }, { status: 500 });
    }

    // Fetch unique wards
    const { data: wardData, error: wardError } = await supabaseServer
      .from('Wentzville Voters')
      .select('Ward')
      .not('Ward', 'is', null);

    if (wardError) {
      console.error('Error fetching wards:', wardError);
      return NextResponse.json({ error: 'Failed to fetch wards' }, { status: 500 });
    }

    // Fetch unique townships
    const { data: townshipData, error: townshipError } = await supabaseServer
      .from('Wentzville Voters')
      .select('Township')
      .not('Township', 'is', null);

    if (townshipError) {
      console.error('Error fetching townships:', townshipError);
      return NextResponse.json({ error: 'Failed to fetch townships' }, { status: 500 });
    }

    // Fetch unique political parties
    const { data: partyData, error: partyError } = await supabaseServer
      .from('Wentzville Voters')
      .select('"Political Party"');
      // Removed .not('"Political Party"', 'is', null) to include all voters

    if (partyError) {
      console.error('Error fetching parties:', partyError);
      return NextResponse.json({ error: 'Failed to fetch parties' }, { status: 500 });
    }

    // Extract unique values and sort them
    const precincts = [...new Set(precinctData.map(item => item.Precinct))].sort((a, b) => a - b);
    const splits = [...new Set(splitData.map(item => item.Split))].sort((a, b) => a - b);
    const wards = [...new Set(wardData.map(item => item.Ward).filter(ward => ward && ward.trim() !== ''))].sort();
    const townships = [...new Set(townshipData.map(item => item.Township).filter(township => township && township.trim() !== ''))].sort();
    
    // Clean up party data and add "Unaffiliated" for empty/null values
    const parties = [...new Set(partyData.map(item => {
      const party = item['Political Party']?.trim();
      return party === '' || !party ? 'Unaffiliated' : party;
    }))].sort();

    console.log(`Successfully fetched filters: ${precincts.length} precincts, ${splits.length} splits, ${wards.length} wards, ${townships.length} townships, ${parties.length} parties`);

    return NextResponse.json({
      precincts: precincts.map(p => p.toString()),
      splits: splits.map(s => s.toString()),
      wards,
      townships,
      parties
    });

  } catch (error) {
    console.error('Unexpected error fetching filters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} // Force new deployment
