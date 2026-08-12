const Quiz = (function() {
    let currentQuiz = null;
    let currentConceptId = null;

    async function generateQuiz(conceptId, count = 5) {
        currentConceptId = conceptId;
        const concepts = window.GATE_DA_CONCEPTS || [];
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) throw new Error("Concept not found");

        const prompt = `Generate ${count} multiple-choice questions for GATE DA exam on the topic: "${concept.concept}".
Each question should have 4 options (A, B, C, D) with exactly one correct answer.
Include the correct answer (as index 0-3) and a brief explanation.
Format as strict JSON array ONLY, like this: [{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 0, "explanation": "..."}]
Difficulty: GATE exam level. Include numerical problems where appropriate. NO OTHER TEXT.`;

        const system = "You are an expert examiner for the GATE Data Science and AI exam. Output valid JSON array only.";

        const responseText = await Mentor.callGeminiWithRotation(prompt, system);
        
        try {
            // Find JSON array in case there are markdown backticks
            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const questions = JSON.parse(jsonStr);
            currentQuiz = questions;
            return questions;
        } catch (e) {
            console.error("Failed to parse quiz JSON:", responseText);
            throw new Error("Failed to parse AI response into questions.");
        }
    }

    function renderQuiz(conceptId) {
        UI.showModal('Generating Quiz...', `
            <div style="text-align:center; padding: 40px;">
                <div class="pulse-red" style="display:inline-block; width:20px; height:20px; border-radius:50%; background:var(--accent); margin-bottom: 20px;"></div>
                <div>Compiling GATE-level questions...</div>
            </div>
        `);

        generateQuiz(conceptId).then(questions => {
            let html = `<div id="quiz-form" style="max-height: 60vh; overflow-y: auto; padding-right: 10px;">`;
            
            questions.forEach((q, qIndex) => {
                html += `
                    <div class="card" style="margin-bottom: 15px; border-left: 3px solid var(--accent);">
                        <div style="margin-bottom: 10px; font-weight: 500;">Q${qIndex + 1}. ${q.question}</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${q.options.map((opt, oIndex) => `
                                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; padding: 8px; border-radius: 4px; background: var(--bg-primary); border: 1px solid var(--border);">
                                    <input type="radio" name="q${qIndex}" value="${oIndex}" style="margin-top: 4px;">
                                    <span>${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div id="exp-q${qIndex}" style="display:none; margin-top: 15px; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; font-size: 0.9rem; color: var(--text-secondary);">
                            <strong>Explanation:</strong> ${q.explanation}
                        </div>
                    </div>
                `;
            });
            html += `</div>`;

            UI.showModal('Concept Quiz', html, `<button class="btn btn-primary" onclick="Quiz.gradeQuiz()">Submit Answers</button>`);
        }).catch(err => {
            UI.showModal('Error', `<div style="color:var(--danger)">${err.message}</div>`);
        });
    }

    async function gradeQuiz() {
        if (!currentQuiz) return;
        
        let score = 0;
        let answered = 0;
        const total = currentQuiz.length;

        currentQuiz.forEach((q, qIndex) => {
            const selected = document.querySelector(`input[name="q${qIndex}"]:checked`);
            const expDiv = document.getElementById(`exp-q${qIndex}`);
            expDiv.style.display = 'block';

            const options = document.querySelectorAll(`input[name="q${qIndex}"]`);
            options.forEach((opt, oIndex) => {
                const label = opt.closest('label');
                opt.disabled = true;
                
                if (oIndex === q.correct) {
                    label.style.borderColor = 'var(--success)';
                    label.style.background = 'rgba(34, 197, 94, 0.1)';
                }
            });

            if (selected) {
                answered++;
                const val = parseInt(selected.value);
                if (val === q.correct) {
                    score++;
                } else {
                    selected.closest('label').style.borderColor = 'var(--danger)';
                    selected.closest('label').style.background = 'rgba(239, 68, 68, 0.1)';
                }
            }
        });

        if (answered < total) {
            UI.showToast(`You left ${total - answered} questions blank.`, 'warning');
        }

        const percentage = Math.round((score / total) * 100);
        
        // Save to storage
        await Storage.saveQuizResult({
            conceptId: currentConceptId,
            score,
            total,
            percentage
        });

        UI.showToast(`Quiz completed: ${score}/${total} (${percentage}%)`, percentage >= 70 ? 'success' : 'warning');
        
        // Update actions to close
        const modalContainer = document.getElementById('modal-container');
        const actions = modalContainer.querySelector('.modal-actions');
        if (actions) {
            actions.innerHTML = `<button class="btn" onclick="UI.hideModal()">Close</button>`;
        }
        
        if (window.Analytics) window.Analytics.renderAnalytics();
    }

    return {
        renderQuiz,
        gradeQuiz
    };
})();
