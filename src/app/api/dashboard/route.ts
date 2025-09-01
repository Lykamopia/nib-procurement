import { NextResponse } from 'next/server';

export async function GET() {
  // In a real application, you would fetch this data from a database or other services.
  const mockData = {
    openRequisitions: 12,
    pendingApprovals: 8,
    budgetStatus: {
      spent: 156345,
      total: 250000,
    },
    pendingPayments: 4,
  };

  return NextResponse.json(mockData);
}
