import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

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

    let query = supabaseServer
      .from('Wentzville Voters')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      // Check if search is a number (for Voter ID)
      const searchAsNumber = parseInt(search);
      if (!isNaN(searchAsNumber)) {
        // If search is a number, search by Voter ID
        query = query.eq('"Voter ID"', searchAsNumber);
      } else {
        // If search is text, search by name, address, and party
        // Split search terms to handle first/last name combinations
        const searchTerms = search.split(' ').filter(term => term.length > 0);
        
        if (searchTerms.length > 1) {
          // Multiple search terms - use a simpler approach
          const firstName = searchTerms[0];
          const lastName = searchTerms[1];
          
          // Search for voters with both first name AND last name matching
          // Use a more reliable approach with Supabase
          query = query.filter('"First Name"', 'ilike', `%${firstName}%`).filter('"Last Name"', 'ilike', `%${lastName}%`);
        } else {
          // Single search term
          query = query.or(`"First Name".ilike.%${search}%,"Last Name".ilike.%${search}%,"Full Address".ilike.%${search}%,"Political Party".ilike.%${search}%`);
        }
      }
    }

    if (precinct && precinct !== 'all') {
      query = query.eq('Precinct', parseInt(precinct));
    }

    if (split && split !== 'all') {
      query = query.eq('Split', parseInt(split));
    }

    if (ward && ward !== 'all') {
      query = query.eq('Ward', ward);
    }

    if (township && township !== 'all') {
      query = query.eq('Township', township);
    }

    if (targetVoter === 'true') {
      console.log('Applying target voter filter: true');
      // Production dataset uses a Yes/No text column to indicate municipal voter status
      query = query.eq('"Voted in at least 1 of the last 5 municipal elections"', 'Yes');
    } else if (targetVoter === 'false') {
      console.log('Applying target voter filter: false');
      query = query.eq('"Voted in at least 1 of the last 5 municipal elections"', 'No');
    }

    // Only apply party filter if it's a valid party that exists in the data
    if (party && party !== 'all') {
      if (party === 'Unaffiliated') {
        // For Unaffiliated, include null, single spaces, empty strings, and actual "Unaffiliated" values
        query = query.or('"Political Party".is.null,"Political Party".eq. ,"Political Party".eq.,"Political Party".eq.Unaffiliated');
      } else {
        query = query.eq('"Political Party"', party);
      }
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    query = query
      .order('"Voter ID"', { ascending: true })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Clean up party data and calculate age
    const cleanedData = data?.map(voter => {
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
    }) || [];

    const totalVoters = count || 0;
    const totalPages = Math.ceil(totalVoters / pageSize);

    console.log(`Successfully fetched ${cleanedData.length} voters (page ${page}, total count: ${totalVoters})`);

    return NextResponse.json({
      voters: cleanedData,
      totalPages,
      totalVoters
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error occurred'
    }, { status: 500 });
  }
}
