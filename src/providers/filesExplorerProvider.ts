import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class FilesExplorerProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private selectedItems: Set<string> = new Set();
    private fileItemCache: Map<string, FileItem> = new Map();
    private treeView: vscode.TreeView<FileItem>;

    constructor(private workspaceRoot: string) {
        // 创建TreeView并监听复选框状态变更
        this.treeView = vscode.window.createTreeView('filesExporterView', {
            treeDataProvider: this,
            // @ts-ignore - VSCode API类型定义中可能缺少showCheckboxes属性
            showCheckboxes: true
        });

        // 监听配置变更
        vscode.workspace.onDidChangeConfiguration(e => {
            // 检查是否影响了我们的配置
            if (e.affectsConfiguration('cursorLoooooongContext')) {
                console.log('Configuration changed, refreshing view');
                // 配置变更时刷新视图，但不重置选择状态
                this.refresh(false);
            }
        });

        // 监听checkbox状态变更
        this.treeView.onDidChangeCheckboxState(e => {
            // 处理TreeCheckboxChangeEvent
            // 由于VSCode API类型定义的限制，我们需要使用any类型
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const checkboxChanges = e as any;
            
            // 遍历所有变更的checkbox状态
            for (const [item, state] of checkboxChanges.entries()) {
                const fileItem = item as FileItem;
                const checkboxState = state as vscode.TreeItemCheckboxState;
                
                const filePath = fileItem.resourceUri.fsPath;
                const isChecked = checkboxState === vscode.TreeItemCheckboxState.Checked;
                
                // 避免重复处理
                const isCurrentlySelected = this.selectedItems.has(filePath);
                if (isChecked === isCurrentlySelected) {
                    continue;
                }

                if (isChecked) {
                    if (fileItem.isDirectory) {
                        this.selectDirectory(filePath);
                    } else {
                        this.selectedItems.add(filePath);
                    }
                } else {
                    if (fileItem.isDirectory) {
                        this.deselectDirectory(filePath);
                    } else {
                        this.selectedItems.delete(filePath);
                    }
                }
            }
            
            // 更新UI
            this.refresh();
        });
    }

    refresh(resetSelection: boolean = false): void {
        // 清除文件缓存，强制重新加载文件树
        this.fileItemCache.clear();
        
        // 如果需要重置选择状态
        if (resetSelection) {
            // 清除所有选中状态
            this.selectedItems.clear();
        }
        
        // 触发树视图刷新
        this._onDidChangeTreeData.fire();
        
        // 打印日志，便于确认刷新执行
        console.log('Tree view refreshed. Selection reset:', resetSelection);
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
            // 读取根路径配置
            const config = vscode.workspace.getConfiguration('cursorLoooooongContext', null);
            const rootPath = config.get<string>('rootPath') || '';
            
            if (rootPath.trim() === '') {
                // 如果根路径为空，则显示整个工作区
                return this.getFileItems(this.workspaceRoot);
            } else {
                // 否则只显示指定根路径下的内容
                const fullRootPath = path.join(this.workspaceRoot, rootPath.replace(/\//g, path.sep));
                
                // 检查路径是否存在
                if (!fs.existsSync(fullRootPath)) {
                    vscode.window.showWarningMessage(`指定的根路径 "${rootPath}" 不存在`);
                    return Promise.resolve([]);
                }
                
                return this.getFileItems(fullRootPath);
            }
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
            
            try {
                const stat = fs.statSync(filePath);
                const isDirectory = stat.isDirectory();

                // 检查是否应该排除此文件/目录
                if (this.shouldExclude(file, filePath, isDirectory)) {
                    continue;
                }

                if (isDirectory) {
                    // 预先检查目录是否有可见内容，如果没有，则跳过该目录
                    const childItems = await this.getFileItems(filePath);
                    if (childItems.length === 0) {
                        // 如果目录内容为空（所有子项都被过滤），则不显示该目录
                        continue;
                    }
                }

                const isSelected = this.selectedItems.has(filePath);

                // 读取是否默认展开所有目录的配置
                const config = vscode.workspace.getConfiguration('cursorLoooooongContext', this.workspaceRoot ? vscode.Uri.file(this.workspaceRoot) : null);
                const expandAll = config.get<boolean>('expandAll') || false;
                
                // 根据配置决定目录的展开状态
                const collapsibleState = isDirectory 
                    ? (expandAll ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed)
                    : vscode.TreeItemCollapsibleState.None;

                const fileItem = new FileItem(
                    vscode.Uri.file(filePath),
                    file,
                    collapsibleState,
                    isSelected,
                    isDirectory
                );

                // 缓存FileItem对象
                this.fileItemCache.set(filePath, fileItem);

                // 设置点击文件名的命令
                fileItem.command = {
                    command: 'filesExporter.toggleSelection',
                    title: 'Toggle Selection',
                    arguments: [fileItem]
                };

                fileItems.push(fileItem);
            } catch (error: unknown) {
                console.error(`Error processing file ${filePath}:`, error);
                // 继续处理其他文件
                continue;
            }
        }

        return fileItems;
    }

    private shouldExclude(fileName: string, filePath: string, isDirectory: boolean): boolean {
        const config = vscode.workspace.getConfiguration('cursorLoooooongContext', this.workspaceRoot ? vscode.Uri.file(this.workspaceRoot) : null);
        
        // 检查排除模式
        const excludePatterns: string[] = config.get('excludePatterns') || [
            'node_modules',
            '.git',
            'out',
            'dist',
            '.vscode'
        ];
        
        if (excludePatterns.some(pattern => fileName === pattern)) {
            return true;
        }

        // 如果是目录，不应该基于文件扩展名排除
        if (isDirectory) {
            return false;
        }

        // 检查是否只显示包含的文件扩展名
        const showOnlyIncluded: boolean = config.get('showOnlyIncludedExtensions') || false;
        if (!showOnlyIncluded) {
            return false;
        }

        // 检查文件扩展名是否在包含列表中
        const includeExtensions: string[] = config.get('includeFileExtensions') || [];
        if (includeExtensions.length === 0) {
            return false;
        }

        const fileExt = path.extname(filePath);
        return !includeExtensions.some(ext => {
            const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
            return normalizedExt === fileExt;
        });
    }

    // 修改toggleSelection方法，处理点击文件名的情况
    toggleSelection(item: FileItem): void {
        const filePath = item.resourceUri.fsPath;
        const isSelected = this.selectedItems.has(filePath);

        // 切换选中状态
        if (!isSelected) {
            if (item.isDirectory) {
                this.selectDirectory(filePath);
            } else {
                this.selectedItems.add(filePath);
            }
        } else {
            if (item.isDirectory) {
                this.deselectDirectory(filePath);
            } else {
                this.selectedItems.delete(filePath);
            }
        }

        // 更新UI
        this.refresh();
    }

    async exportSelected(): Promise<void> {
        if (this.selectedItems.size === 0) {
            vscode.window.showWarningMessage('Please select files to export');
            return;
        }

        try {
            // 添加头部注释提示
            let output = '// *********************\n';
            output += '// ! 这是预览文件，请勿复制这个文件，否则会失效，不小心复制请重新生成\n';
            output += '// ! This is a preview file, do not copy this file, otherwise it will be invalid, if you accidentally copy it, please regenerate it\n';
            output += '// ! 这是预览文件，请勿复制这个文件，否则会失效，不小心复制请重新生成\n';
            output += '// ! This is a preview file, do not copy this file, otherwise it will be invalid, if you accidentally copy it, please regenerate it\n';
            output += '// ! 这是预览文件，请勿复制这个文件，否则会失效，不小心复制请重新生成\n';
            output += '// ! This is a preview file, do not copy this file, otherwise it will be invalid, if you accidentally copy it, please regenerate it\n';
            output += '// ! 你需要的内容已经复制到剪贴板了，请直接粘贴到你的AI对话框中\n';
            output += '// ! The content you need has already been copied to your clipboard, please paste it directly into your AI dialog\n';
            output += '// *********************\n\n';

            output += '<catalog>\n';
            output += this.generateCatalog();
            output += '</catalog>\n\n';
            output += '<code_context>\n';

            // 只导出文件，不导出目录
            const filesToExport = Array.from(this.selectedItems).filter(filePath => {
                try {
                    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
                } catch (error: unknown) {
                    console.error(`Error checking file ${filePath}:`, error);
                    return false;
                }
            });

            for (const filePath of filesToExport) {
                try {
                    const relativePath = path.relative(this.workspaceRoot, filePath);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const extension = path.extname(filePath).substring(1);

                    output += `<file path='${relativePath}'>\n`;
                    output += '```' + this.getLanguageIdentifier(extension) + '\n';
                    output += content;
                    output += '\n```\n';
                    output += '</file>\n\n';
                } catch (error: unknown) {
                    console.error(`Error processing file ${filePath} for export:`, error);
                    // 继续处理其他文件
                    continue;
                }
            }

            output += '</code_context>';

            // 复制内容到剪贴板时不包含头部注释
            const clipboardContent = output.substring(output.indexOf('<catalog>'));
            await vscode.env.clipboard.writeText(clipboardContent + ' ');

            // 创建新文档显示结果
            const document = await vscode.workspace.openTextDocument({
                content: output,
                language: 'markdown'
            });

            await vscode.window.showTextDocument(document);

            // 显示通知消息
            vscode.window.showInformationMessage('内容已复制到剪贴板，可以直接粘贴到Cursor AI聊天窗口中使用！');
        } catch (error: unknown) {
            console.error('Error exporting selected files:', error);
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`导出失败: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('导出失败: 未知错误');
            }
        }
    }

    private getLanguageIdentifier(extension: string): string {
        const mapping: { [key: string]: string } = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            'cs': 'csharp',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
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
            'vue': 'vue',
            'svelte': 'svelte',
            'graphql': 'graphql',
            'gql': 'graphql',
            // 添加更多扩展名和语言标识符
        };

        return mapping[extension] || extension || '';
    }

    private generateCatalog(): string {
        try {
            // 过滤出文件路径（不包括目录）
            const filePaths = Array.from(this.selectedItems).filter(filePath => {
                try {
                    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
                } catch (error: unknown) {
                    console.error(`Error checking file ${filePath}:`, error);
                    return false;
                }
            });

            const sortedPaths = filePaths.sort();

            const dirTree: { [key: string]: any } = {};

            for (const filePath of sortedPaths) {
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
        } catch (error: unknown) {
            console.error('Error generating catalog:', error);
            return '- Error generating catalog\n';
        }
    }

    private renderDirectoryTree(tree: { [key: string]: any }, level: number): string {
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

    // 递归选中目录中的所有文件
    private selectDirectory(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            return;
        }
        
        try {
            const stat = fs.statSync(dirPath);
            if (!stat.isDirectory()) {
                return;
            }
            
            // 将目录本身添加到selectedItems中，使checkbox状态与实际选择状态一致
            this.selectedItems.add(dirPath);

            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);

                try {
                    const stat = fs.statSync(filePath);
                    
                    // 检查是否应该排除此文件/目录
                    if (this.shouldExclude(file, filePath, stat.isDirectory())) {
                        continue;
                    }

                    if (stat.isDirectory()) {
                        // 递归处理子目录
                        this.selectDirectory(filePath);
                    } else {
                        // 选中文件
                        this.selectedItems.add(filePath);
                    }
                } catch (error: unknown) {
                    console.error(`Error processing file ${filePath} during directory selection:`, error);
                    // 继续处理其他文件
                    continue;
                }
            }
        } catch (error: unknown) {
            console.error(`Error selecting directory ${dirPath}:`, error);
        }
    }

    // 递归取消选中目录中的所有文件
    private deselectDirectory(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            return;
        }
        
        try {
            const stat = fs.statSync(dirPath);
            if (!stat.isDirectory()) {
                return;
            }
            
            // 取消选中目录本身
            this.selectedItems.delete(dirPath);

            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);

                try {
                    const stat = fs.statSync(filePath);
                    
                    if (this.shouldExclude(file, filePath, stat.isDirectory())) {
                        continue;
                    }

                    if (stat.isDirectory()) {
                        // 递归处理子目录
                        this.deselectDirectory(filePath);
                    } else {
                        // 取消选中文件
                        this.selectedItems.delete(filePath);
                    }
                } catch (error: unknown) {
                    console.error(`Error processing file ${filePath} during directory deselection:`, error);
                    // 继续处理其他文件
                    continue;
                }
            }
        } catch (error: unknown) {
            console.error(`Error deselecting directory ${dirPath}:`, error);
        }
    }
}

class FileItem extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isSelected: boolean = false,
        public readonly isDirectory: boolean = false
    ) {
        super(resourceUri, collapsibleState);
        this.tooltip = this.label;
        this.description = path.relative(vscode.workspace.rootPath || '', this.resourceUri.fsPath);

        this.checkboxState = isSelected
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;
            
        // 设置适当的图标
        this.iconPath = isDirectory 
            ? vscode.ThemeIcon.Folder 
            : vscode.ThemeIcon.File;
    }

    contextValue = 'file';
} 