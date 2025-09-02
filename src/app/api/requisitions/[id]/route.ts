
'use server';

import { NextResponse } from 'next/server';
import { requisitions } from '@/lib/data-store';


export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`GET /api/requisitions/${params.id}`);
  try {
    const { id } = params;
    const requisition = requisitions.find((r) => r.id === id);

    if (!requisition) {
      console.error(`Requisition with ID ${id} not found.`);
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }
    
    console.log('Found requisition:', requisition);
    return NextResponse.json(requisition);
  } catch (error) {
     console.error('Failed to fetch requisition:', error);
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
