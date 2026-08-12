const Tracker = (function() {
    let currentFilter = { subject: 'all', status: 'all', search: '' };
    let expandedRowId = null;

    async function renderTracker() {
        const container = document.getElementById('tracker-container');
        if (!container) return;

        const concepts = window.GATE_DA_CONCEPTS || [];
        const progressData = await Storage.getAllProgress();
        const progressMap = new Map(progressData.map(p => [p.conceptId, p]));

        // Get subjects for filter
        const subjects = [...new Set(concepts.map(c => c.subject))];

        const missingVideoCount = concepts.filter(c => !c.videoUrl).length;

        let html = `
            <div class="card" style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                <input type="text" class="input" id="tracker-search" placeholder="Search concepts..." style="flex: 1; min-width: 200px;">
                <select class="input" id="tracker-subject" style="width: auto; min-width: 150px;">
                    <option value="all">All Subjects</option>
                    ${subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
                <select class="input" id="tracker-status" style="width: auto; min-width: 150px;">
                    <option value="all">All Status</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                </select>
                <div style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
                    <span class="badge badge-yellow" id="video-missing-badge">${missingVideoCount} concepts need video links</span>
                    <button class="btn" onclick="Tracker.findNextVideo()">Find Videos</button>
                </div>
            </div>
            
            <div class="card" style="overflow-x: auto; padding: 0;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border); background: var(--bg-tertiary);">
                            <th style="padding: 15px;">Subject</th>
                            <th style="padding: 15px;">Concept</th>
                            <th style="padding: 15px;">Status</th>
                            <th style="padding: 15px;">Revision</th>
                            <th style="padding: 15px; width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="tracker-table-body">
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;

        // Attach events
        document.getElementById('tracker-search').addEventListener('input', UI.debounce((e) => {
            currentFilter.search = e.target.value.toLowerCase();
            updateTable(concepts, progressMap);
        }, 300));
        
        document.getElementById('tracker-subject').addEventListener('change', (e) => {
            currentFilter.subject = e.target.value;
            updateTable(concepts, progressMap);
        });

        document.getElementById('tracker-status').addEventListener('change', (e) => {
            currentFilter.status = e.target.value;
            updateTable(concepts, progressMap);
        });

        updateTable(concepts, progressMap);
    }

    function updateTable(concepts, progressMap) {
        const tbody = document.getElementById('tracker-table-body');
        if (!tbody) return;

        let filtered = concepts.filter(c => {
            const p = progressMap.get(c.id) || { status: 'Not Started' };
            const matchSubject = currentFilter.subject === 'all' || c.subject === currentFilter.subject;
            const matchStatus = currentFilter.status === 'all' || p.status === currentFilter.status;
            const matchSearch = currentFilter.search === '' || 
                                c.concept.toLowerCase().includes(currentFilter.search) || 
                                c.subject.toLowerCase().includes(currentFilter.search);
            return matchSubject && matchStatus && matchSearch;
        });

        tbody.innerHTML = filtered.map(c => renderConceptRow(c, progressMap.get(c.id))).join('');
        
        // Attach row action listeners
        tbody.querySelectorAll('.tracker-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                toggleExpandRow(row.dataset.id);
            });
        });
    }

    function renderConceptRow(concept, progress) {
        progress = progress || { status: 'Not Started' };
        
        let statusBadge = `<span class="badge badge-grey">Not Started</span>`;
        if (progress.status === 'In Progress') statusBadge = `<span class="badge badge-blue">In Progress</span>`;
        else if (progress.status === 'Completed') statusBadge = `<span class="badge badge-green">Completed</span>`;

        let revBadge = '-';
        let rowClass = 'tracker-row';
        if (progress.status === 'Completed' && progress.revisionDue) {
            const days = UI.daysUntil(progress.revisionDue);
            if (days < 0) {
                revBadge = `<span class="badge badge-red pulse-red">Overdue</span>`;
            } else if (days <= 2) {
                revBadge = `<span class="badge badge-yellow">Due in ${days}d</span>`;
            } else {
                revBadge = `<span class="badge badge-green">Next: ${UI.formatDate(progress.revisionDue)}</span>`;
            }
        }

        let timestampIcon = progress.skipTimestamp ? ' <span title="Timestamp saved">⏩</span>' : '';

        const isExpanded = expandedRowId === concept.id;
        
        let videoLink = concept.videoUrl || '';
        if (videoLink && progress.skipTimestamp) {
            const secs = timestampToSeconds(progress.skipTimestamp);
            if (secs > 0) {
                const joiner = videoLink.includes('?') ? '&' : '?';
                videoLink += `${joiner}t=${secs}`;
            }
        }
        
        const detailsHtml = isExpanded ? `
            <tr class="tracker-details" style="background: var(--bg-secondary); border-bottom: 1px solid var(--border);">
                <td colspan="5" style="padding: 20px;">
                    <div style="margin-bottom: 15px; color: var(--text-secondary);">${concept.description}</div>
                    <div class="grid" style="grid-template-columns: 1fr 1fr;">
                        <div>
                            <h4 style="margin-bottom: 10px; color: var(--accent);">Resources</h4>
                            ${concept.videoUrl ? `<a href="${videoLink}" target="_blank" style="color: var(--text-primary); text-decoration: none; display: block; margin-bottom: 5px;">🎥 ${concept.videoTitle || 'Watch Video'}</a>` : ''}
                            ${concept.searchUrl ? `<a href="${concept.searchUrl}" target="_blank" style="color: var(--text-primary); text-decoration: none; display: block; margin-bottom: 15px;">🔍 Search Web</a>` : ''}
                            
                            <div style="display: flex; flex-direction: column; gap: 10px; background: var(--bg-primary); padding: 10px; border-radius: 4px; border: 1px solid var(--border);">
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <input type="text" class="input" id="video-input-${concept.id}" placeholder="Paste Video URL..." value="${concept.videoUrl || ''}" style="flex: 1;">
                                </div>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <label style="color: var(--text-secondary); width: 80px;" title="Check the video's pinned comment or description for chapter timestamps. Enter the time where this specific concept starts.">⏩ Skip to:</label>
                                    <input type="text" class="input" id="timestamp-input-${concept.id}" placeholder="e.g. 8:30" value="${progress.skipTimestamp || ''}" style="flex: 1;">
                                </div>
                                <button class="btn btn-primary" onclick="Tracker.saveVideoDetails('${concept.id}')" style="align-self: flex-start;">Save Media Details</button>
                            </div>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 10px; color: var(--accent);">Actions</h4>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                ${progress.status !== 'Completed' ? `<button class="btn btn-primary" onclick="Tracker.markAsLearned('${concept.id}')">Mark as Learned</button>` : ''}
                                ${progress.status === 'Not Started' ? `<button class="btn" onclick="Tracker.markAsInProgress('${concept.id}')">Start Learning</button>` : ''}
                                ${progress.status === 'Completed' ? `<button class="btn" onclick="Tracker.markAsRevised('${concept.id}')">Log Revision</button>` : ''}
                                <button class="btn" onclick="App.switchToQuiz('${concept.id}')">Practice Quiz</button>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        ` : '';

        return `
            <tr class="${rowClass}" data-id="${concept.id}" style="border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s; ${isExpanded ? 'background: var(--bg-tertiary);' : ''}">
                <td style="padding: 15px; color: var(--text-secondary); font-size: 0.9rem;">${concept.subject}</td>
                <td style="padding: 15px; font-weight: 500;">${concept.concept}${timestampIcon}</td>
                <td style="padding: 15px;">${statusBadge}</td>
                <td style="padding: 15px;">${revBadge}</td>
                <td style="padding: 15px;">
                    <button class="btn-icon" style="pointer-events: none;">${isExpanded ? '▲' : '▼'}</button>
                </td>
            </tr>
            ${detailsHtml}
        `;
    }

    async function toggleExpandRow(conceptId) {
        expandedRowId = expandedRowId === conceptId ? null : conceptId;
        const concepts = window.GATE_DA_CONCEPTS || [];
        const progressData = await Storage.getAllProgress();
        const progressMap = new Map(progressData.map(p => [p.conceptId, p]));
        updateTable(concepts, progressMap);
    }

    async function markAsLearned(conceptId) {
        const dateCompleted = Date.now();
        const revisionDue = dateCompleted + (7 * 24 * 60 * 60 * 1000); // +7 days
        await Storage.saveProgress(conceptId, { 
            status: 'Completed', 
            dateCompleted, 
            revisionDue,
            revisionCount: 0
        });
        UI.showToast('Concept marked as learned!', 'success');
        toggleExpandRow(conceptId); // Trigger re-render
        if(window.Dashboard) window.Dashboard.renderDashboard();
    }

    async function markAsInProgress(conceptId) {
        await Storage.saveProgress(conceptId, { status: 'In Progress' });
        UI.showToast('Concept marked in progress', 'info');
        toggleExpandRow(conceptId);
    }

    async function markAsRevised(conceptId) {
        const progress = await Storage.getProgress(conceptId);
        const revisionCount = (progress.revisionCount || 0) + 1;
        // Spaced repetition interval (simplistic): 7, 14, 30 days
        const intervalDays = revisionCount === 1 ? 14 : 30;
        const revisionDue = Date.now() + (intervalDays * 24 * 60 * 60 * 1000);
        
        await Storage.saveProgress(conceptId, {
            revisionCount,
            revisionDue,
            lastRevised: Date.now()
        });
        UI.showToast(`Revision logged. Next in ${intervalDays} days.`, 'success');
        toggleExpandRow(conceptId);
        if(window.Dashboard) window.Dashboard.renderDashboard();
    }

    function timestampToSeconds(ts) {
        if (!ts) return 0;
        const parts = ts.replace(/[^0-9:]/g, '').split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return parts[0] || 0;
    }

    function findNextVideo() {
        const concepts = window.GATE_DA_CONCEPTS || [];
        const missing = concepts.find(c => !c.videoUrl);
        if (missing && missing.searchUrl) {
            window.open(missing.searchUrl, '_blank');
            UI.showToast(`Searching for: ${missing.concept}`, 'info');
            
            // Auto expand the row so they can paste it when they return
            const search = document.getElementById('tracker-search');
            if (search) {
                search.value = missing.concept;
                search.dispatchEvent(new Event('input'));
                setTimeout(() => {
                    if (expandedRowId !== missing.id) toggleExpandRow(missing.id);
                }, 100);
            }
        } else {
            UI.showToast('All concepts have videos!', 'success');
        }
    }

    async function saveVideoDetails(conceptId) {
        const urlInput = document.getElementById(`video-input-${conceptId}`);
        const timeInput = document.getElementById(`timestamp-input-${conceptId}`);
        if (!urlInput || !timeInput) return;
        
        const concept = (window.GATE_DA_CONCEPTS || []).find(c => c.id == conceptId);
        if (concept) {
            concept.videoUrl = urlInput.value.trim();
        }
        
        await Storage.saveProgress(conceptId, {
            skipTimestamp: timeInput.value.trim()
        });
        
        UI.showToast('Media details saved successfully', 'success');
        toggleExpandRow(conceptId); // close or re-render
        
        // Update badge
        const badge = document.getElementById('video-missing-badge');
        if (badge && window.GATE_DA_CONCEPTS) {
            const missingCount = window.GATE_DA_CONCEPTS.filter(c => !c.videoUrl).length;
            badge.textContent = `${missingCount} concepts need video links`;
        }
    }

    return {
        renderTracker,
        markAsLearned,
        markAsInProgress,
        markAsRevised,
        findNextVideo,
        saveVideoDetails
    };
})();
