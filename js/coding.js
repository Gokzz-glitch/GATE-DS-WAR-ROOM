const Coding = (function() {
    let editor = null;
    let initialized = false;
    let pyodide = null;
    let pyodideOutput = '';

    // Custom stdout/stderr handlers
    function handlePyodideStdout(text) {
        pyodideOutput += text + '\n';
    }

    async function initPyodide() {
        const consoleOut = document.getElementById('coding-console-output');
        try {
            consoleOut.innerHTML = '<div style="color: var(--text-secondary);">Loading Pyodide Execution Engine...</div>';
            pyodide = await loadPyodide({
                stdout: handlePyodideStdout,
                stderr: handlePyodideStdout
            });
            consoleOut.innerHTML = '<div style="color: var(--success);">Pyodide Execution Engine Ready.</div>';
        } catch (e) {
            consoleOut.innerHTML = `<div style="color: var(--danger);">Failed to load Pyodide: ${e.message}</div>`;
        }
    }

    function init() {
        if (initialized) return;

        // Initialize Split Panes
        Split(['#coding-left-pane', '#coding-right-pane'], {
            sizes: [40, 60],
            minSize: [300, 400],
            gutterSize: 8,
            cursor: 'col-resize'
        });

        Split(['#coding-editor-container', '#coding-console-container'], {
            direction: 'vertical',
            sizes: [70, 30],
            minSize: [200, 100],
            gutterSize: 8,
            cursor: 'row-resize'
        });

        // Initialize Monaco Editor
        if (window.require) {
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }});
            require(['vs/editor/editor.main'], function() {
                editor = monaco.editor.create(document.getElementById('monaco-editor'), {
                    value: '# Write your Python code here\n\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
                    language: 'python',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, monospace',
                    scrollBeyondLastLine: false,
                    roundedSelection: false,
                    padding: { top: 15 }
                });
                
                // Add custom theme matching our UI
                monaco.editor.defineTheme('war-room-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { background: '0a0a0a' }
                    ],
                    colors: {
                        'editor.background': '#0a0a0a',
                        'editor.lineHighlightBackground': '#111111',
                        'editorCursor.foreground': '#3b82f6',
                        'editorIndentGuide.background': '#1e1e1e',
                    }
                });
                monaco.editor.setTheme('war-room-dark');
                monaco.editor.setTheme('war-room-dark');
            });
        }

        // Initialize VS Code Sync Bridge
        initVSCodeSync();

        // Initialize Pyodide
        initPyodide();

        // Hook up run button
        document.getElementById('btn-run-code').addEventListener('click', runCode);

        initialized = true;
    }

    async function runCode() {
        const consoleOut = document.getElementById('coding-console-output');
        if (!editor || !pyodide) return;
        
        const code = editor.getValue();
        consoleOut.innerHTML = '<div style="color: var(--warning);">Executing...</div>';
        pyodideOutput = ''; // Clear previous output
        
        try {
            // Run the code via Pyodide WebAssembly
            await pyodide.runPythonAsync(code);
            consoleOut.innerHTML = `<div style="color: var(--success);">Execution Complete.</div><pre style="margin-top:10px; color:var(--text-secondary);">${pyodideOutput}</pre>`;
        } catch (e) {
            // Catch compilation/runtime errors and display them
            consoleOut.innerHTML = `<div style="color: var(--danger);">Execution Error</div><pre style="margin-top:10px; color:var(--danger);">${e.message}</pre>`;
        }
    }

    function initVSCodeSync() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return;
        }

        try {
            let ws = new WebSocket('ws://localhost:3000');
            
            function getOrCreateIndicator() {
                let syncStatus = document.getElementById('vscode-sync-status');
                if (!syncStatus) {
                    syncStatus = document.createElement('div');
                    syncStatus.id = 'vscode-sync-status';
                    syncStatus.style.position = 'absolute';
                    syncStatus.style.top = '10px';
                    syncStatus.style.right = '20px';
                    syncStatus.style.fontSize = '0.8rem';
                    syncStatus.style.zIndex = '100';
                    const container = document.getElementById('coding-editor-container') || document.body;
                    container.style.position = 'relative';
                    container.appendChild(syncStatus);
                }
                return syncStatus;
            }

            ws.onopen = () => {
                console.log('Connected to VS Code Sync Server');
                if (window.UI && window.UI.showToast) {
                    UI.showToast('VS Code Sync Connected', 'success');
                }
                const syncStatus = getOrCreateIndicator();
                syncStatus.innerHTML = '<span style="color: var(--success);">● Sync Connected</span>';
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'code_sync' && editor) {
                        if (editor.getValue() !== data.code) {
                            const position = editor.getPosition();
                            editor.setValue(data.code);
                            if (position) editor.setPosition(position);
                        }
                    }
                } catch (e) {
                    console.error('Sync error', e);
                }
            };

            ws.onclose = () => {
                const syncStatus = getOrCreateIndicator();
                syncStatus.innerHTML = '<span style="color: var(--warning);">○ Sync Disconnected</span>';
                setTimeout(initVSCodeSync, 5000);
            };

            ws.onerror = (e) => {
                console.log('VS Code Sync WebSocket error.');
            };
        } catch (e) {
            console.log('Could not initialize VS Code Sync:', e.message);
        }
    }

    function renderCoding() {
        if (!initialized) {
            init();
        }
        // Force layout update for Monaco if it exists
        if (editor) {
            setTimeout(() => editor.layout(), 50);
        }
    }

    return {
        renderCoding
    };
})();
