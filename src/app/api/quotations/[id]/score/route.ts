

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users, auditLogs } from '@/lib/data-store';
import { EvaluationCriterion, QuoteItem } from '@/lib/types';

function calculateFinalScore(scores: { financialScores: any[], technicalScores: any[] }, criteria: any): number {
    let totalFinancialScore = 0;
    let totalTechnicalScore = 0;

    criteria.financialCriteria.forEach((c: EvaluationCriterion) => {
        const score = scores.financialScores.find((s: any) => s.criterionId === c.id)?.score || 0;
        totalFinancialScore += score * (c.weight / 100);
    });

    criteria.technicalCriteria.forEach((c: EvaluationCriterion) => {
        const score = scores.technicalScores.find((s: any) => s.criterionId === c.id)?.score || 0;
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

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const quoteToUpdate = await prisma.quotation.findUnique({ where: { id: quoteId }, include: { items: true } });
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
        where: {
            quotationId: quoteId,
            scorerId: userId
        }
    });

    if (existingScore) {
        return NextResponse.json({ error: 'You have already scored this quotation.' }, { status: 409 });
    }
    
    // Since we are not doing per-item scoring at DB level, aggregate scores from the form.
    // Assuming the form now sends a single set of financial/technical scores.
    // Let's take the first item's scores as the overall scores for simplicity.
    const overallScores = scores.itemScores[0];
    if (!overallScores) {
        return NextResponse.json({ error: 'No scores provided.' }, { status: 400 });
    }

    const finalAverageScoreForQuote = calculateFinalScore(overallScores, requisition.evaluationCriteria);

    const createdScoreSet = await prisma.committeeScoreSet.create({
        data: {
            quotation: { connect: { id: quoteId } },
            scorer: { connect: { id: user.id } },
            scorerName: user.name,
            committeeComment: scores.committeeComment,
            finalScore: finalAverageScoreForQuote,
            financialScores: {
                create: overallScores.financialScores.map((s: any) => ({
                    criterionId: s.criterionId,
                    score: s.score,
                    comment: s.comment
                }))
            },
            technicalScores: {
                 create: overallScores.technicalScores.map((s: any) => ({
                    criterionId: s.criterionId,
                    score: s.score,
                    comment: s.comment
                }))
            }
        }
    });


    const allScoresForQuote = await prisma.committeeScoreSet.findMany({ where: { quotationId: quoteId } });
    const averageScore = allScoresForQuote.reduce((acc, s) => acc + s.finalScore, 0) / allScoresForQuote.length;
    await prisma.quotation.update({ where: { id: quoteId }, data: { finalAverageScore: averageScore } });

    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'SCORE_QUOTE',
        entity: 'Quotation',
        entityId: quoteId,
        details: `Submitted scores for quote from ${quoteToUpdate.vendorName}. Final Score: ${finalAverageScoreForQuote.toFixed(2)}.`,
    });

    return NextResponse.json(createdScoreSet);
  } catch (error) {
    console.error('Failed to submit scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
