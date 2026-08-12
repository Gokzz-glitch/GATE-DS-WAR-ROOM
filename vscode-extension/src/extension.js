const vscode = require('vscode');
const WebSocket = require('ws');

let wss;
let statusBarItem;

function activate(context) {
    console.log('GATE DA Sync extension activated.');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'gate-da-sync.startSync';
    statusBarItem.text = '$(sync) GATE DA: Start Sync';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    let disposable = vscode.commands.registerCommand('gate-da-sync.startSync', () => {
        if (wss) {
            vscode.window.showInformationMessage('GATE DA Sync is already running on port 3000.');
            return;
        }

        try {
            wss = new WebSocket.Server({ port: 3000 });
            
            wss.on('connection', (ws) => {
                vscode.window.showInformationMessage('GATE DA War Room connected!');
                
                // Send current active file content immediately
                if (vscode.window.activeTextEditor) {
                    ws.send(JSON.stringify({
                        type: 'code_sync',
                        code: vscode.window.activeTextEditor.document.getText()
                    }));
                }
            });

            statusBarItem.text = '$(check) GATE DA: Syncing';
            statusBarItem.color = '#3b82f6';
            vscode.window.showInformationMessage('GATE DA Sync server started on port 3000');
        } catch (e) {
            vscode.window.showErrorMessage('Failed to start sync server. Port 3000 might be in use.');
            console.error(e);
        }
    });

    context.subscriptions.push(disposable);

    // Listen for typing events
    vscode.workspace.onDidChangeTextDocument(event => {
        if (!wss || !event.document) return;
        
        // Only broadcast if the changed document is the active one (or just broadcast it)
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && event.document === activeEditor.document) {
            const code = event.document.getText();
            broadcast({
                type: 'code_sync',
                code: code
            });
        }
    });
}

function broadcast(data) {
    if (!wss) return;
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

function deactivate() {
    if (wss) {
        wss.close();
    }
}

module.exports = {
    activate,
    deactivate
};
