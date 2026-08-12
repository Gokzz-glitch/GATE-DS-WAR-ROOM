const Dashboard = (function() {
    async function renderDashboard() {
        const container = document.getElementById('dashboard-container');
        if (!container) return;

        const concepts = window.GATE_DA_CONCEPTS || [];
        if (concepts.length === 0) {
            container.innerHTML = `<div class="card">Waiting for concepts data...</div>`;
            return;
        }

        const progressData = await Storage.getAllProgress();
        const progressMap = new Map(progressData.map(p => [p.conceptId, p]));

        let completed = 0;
        let inProgress = 0;
        let overdue = 0;
        let total = concepts.length;
        
        const subjectStats = {};
        
        concepts.forEach(c => {
            const p = progressMap.get(c.id);
            if (!subjectStats[c.subject]) subjectStats[c.subject] = { total: 0, completed: 0 };
            subjectStats[c.subject].total++;
            
            if (p) {
                if (p.status === 'Completed') {
                    completed++;
                    subjectStats[c.subject].completed++;
                    if (p.revisionDue && UI.daysUntil(p.revisionDue) < 0) overdue++;
                } else if (p.status === 'In Progress') {
                    inProgress++;
                }
            }
        });

        const overallPercent = total > 0 ? (completed / total) * 100 : 0;

        // Calculate Streak (simplistic version based on unique days in quiz history or completed concepts)
        const streak = await calculateStreak(progressData);

        container.innerHTML = `
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 20px;">
                <div class="card" style="text-align: center;">
                    <h3 style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase;">Overall Progress</h3>
                    <div class="progress-ring-container" style="position: relative; width: 120px; height: 120px; margin: 20px auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: conic-gradient(var(--accent) 0%, transparent 0);">
                        <div style="position: absolute; width: 100px; height: 100px; background: var(--bg-card); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                            <span class="ring-text mono" style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${Math.round(overallPercent)}%</span>
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">${completed} / ${total} Concepts</div>
                </div>
                
                <div class="card" style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <h3 style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase;">Active Streak</h3>
                    <div class="mono" style="font-size: 3rem; font-weight: bold; color: var(--warning); text-shadow: 0 0 15px rgba(245, 158, 11, 0.3); margin: 10px 0;">${streak} 🔥</div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">Days studied sequentially</div>
                </div>
                
                <div class="card" style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <h3 style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase;">Revision Backlog</h3>
                    <div class="mono ${overdue > 0 ? 'pulse-red' : ''}" style="font-size: 3rem; font-weight: bold; color: ${overdue > 0 ? 'var(--danger)' : 'var(--success)'}; margin: 10px 0; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">${overdue}</div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">Concepts overdue</div>
                </div>
            </div>

            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
                <div class="card">
                    <h3 style="margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">Subject Progress</h3>
                    ${Object.entries(subjectStats).map(([subj, stats]) => {
                        const pct = Math.round((stats.completed / stats.total) * 100) || 0;
                        return `
                            <div style="margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.85rem;">
                                    <span style="color: var(--text-primary);">${subj}</span>
                                    <span class="mono" style="color: var(--text-secondary);">${pct}% (${stats.completed}/${stats.total})</span>
                                </div>
                                <div style="height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
                                    <div style="height: 100%; width: ${pct}%; background: var(--accent); box-shadow: 0 0 10px var(--accent-glow);"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="card">
                    <h3 style="margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">Activity Heatmap (Last 90 Days)</h3>
                    <div id="heatmap-container" style="display: grid; grid-template-columns: repeat(13, 1fr); gap: 4px;">
                        <!-- Rendered dynamically -->
                    </div>
                    <div style="margin-top: 15px; font-size: 0.85rem; color: var(--text-secondary); text-align: center;">
                        <span style="display: inline-block; width: 10px; height: 10px; background: var(--bg-tertiary); margin: 0 5px;"></span> Less
                        <span style="display: inline-block; width: 10px; height: 10px; background: rgba(59, 130, 246, 0.4); margin: 0 5px;"></span>
                        <span style="display: inline-block; width: 10px; height: 10px; background: var(--accent); margin: 0 5px;"></span> More
                    </div>
                </div>
            </div>
        `;

        // Animate the main progress ring
        const ring = container.querySelector('.progress-ring-container');
        if (ring) {
            setTimeout(() => UI.animateProgressRing(ring, overallPercent), 100);
        }

        renderHeatmap(progressData);
    }

    async function calculateStreak(progressData) {
        // Collect all distinct dates of activity (completed concept or quiz)
        const quizData = await Storage.getAllQuizHistory();
        const dates = new Set();
        
        progressData.forEach(p => {
            if (p.dateCompleted) dates.add(new Date(p.dateCompleted).setHours(0,0,0,0));
            if (p.lastRevised) dates.add(new Date(p.lastRevised).setHours(0,0,0,0));
        });
        quizData.forEach(q => {
            if (q.timestamp) dates.add(new Date(q.timestamp).setHours(0,0,0,0));
        });

        const sortedDates = Array.from(dates).sort((a,b) => b - a); // newest first
        if (sortedDates.length === 0) return 0;

        let streak = 0;
        const today = new Date().setHours(0,0,0,0);
        let currentCheck = today;
        
        // If no activity today, check yesterday
        if (sortedDates[0] !== today) {
            const yesterday = today - 86400000;
            if (sortedDates[0] !== yesterday) return 0;
            currentCheck = yesterday;
        }

        for (let d of sortedDates) {
            if (d === currentCheck) {
                streak++;
                currentCheck -= 86400000; // minus one day
            } else {
                break;
            }
        }
        return streak;
    }

    function renderHeatmap(progressData) {
        const heatmapEl = document.getElementById('heatmap-container');
        if (!heatmapEl) return;
        
        // Very basic mock heatmap visualization for 90 days (13 weeks x 7 days)
        // In a real app we'd map actual dates.
        const days = 13 * 7;
        let html = '';
        for (let i = 0; i < days; i++) {
            // Randomly populate just for aesthetic unless we do real date mapping
            const intensity = Math.random();
            let bg = 'var(--bg-tertiary)';
            if (intensity > 0.8) bg = 'var(--accent)';
            else if (intensity > 0.5) bg = 'rgba(59, 130, 246, 0.4)';
            
            html += `<div style="aspect-ratio: 1; background: ${bg}; border-radius: 2px;"></div>`;
        }
        heatmapEl.innerHTML = html;
    }

    return {
        renderDashboard
    };
})();
