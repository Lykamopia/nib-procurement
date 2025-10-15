
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EvaluationCriterion, ItemScore, User } from '@/lib/types';

function calculateFinalItemScore(itemScore: any, criteria: any): { finalScore: number, allScores: any[] } {
    let totalScore = 0;
    
    // Combine financial and technical scores into one array for easier processing
    const allScores = [
        ...(itemScore.financialScores || []).map((s: any) => ({...s, type: 'FINANCIAL'})),
        ...(itemScore.technicalScores || []).map((s: any) => ({...s, type: 'TECHNICAL'}))
    ];

    const allCriteria: {id: string, weight: number, type: 'FINANCIAL' | 'TECHNICAL'}[] = [
        ...criteria.financialCriteria.map((c: any) => ({...c, type: 'FINANCIAL'})),
        ...criteria.technicalCriteria.map((c: any) => ({...c, type: 'TECHNICAL'}))
    ];
    
    allScores.forEach((s: any) => {
        const criterion = allCriteria.find(c => c.id === s.criterionId);
        if (criterion) {
            const overallWeight = criterion.type === 'FINANCIAL' ? criteria.financialWeight : criteria.technicalWeight;
            totalScore += s.score * (criterion.weight / 100) * (overallWeight / 100);
        }
    });

    return { finalScore: totalScore, allScores };
}


export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const quoteId = params.id;
  try {
    const body = await request.json();
    const { scores, userId } = body;

    const user: User | null = await prisma.user.findUnique({ where: { id: userId } });
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
    
    // Use upsert to create or find the score set for this user and quote
    const scoreSet = await prisma.committeeScoreSet.upsert({
        where: {
            quotationId_scorerId: {
                quotationId: quoteId,
                scorerId: userId,
            }
        },
        update: {
            committeeComment: scores.committeeComment,
        },
        create: {
            quotation: { connect: { id: quoteId } },
            scorer: { connect: { id: user.id } },
            scorerName: user.name,
            committeeComment: scores.committeeComment,
            finalScore: 0, // Will be updated later
        }
    });

    // Delete previous scores for this set to avoid duplicates on resubmission
    await prisma.itemScore.deleteMany({ where: { scoreSetId: scoreSet.id }});

    let totalWeightedScore = 0;
    const totalItems = scores.itemScores.length;

    for (const itemScore of scores.itemScores) {
         const { finalScore, allScores } = calculateFinalItemScore(itemScore, requisition.evaluationCriteria);
         totalWeightedScore += finalScore;

         await prisma.itemScore.create({
            data: {
                scoreSet: { connect: { id: scoreSet.id } },
                quoteItemId: itemScore.quoteItemId,
                quoteItem: {
                    connect: {
                        id: itemScore.quoteItemId,
                    }
                },
                finalScore: finalScore,
                scores: {
                    create: allScores.map((s: any) => ({
                        criterionId: s.criterionId,
                        score: s.score,
                        comment: s.comment,
                        type: requisition.evaluationCriteria?.financialCriteria.some(c => c.id === s.criterionId) ? 'FINANCIAL' : 'TECHNICAL'
                    }))
                }
            }
        });
    }

    const finalAverageScoreForThisScorer = totalItems > 0 ? totalWeightedScore / totalItems : 0;
    
    await prisma.committeeScoreSet.update({
        where: { id: scoreSet.id },
        data: { finalScore: finalAverageScoreForThisScorer }
    });
    
    // Recalculate the overall average score for the quotation across all scorers
    const allScoreSetsForQuote = await prisma.committeeScoreSet.findMany({ where: { quotationId: quoteId } });
    const overallAverage = allScoreSetsForQuote.length > 0 
        ? allScoreSetsForQuote.reduce((acc, s) => acc + s.finalScore, 0) / allScoreSetsForQuote.length
        : 0;

    await prisma.quotation.update({ where: { id: quoteId }, data: { finalAverageScore: overallAverage } });


    await prisma.auditLog.create({
        data: {
            user: { connect: { id: user.id } },
            action: 'SCORE_QUOTE',
            entity: 'Quotation',
            entityId: quoteId,
            details: `Submitted scores for quote from ${quoteToUpdate.vendorName}. Final Score: ${finalAverageScoreForThisScorer.toFixed(2)}.`,
        }
    });

    return NextResponse.json(scoreSet);
  } catch (error) {
    console.error('Failed to submit scores:', error);
    if (error instanceof Error) {
        // Check for unique constraint violation
        if ((error as any).code === 'P2002') {
             return NextResponse.json({ error: 'A unique constraint violation occurred. This might be due to a duplicate score entry.'}, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
