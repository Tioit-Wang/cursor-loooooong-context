# Cursor Loooooong Context

*[中文README](./README_zh.md)*

A specialized VSCode extension designed to **break through the context limitations of Cursor IDE**. This extension solves a critical problem: Cursor often fails to send complete context when you @mention files, forcing you to waste precious Agent mode requests on read_file operations and "continue" prompts. With this extension, you can send AI-friendly context in one go, bypassing Cursor's built-in limitations!

## 🚨 Why This Extension Is CRITICAL For Cursor Users

### The PAINFUL Reality: Cursor's Hidden Context Limitation

Cursor IDE has a **devastating limitation** that's costing you time and money: **When you @mention files, Cursor doesn't actually send the complete context to save on their API costs!** This leads to:

- **Wasted Agent Requests**: Your precious 25 daily Agent requests get consumed by read_file operations
- **Frustrating Workflows**: You're forced to waste another request just to say "continue" to get the AI back on track
- **Lost Productivity**: Constant context switching as you wait for the AI to gather information it should have had from the start
- **Incomplete Assistance**: The AI lacks crucial context about your code, leading to subpar solutions

### The Liberating Solution: Loooooong Context

This extension **frees you from Cursor's artificial limitations** by allowing you to:

1. **Take Control of Your Context**: Deliberately select exactly which files matter for your current task
2. **Send Complete Context in One Go**: No more waiting for multiple read_file operations
3. **Preserve Project Structure**: The AI understands the relationships between files instantly
4. **Save Your Precious Agent Requests**: Use them for actual problem-solving, not just gathering context

## Features

- **Visual Selection Interface**: Checkbox-based file selection in familiar tree view
- **Smart Filtering**: Default exclusion of irrelevant directories (node_modules, .git, etc.)
- **One-Click Export**: Generate a perfectly formatted AI prompt with a single click
- **Catalog Generation**: Automatic creation of file structure overview
- **Syntax Preservation**: Language-specific code formatting in the exported content

## Usage

1. Click on the Cursor Context icon in the activity bar (left sidebar)
2. The "Files for Context Export" view will appear
3. Use the checkboxes to select the relevant files for your current task
4. Click the export button (📤) at the top of the view
5. The exported content will open in a new editor tab - ready to copy and paste into Cursor's AI chat

Alternatively, you can:
1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS)
2. Type and select "Show Files for Cursor Context Export"

## Export Format

The extension generates content in this precise format:

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
// File content with syntax highlighting
```
</file>

<file path='src/utils/helpers.ts'>
```typescript
// File content with syntax highlighting
```
</file>
</code_context>
```

## Installation

### From VSIX File
1. Download the `cursor-loooooong-context-0.1.0.vsix` file from the [releases page](https://github.com/Tioit-Wang/cursor-loooooong-context/releases)
2. Open VSCode
3. Press `Ctrl+Shift+X` to open the Extensions view
4. Click the "..." menu at the top of the view
5. Select "Install from VSIX..."
6. Browse and select the downloaded VSIX file
7. Restart VSCode after installation

### Building from Source
1. Clone the repository:
   ```
   git clone https://github.com/Tioit-Wang/cursor-loooooong-context.git
   ```
2. Navigate to the project directory:
   ```
   cd cursor-loooooong-context
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Build the extension:
   ```
   npm run compile
   ```
5. Package the extension:
   ```
   npx vsce package
   ```
6. Install the generated VSIX file in VSCode

## Pro Tips for Cursor Users

- **Stop Wasting Agent Requests**: Use this extension to provide complete context upfront
- **Select Strategically**: Include only the files directly relevant to your current task
- **Include Interface Files**: Always include files that define interfaces/types used by your working files
- **Export Before Complex Tasks**: Generate a fresh context export before asking the AI to implement complex features
- **Update Context When Stuck**: If the AI seems confused or is making mistakes, update your context with additional relevant files

## Requirements

- VSCode 1.60.0 or higher
- Cursor IDE (for using the exported context)

## Coming Soon

- Max file size limit warnings
- Export format templates
- Context size estimation

## New Features

### Multiple Root Directories Support

The extension now supports configuring multiple root directories for your workspace. This is useful when you want to include files from different directories in your context, such as both `src/` and `test/` directories.

#### How to Configure Multiple Root Directories

1. Click the folder icon in the "Files for Context Export" view in the Cursor Context sidebar
2. Select the directories you want to include (you can select multiple)
3. Click OK to save your configuration

Alternatively, you can configure the root directories in the settings:

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS)
2. Type and select "Preferences: Open Settings (UI)"
3. Search for "Cursor Loooooong Context"
4. Find the "Root Paths" setting and add your desired directories

## Known Issues

None at this time.

## Release Notes

### 0.1.0

- Initial release
- File selection with checkboxes
- Directory structure generation
- Markdown syntax highlighting in exported code