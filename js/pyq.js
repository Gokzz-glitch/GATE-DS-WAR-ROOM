const PYQ = (function() {
    const GATE_DA_PYQ = {
      2024: {
        totalMarks: 100,
        totalQuestions: 65,
        subjectWise: [
          { subject: 'General Aptitude', marks: 15, questions: 10, topics: ['Reading Comprehension', 'Data Interpretation', 'Percentages', 'Logical Reasoning'], link: 'https://gateoverflow.in/exam/gate-da-2024' },
          { subject: 'PDSA', marks: 15, questions: 8, topics: ['Binary Search Trees', 'Graph Traversal', 'Sorting Algorithms', 'Time Complexity', 'Recursion'], link: 'https://gateoverflow.in/exam/gate-da-2024' },
          { subject: 'Probability & Statistics', marks: 16, questions: 9, topics: ['Bayes Theorem', 'Normal Distribution', 'Hypothesis Testing', 'MLE', 'Conditional Probability'], link: 'https://gateoverflow.in/exam/gate-da-2024' },
          { subject: 'Machine Learning', marks: 16, questions: 9, topics: ['Linear Regression', 'SVM', 'Decision Trees', 'PCA', 'K-Means', 'Bias-Variance'], link: 'https://gateoverflow.in/exam/gate-da-2024' },
          { subject: 'Linear Algebra', marks: 10, questions: 5, topics: ['Eigenvalues', 'Matrix Rank', 'SVD', 'Positive Definite'], link: 'https://gateoverflow.in/exam/gate-da-2024' },
          { subject: 'Calculus & Optimization', marks: 9, questions: 5, topics: ['Gradient Descent', 'Partial Derivatives', 'Lagrange Multipliers', 'Maxima Minima'], link: 'https://gateoverflow.in/exam/gate-da-2024' },
          { subject: 'DBMS & Data Warehousing', marks: 10, questions: 6, topics: ['SQL Queries', 'Normalization', 'ER Diagrams', 'OLAP Operations'], link: 'https://gateoverflow.in/exam/gate-da-2024' },
          { subject: 'Artificial Intelligence', marks: 9, questions: 5, topics: ['A* Search', 'Bayesian Networks', 'Minimax', 'Propositional Logic'], link: 'https://gateoverflow.in/exam/gate-da-2024' }
        ]
      },
      2025: {
        totalMarks: 100,
        totalQuestions: 65,
        subjectWise: [
          { subject: 'General Aptitude', marks: 15, questions: 10, topics: ['Sentence Completion', 'Venn Diagrams', 'Speed-Distance', 'Series'], link: 'https://gateoverflow.in/exam/gate-da-2025' },
          { subject: 'PDSA', marks: 16, questions: 9, topics: ['Hashing', 'Binary Heaps', 'Dynamic Programming', 'BFS/DFS', 'Stack Applications'], link: 'https://gateoverflow.in/exam/gate-da-2025' },
          { subject: 'Probability & Statistics', marks: 15, questions: 8, topics: ['CLT', 'Poisson Distribution', 'Confidence Intervals', 'Chi-Square Tests', 'Random Variables'], link: 'https://gateoverflow.in/exam/gate-da-2025' },
          { subject: 'Machine Learning', marks: 15, questions: 8, topics: ['Logistic Regression', 'Naive Bayes', 'Cross Validation', 'ROC-AUC', 'Neural Networks', 'Regularization'], link: 'https://gateoverflow.in/exam/gate-da-2025' },
          { subject: 'Linear Algebra', marks: 10, questions: 5, topics: ['Diagonalization', 'Null Space', 'Orthogonal Matrices', 'Quadratic Forms'], link: 'https://gateoverflow.in/exam/gate-da-2025' },
          { subject: 'Calculus & Optimization', marks: 9, questions: 5, topics: ['Taylor Series', 'Hessian Matrix', 'Convex Functions', 'KKT Conditions'], link: 'https://gateoverflow.in/exam/gate-da-2025' },
          { subject: 'DBMS & Data Warehousing', marks: 10, questions: 6, topics: ['Relational Algebra', 'B+ Trees', 'Transactions ACID', 'Star Schema', 'SQL Joins'], link: 'https://gateoverflow.in/exam/gate-da-2025' },
          { subject: 'Artificial Intelligence', marks: 8, questions: 4, topics: ['CSP', 'Alpha-Beta Pruning', 'FOL Resolution', 'Variable Elimination'], link: 'https://gateoverflow.in/exam/gate-da-2025' }
        ]
      }
    };

    function renderPYQ() {
        const container = document.getElementById('pyq-container');
        if (!container) return;

        let html = `
            <div class="card" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-card) 100%);">
                <div>
                    <h2 style="color: var(--accent); margin-bottom: 5px;">📝 PYQ Bank & AI Analysis</h2>
                    <div style="color: var(--text-secondary);">Past year papers (2024 & 2025) and predictive insights.</div>
                </div>
                <button class="btn btn-primary" id="btn-ai-predict" onclick="PYQ.runAIPredict()">
                    <span style="margin-right: 5px;">✨</span> AI Predict Next Exam
                </button>
            </div>
            
            <div id="ai-predict-result" style="display: none; margin-bottom: 20px;" class="card"></div>

            <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 20px;">
        `;

        [2025, 2024].forEach(year => {
            const data = GATE_DA_PYQ[year];
            html += `
                <div class="card" style="display: flex; flex-direction: column; height: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                        <h3 style="color: var(--text-primary);">GATE DA ${year}</h3>
                        <span class="badge badge-grey">${data.totalQuestions} Qs / ${data.totalMarks} Marks</span>
                    </div>
                    
                    <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
            `;
            
            data.subjectWise.forEach(sub => {
                html += `
                    <div style="background: var(--bg-primary); border: 1px solid var(--border); border-radius: 4px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <strong style="color: var(--text-primary);">${sub.subject}</strong>
                            <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.85rem;">${sub.marks}M (${sub.questions}Q)</span>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px;">
                            <strong>Topics:</strong> ${sub.topics.join(', ')}
                        </div>
                        <a href="${sub.link}" target="_blank" class="btn" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 6px;">
                            View Questions on GATE Overflow
                        </a>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    async function runAIPredict() {
        const btn = document.getElementById('btn-ai-predict');
        const resContainer = document.getElementById('ai-predict-result');
        
        if (!btn || !resContainer) return;
        
        btn.disabled = true;
        btn.innerHTML = `<span class="pulse-red" style="display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:8px; background:var(--accent);"></span> Analyzing...`;
        resContainer.style.display = 'block';
        resContainer.innerHTML = '<div style="color: var(--text-secondary);">Fetching historical patterns and invoking Gemini AI for prediction...</div>';

        try {
            const prompt = `
Analyze the GATE DA 2024 and 2025 topics and predict the most likely high-weightage topics for 2026. 
Consider gaps in coverage (topics not asked yet) and frequently repeated topics.
Output a ranked list with brief justification and confidence levels. Use markdown.

Data:
${JSON.stringify(GATE_DA_PYQ, null, 2)}
            `;
            
            const systemInstruction = "You are an expert AI professor analyzing GATE DA exam patterns. Output the most likely topics for the next exam, grouped logically.";
            const response = await Mentor.callGeminiWithRotation(prompt, systemInstruction);
            
            let formatted = response
                .replace(/```([\s\S]*?)```/g, '<pre style="background:var(--bg-primary); padding:10px; border-radius:4px; overflow-x:auto; border:1px solid var(--border); margin:10px 0;"><code style="font-family:var(--font-mono); font-size:0.9rem;">$1</code></pre>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>')
                .replace(/\n/g, '<br>');
                
            resContainer.innerHTML = `
                <h3 style="margin-bottom: 10px; color: var(--success); border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    ✨ AI Prediction: GATE DA 2026
                </h3>
                <div style="line-height: 1.6;">${formatted}</div>
            `;
        } catch (e) {
            resContainer.innerHTML = `<div style="color: var(--danger);">Prediction failed: ${e.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span style="margin-right: 5px;">✨</span> AI Predict Next Exam`;
        }
    }

    return {
        renderPYQ,
        runAIPredict
    };
})();
window.PYQ = PYQ;
