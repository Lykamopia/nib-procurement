
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApprovalThreshold } from '@/lib/types';

export async function GET() {
  try {
    const thresholds = await prisma.approvalThreshold.findMany({
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        min: 'asc'
      }
    });
    return NextResponse.json(thresholds);
  } catch (error) {
    console.error("Failed to fetch approval matrix:", error);
    return NextResponse.json({ error: 'Failed to fetch approval matrix' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newThresholds: ApprovalThreshold[] = await request.json();

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing steps and thresholds
      await tx.approvalStep.deleteMany({});
      await tx.approvalThreshold.deleteMany({});

      const createdThresholds = [];
      for (const tier of newThresholds) {
        const createdThreshold = await tx.approvalThreshold.create({
          data: {
            name: tier.name,
            min: tier.min,
            max: tier.max,
          },
        });

        const stepsToCreate = tier.steps.map((step, index) => ({
          thresholdId: createdThreshold.id,
          role: step.role,
          order: index,
        }));
        
        if(stepsToCreate.length > 0) {
            await tx.approvalStep.createMany({
                data: stepsToCreate,
            });
        }
        
        createdThresholds.push({
            ...createdThreshold,
            steps: stepsToCreate
        });
      }
      return createdThresholds;
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Failed to update approval matrix:", error);
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
