const Analytics = (function() {
    async function renderAnalytics() {
        const container = document.getElementById('analytics-container');
        if (!container) return;

        const concepts = window.GATE_DA_CONCEPTS || [];
        const progressData = await Storage.getAllProgress();
        const quizHistory = await Storage.getAllQuizHistory();

        if (concepts.length === 0) {
            container.innerHTML = `<div class="card">No concept data available.</div>`;
            return;
        }

        // Calculate stats
        let totalCompleted = 0;
        let onTimeRevisions = 0;
        let lateRevisions = 0;
        
        progressData.forEach(p => {
            if (p.status === 'Completed') totalCompleted++;
            if (p.revisionCount > 0) {
                // In a real app we'd track timestamp of revision vs due date.
                // Simulating compliance based on current overdue status
                if (p.revisionDue && UI.daysUntil(p.revisionDue) < 0) lateRevisions++;
                else onTimeRevisions++;
            }
        });

        const revCompliance = (onTimeRevisions + lateRevisions) > 0 
            ? Math.round((onTimeRevisions / (onTimeRevisions + lateRevisions)) * 100) 
            : 100;

        // Detect weak areas based on quiz history
        const weakConcepts = [];
        const conceptMap = new Map(concepts.map(c => [c.id, c]));
        
        const conceptScores = {};
        quizHistory.forEach(q => {
            if (!conceptScores[q.conceptId]) conceptScores[q.conceptId] = { total: 0, score: 0 };
            conceptScores[q.conceptId].total += q.total;
            conceptScores[q.conceptId].score += q.score;
        });

        Object.entries(conceptScores).forEach(([id, stats]) => {
            const accuracy = stats.score / stats.total;
            if (accuracy < 0.6 && stats.total > 0) {
                const c = conceptMap.get(id);
                if (c) weakConcepts.push({ name: c.concept, accuracy: Math.round(accuracy * 100) });
            }
        });

        // Calculate projected finish
        let projectedFinishText = 'Need more data';
        const totalConcepts = concepts.length;
        const remaining = totalConcepts - totalCompleted;
        if (remaining === 0 && totalConcepts > 0) {
            projectedFinishText = 'Completed!';
        } else if (progressData.length > 0 && totalCompleted > 0) {
            const firstEntry = progressData.reduce((min, p) => p.startedAt && p.startedAt < min ? p.startedAt : min, Date.now());
            const daysSinceFirst = Math.max(1, (Date.now() - firstEntry) / (1000 * 60 * 60 * 24));
            const dailyRate = Math.max(1, totalCompleted / daysSinceFirst);
            const daysRemaining = remaining / dailyRate;
            const finishDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
            projectedFinishText = finishDate.toISOString().split('T')[0];
        }

        container.innerHTML = `
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); margin-bottom: 20px;">
                <div class="card">
                    <h3 style="margin-bottom: 15px; color: var(--accent);">Pace & Compliance</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                        <span>Completion Pace</span>
                        <span class="mono" style="color: var(--success);">${totalCompleted > 0 ? 'Optimal' : 'Needs Data'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                        <span>Revision Compliance</span>
                        <span class="mono" style="color: ${revCompliance > 80 ? 'var(--success)' : 'var(--warning)'};">${revCompliance}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Projected Finish</span>
                        <span class="mono">${projectedFinishText}</span>
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 15px; color: var(--danger);">Critical Weaknesses</h3>
                    ${weakConcepts.length > 0 ? weakConcepts.map(w => `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; background: rgba(239, 68, 68, 0.1); padding: 8px 12px; border-radius: 4px; border-left: 3px solid var(--danger);">
                            <span>${w.name}</span>
                            <span class="mono" style="color: var(--danger);">${w.accuracy}% Accuracy</span>
                        </div>
                    `).join('') : '<div style="color: var(--text-secondary); font-style: italic;">No critical weaknesses detected yet. Take more quizzes.</div>'}
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 15px;">AI Strategy Insights</h3>
                <div id="ai-insights" style="background: var(--bg-tertiary); padding: 15px; border-radius: 4px; border: 1px solid var(--border); color: var(--text-secondary);">
                    Click 'Generate Insights' to analyze your performance using the AI Mentor.
                </div>
                <button class="btn btn-primary" style="margin-top: 15px;" onclick="Analytics.generateInsights()">Generate Insights</button>
            </div>
        `;
    }

    async function generateInsights() {
        const insightsDiv = document.getElementById('ai-insights');
        if (!insightsDiv) return;

        insightsDiv.innerHTML = '<span class="pulse-red" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--accent);"></span> Analyzing performance patterns...';

        try {
            const prompt = "Analyze my current progress. Identify structural weaknesses based on the fact that I'm taking the GATE DA exam. Provide 3 highly actionable pieces of advice for the next 7 days. Keep it concise, brutal, and military style.";
            const system = "You are the analytics module of GATE DA War Room. Provide direct analysis.";
            
            if (!window.Mentor) throw new Error("Mentor module not loaded");
            const response = await window.Mentor.callGeminiWithRotation(prompt, system);
            
            insightsDiv.innerHTML = response
                .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>')
                .replace(/\n/g, '<br>');
                
        } catch (e) {
            insightsDiv.innerHTML = `<span style="color:var(--danger);">Analysis failed: ${e.message}</span>`;
        }
    }

    return {
        renderAnalytics,
        generateInsights
    };
})();
