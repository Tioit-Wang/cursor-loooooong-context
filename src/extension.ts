import * as vscode from 'vscode';
import { FilesExplorerProvider } from './providers/filesExplorerProvider';

export function activate(context: vscode.ExtensionContext) {
    const filesExplorerProvider = new FilesExplorerProvider(vscode.workspace.rootPath || '');
    
    context.subscriptions.push(
        vscode.commands.registerCommand('filesExporter.showExportView', () => {
            vscode.commands.executeCommand('workbench.view.explorer');
            vscode.commands.executeCommand('filesExporterView.focus');
        }),
        vscode.commands.registerCommand('filesExporter.refreshEntry', () => 
            filesExplorerProvider.refresh(true)
        ),
        vscode.commands.registerCommand('filesExporter.toggleSelection', (item) => 
            filesExplorerProvider.toggleSelection(item)
        ),
        vscode.commands.registerCommand('filesExporter.exportSelected', () => 
            filesExplorerProvider.exportSelected()
        ),
        vscode.commands.registerCommand('filesExporter.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'cursorLoooooongContext');
        })
    );
    
    context.subscriptions.push(filesExplorerProvider.getTreeView());
}

export function deactivate() {} 