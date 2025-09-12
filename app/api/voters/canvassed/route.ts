import { NextRequest, NextResponse } from 'next/server';
import { dbUtils } from '../../../../lib/database';

export async function PUT(request: NextRequest) {
  try {
    const { voterId, canvassed } = await request.json();

    if (!voterId || typeof canvassed !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request. voterId and canvassed (boolean) are required.' },
        { status: 400 }
      );
    }

    const result = dbUtils.updateCanvassedStatus(voterId, canvassed);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Voter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Voter ${voterId} marked as ${canvassed ? 'canvassed' : 'not canvassed'}` 
    });

  } catch (error) {
    console.error('Error updating canvassed status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
