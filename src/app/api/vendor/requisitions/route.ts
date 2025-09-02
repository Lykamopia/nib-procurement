
import { NextResponse } from 'next/server';
import { requisitions } from '@/lib/data-store';
import { getUserByToken } from '@/lib/auth';

// This endpoint is for vendors to see requisitions they can quote on.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const userData = await getUserByToken(token);

    // We check if the user is a vendor, but don't filter requisitions by vendor.
    if (!userData || userData.role !== 'Vendor') {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return all requisitions that are in a state ready for quotation.
    const openRequisitions = requisitions.filter(
        (r) => r.status === 'Approved' || r.status === 'RFQ In Progress'
    );
    
    return NextResponse.json(openRequisitions, {
        headers: {
            'Cache-Control': 'no-store',
        }
    });

  } catch (error) {
    console.error('Failed to fetch vendor requisitions:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
