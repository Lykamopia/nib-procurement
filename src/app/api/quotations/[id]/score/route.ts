
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvaluationCriterion } from '@/lib/types';

function calculateFinalScore(scores: { financialScores: any[], technicalScores: any[] }, criteria: any): number {
    let totalFinancialScore = 0;
    let totalTechnicalScore = 0;

    criteria.financialCriteria.forEach((c: EvaluationCriterion) => {
        const score = scores.financialScores.find(s => s.criterionId === c.id)?.score || 0;
        totalFinancialScore += score * (c.weight / 100);
    });

    criteria.technicalCriteria.forEach((c: EvaluationCriterion) => {
        const score = scores.technicalScores.find(s => s.criterionId === c.id)?.score || 0;
        totalTechnicalScore += score * (c.weight / 100);
    });

    const finalScore = (totalFinancialScore * (criteria.financialWeight / 100)) + 
                       (totalTechnicalScore * (criteria.technicalWeight / 100));

    return finalScore;
}


export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const quoteId = params.id;
  try {
    const body = await request.json();
    const { scores, userId } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const quoteToUpdate = await prisma.quotation.findUnique({ where: { id: quoteId }});
    if (!quoteToUpdate) {
        return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }
    
    const requisition = await prisma.purchaseRequisition.findUnique({ 
      where: { id: quoteToUpdate.requisitionId },
      include: { evaluationCriteria: { include: { financialCriteria: true, technicalCriteria: true } } }
    });
    if (!requisition || !requisition.evaluationCriteria) {
        return NextResponse.json({ error: 'Associated requisition or its evaluation criteria not found.' }, { status: 404 });
    }

    const existingScore = await prisma.committeeScoreSet.findFirst({
        where: { quotationId: quoteId, scorerId: userId }
    });

    if (existingScore) {
        return NextResponse.json({ error: 'You have already scored this quotation.' }, { status: 409 });
    }

    const finalScore = calculateFinalScore(scores, requisition.evaluationCriteria);

    const newScoreSet = await prisma.committeeScoreSet.create({
        data: {
            scorer: { connect: { id: user.id } },
            quotation: { connect: { id: quoteId } },
            financialScores: {
                create: scores.financialScores.map((s: any) => ({
                    criterion: { connect: { id: s.criterionId } },
                    score: s.score,
                    comment: s.comment,
                }))
            },
            technicalScores: {
                create: scores.technicalScores.map((s: any) => ({
                    criterion: { connect: { id: s.criterionId } },
                    score: s.score,
                    comment: s.comment,
                }))
            },
            committeeComment: scores.committeeComment,
            finalScore,
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'SCORE_QUOTE',
            entity: 'Quotation',
            entityId: quoteId,
            details: `Submitted scores for quote from ${quoteToUpdate.vendorName}. Final Score: ${finalScore.toFixed(2)}.`,
        }
    });

    return NextResponse.json(newScoreSet);
  } catch (error) {
    console.error('Failed to submit scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
