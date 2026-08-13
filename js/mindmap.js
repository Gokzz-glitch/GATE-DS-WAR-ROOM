const MindMap = (function() {
    let container;
    let width, height;
    let svg, g;
    let zoom, pan;
    let resizeListenerAdded = false;
    
    function renderMindMap() {
        container = document.getElementById('mindmap-container');
        if (!container) return;
        
        const concepts = window.GATE_DA_CONCEPTS || [];
        const subjects = [...new Set(concepts.map(c => c.subject))];
        
        if (subjects.length === 0) {
            container.innerHTML = '<div class="card">No data available for Mind Map.</div>';
            return;
        }
        
        container.innerHTML = `
            <div class="card" style="display: flex; flex-direction: column; height: calc(100vh - 120px); padding: 0;">
                <div style="padding: 15px 20px; border-bottom: 1px solid var(--border); background: var(--bg-tertiary); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: var(--accent);">Subject Mind Map</h3>
                    <select class="input" id="mindmap-subject-select" style="width: 250px;">
                        ${subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div id="mindmap-svg-container" style="flex: 1; overflow: hidden; background: var(--bg-primary); cursor: grab;">
                </div>
            </div>
        `;
        
        document.getElementById('mindmap-subject-select').addEventListener('change', (e) => {
            drawMindMap(e.target.value);
        });
        
        if (!resizeListenerAdded) {
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    const select = document.getElementById('mindmap-subject-select');
                    if (select && document.getElementById('mindmap-svg-container')) {
                        drawMindMap(select.value);
                    }
                }, 300);
            });
            resizeListenerAdded = true;
        }
        
        drawMindMap(subjects[0]);
    }
    
    async function drawMindMap(subject) {
        const svgContainer = document.getElementById('mindmap-svg-container');
        if (!svgContainer) return;
        
        svgContainer.innerHTML = ''; // Clear previous
        
        width = svgContainer.clientWidth;
        height = svgContainer.clientHeight;
        
        // Setup SVG
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        // Center the main group initially
        g.setAttribute('transform', `translate(${width/2}, ${height/2}) scale(1)`);
        svg.appendChild(g);
        svgContainer.appendChild(svg);
        
        setupZoomAndPan(svgContainer, g);
        
        // Get data
        const concepts = window.GATE_DA_CONCEPTS.filter(c => c.subject === subject);
        const progressData = await Storage.getAllProgress();
        const progressMap = new Map(progressData.map(p => [p.conceptId, p]));
        
        // Group by category
        const categories = {};
        concepts.forEach(c => {
            if (!categories[c.category]) categories[c.category] = [];
            categories[c.category].push(c);
        });
        
        const catKeys = Object.keys(categories);
        const catCount = catKeys.length;
        
        // Layout Config
        const centerNodeRadius = 60;
        const catRadius = 250; // Distance of categories from center
        const conceptRadius = 150; // Distance of concepts from category
        
        // Draw Lines & Nodes
        const linesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.appendChild(linesGroup);
        g.appendChild(nodesGroup);
        
        // Draw Center Node (Subject)
        drawNode(nodesGroup, 0, 0, subject, 'subject', null);
        
        catKeys.forEach((cat, i) => {
            const catAngle = (Math.PI * 2 * i) / catCount;
            const cx = Math.cos(catAngle) * catRadius;
            const cy = Math.sin(catAngle) * catRadius;
            
            // Line from center to category
            drawLine(linesGroup, 0, 0, cx, cy);
            
            // Category Node
            drawNode(nodesGroup, cx, cy, cat, 'category', null);
            
            // Concept Nodes
            const catConcepts = categories[cat];
            const conCount = catConcepts.length;
            const angleSpread = Math.PI * 0.8; // Spread concepts over this angle
            const startAngle = catAngle - angleSpread/2;
            
            catConcepts.forEach((concept, j) => {
                const conAngle = conCount > 1 ? startAngle + (angleSpread * j / (conCount - 1)) : catAngle;
                const px = cx + Math.cos(conAngle) * conceptRadius;
                const py = cy + Math.sin(conAngle) * conceptRadius;
                
                // Line from category to concept
                drawLine(linesGroup, cx, cy, px, py);
                
                // Progress status
                const p = progressMap.get(concept.id);
                let status = 'not-started';
                let isOverdue = false;
                
                if (p) {
                    if (p.status === 'Completed') {
                        status = 'completed';
                        if (p.revisionDue && p.revisionDue < Date.now()) {
                            isOverdue = true;
                        }
                    } else if (p.status === 'In Progress') {
                        status = 'in-progress';
                    }
                }
                
                drawNode(nodesGroup, px, py, concept.concept, 'concept', status, isOverdue, concept);
            });
        });
    }
    
    function drawLine(parent, x1, y1, x2, y2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', 'rgba(59, 130, 246, 0.3)');
        line.setAttribute('stroke-width', '2');
        line.style.filter = "drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))";
        parent.appendChild(line);
    }
    
    function drawNode(parent, x, y, label, type, status, isOverdue = false, conceptData = null) {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute('transform', `translate(${x}, ${y})`);
        
        let width = 140;
        let height = 40;
        let rx = 6;
        let fill = '#1e1e1e';
        let stroke = '#3b82f6';
        let textColor = '#e4e4e7';
        let fontSize = '12px';
        let fontWeight = 'normal';
        
        if (type === 'subject') {
            width = 160; height = 50; rx = 8;
            fill = '#111111'; stroke = '#3b82f6';
            fontSize = '14px'; fontWeight = 'bold';
        } else if (type === 'category') {
            width = 130; height = 35; rx = 6;
            fill = '#141414'; stroke = '#71717a';
        } else {
            // Concept
            if (status === 'completed') { fill = 'rgba(34, 197, 94, 0.1)'; stroke = '#22c55e'; }
            else if (status === 'in-progress') { fill = 'rgba(59, 130, 246, 0.1)'; stroke = '#3b82f6'; }
            else { fill = '#1a1a1a'; stroke = '#3f3f46'; textColor = '#a1a1aa'; }
        }
        
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute('x', -width/2);
        rect.setAttribute('y', -height/2);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        rect.setAttribute('rx', rx);
        rect.setAttribute('fill', fill);
        rect.setAttribute('stroke', stroke);
        rect.setAttribute('stroke-width', '2');
        
        if (isOverdue) {
            const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
            animate.setAttribute('attributeName', 'stroke');
            animate.setAttribute('values', '#22c55e;#ef4444;#22c55e');
            animate.setAttribute('dur', '1.5s');
            animate.setAttribute('repeatCount', 'indefinite');
            rect.appendChild(animate);
        }
        
        // Truncate label if too long
        let displayLabel = label;
        if (displayLabel.length > 18) displayLabel = displayLabel.substring(0, 16) + '...';
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('x', '0');
        text.setAttribute('y', '4'); // Adjust for vertical center
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', textColor);
        text.setAttribute('font-family', 'Inter, sans-serif');
        text.setAttribute('font-size', fontSize);
        text.setAttribute('font-weight', fontWeight);
        text.textContent = displayLabel;
        
        // Title for tooltip
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = label;
        group.appendChild(title);
        
        group.appendChild(rect);
        group.appendChild(text);
        
        if (type === 'concept') {
            group.style.cursor = 'pointer';
            group.addEventListener('click', (e) => {
                e.stopPropagation();
                showConceptDetails(conceptData, x, y);
            });
        }
        
        parent.appendChild(group);
    }
    
    function showConceptDetails(concept, x, y) {
        // Find or create details box
        let detailsBox = document.getElementById('mindmap-details-box');
        if (!detailsBox) {
            detailsBox = document.createElement('div');
            detailsBox.id = 'mindmap-details-box';
            detailsBox.style.position = 'absolute';
            detailsBox.style.background = 'var(--bg-card)';
            detailsBox.style.border = '1px solid var(--accent)';
            detailsBox.style.borderRadius = '6px';
            detailsBox.style.padding = '15px';
            detailsBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.8)';
            detailsBox.style.zIndex = '1000';
            detailsBox.style.width = '250px';
            document.getElementById('mindmap-svg-container').appendChild(detailsBox);
        }
        
        detailsBox.innerHTML = `
            <h4 style="margin-bottom: 8px; color: var(--accent);">${concept.concept}</h4>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">${concept.description || ''}</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${concept.videoUrl ? `<a href="${concept.videoUrl}" target="_blank" class="btn btn-primary" style="font-size: 0.8rem; padding: 5px;">🎥 Watch Video</a>` : ''}
                ${concept.searchUrl ? `<a href="${concept.searchUrl}" target="_blank" class="btn" style="font-size: 0.8rem; padding: 5px;">🔍 Search Topic</a>` : ''}
                <button class="btn" style="font-size: 0.8rem; padding: 5px;" onclick="App.quickStart('${concept.id}')">Go to Tracker</button>
                <button class="btn" style="font-size: 0.8rem; padding: 5px;" onclick="document.getElementById('mindmap-details-box').style.display='none'">Close</button>
            </div>
        `;
        
        detailsBox.style.display = 'block';
        
        // Position intelligently
        const svgRect = document.getElementById('mindmap-svg-container').getBoundingClientRect();
        detailsBox.style.left = Math.min(svgRect.width - 270, Math.max(20, svgRect.width/2 + 20)) + 'px';
        detailsBox.style.top = '20px';
    }
    
    function setupZoomAndPan(container, gGroup) {
        let isDragging = false;
        let startX, startY;
        let translateX = width / 2;
        let translateY = height / 2;
        let scale = 1;
        
        function updateTransform() {
            gGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
            const details = document.getElementById('mindmap-details-box');
            if (details) details.style.display = 'none';
        }
        
        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            container.style.cursor = 'grabbing';
        });
        
        window.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.cursor = 'grab';
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
        });
        
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            
            // Get mouse position relative to container
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Adjust translate so we zoom towards mouse
            translateX = mouseX - (mouseX - translateX) * delta;
            translateY = mouseY - (mouseY - translateY) * delta;
            
            scale *= delta;
            scale = Math.max(0.2, Math.min(scale, 3)); // Clamp zoom
            
            updateTransform();
        }, { passive: false });
    }
    
    return {
        renderMindMap
    };
})();
window.MindMap = MindMap;
