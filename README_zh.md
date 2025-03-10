# Cursor 超长上下文扩展

*[English README](./README.md)*

一款专为**突破 Cursor IDE 上下文限制**而设计的 VSCode 扩展。通过以结构化、优化的格式导出选定的项目文件，它使得 AI 驱动的开发不再受到上下文窗口大小的限制。

## 🚨 为什么 Cursor 用户必备此扩展

### 问题：Cursor 的上下文限制

Cursor IDE 虽然强大，但有一个根本性的限制：**其上下文窗口只能处理有限的代码量**。当您处理以下情况时：
- 大型项目
- 复杂代码库
- 多个相互依赖的文件

...您可能会遇到令人沮丧的 "上下文窗口已满" 的提示，或由于 AI 助手缺乏关于您代码的关键上下文而得到不完整的帮助。

### 解决方案：超长上下文

此扩展允许您**有针对性地选择当前任务最相关的文件**，并将它们导出为格式完美的提示，它能：

1. **保留目录结构** - 使 AI 了解文件之间的关系
2. **使用语言标记格式化代码** - 提供正确的语法高亮和语言理解
3. **创建优化的目录** - 为 AI 提供项目结构的思维导图

## 功能特性

- **可视化选择界面**：基于复选框的文件选择，树状视图直观展示
- **智能过滤**：默认排除无关目录（node_modules、.git 等）
- **一键导出**：只需单击即可生成格式完美的 AI 提示
- **目录生成**：自动创建文件结构概览
- **语法保留**：导出内容中的特定语言代码格式化

## 使用方法

1. 打开命令面板（Windows/Linux 上使用 `Ctrl+Shift+P`，macOS 上使用 `Cmd+Shift+P`）
2. 输入并选择 "Show Files for Cursor Context Export"
3. 在资源管理器视图中，将出现 "Files for Cursor Context" 新部分
4. 使用复选框选择与当前任务相关的文件
5. 点击视图顶部的导出按钮 (📤)
6. 导出的内容将在新的编辑器选项卡中打开 - 随时可以复制并粘贴到 Cursor 的 AI 聊天中

## 导出格式

扩展生成以下精确格式的内容：

```
<catalog>
- src/
  - components/
    - Button.tsx
    - Header.tsx
  - utils/
    - helpers.ts
- package.json
</catalog>

<code_context>
<file path='src/components/Button.tsx'>
```typescript
import React from 'react';
// 带有语法高亮的文件内容
```
</file>

<file path='src/utils/helpers.ts'>
```typescript
// 带有语法高亮的文件内容
```
</file>
</code_context>
```

## 安装方法

### 从VSIX文件安装
1. 从[发布页面](https://github.com/Tioit-Wang/cursor-loooooong-context/releases)下载`cursor-loooooong-context-0.1.0.vsix`文件
2. 打开VSCode
3. 按下`Ctrl+Shift+X`打开扩展视图
4. 点击视图顶部的"..."菜单
5. 选择"从VSIX安装..."选项
6. 浏览并选择下载的VSIX文件
7. 安装后重启VSCode

### 从源码构建
1. 克隆仓库：
   ```
   git clone https://github.com/Tioit-Wang/cursor-loooooong-context.git
   ```
2. 进入项目目录：
   ```
   cd cursor-loooooong-context
   ```
3. 安装依赖：
   ```
   npm install
   ```
4. 构建扩展：
   ```
   npm run compile
   ```
5. 打包扩展：
   ```
   npx vsce package
   ```
6. 在VSCode中安装生成的VSIX文件

## Cursor 用户专业技巧

- **战略性选择**：仅包含与当前任务直接相关的文件
- **包含接口文件**：始终包含定义工作文件使用的接口/类型的文件
- **复杂任务前导出**：在请求 AI 实现复杂功能之前生成新的上下文导出
- **卡住时更新上下文**：如果 AI 似乎困惑或犯错，请用其他相关文件更新上下文

## 系统要求

- VSCode 1.60.0 或更高版本
- Cursor IDE（用于使用导出的上下文）

## 即将推出

- 可自定义排除模式
- 最大文件大小警告
- 导出格式模板
- 上下文大小估算

## 已知问题

目前没有已知问题。

## 发行说明

### 0.1.0

- 首次发布
- 带复选框的文件选择
- 目录结构生成
- 导出代码中的 Markdown 语法高亮 