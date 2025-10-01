

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EvaluationCriterion, ItemScore } from '@/lib/types';

function calculateFinalItemScore(itemScore: any, criteria: any): number {
    let totalFinancialScore = 0;
    let totalTechnicalScore = 0;

    criteria.financialCriteria.forEach((c: EvaluationCriterion) => {
        const score = itemScore.financialScores.find((s: any) => s.criterionId === c.id)?.score || 0;
        totalFinancialScore += score * (c.weight / 100);
    });

    criteria.technicalCriteria.forEach((c: EvaluationCriterion) => {
        const score = itemScore.technicalScores.find((s: any) => s.criterionId === c.id)?.score || 0;
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

    const quoteToUpdate = await prisma.quotation.findUnique({ where: { id: quoteId } });
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
    
    const existingScoreSet = await prisma.committeeScoreSet.findFirst({
        where: {
            quotationId: quoteId,
            scorerId: userId
        }
    });

    if (existingScoreSet) {
        return NextResponse.json({ error: 'You have already scored this quotation.' }, { status: 409 });
    }
    
    let totalWeightedScore = 0;
    const totalItems = scores.itemScores.length;

    const createdScoreSet = await prisma.committeeScoreSet.create({
        data: {
            quotation: { connect: { id: quoteId } },
            scorer: { connect: { id: user.id } },
            scorerName: user.name,
            committeeComment: scores.committeeComment,
            finalScore: 0, // Will be updated later
        }
    });

    for (const itemScore of scores.itemScores) {
         const finalItemScore = calculateFinalItemScore(itemScore, requisition.evaluationCriteria);
         totalWeightedScore += finalItemScore;

         await prisma.itemScore.create({
            data: {
                scoreSet: { connect: { id: createdScoreSet.id } },
                quoteItem: { connect: { id: itemScore.quoteItemId } },
                finalScore: finalItemScore,
                financialScores: {
                    create: itemScore.financialScores.map((s: any) => ({
                        criterionId: s.criterionId,
                        score: s.score,
                        comment: s.comment
                    }))
                },
                technicalScores: {
                    create: itemScore.technicalScores.map((s: any) => ({
                        criterionId: s.criterionId,
                        score: s.score,
                        comment: s.comment
                    }))
                }
            }
        });
    }

    const finalAverageScoreForQuote = totalItems > 0 ? totalWeightedScore / totalItems : 0;
    
    await prisma.committeeScoreSet.update({
        where: { id: createdScoreSet.id },
        data: { finalScore: finalAverageScoreForQuote }
    });
    
    const allScoreSetsForQuote = await prisma.committeeScoreSet.findMany({ where: { quotationId: quoteId } });
    const overallAverage = allScoreSetsForQuote.reduce((acc, s) => acc + s.finalScore, 0) / allScoreSetsForQuote.length;
    await prisma.quotation.update({ where: { id: quoteId }, data: { finalAverageScore: overallAverage } });


    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: 'SCORE_QUOTE',
            entity: 'Quotation',
            entityId: quoteId,
            details: `Submitted scores for quote from ${quoteToUpdate.vendorName}. Final Score: ${finalAverageScoreForQuote.toFixed(2)}.`,
        }
    });

    return NextResponse.json(createdScoreSet);
  } catch (error) {
    console.error('Failed to submit scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
