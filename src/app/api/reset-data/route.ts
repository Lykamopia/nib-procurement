
import { NextResponse } from 'next/server';
import { resetData } from '@/lib/data-store';

export async function POST() {
  try {
    console.log('POST /api/reset-data - Resetting all application data.');
    resetData();
    return NextResponse.json({ message: 'Demo data has been reset successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Failed to reset data:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to reset data', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred during data reset' }, { status: 500 });
  }
}
