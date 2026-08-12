const Mentor = (function() {
    let chatHistory = [];

    async function callGeminiWithRotation(prompt, systemInstruction) {
        const settings = await Storage.getSettings();
        const keys = settings.geminiKeys || [];
        if (keys.length === 0) throw new Error('No API keys configured. Please add a Gemini API key in Settings > API Key Vault.');
        
        let attempts = 0;
        let currentIndex = settings.currentGeminiIndex || 0;
        
        while (attempts < keys.length) {
            const keyEntry = keys[currentIndex];
            try {
                const decryptedKey = await Storage.decryptKey(keyEntry.encrypted);
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${decryptedKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            system_instruction: { parts: [{ text: systemInstruction }] },
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    }
                );
                
                if (response.status === 429) {
                    keyEntry.status = 'rate-limited';
                    keyEntry.errorCount = (keyEntry.errorCount || 0) + 1;
                    currentIndex = (currentIndex + 1) % keys.length;
                    attempts++;
                    continue;
                }
                
                if (!response.ok) throw new Error(`API error: ${response.status}`);
                
                keyEntry.status = 'healthy';
                keyEntry.lastUsed = new Date().toISOString();
                keyEntry.errorCount = 0;
                
                settings.currentGeminiIndex = (currentIndex + 1) % keys.length;
                await Storage.saveSettings(settings);
                
                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            } catch (err) {
                if (err.message.includes('429') || err.message.includes('rate')) {
                    keyEntry.status = 'rate-limited';
                    currentIndex = (currentIndex + 1) % keys.length;
                    attempts++;
                } else {
                    keyEntry.status = 'error';
                    keyEntry.errorCount = (keyEntry.errorCount || 0) + 1;
                    currentIndex = (currentIndex + 1) % keys.length;
                    attempts++;
                }
            }
        }
        
        // Update settings with the failed statuses before throwing
        await Storage.saveSettings(settings);
        throw new Error('All API keys are rate-limited or failed. Try again in a few minutes.');
    }

    async function buildSystemContext() {
        const settings = await Storage.getSettings();
        const progressData = await Storage.getAllProgress();
        const completed = progressData.filter(p => p.status === 'Completed').length;
        
        // Calculate dynamic state for Jarvis Context
        const now = Date.now();
        const overdue = progressData.filter(p => p.status === 'Completed' && p.revisionDue && p.revisionDue < now).length;
        const streak = window.Dashboard ? await Dashboard.calculateStreak(progressData) : 0;
        
        // Find weak subjects (based on quiz scores < 70)
        const quizHistory = await Storage.getQuizHistory() || [];
        const weakSubjectsMap = {};
        quizHistory.forEach(q => {
            if (q.score < 70) {
                weakSubjectsMap[q.subject] = (weakSubjectsMap[q.subject] || 0) + 1;
            }
        });
        const weakSubjects = Object.keys(weakSubjectsMap).sort((a,b) => weakSubjectsMap[b] - weakSubjectsMap[a]).slice(0, 2);

        return `You are the AI Mentor in the "GATE DA War Room", a premium study application for students preparing for the GATE Data Science and Artificial Intelligence exam.
User Name: ${settings.userName || 'Commander'}
Total Concepts Completed: ${completed}
Current Study Streak: ${streak} days
Overdue Revisions: ${overdue}
Weak Subjects (from quiz history): ${weakSubjects.length > 0 ? weakSubjects.join(', ') : 'None yet'}

Context-Aware Directives:
- You are a proactive, JARVIS-like assistant.
- You are aware of the user's current streak. If it's high, congratulate them. If it's 0, encourage them to start.
- If they have overdue revisions, gently remind them they need to clear their backlog.
- If they ask about a weak subject, give them extra attention.
Tone: Direct, encouraging, analytical, exactly like a high-performance military or fighter-pilot commander guiding a trainee. Use Markdown for formatting. Be concise but deep when explaining technical concepts.`;
    }

    async function renderMentor() {
        const container = document.getElementById('mentor-container');
        if (!container) return;

        if (!container.innerHTML.trim()) {
            container.innerHTML = `
                <div class="card" style="display: flex; flex-direction: column; height: calc(100vh - 120px); padding: 0;">
                    <div style="padding: 15px 20px; border-bottom: 1px solid var(--border); background: var(--bg-tertiary); display: flex; align-items: center; justify-content: space-between;">
                        <h3 style="margin:0; display:flex; align-items:center; gap:10px;">
                            <span style="color:var(--accent);">🤖</span> AI Command Mentor
                        </h3>
                        <div style="font-size:0.85rem; color:var(--text-secondary);">Gemini 2.0 Flash Active</div>
                    </div>
                    
                    <div id="mentor-chat-log" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                        <!-- Messages go here -->
                        <div class="chat-message ai-message" style="align-self: flex-start; max-width: 80%; background: var(--bg-tertiary); padding: 12px 16px; border-radius: 8px 8px 8px 0; border: 1px solid var(--border);">
                            Commander, I am online. Ask me to explain a concept, generate a study plan, or test your knowledge.
                        </div>
                    </div>
                    
                    <div style="padding: 15px 20px; border-top: 1px solid var(--border); background: var(--bg-secondary);">
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button class="badge badge-grey" onclick="Mentor.sendQuickPrompt('Explain Support Vector Machines simply')">Explain SVM</button>
                            <button class="badge badge-grey" onclick="Mentor.sendQuickPrompt('What should I focus on for Probability & Statistics?')">Prob & Stat Focus</button>
                            <button class="badge badge-grey" onclick="Mentor.sendQuickPrompt('Give me a tough question on SQL Joins')">SQL Challenge</button>
                        </div>
                        <form id="mentor-form" style="display: flex; gap: 10px;">
                            <input type="text" id="mentor-input" class="input" placeholder="Type your message..." autocomplete="off" required style="flex: 1;">
                            <button type="submit" class="btn btn-primary" id="mentor-send-btn">Send</button>
                        </form>
                    </div>
                </div>
            `;

            document.getElementById('mentor-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = document.getElementById('mentor-input');
                const text = input.value.trim();
                if (!text) return;
                
                input.value = '';
                await sendMessage(text);
            });
        }
    }

    async function sendMessage(text) {
        appendMessage('user', text);
        const log = document.getElementById('mentor-chat-log');
        const typingId = 'typing-' + Date.now();
        
        appendMessage('ai', '<span class="pulse-red" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--accent);"></span> Processing...', typingId);
        
        try {
            const systemInstruction = await buildSystemContext();
            const response = await callGeminiWithRotation(text, systemInstruction);
            
            document.getElementById(typingId)?.remove();
            
            // Format basic markdown (bold, code blocks)
            let formatted = response
                .replace(/```([\s\S]*?)```/g, '<pre style="background:var(--bg-primary); padding:10px; border-radius:4px; overflow-x:auto; border:1px solid var(--border); margin:10px 0;"><code style="font-family:var(--font-mono); font-size:0.9rem;">$1</code></pre>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>')
                .replace(/\n/g, '<br>');
                
            appendMessage('ai', formatted);
        } catch (e) {
            document.getElementById(typingId)?.remove();
            appendMessage('ai', `<span style="color:var(--danger);">Error: ${e.message}</span>`);
        }
    }

    function appendMessage(sender, html, id = null) {
        const log = document.getElementById('mentor-chat-log');
        if (!log) return;
        
        const div = document.createElement('div');
        if (id) div.id = id;
        
        if (sender === 'user') {
            div.style.cssText = `align-self: flex-end; max-width: 80%; background: var(--accent-dim); padding: 12px 16px; border-radius: 8px 8px 0 8px; border: 1px solid var(--accent); color: var(--text-primary); box-shadow: 0 4px 15px var(--accent-glow);`;
        } else {
            div.style.cssText = `align-self: flex-start; max-width: 80%; background: var(--bg-tertiary); padding: 12px 16px; border-radius: 8px 8px 8px 0; border: 1px solid var(--border); color: var(--text-primary); line-height: 1.6;`;
        }
        
        div.innerHTML = html;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }

    function sendQuickPrompt(prompt) {
        const input = document.getElementById('mentor-input');
        if (input) {
            input.value = prompt;
            document.getElementById('mentor-form').dispatchEvent(new Event('submit'));
        }
    }

    return {
        renderMentor,
        sendQuickPrompt,
        callGeminiWithRotation // Exposed for quiz.js
    };
})();
