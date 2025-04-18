# Cursor 超长上下文扩展

*[English README](./README.md)*

**Cursor为了省钱，竟然在你@文件时不传递完整上下文！** 这导致你在Agent模式下频繁触发read_file工具操作，无情消耗你宝贵的25次日常Agent请求配额。更糟的是，你不得不浪费另一次请求仅仅发送"继续"让AI重新工作。本插件就是为了彻底解决这个痛点，让你一次性发送对AI友好的完整上下文，彻底摆脱Cursor设下的人为限制！

## 🚨 为什么这个扩展对Cursor用户至关重要

### 残酷现实：Cursor隐藏的上下文限制

Cursor IDE有一个**令人沮丧的致命缺陷**，正在浪费你的时间和金钱：**当你@提及文件时，Cursor实际上并没有发送完整上下文，只是为了节省他们的API成本！** 这导致：

- **Agent请求配额被无情消耗**：你宝贵的25次Agent请求被read_file操作大量占用
- **工作流程频繁中断**：你被迫浪费另一次请求只为发送"继续"让AI回到正轨
- **生产力严重下降**：不断的上下文切换，等待AI收集本应一开始就提供的信息
- **AI助手能力大打折扣**：缺乏关键代码上下文，导致解决方案质量低下

### 解放性方案：超长上下文

这个扩展**彻底打破Cursor人为设置的限制**，让你能够：

1. **完全掌控上下文提供**：精确选择当前任务真正需要的文件
2. **一次性发送完整上下文**：不再等待多次read_file操作慢慢获取信息
3. **完美保留项目结构**：AI立即理解文件之间的关系和依赖
4. **节省宝贵的Agent请求配额**：将它们用于真正的问题解决，而不是仅仅收集上下文

## 功能特性

- **可视化选择界面**：基于复选框的文件选择，树状视图直观展示
- **智能过滤**：默认排除无关目录（node_modules、.git 等）
- **一键导出**：只需单击即可生成格式完美的 AI 提示
- **目录生成**：自动创建文件结构概览
- **语法保留**：导出内容中的特定语言代码格式化

## 使用方法

1. 点击活动栏（左侧边栏）中的 Cursor Context 图标
2. 将出现 "Files for Context Export" 视图
3. 使用复选框选择与当前任务相关的文件
4. 点击视图顶部的导出按钮 (📤)
5. 导出的内容将在新的编辑器选项卡中打开 - 随时可以复制并粘贴到 Cursor 的 AI 聊天中

或者，你也可以：
1. 打开命令面板（Windows/Linux 上使用 `Ctrl+Shift+P`，macOS 上使用 `Cmd+Shift+P`）
2. 输入并选择 "Show Files for Cursor Context Export"

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

- **停止浪费Agent请求**：使用此扩展提前提供完整上下文
- **战略性选择**：仅包含与当前任务直接相关的文件
- **包含接口文件**：始终包含定义工作文件使用的接口/类型的文件
- **复杂任务前导出**：在请求 AI 实现复杂功能之前生成新的上下文导出
- **卡住时更新上下文**：如果 AI 似乎困惑或犯错，请用其他相关文件更新上下文

## 系统要求

- VSCode 1.60.0 或更高版本
- Cursor IDE（用于使用导出的上下文）

## 即将推出

- 最大文件大小警告
- 导出格式模板
- 上下文大小估算

## 新功能

### 多根目录支持

插件现在支持为工作区配置多个根目录。当你想要在上下文中包含来自不同目录的文件时，这非常有用，例如同时包含 `src/` 和 `test/` 目录。

#### 如何配置多个根目录

1. 点击 Cursor Context 侧边栏中“Files for Context Export”视图中的文件夹图标
2. 选择你想要包含的目录（可以选择多个）
3. 点击OK保存你的配置

或者，你可以在设置中配置根目录：

1. 打开命令面板（Windows/Linux 上使用 `Ctrl+Shift+P`，macOS 上使用 `Cmd+Shift+P`）
2. 输入并选择 "Preferences: Open Settings (UI)"
3. 搜索 "Cursor Loooooong Context"
4. 找到 "Root Paths" 设置并添加你想要的目录

#### 首次打开工作区的引导

当你首次在新的工作区中打开插件时，会显示一个引导对话框，帮助你配置根目录。你可以选择配置根目录或跳过。

## 已知问题

目前没有已知问题。

## 发行说明

### 0.1.0

- 首次发布
- 带复选框的文件选择
- 目录结构生成
- 导出代码中的 Markdown 语法高亮