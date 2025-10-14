

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/services/email-service';
import { User } from '@/lib/types';
import { differenceInMinutes } from 'date-fns';

// This entire file is now deprecated. The logic has been moved to the PATCH handler in /api/requisitions/route.ts
// to handle committee approvals and notifications in a single place.

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.warn("DEPRECATED: /api/requisitions/[id]/finalize-scores is no longer used.");
  return NextResponse.json({ message: "This endpoint is deprecated." }, { status: 410 });
}
