import { NextResponse } from 'next/server';
import { resetData } from '@/lib/data-store';
import { users } from '@/lib/auth-store'; // Assuming users are separate and not reset
import { seedInitialUsers } from '@/lib/auth-store';

export async function POST() {
  try {
    resetData();
    // Assuming you might want to reset users as well, or have a separate mechanism
    // For now, let's assume users are not reset, but if they were, it would be:
    // seedInitialUsers();
    
    return NextResponse.json({ message: 'Demo data has been reset successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Failed to reset data:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to reset data', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred during data reset' }, { status: 500 });
  }
}
