

import { quotations, requisitions, auditLogs } from '@/lib/data-store';
import { EvaluationCriteria, Quotation } from '@/lib/types';


export function tallyAndAwardScores(requisitionId: string, awardResponseDeadline?: Date): { success: boolean, message: string, winner: string } {
    const requisition = requisitions.find(r => r.id === requisitionId);
    if (!requisition) {
        return { success: false, message: "Scoring service: Requisition not found.", winner: 'N/A' };
    }
    
    if (!requisition.evaluationCriteria) {
        return { success: false, message: "Scoring service: Requisition evaluation criteria not found.", winner: 'N/A' };
    }

    const relevantQuotes = quotations.filter(q => q.requisitionId === requisitionId);
    if (relevantQuotes.length === 0) {
        return { success: true, message: "No quotes to score.", winner: 'N/A' };
    }

    relevantQuotes.forEach(quote => {
        if (!quote.scores || quote.scores.length === 0) {
            quote.finalAverageScore = 0;
            return;
        }

        const totalScorers = quote.scores.length;
        const aggregateScore = quote.scores.reduce((sum, scoreSet) => sum + scoreSet.finalScore, 0);
        quote.finalAverageScore = aggregateScore / totalScorers;
    });

    // Sort quotes by final average score, descending
    relevantQuotes.sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));

    // Award, Standby, Reject
    relevantQuotes.forEach((quote, index) => {
        if (index === 0) {
            quote.status = 'Awarded';
            quote.rank = 1;
        } else if (index === 1 || index === 2) {
            quote.status = 'Standby';
            quote.rank = (index + 1) as 2 | 3;
        } else {
            quote.status = 'Rejected';
            quote.rank = undefined;
        }
    });
    
    requisition.status = 'RFQ In Progress';
    requisition.awardResponseDeadline = awardResponseDeadline;
    requisition.updatedAt = new Date();

    const winnerName = relevantQuotes[0]?.vendorName || 'N/A';
    
    return { success: true, message: "Scores tallied and awards processed.", winner: winnerName };
}
