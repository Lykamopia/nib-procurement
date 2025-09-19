
import prisma from '@/lib/prisma';
import { EvaluationCriteria, Quotation } from '@/lib/types';


export async function tallyAndAwardScores(requisitionId: string, awardResponseDeadline?: Date, awardResponseDurationMinutes?: number): Promise<{ success: boolean, message: string, winner: string }> {
    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      include: {
        evaluationCriteria: {
          include: {
            financialCriteria: true,
            technicalCriteria: true,
          },
        },
      },
    });

    if (!requisition) {
        return { success: false, message: "Scoring service: Requisition not found.", winner: 'N/A' };
    }
    
    if (!requisition.evaluationCriteria) {
        return { success: false, message: "Scoring service: Requisition evaluation criteria not found.", winner: 'N/A' };
    }

    const relevantQuotes = await prisma.quotation.findMany({
      where: { requisitionId },
      include: { scores: true },
    });

    if (relevantQuotes.length === 0) {
        return { success: true, message: "No quotes to score.", winner: 'N/A' };
    }
    
    const scoredQuotes = relevantQuotes.map(quote => {
        if (!quote.scores || quote.scores.length === 0) {
            return { ...quote, finalAverageScore: 0 };
        }
        const totalScorers = quote.scores.length;
        const aggregateScore = quote.scores.reduce((sum, scoreSet) => sum + scoreSet.finalScore, 0);
        const finalAverageScore = aggregateScore / totalScorers;
        return { ...quote, finalAverageScore };
    });

    for(const quote of scoredQuotes) {
        await prisma.quotation.update({
            where: { id: quote.id },
            data: { finalAverageScore: quote.finalAverageScore }
        });
    }

    scoredQuotes.sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));

    for (let i = 0; i < scoredQuotes.length; i++) {
        const quote = scoredQuotes[i];
        let status: 'Awarded' | 'Standby' | 'Rejected' = 'Rejected';
        let rank: 1 | 2 | 3 | null = null;
        if (i === 0) {
            status = 'Awarded';
            rank = 1;
        } else if (i === 1 || i === 2) {
            status = 'Standby';
            rank = (i + 1) as 2 | 3;
        }
        await prisma.quotation.update({
            where: { id: quote.id },
            data: { status, rank }
        });
    }
    
    await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'RFQ_In_Progress',
        awardResponseDeadline: awardResponseDeadline,
        awardResponseDurationMinutes: awardResponseDurationMinutes,
        updatedAt: new Date(),
      }
    });


    const winnerName = scoredQuotes[0]?.vendorName || 'N/A';
    
    return { success: true, message: "Scores tallied and awards processed.", winner: winnerName };
}
