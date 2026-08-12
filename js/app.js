const App = (function() {
    let settings = null;

    async function init() {
        await Storage.init();
        settings = await Storage.getSettings();
        
        setupNavigation();
        setupExportImport();

        if (!settings.geminiKeys || settings.geminiKeys.length === 0) {
            switchView('settings');
        } else {
            // Delay slight to allow data.js to load if script async
            setTimeout(async () => {
                await checkComeback();
                switchView('briefing');
            }, 100);
        }
    }

    function setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const view = e.currentTarget.dataset.view;
                switchView(view);

                // Mobile close sidebar
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });
        });

        document.getElementById('mobile-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    async function switchView(viewName) {
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
        const activeSection = document.getElementById(`view-${viewName}`);
        if (activeSection) activeSection.classList.add('active');

        const titleMap = {
            'briefing': 'Daily Briefing',
            'dashboard': 'Dashboard',
            'tracker': 'Concept Tracker',
            'mindmap': 'Mind Map',
            'pyq': 'PYQ Bank',
            'mentor': 'AI Mentor',
            'analytics': 'Analytics',
            'settings': 'API Vault & Settings'
        };
        document.getElementById('view-title').textContent = titleMap[viewName] || 'War Room';

        if (viewName === 'briefing') await renderBriefing();
        else if (viewName === 'dashboard') await Dashboard.renderDashboard();
        else if (viewName === 'tracker') await Tracker.renderTracker();
        else if (viewName === 'mindmap') { if(window.MindMap) MindMap.renderMindMap(); }
        else if (viewName === 'pyq') { if(window.PYQ) PYQ.renderPYQ(); }
        else if (viewName === 'mentor') await Mentor.renderMentor();
        else if (viewName === 'analytics') await Analytics.renderAnalytics();
        else if (viewName === 'settings') await renderSettings();
    }

    async function renderBriefing() {
        const container = document.getElementById('briefing-container');
        if (!container) return;

        const concepts = window.GATE_DA_CONCEPTS || [];
        if (concepts.length === 0) {
            container.innerHTML = `<div class="card">Waiting for concepts data...</div>`;
            return;
        }

        const progressData = await Storage.getAllProgress();
        const progressMap = new Map(progressData.map(p => [p.conceptId, p]));

        const completed = progressData.filter(p => p.status === 'Completed').length;
        const total = concepts.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Daily targets
        const targetConcepts = settings.dailyTarget || 4;
        
        let toLearn = [];
        let toRevise = [];

        concepts.forEach(c => {
            const p = progressMap.get(c.id);
            if (!p || p.status === 'Not Started' || p.status === 'In Progress') {
                toLearn.push(c);
            } else if (p.status === 'Completed' && p.revisionDue) {
                const days = UI.daysUntil(p.revisionDue);
                if (days <= 2) toRevise.push({ concept: c, days, p });
            }
        });

        // Priority sort for learning (mock logic based on array order for now)
        toLearn = toLearn.slice(0, targetConcepts);
        
        // Urgency sort for revisions
        toRevise.sort((a,b) => a.days - b.days);
        toRevise = toRevise.slice(0, 6);

        let quote = '"Victory favors the prepared. Let\'s conquer the curriculum."';
        if (pct < 10) quote = '"The hardest part is starting. You\'ve already done that."';
        else if (pct < 30) quote = '"You\'re building momentum. Every concept is a brick in your fortress."';
        else if (pct < 50) quote = '"You\'re in the zone. Half the syllabus is behind you."';
        else if (pct < 70) quote = '"Past the halfway mark. You can see the finish line."';
        else if (pct < 90) quote = '"You\'re in the elite zone. Most aspirants never get here."';
        else quote = '"You\'re ready. Trust your preparation."';

        container.innerHTML = `
            <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-card) 100%); border-left: 4px solid var(--accent);">
                <h2 style="margin-bottom: 10px;">Commander ${settings.userName}</h2>
                <div style="color: var(--text-secondary); font-size: 1.1rem;">
                    You have completed <strong style="color: var(--text-primary);">${completed}/${total}</strong> concepts (<strong style="color: var(--accent);">${pct}%</strong>).
                </div>
                <div style="margin-top: 15px; font-style: italic; color: var(--warning);">
                    ${quote}
                </div>
            </div>

            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));">
                <div class="card">
                    <h3 style="margin-bottom: 15px; display: flex; justify-content: space-between;">
                        <span>🎯 Today's Targets</span>
                        <span class="badge badge-blue">${toLearn.length} left</span>
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${toLearn.length > 0 ? toLearn.map(c => `
                            <div style="padding: 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-primary); display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 500;">${c.concept}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${c.subject}</div>
                                </div>
                                <button class="btn btn-primary" onclick="App.quickStart('${c.id}')">Start</button>
                            </div>
                        `).join('') : '<div style="color: var(--success);">All targets met! Take a break or start ahead.</div>'}
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 15px; display: flex; justify-content: space-between;">
                        <span>🔄 Critical Revisions</span>
                        <span class="badge ${toRevise.some(r => r.days < 0) ? 'badge-red pulse-red' : 'badge-yellow'}">${toRevise.length} pending</span>
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${toRevise.length > 0 ? toRevise.map(r => `
                            <div style="padding: 12px; border: 1px solid ${r.days < 0 ? 'var(--danger)' : 'var(--border)'}; border-radius: 4px; background: var(--bg-primary); display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 500;">${r.concept.concept}</div>
                                    <div style="font-size: 0.8rem; color: ${r.days < 0 ? 'var(--danger)' : 'var(--warning)'};">${r.days < 0 ? 'Overdue by ' + Math.abs(r.days) + ' days' : 'Due in ' + r.days + ' days'}</div>
                                </div>
                                <button class="btn" onclick="Tracker.markAsRevised('${r.concept.id}'); App.switchView('briefing');">Revise</button>
                            </div>
                        `).join('') : '<div style="color: var(--success);">No revisions pending. Excellent retention.</div>'}
                    </div>
                </div>
            </div>
        `;
    }

    async function renderSettings() {
        const currentSettings = await Storage.getSettings();
        const geminiKeys = currentSettings.geminiKeys || [];
        const secondaryKeys = currentSettings.secondaryKeys || [];
        
        // Helper to render keys
        const renderKeys = (keys, type) => {
            if (keys.length === 0) return `<div style="color:var(--text-muted); font-size:0.9rem;">No ${type} keys added.</div>`;
            return keys.map((k, i) => {
                let statusColor = 'var(--success)';
                if (k.status === 'rate-limited') statusColor = 'var(--warning)';
                if (k.status === 'error') statusColor = 'var(--danger)';
                
                return `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; background:var(--bg-primary); padding:10px; border-radius:4px; border:1px solid var(--border);">
                    <div style="width:10px; height:10px; border-radius:50%; background:${statusColor};" title="${k.status}"></div>
                    <div style="flex:1;">
                        <div style="font-size:0.9rem; font-weight:500;">${k.label}</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Used: ${k.lastUsed ? UI.formatDate(new Date(k.lastUsed).getTime()) : 'Never'} | Errors: ${k.errorCount || 0}</div>
                    </div>
                    <button class="btn-icon" onclick="App.deleteKey('${type}', ${i})" style="color:var(--danger);">&times;</button>
                </div>
                `;
            }).join('');
        };

        const html = `
            <div style="margin-bottom: 20px;">
                <label style="display:block; margin-bottom:5px; color:var(--text-secondary);">User Name</label>
                <input type="text" id="setting-username" class="input" value="${currentSettings.userName || 'Commander'}">
            </div>
            
            <div style="margin-bottom: 25px; border-top: 1px solid var(--border); padding-top: 20px;">
                <h4 style="margin-bottom: 5px; display:flex; align-items:center; gap:8px;">
                    🔑 API Key Vault 
                    <span style="font-size: 0.7rem; font-weight: normal; color: var(--success); background: rgba(34,197,94,0.1); padding: 2px 6px; border-radius: 10px;">AES-256 Encrypted</span>
                </h4>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom: 15px;">Keys never leave your browser. They are encrypted securely in IndexedDB.</div>
                
                <div style="margin-bottom: 20px;">
                    <h5 style="margin-bottom: 10px; color: var(--accent);">Gemini Pro Keys (up to 6)</h5>
                    <div id="gemini-keys-list" style="margin-bottom: 10px;">
                        ${renderKeys(geminiKeys, 'gemini')}
                    </div>
                    ${geminiKeys.length < 6 ? `
                        <div style="display:flex; gap:10px;">
                            <input type="password" id="new-gemini-key" class="input" placeholder="Paste API Key..." style="flex:2;">
                            <input type="text" id="new-gemini-label" class="input" placeholder="Label (e.g. Work)" style="flex:1;">
                            <button class="btn btn-primary" onclick="App.addKey('gemini')">Add</button>
                        </div>
                    ` : '<div style="color:var(--warning); font-size:0.85rem;">Maximum 6 keys reached.</div>'}
                </div>

                <div>
                    <h5 style="margin-bottom: 10px; color: var(--accent);">Secondary AI Keys (up to 6)</h5>
                    <div id="secondary-keys-list" style="margin-bottom: 10px;">
                        ${renderKeys(secondaryKeys, 'secondary')}
                    </div>
                    ${secondaryKeys.length < 6 ? `
                        <div style="display:flex; gap:10px;">
                            <select id="new-secondary-provider" class="input" style="flex:1;">
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                            </select>
                            <input type="password" id="new-secondary-key" class="input" placeholder="Paste API Key..." style="flex:2;">
                            <input type="text" id="new-secondary-label" class="input" placeholder="Label" style="flex:1;">
                            <button class="btn btn-primary" onclick="App.addKey('secondary')">Add</button>
                        </div>
                    ` : '<div style="color:var(--warning); font-size:0.85rem;">Maximum 6 keys reached.</div>'}
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button class="btn btn-primary" onclick="App.saveBasicSettings()">Save Settings</button>
            </div>
        `;
        
        document.getElementById('settings-container').innerHTML = html;
    }

    async function saveBasicSettings() {
        const currentSettings = await Storage.getSettings();
        currentSettings.userName = document.getElementById('setting-username').value;
        await Storage.saveSettings(currentSettings);
        settings = currentSettings;
        UI.showToast('Settings saved', 'success');
        
        // Refresh briefing to show name if active
        if (document.getElementById('view-briefing').classList.contains('active')) {
            renderBriefing();
        }
    }

    async function addKey(type) {
        const keyInput = document.getElementById(`new-${type}-key`);
        const labelInput = document.getElementById(`new-${type}-label`);
        const rawKey = keyInput.value.trim();
        const label = labelInput.value.trim() || 'Default';
        
        if (!rawKey) {
            UI.showToast('Please enter an API key', 'error');
            return;
        }

        const currentSettings = await Storage.getSettings();
        const list = type === 'gemini' ? currentSettings.geminiKeys : currentSettings.secondaryKeys;
        
        if (list.length >= 6) return;

        // Encrypt the key using Storage's exposed KEY_VAULT method
        const encrypted = await Storage.encryptKey(rawKey);

        const keyEntry = {
            encrypted,
            label,
            status: 'healthy',
            lastUsed: null,
            errorCount: 0
        };

        if (type === 'secondary') {
            keyEntry.provider = document.getElementById('new-secondary-provider').value;
        }

        list.push(keyEntry);
        await Storage.saveSettings(currentSettings);
        settings = currentSettings;
        
        UI.showToast(`${type} key added securely`, 'success');
        renderSettings(); // Refresh view
    }

    async function deleteKey(type, index) {
        const currentSettings = await Storage.getSettings();
        const list = type === 'gemini' ? currentSettings.geminiKeys : currentSettings.secondaryKeys;
        
        list.splice(index, 1);
        
        // Adjust indices if needed
        if (type === 'gemini' && currentSettings.currentGeminiIndex >= list.length) {
            currentSettings.currentGeminiIndex = 0;
        }
        
        await Storage.saveSettings(currentSettings);
        settings = currentSettings;
        
        UI.showToast('Key removed', 'info');
        renderSettings(); // Refresh view
    }

    function setupExportImport() {
        document.getElementById('export-btn').addEventListener('click', async () => {
            const data = await Storage.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gate_da_warroom_backup_${new Date().toISOString().split('T')[0]}.export.json`;
            a.click();
            URL.revokeObjectURL(url);
            UI.showToast('Data exported successfully', 'success');
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                const success = await Storage.importData(event.target.result);
                if (success) {
                    UI.showToast('Data imported successfully. Reloading...', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    UI.showToast('Import failed. Invalid JSON.', 'error');
                }
            };
            reader.readAsText(file);
        });
    }

    function quickStart(conceptId) {
        // Navigates to tracker and expands the concept
        document.querySelector('[data-view="tracker"]').click();
        
        setTimeout(() => {
            const search = document.getElementById('tracker-search');
            if (search) {
                const c = window.GATE_DA_CONCEPTS.find(x => x.id === conceptId);
                if (c) {
                    search.value = c.concept;
                    search.dispatchEvent(new Event('input'));
                    
                    // Click the row to expand it
                    setTimeout(() => {
                        const row = document.querySelector(`.tracker-row[data-id="${conceptId}"]`);
                        if (row) row.click();
                    }, 400);
                }
            }
        }, 100);
    }
    
    function switchToQuiz(conceptId) {
        if(window.Quiz) {
            Quiz.renderQuiz(conceptId);
        }
    }

    async function checkComeback() {
        const lastStudyDate = settings.lastStudyDate;
        const now = Date.now();
        settings.lastStudyDate = now;
        await Storage.saveSettings(settings);

        if (lastStudyDate) {
            const daysAway = Math.floor((now - lastStudyDate) / (1000 * 60 * 60 * 24));
            if (daysAway > 3) {
                const progressData = await Storage.getAllProgress();
                const overdueRevisions = progressData.filter(p => p.status === 'Completed' && p.revisionDue && p.revisionDue < now);
                
                let html = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: var(--accent); margin-bottom: 10px;">Welcome Back, Commander</h2>
                        <p style="color: var(--text-secondary);">You've been away for ${daysAway} days. That's okay — everyone takes breaks.</p>
                    </div>
                    <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid var(--warning);">
                        <h4 style="margin-bottom: 10px;">Your Recovery Plan:</h4>
                        <p>You have <strong style="color: var(--danger);">${overdueRevisions.length}</strong> overdue revisions.</p>
                        <p>Suggest starting with the 3 most overdue revisions to get your momentum back.</p>
                    </div>
                    <div style="text-align: center; font-style: italic; color: var(--text-muted); margin-bottom: 20px;">
                        "The obstacle is the way. Let's get back on track."
                    </div>
                `;
                UI.showModal('Recovery Protocol Initiated', html, `
                    <button class="btn btn-primary" onclick="UI.hideModal(); App.switchView('tracker')">Start Recovery</button>
                `);
            }
        }
    }

    return {
        init,
        switchView,
        quickStart,
        switchToQuiz,
        addKey,
        deleteKey,
        saveBasicSettings
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
