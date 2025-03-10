import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class FilesExplorerProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private selectedItems: Set<string> = new Set();

    constructor(private workspaceRoot: string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FileItem): Promise<FileItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No workspace folder is opened');
            return Promise.resolve([]);
        }

        if (element) {
            const filePath = element.resourceUri.fsPath;
            return this.getFileItems(filePath);
        } else {
            return this.getFileItems(this.workspaceRoot);
        }
    }

    private async getFileItems(folderPath: string): Promise<FileItem[]> {
        if (!fs.existsSync(folderPath)) {
            return [];
        }

        const files = fs.readdirSync(folderPath);
        const fileItems: FileItem[] = [];

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stat = fs.statSync(filePath);

            if (this.shouldExclude(file)) {
                continue;
            }

            const isSelected = this.selectedItems.has(filePath);
            const fileItem = new FileItem(
                vscode.Uri.file(filePath),
                file,
                stat.isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                isSelected
            );

            fileItem.command = {
                command: 'filesExporter.toggleSelection',
                title: 'Toggle Selection',
                arguments: [fileItem]
            };

            fileItems.push(fileItem);
        }

        return fileItems;
    }

    private shouldExclude(fileName: string): boolean {
        // 可以从设置中读取排除模式
        const excludePatterns = [
            'node_modules',
            '.git',
            'out',
            'dist',
            '.vscode'
        ];
        return excludePatterns.some(pattern => fileName === pattern);
    }

    toggleSelection(item: FileItem): void {
        const path = item.resourceUri.fsPath;
        if (this.selectedItems.has(path)) {
            this.selectedItems.delete(path);
        } else {
            this.selectedItems.add(path);
        }
        this.refresh();
    }

    async exportSelected(): Promise<void> {
        if (this.selectedItems.size === 0) {
            vscode.window.showWarningMessage('Please select files to export');
            return;
        }

        let output = '<catalog>\n';
        output += this.generateCatalog();
        output += '</catalog>\n\n';
        output += '<code_context>\n';
        
        for (const filePath of this.selectedItems) {
            if (!fs.existsSync(filePath)) {
                continue;
            }
            
            const relativePath = path.relative(this.workspaceRoot, filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            const extension = path.extname(filePath).substring(1); // 获取文件扩展名（不带点）
            
            output += `<file path='${relativePath}'>\n`;
            output += '```' + this.getLanguageIdentifier(extension) + '\n';
            output += content;
            output += '\n```\n';
            output += '</file>\n\n';
        }
        
        output += '</code_context>';

        // 创建新文档显示结果
        const document = await vscode.workspace.openTextDocument({
            content: output,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(document);
    }

    private getLanguageIdentifier(extension: string): string {
        const mapping: {[key: string]: string} = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'yml': 'yaml',
            'yaml': 'yaml',
            'xml': 'xml',
            'sh': 'bash',
            'bat': 'batch',
            'ps1': 'powershell',
            'sql': 'sql',
            'php': 'php',
            'go': 'go',
            'rb': 'ruby',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'dart': 'dart',
            // 添加更多扩展名和语言标识符
        };
        
        return mapping[extension] || extension || '';
    }

    private generateCatalog(): string {
        const sortedPaths = Array.from(this.selectedItems).sort();
        
        const dirTree: {[key: string]: any} = {};
        
        for (const filePath of sortedPaths) {
            if (!fs.existsSync(filePath)) {
                continue;
            }
            
            const relativePath = path.relative(this.workspaceRoot, filePath);
            const pathParts = relativePath.split(path.sep);
            
            let currentLevel = dirTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) {
                    currentLevel[part] = null;
                } else {
                    if (!currentLevel[part]) {
                        currentLevel[part] = {};
                    }
                    currentLevel = currentLevel[part];
                }
            }
        }
        
        return this.renderDirectoryTree(dirTree, 0);
    }
    
    private renderDirectoryTree(tree: {[key: string]: any}, level: number): string {
        let result = '';
        const indent = '  '.repeat(level);
        
        for (const key in tree) {
            if (tree[key] === null) {
                result += `${indent}- ${key}\n`;
            } else {
                result += `${indent}- ${key}/\n`;
                result += this.renderDirectoryTree(tree[key], level + 1);
            }
        }
        
        return result;
    }
}

class FileItem extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isSelected: boolean = false
    ) {
        super(resourceUri, collapsibleState);
        this.tooltip = this.label;
        this.description = path.relative(vscode.workspace.rootPath || '', this.resourceUri.fsPath);
        
        this.checkboxState = isSelected 
            ? vscode.TreeItemCheckboxState.Checked 
            : vscode.TreeItemCheckboxState.Unchecked;
    }

    iconPath = vscode.ThemeIcon.File;
    contextValue = 'file';
} 