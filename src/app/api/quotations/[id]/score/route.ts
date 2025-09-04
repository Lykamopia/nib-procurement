
'use server';

import { NextResponse } from 'next/server';
import { auditLogs, quotations, requisitions, users } from '@/lib/data-store';
import { CommitteeScoreSet, EvaluationCriterion, Score } from '@/lib/types';
import { tallyAndAwardScores } from '@/services/scoring-service';


function calculateFinalScore(scores: { financialScores: Score[], technicalScores: Score[] }, criteria: any): number {
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

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const quoteToUpdate = quotations.find(q => q.id === quoteId);
    if (!quoteToUpdate) {
        return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }
    
    const requisition = requisitions.find(r => r.id === quoteToUpdate.requisitionId);
    if (!requisition || !requisition.evaluationCriteria) {
        return NextResponse.json({ error: 'Associated requisition or its evaluation criteria not found.' }, { status: 404 });
    }

    if (!quoteToUpdate.scores) {
        quoteToUpdate.scores = [];
    }

    // Prevent duplicate scoring
    if (quoteToUpdate.scores.some(s => s.scorerId === userId)) {
        return NextResponse.json({ error: 'You have already scored this quotation.' }, { status: 409 });
    }

    const finalScore = calculateFinalScore(scores, requisition.evaluationCriteria);

    const newScoreSet: CommitteeScoreSet = {
        scorerId: user.id,
        scorerName: user.name,
        financialScores: scores.financialScores,
        technicalScores: scores.technicalScores,
        committeeComment: scores.committeeComment,
        finalScore,
    };
    
    quoteToUpdate.scores.push(newScoreSet);

    // After scoring, run the tally and award logic
    tallyAndAwardScores(quoteToUpdate.requisitionId);

    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'SCORE_QUOTE',
        entity: 'Quotation',
        entityId: quoteId,
        details: `Submitted scores for quote from ${quoteToUpdate.vendorName}. Final Score: ${finalScore.toFixed(2)}.`,
    });

    return NextResponse.json(quoteToUpdate);
  } catch (error) {
    console.error('Failed to submit scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
