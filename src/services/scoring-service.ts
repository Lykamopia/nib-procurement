

import { quotations, requisitions, auditLogs } from '@/lib/data-store';
import { EvaluationCriteria, Quotation } from '@/lib/types';

function calculateFinalScore(quote: Quotation, criteria: EvaluationCriteria): number {
    let totalFinancialScore = 0;
    let totalTechnicalScore = 0;

    criteria.financialCriteria.forEach(c => {
        const score = quote.scores?.find(s => s.financialScores.some(fs => fs.criterionId === c.id))
                         ?.financialScores.find(fs => fs.criterionId === c.id)?.score || 0;
        totalFinancialScore += score * (c.weight / 100);
    });

    criteria.technicalCriteria.forEach(c => {
         const score = quote.scores?.find(s => s.technicalScores.some(ts => ts.criterionId === c.id))
                         ?.technicalScores.find(ts => ts.criterionId === c.id)?.score || 0;
        totalTechnicalScore += score * (c.weight / 100);
    });

    const finalScore = (totalFinancialScore * (criteria.financialWeight / 100)) + 
                       (totalTechnicalScore * (criteria.technicalWeight / 100));

    return finalScore;
}


export function tallyAndAwardScores(requisitionId: string) {
    const requisition = requisitions.find(r => r.id === requisitionId);
    if (!requisition || !requisition.evaluationCriteria) {
        console.error("Scoring service: Requisition or its criteria not found.");
        return;
    }

    const relevantQuotes = quotations.filter(q => q.requisitionId === requisitionId);

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
    requisition.updatedAt = new Date();

    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: 'System',
        role: 'Admin',
        action: 'AUTO_AWARD',
        entity: 'Requisition',
        entityId: requisitionId,
        details: `Automatically awarded quotes based on committee scores. Winner: ${relevantQuotes[0]?.vendorName || 'N/A'}.`,
    });
}
