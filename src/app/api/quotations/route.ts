
import { NextResponse } from 'next/server';
import { quotations, requisitions, vendors } from '@/lib/data-store';
import { Quotation } from '@/lib/types';
import { addDays } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requisitionId = searchParams.get('requisitionId');

  if (!requisitionId) {
    return NextResponse.json({ error: 'Requisition ID is required' }, { status: 400 });
  }

  const reqQuotations = quotations.filter(q => q.requisitionId === requisitionId);
  return NextResponse.json(reqQuotations);
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requisitionId, vendorId, items, notes } = body;

    const requisition = requisitions.find(r => r.id === requisitionId);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    let totalPrice = 0;
    let maxLeadTime = 0;
    const quoteItems = items.map((item: any) => {
        totalPrice += item.unitPrice * item.quantity;
        if (item.leadTimeDays > maxLeadTime) {
            maxLeadTime = item.leadTimeDays;
        }
        return {
            requisitionItemId: item.requisitionItemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            leadTimeDays: Number(item.leadTimeDays),
        };
    });

    const newQuotation: Quotation = {
      id: `QUO-${Date.now()}`,
      requisitionId,
      vendorId,
      vendorName: vendor.name,
      items: quoteItems,
      totalPrice,
      deliveryDate: addDays(new Date(), maxLeadTime),
      createdAt: new Date(),
      status: 'Submitted',
      notes: notes,
    };

    quotations.unshift(newQuotation);
    
    // Also add to the requisition for easy access
    if (!requisition.quotations) {
        requisition.quotations = [];
    }
    requisition.quotations.push(newQuotation);


    // In a real app, you would add an audit log entry here.

    return NextResponse.json(newQuotation, { status: 201 });
  } catch (error) {
    console.error('Failed to create quotation:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process quotation', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
