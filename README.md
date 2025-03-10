# Cursor Loooooong Context

*[中文README](./README_zh.md)*

A specialized VSCode extension designed to **break through the context limitations of Cursor IDE**. By exporting selected project files in a structured, optimized format, it enables AI-powered development without the constraints of context window size.

## 🚨 Why This Extension Is Essential For Cursor Users

### The Problem: Cursor's Context Limitation

Cursor IDE, while powerful, has a fundamental limitation: **its context window can only handle a limited amount of code**. When working with:
- Large projects
- Complex codebases 
- Multiple interdependent files

...you've likely encountered the frustrating "Context window full" message, or received incomplete assistance because your AI assistant lacks crucial context about your code.

### The Solution: Loooooong Context

This extension allows you to **deliberately select the most relevant files** for your current task and export them in a perfectly formatted prompt that:

1. **Preserves directory structure** - So the AI understands the relationships between files
2. **Formats code with language markers** - For proper syntax highlighting and language understanding
3. **Creates an optimized catalog** - Giving the AI a mental map of your project structure

## Features

- **Visual Selection Interface**: Checkbox-based file selection in familiar tree view
- **Smart Filtering**: Default exclusion of irrelevant directories (node_modules, .git, etc.)
- **One-Click Export**: Generate a perfectly formatted AI prompt with a single click
- **Catalog Generation**: Automatic creation of file structure overview
- **Syntax Preservation**: Language-specific code formatting in the exported content

## Usage

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS)
2. Type and select "Show Files for Cursor Context Export"
3. In the explorer view, a new section called "Files for Cursor Context" will appear
4. Use the checkboxes to select the relevant files for your current task
5. Click the export button (📤) at the top of the view
6. The exported content will open in a new editor tab - ready to copy and paste into Cursor's AI chat

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

- **Select Strategically**: Include only the files directly relevant to your current task
- **Include Interface Files**: Always include files that define interfaces/types used by your working files
- **Export Before Complex Tasks**: Generate a fresh context export before asking the AI to implement complex features
- **Update Context When Stuck**: If the AI seems confused or is making mistakes, update your context with additional relevant files

## Requirements

- VSCode 1.60.0 or higher
- Cursor IDE (for using the exported context)

## Coming Soon

- Customizable exclusion patterns
- Max file size limit warnings
- Export format templates
- Context size estimation

## Known Issues

None at this time.

## Release Notes

### 0.1.0

- Initial release
- File selection with checkboxes
- Directory structure generation
- Markdown syntax highlighting in exported code 