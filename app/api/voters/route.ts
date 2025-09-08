import { NextRequest, NextResponse } from 'next/server';
import { dbUtils } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search') || '';
    const precinct = searchParams.get('precinct') || '';
    const split = searchParams.get('split') || '';
    const ward = searchParams.get('ward') || '';
    const township = searchParams.get('township') || '';
    const targetVoter = searchParams.get('targetVoter') || '';
    const party = searchParams.get('party') || '';

    console.log('Fetching voters with params:', { page, pageSize, search, precinct, split, ward, township, targetVoter, party });

    // Use SQLite database
    const result = dbUtils.getVoters({
      page,
      pageSize,
      search,
      precinct,
      split,
      ward,
      township,
      targetVoter,
      party
    });

    // Clean up party data and calculate age
    const cleanedData = result.voters.map(voter => {
      // Calculate age from birth year
      const currentYear = new Date().getFullYear();
      const birthYear = voter["Birth Year"];
      const age = birthYear ? currentYear - birthYear : null;
      
      const isTarget = (voter["Voted in at least 1 of the last 5 municipal elections"] || '').toString().toLowerCase() === 'yes';

      return {
        ...voter,
        "Age": age,
        // Fix party conversion to handle single spaces and null values properly
        "Political Party": voter["Political Party"]?.trim() === "" || voter["Political Party"] === " " || !voter["Political Party"] ? "Unaffiliated" : voter["Political Party"],
        // Provide normalized boolean used by the client UI
        "is_target_voter": isTarget
      };
    });

    console.log(`Successfully fetched ${cleanedData.length} voters (page ${page}, total count: ${result.totalVoters})`);

    return NextResponse.json({
      voters: cleanedData,
      totalPages: result.totalPages,
      totalVoters: result.totalVoters
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error occurred'
    }, { status: 500 });
  }
}
