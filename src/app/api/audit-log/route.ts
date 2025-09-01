
import { NextResponse } from 'next/server';
import { auditLogs } from '@/lib/data-store';

export async function GET() {
  return NextResponse.json(auditLogs);
}
