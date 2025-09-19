
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addDays } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requisitionId = searchParams.get('requisitionId');
  console.log(`GET /api/quotations - Fetching quotes for requisitionId: ${requisitionId}`);

  if (!requisitionId) {
    console.error('Requisition ID is required');
    return NextResponse.json({ error: 'Requisition ID is required' }, { status: 400 });
  }

  const reqQuotations = await prisma.quotation.findMany({ 
      where: { requisitionId },
      include: {
          items: true,
          answers: true,
          scores: {
            include: {
                financialScores: true,
                technicalScores: true
            }
          }
      },
      orderBy: { createdAt: 'asc' }
    });
  console.log(`Found ${reqQuotations.length} quotations for requisition ${requisitionId}.`);
  return NextResponse.json(reqQuotations);
}


export async function POST(request: Request) {
  console.log('POST /api/quotations - Creating new quotation.');
  try {
    const body = await request.json();
    console.log('Request Body:', body);
    const { requisitionId, vendorId, items, notes, answers, cpoDocumentUrl } = body;

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      console.error('Vendor not found for ID:', vendorId);
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    console.log('Found vendor:', vendor);
    
    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId } });
    if (!requisition) {
      console.error('Requisition not found for ID:', requisitionId);
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }
    console.log('Found requisition:', requisition);

    const existingQuote = await prisma.quotation.findFirst({
        where: { requisitionId, vendorId }
    });
    if (existingQuote) {
        console.error(`Vendor ${vendorId} has already submitted a quote for requisition ${requisitionId}.`);
        return NextResponse.json({ error: 'You have already submitted a quote for this requisition.' }, { status: 409 });
    }


    let totalPrice = 0;
    let maxLeadTime = 0;
    items.forEach((item: any) => {
        totalPrice += item.unitPrice * item.quantity;
        if (item.leadTimeDays > maxLeadTime) {
            maxLeadTime = item.leadTimeDays;
        }
    });

    const newQuotation = await prisma.quotation.create({
        data: {
            requisition: { connect: { id: requisitionId } },
            vendor: { connect: { id: vendorId } },
            vendorName: vendor.name,
            items: {
                create: items.map((item: any) => ({
                    requisitionItemId: item.requisitionItemId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice),
                    leadTimeDays: Number(item.leadTimeDays),
                    brandDetails: item.brandDetails
                }))
            },
            totalPrice,
            deliveryDate: addDays(new Date(), maxLeadTime),
            status: 'Submitted',
            notes: notes,
            answers: {
                create: answers?.map((answer: any) => ({
                    questionId: answer.questionId,
                    answer: answer.answer,
                }))
            },
            cpoDocumentUrl: cpoDocumentUrl,
        }
    });

    console.log('Created new quotation:', newQuotation);
    
    await prisma.auditLog.create({
        data: {
            user: { connect: { id: vendor.userId } },
            role: 'Vendor',
            action: 'SUBMIT_QUOTATION',
            entity: 'Quotation',
            entityId: newQuotation.id,
            details: `Submitted quotation from ${vendor.name} for requisition ${requisitionId}.`,
        }
    });


    return NextResponse.json(newQuotation, { status: 201 });
  } catch (error) {
    console.error('Failed to create quotation:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process quotation', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
