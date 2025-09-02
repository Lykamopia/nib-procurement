

import { NextResponse } from 'next/server';
import { quotations, requisitions, vendors, auditLogs, users } from '@/lib/data-store';
import { Quotation } from '@/lib/types';
import { addDays } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requisitionId = searchParams.get('requisitionId');
  console.log(`GET /api/quotations - Fetching quotes for requisitionId: ${requisitionId}`);

  if (!requisitionId) {
    console.error('Requisition ID is required');
    return NextResponse.json({ error: 'Requisition ID is required' }, { status: 400 });
  }

  const reqQuotations = quotations.filter(q => q.requisitionId === requisitionId);
  console.log(`Found ${reqQuotations.length} quotations for requisition ${requisitionId}.`);
  return NextResponse.json(reqQuotations);
}


export async function POST(request: Request) {
  console.log('POST /api/quotations - Creating new quotation.');
  try {
    const body = await request.json();
    console.log('Request Body:', body);
    const { requisitionId, vendorId, items, notes } = body;

    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) {
      console.error('Vendor not found for ID:', vendorId);
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const user = users.find(u => u.id === vendor.userId);
    const actorName = user ? user.name : vendor.name; // Fallback to vendor name

    const requisition = requisitions.find(r => r.id === requisitionId);
    if (!requisition) {
      console.error('Requisition not found for ID:', requisitionId);
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
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
    console.log('Created new quotation:', newQuotation);
    
    if (!requisition.quotations) {
        requisition.quotations = [];
    }
    requisition.quotations.push(newQuotation);

    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: actorName,
        role: user ? user.role : 'Vendor',
        action: 'SUBMIT_QUOTATION',
        entity: 'Quotation',
        entityId: newQuotation.id,
        details: `Submitted quotation from ${vendor.name} for requisition ${requisitionId}.`,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);


    return NextResponse.json(newQuotation, { status: 201 });
  } catch (error) {
    console.error('Failed to create quotation:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process quotation', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
