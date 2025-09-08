import { NextResponse } from 'next/server';
import { dbUtils } from '../../../../lib/database';

export async function GET() {
  try {
    console.log('Fetching filter data from SQLite...');

    // Get filter options from SQLite database
    const filters = dbUtils.getFilters();

    console.log(`Fetched filters: ${filters.precincts.length} precincts, ${filters.splits.length} splits, ${filters.wards.length} wards, ${filters.townships.length} townships, ${filters.parties.length} parties`);

    return NextResponse.json({
      precincts: filters.precincts,
      splits: filters.splits,
      wards: filters.wards,
      townships: filters.townships,
      parties: filters.parties
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
