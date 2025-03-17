import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class FilesExplorerProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private selectedItems: Set<string> = new Set();
    private selectedFiles: Set<string> = new Set();
    private fileItemCache: Map<string, FileItem> = new Map();
    private treeView: vscode.TreeView<FileItem>;

    // 类级别防抖器
    private refreshDebouncer: DebounceHelper = new DebounceHelper(100);

    constructor(private workspaceRoot: string) {
        // 创建TreeView（明确禁用复选框）
        this.treeView = vscode.window.createTreeView('filesExporterView', {
            treeDataProvider: this,
            showCheckboxes: false, // 明确禁用复选框显示
            manageCheckboxStateManually: false, // 不手动管理复选框状态
            canSelectMany: false, // 禁用多选
        } as vscode.TreeViewOptions<FileItem>);

        console.log('TreeView created with enhanced icons, checkboxes disabled');

        // 监听树视图中的选择事件
        this.treeView.onDidChangeSelection(e => {
            console.log('TreeView selection changed:', e.selection.length > 0
                ? e.selection.map(item => item.label || 'unknown')
                : 'No selection');
        });

        // 监听可见性变化事件
        this.treeView.onDidChangeVisibility(e => {
            console.log('TreeView visibility changed:', e.visible ? 'visible' : 'hidden');

            // 当TreeView变为可见时，刷新视图
            if (e.visible) {
                this.refresh(false);
            }
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
    }

    // 提供TreeView实例给extension.ts使用
    getTreeView(): vscode.TreeView<FileItem> {
        return this.treeView;
    }

    refresh(resetSelection: boolean = false): void {
        // 保存当前选择状态的副本
        const selectedItemsCopy = resetSelection ? new Set<string>() : new Set(this.selectedItems);
        const selectedFilesCopy = resetSelection ? new Set<string>() : new Set(this.selectedFiles);

        console.log(`Refresh called with resetSelection=${resetSelection}`);
        console.log('Before refresh - Selected items count:', this.selectedItems.size);
        console.log('Before refresh - Selected files count:', this.selectedFiles.size);

        // 如果有选中项，输出部分选中项用于调试
        if (this.selectedItems.size > 0) {
            const sampleItems = Array.from(this.selectedItems).slice(0, Math.min(5, this.selectedItems.size));
            console.log('Selected items sample:', sampleItems);
        }

        // 清除文件缓存，强制重新加载文件树
        this.fileItemCache.clear();

        // 如果需要重置选择状态
        if (resetSelection) {
            // 清除所有选中状态
            this.selectedItems.clear();
            this.selectedFiles.clear();
            console.log('Selection reset requested, cleared all selections');
        }

        // 触发树视图刷新
        this._onDidChangeTreeData.fire();

        // 确保刷新后恢复选择状态（如果不是重置）
        if (!resetSelection) {
            // 使用副本恢复选择状态
            this.selectedItems = selectedItemsCopy;
            this.selectedFiles = selectedFilesCopy;
        }

        console.log('After refresh - Selected items count:', this.selectedItems.size);
        console.log('After refresh - Selected files count:', this.selectedFiles.size);

        // 打印刷新完成日志
        console.log('Tree view refreshed. Selection reset:', resetSelection);
    }

    // 获取树项
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
                console.log(`File item ${filePath}: isSelected=${isSelected}`);

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
                    isDirectory,
                    this
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

        console.log(`Toggle selection for ${filePath}: current state=${isSelected}, isDirectory=${item.isDirectory}`);

        // 切换选中状态
        if (!isSelected) {
            if (item.isDirectory) {
                this.selectDirectory(filePath);
            } else {
                this.selectedItems.add(filePath);
                this.selectedFiles.add(filePath);
            }
        } else {
            if (item.isDirectory) {
                this.deselectDirectory(filePath);
            } else {
                this.selectedItems.delete(filePath);
                this.selectedFiles.delete(filePath);
            }
        }

        // 更新UI，但不重置选择状态
        this.refresh(false);
    }

    async exportSelected(): Promise<void> {
        console.log('Export called - checking selection state');
        console.log('Selected items count:', this.selectedItems.size);
        console.log('Selected files count:', this.selectedFiles.size);

        // 检查是否有选中的文件（不是目录）
        if (this.selectedFiles.size === 0) {
            // 如果没有选中文件，但有选中目录，询问是否自动选择目录中的文件
            if (this.selectedItems.size > 0) {
                const selectedDirs = Array.from(this.selectedItems).filter(item => {
                    try {
                        return fs.existsSync(item) && fs.statSync(item).isDirectory();
                    } catch (error) {
                        return false;
                    }
                });

                if (selectedDirs.length > 0) {
                    console.log('Found selected directories but no files:', selectedDirs);

                    // 自动选择目录中的文件
                    for (const dirPath of selectedDirs) {
                        this.autoSelectFilesInDirectory(dirPath);
                    }

                    // 如果现在有了选中的文件，则继续导出，否则提示用户
                    if (this.selectedFiles.size === 0) {
                        vscode.window.showWarningMessage('所选目录中没有符合条件的文件。请直接选择要导出的文件。');
                        return;
                    } else {
                        const result = await vscode.window.showInformationMessage(
                            `已自动选择目录中的 ${this.selectedFiles.size} 个文件，是否继续导出？`,
                            '是', '否'
                        );

                        if (result !== '是') {
                            vscode.window.showInformationMessage('导出已取消。请手动选择要导出的文件。');
                            return;
                        }
                    }
                } else {
                    vscode.window.showWarningMessage('Please select files to export');
                    return;
                }
            } else {
                vscode.window.showWarningMessage('Please select files to export');
                return;
            }
        }

        try {
            // 添加调试日志，查看选中的项目
            console.log('Selected items:', Array.from(this.selectedItems));
            console.log('Selected files:', Array.from(this.selectedFiles));

            // 使用selectedFiles集合而不是过滤selectedItems
            const filesToExport = Array.from(this.selectedFiles).filter(filePath => {
                try {
                    // 检查文件是否存在且是文件而非目录
                    if (fs.existsSync(filePath)) {
                        const isFile = fs.statSync(filePath).isFile();
                        console.log(`Checking file ${filePath}: exists=${true}, isFile=${isFile}`);
                        return isFile;
                    } else {
                        console.log(`File does not exist: ${filePath}`);
                        return false;
                    }
                } catch (error: unknown) {
                    console.error(`Error checking file ${filePath}:`, error);
                    return false;
                }
            });

            // 添加调试日志，查看过滤后的文件列表
            console.log('Files to export:', filesToExport);

            // 如果没有可导出的文件，显示提示
            if (filesToExport.length === 0) {
                vscode.window.showWarningMessage('No valid files selected for export. Please select at least one file (not just directories).');
                return;
            }

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
            console.log(`Directory does not exist: ${dirPath}`);
            return;
        }

        try {
            const stat = fs.statSync(dirPath);
            if (!stat.isDirectory()) {
                console.log(`Not a directory: ${dirPath}`);
                return;
            }

            // 将目录本身添加到selectedItems中
            this.selectedItems.add(dirPath);
            console.log(`Added directory to selection: ${dirPath}`);

            const files = fs.readdirSync(dirPath);
            console.log(`Directory ${dirPath} contains ${files.length} files/subdirectories`);

            let selectedFilesCount = 0;
            let skippedFilesCount = 0;

            for (const file of files) {
                const filePath = path.join(dirPath, file);

                try {
                    const stat = fs.statSync(filePath);

                    // 检查是否应该排除此文件/目录
                    if (this.shouldExclude(file, filePath, stat.isDirectory())) {
                        skippedFilesCount++;
                        continue;
                    }

                    if (stat.isDirectory()) {
                        // 递归处理子目录
                        this.selectDirectory(filePath);
                    } else {
                        // 选中文件
                        this.selectedItems.add(filePath);
                        this.selectedFiles.add(filePath);
                        selectedFilesCount++;
                    }
                } catch (error: unknown) {
                    console.error(`Error processing file ${filePath} during directory selection:`, error);
                    // 继续处理其他文件
                    continue;
                }
            }

            console.log(`Directory ${dirPath}: selected ${selectedFilesCount} files, skipped ${skippedFilesCount} files/directories`);
        } catch (error: unknown) {
            console.error(`Error selecting directory ${dirPath}:`, error);
        }
    }

    // 递归取消选中目录中的所有文件
    private deselectDirectory(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            console.log(`Directory does not exist: ${dirPath}`);
            return;
        }

        try {
            const stat = fs.statSync(dirPath);
            if (!stat.isDirectory()) {
                console.log(`Not a directory: ${dirPath}`);
                return;
            }

            // 取消选中目录本身
            this.selectedItems.delete(dirPath);
            console.log(`Removed directory from selection: ${dirPath}`);

            const files = fs.readdirSync(dirPath);
            console.log(`Directory ${dirPath} contains ${files.length} files/subdirectories to deselect`);

            let deselectedFilesCount = 0;
            let skippedFilesCount = 0;

            for (const file of files) {
                const filePath = path.join(dirPath, file);

                try {
                    const stat = fs.statSync(filePath);

                    if (this.shouldExclude(file, filePath, stat.isDirectory())) {
                        skippedFilesCount++;
                        continue;
                    }

                    if (stat.isDirectory()) {
                        // 递归处理子目录
                        this.deselectDirectory(filePath);
                    } else {
                        // 取消选中文件
                        this.selectedItems.delete(filePath);
                        this.selectedFiles.delete(filePath);
                        deselectedFilesCount++;
                    }
                } catch (error: unknown) {
                    console.error(`Error processing file ${filePath} during directory deselection:`, error);
                    // 继续处理其他文件
                    continue;
                }
            }

            console.log(`Directory ${dirPath}: deselected ${deselectedFilesCount} files, skipped ${skippedFilesCount} files/directories`);
        } catch (error: unknown) {
            console.error(`Error deselecting directory ${dirPath}:`, error);
        }
    }

    // 新增方法：自动选择目录中的文件
    private autoSelectFilesInDirectory(dirPath: string): void {
        if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
            return;
        }

        try {
            console.log(`Auto-selecting files in directory: ${dirPath}`);
            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);

                try {
                    const stats = fs.statSync(filePath);

                    if (stats.isDirectory()) {
                        // 递归处理子目录
                        this.autoSelectFilesInDirectory(filePath);
                    } else if (!this.shouldExclude(file, filePath, false)) {
                        // 选中符合条件的文件
                        console.log(`Auto-selecting file: ${filePath}`);
                        this.selectedItems.add(filePath);
                        this.selectedFiles.add(filePath);
                    }
                } catch (error) {
                    console.error(`Error processing file ${filePath} during auto-selection:`, error);
                }
            }
        } catch (error) {
            console.error(`Error auto-selecting files in directory ${dirPath}:`, error);
        }
    }

    // 无重置刷新方法 - 确保状态保持一致
    private refreshWithoutReset(): void {
        // 保存当前状态副本
        const selectedItemsCopy = new Set(this.selectedItems);
        const selectedFilesCopy = new Set(this.selectedFiles);

        console.log('刷新前状态 - 选中项数:', this.selectedItems.size);

        // 缓存当前展开的目录
        const expandedItems = new Set<string>();
        for (const [path, item] of this.fileItemCache.entries()) {
            if (item.collapsibleState === vscode.TreeItemCollapsibleState.Expanded) {
                expandedItems.add(path);
            }
        }

        // 清除缓存
        this.fileItemCache.clear();

        // 触发刷新
        this._onDidChangeTreeData.fire();

        // 恢复状态
        this.selectedItems = selectedItemsCopy;
        this.selectedFiles = selectedFilesCopy;

        // 延迟恢复展开状态
        setTimeout(() => {
            // 恢复展开状态
            for (const [path, item] of this.fileItemCache.entries()) {
                if (expandedItems.has(path) &&
                    item.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
                    try {
                        this.treeView.reveal(item, { expand: true });
                    } catch (e) {
                        // 忽略可能的错误
                    }
                }
            }
        }, 10);
    }

    // 防抖执行刷新
    private debouncedRefresh(resetSelection: boolean = false): void {
        this.refreshDebouncer.debounce(() => {
            this.refresh(resetSelection);
        });
    }

    // 重新实现getSelectedFilesCountInDirectory方法
    getSelectedFilesCountInDirectory(dirPath: string): number {
        let count = 0;
        try {
            if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
                return 0;
            }

            const countSelectedFilesRecursively = (dirPathParam: string): number => {
                let fileCount = 0;
                const entries = fs.readdirSync(dirPathParam);

                for (const entry of entries) {
                    const entryPath = path.join(dirPathParam, entry);

                    try {
                        if (fs.statSync(entryPath).isDirectory()) {
                            // 递归统计子目录
                            fileCount += countSelectedFilesRecursively(entryPath);
                        } else if (this.selectedFiles.has(entryPath)) {
                            // 统计选中的文件
                            fileCount++;
                        }
                    } catch (error) {
                        console.error(`处理目录项时出错: ${entryPath}`, error);
                    }
                }

                return fileCount;
            };

            count = countSelectedFilesRecursively(dirPath);
        } catch (error) {
            console.error(`统计目录中选中文件时出错: ${dirPath}`, error);
        }

        return count;
    }
}

class FileItem extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isSelected: boolean = false,
        public readonly isDirectory: boolean = false,
        private readonly provider?: FilesExplorerProvider
    ) {
        super(resourceUri, collapsibleState);
        
        // 为选中项添加高亮效果
        if (isSelected) {
            this.label = `✔ ${this.label}`;
        }
        
        this.tooltip = this.getTooltipText();
        this.description = this.getDescriptionText();
        this.iconPath = this.getIconPath();
        
        // 为选中项添加高亮颜色
        if (isSelected) {
            this.resourceUri = this.resourceUri;
            this.iconPath = this.getIconPath();
        }
    }

    // 增强的状态显示
    private getDescriptionText(): string {
        if (this.isDirectory && this.provider) {
            const count = this.provider.getSelectedFilesCountInDirectory(this.resourceUri.fsPath);
            return count > 0 ? `（已选择 ${count} 个文件）` : '';
        }
        return this.isSelected ? '（已选择）' : '';
    }

    // 增强的提示信息
    private getTooltipText(): string {
        let tooltip = this.label;
        if (this.isDirectory) {
            tooltip += ' (目录)';
        }
        if (this.isSelected) {
            tooltip += ' [已选择]';
        }
        return tooltip;
    }

    // 优化图标显示
    private getIconPath(): vscode.ThemeIcon | undefined {
        if (this.isDirectory) {
            return this.isSelected
                ? new vscode.ThemeIcon('folder-active', new vscode.ThemeColor('symbolIcon.classForeground'))
                : vscode.ThemeIcon.Folder;
        }
        return this.isSelected
            ? new vscode.ThemeIcon('file-text', new vscode.ThemeColor('terminal.ansiGreen'))
            : vscode.ThemeIcon.File;
    }

    contextValue = 'file';
}

// 防抖助手类
class DebounceHelper {
    private timeout: NodeJS.Timeout | null = null;

    constructor(private delay: number) { }

    debounce(callback: () => void): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.timeout = setTimeout(() => {
            this.timeout = null;
            callback();
        }, this.delay);
    }

    cancel(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
} 