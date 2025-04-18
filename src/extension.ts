import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FilesExplorerProvider } from './providers/filesExplorerProvider';

export function activate(context: vscode.ExtensionContext) {
    const filesExplorerProvider = new FilesExplorerProvider(vscode.workspace.rootPath || '');

    context.subscriptions.push(
        vscode.commands.registerCommand('filesExporter.showExportView', () => {
            vscode.commands.executeCommand('workbench.view.cursorContextExplorer');
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
        }),
        vscode.commands.registerCommand('filesExporter.configureRootPaths', async () => {
            await configureRootPaths(filesExplorerProvider);
        }),
        vscode.commands.registerCommand('filesExporter.configureExcludePatterns', async () => {
            await configureExcludePatterns(filesExplorerProvider);
        })
    );

    // 创建树视图并注册到上下文中
    const treeView = vscode.window.createTreeView('filesExporterView', {
        treeDataProvider: filesExplorerProvider
    });
    context.subscriptions.push(treeView);
}

// 配置根目录的函数
async function configureRootPaths(filesExplorerProvider: FilesExplorerProvider): Promise<void> {
    const workspaceRoot = vscode.workspace.rootPath || '';
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('未打开工作区，无法配置根目录');
        return;
    }

    try {
        // 获取当前配置
        const config = vscode.workspace.getConfiguration('cursorLoooooongContext', null);
        const currentRootPaths: string[] = config.get<string[]>('rootPaths') || [];

        // 向后兼容：如果当前没有rootPaths配置，但有rootPath配置，则将其转换为rootPaths
        if (currentRootPaths.length === 0) {
            const rootPath = config.get<string>('rootPath') || '';
            if (rootPath.trim() !== '') {
                currentRootPaths.push(rootPath);
            }
        }

        // 获取工作区下的目录
        const directories: vscode.QuickPickItem[] = [];
        const entries = fs.readdirSync(workspaceRoot);

        for (const entry of entries) {
            const entryPath = path.join(workspaceRoot, entry);
            try {
                const stat = fs.statSync(entryPath);
                if (stat.isDirectory()) {
                    // 检查是否应该排除此目录
                    const excludePatterns: string[] = config.get('excludePatterns') || [
                        'node_modules',
                        '.git',
                        'out',
                        'dist',
                        '.vscode'
                    ];

                    if (!excludePatterns.includes(entry)) {
                        directories.push({
                            label: entry + '/',
                            picked: currentRootPaths.includes(entry + '/')
                        });
                    }
                }
            } catch (error) {
                console.error(`读取目录时出错: ${entryPath}`, error);
            }
        }

        // 创建多选项目录选择器
        const selectedItems = await vscode.window.showQuickPick(directories, {
            canPickMany: true,
            placeHolder: '选择要显示的根目录（可多选）',
            title: '配置工作区根目录'
        });

        if (selectedItems === undefined) {
            // 用户取消了选择
            return;
        }

        // 更新配置
        if (selectedItems && selectedItems.length > 0) {
            // 提取选中项的标签
            const selectedPaths = selectedItems.map(item => item.label);

            await config.update('rootPaths', selectedPaths, vscode.ConfigurationTarget.Workspace);

            // 如果有旧的rootPath配置，将其清空
            if (config.get<string>('rootPath')) {
                await config.update('rootPath', '', vscode.ConfigurationTarget.Workspace);
            }

            // 刷新文件浏览器
            filesExplorerProvider.refresh(false);

            vscode.window.showInformationMessage(`根目录配置已更新: ${selectedPaths.join(', ')}`);
        } else {
            // 用户没有选择任何目录，清空配置
            await config.update('rootPaths', [], vscode.ConfigurationTarget.Workspace);

            // 如果有旧的rootPath配置，将其清空
            if (config.get<string>('rootPath')) {
                await config.update('rootPath', '', vscode.ConfigurationTarget.Workspace);
            }

            // 刷新文件浏览器
            filesExplorerProvider.refresh(false);

            vscode.window.showInformationMessage('根目录配置已清空，将显示整个工作区');
        }
    } catch (error) {
        console.error('配置根目录时出错:', error);
        vscode.window.showErrorMessage(`配置根目录时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
}

// 配置排除模式的函数
async function configureExcludePatterns(filesExplorerProvider: FilesExplorerProvider): Promise<void> {
    try {
        // 获取当前配置
        const config = vscode.workspace.getConfiguration('cursorLoooooongContext', null);
        const currentExcludePatterns: string[] = config.get<string[]>('excludePatterns') || [];
        const currentExcludeRegexPatterns: string[] = config.get<string[]>('excludeRegexPatterns') || [];

        // 创建选项
        const options = [
            { id: 'excludePatterns', label: '配置文件夹排除模式', description: '排除特定文件夹，如 node_modules、.git 等' },
            { id: 'excludeRegexPatterns', label: '配置正则表达式排除模式', description: '使用正则表达式排除文件或文件夹' }
        ];

        // 显示选项选择器
        const selectedOption = await vscode.window.showQuickPick(options, {
            placeHolder: '选择要配置的排除模式类型',
            title: '配置排除模式'
        });

        if (!selectedOption) {
            return; // 用户取消了选择
        }

        if (selectedOption.id === 'excludePatterns') {
            // 配置文件夹排除模式
            const input = await vscode.window.showInputBox({
                prompt: '输入要排除的文件夹名称，多个用逗号分隔（如 node_modules,.git,.venv）',
                value: currentExcludePatterns.join(',')
            });

            if (input !== undefined) {
                // 处理用户输入
                const patterns = input.split(',').map(p => p.trim()).filter(p => p.length > 0);
                await config.update('excludePatterns', patterns, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage(`文件夹排除模式已更新: ${patterns.join(', ')}`);
            }
        } else if (selectedOption.id === 'excludeRegexPatterns') {
            // 配置正则表达式排除模式
            const input = await vscode.window.showInputBox({
                prompt: '输入要排除的正则表达式模式，多个用逗号分隔（如 \\.venv.*,.*\\.pyc$）',
                value: currentExcludeRegexPatterns.join(',')
            });

            if (input !== undefined) {
                // 处理用户输入
                const patterns = input.split(',').map(p => p.trim()).filter(p => p.length > 0);
                await config.update('excludeRegexPatterns', patterns, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage(`正则表达式排除模式已更新: ${patterns.join(', ')}`);
            }
        }

        // 刷新文件浏览器
        filesExplorerProvider.refresh(false);
    } catch (error) {
        console.error('配置排除模式时出错:', error);
        vscode.window.showErrorMessage(`配置排除模式时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
}

export function deactivate() {}