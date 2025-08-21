# Code Editor System Architecture

## Overview
The Code Editor system provides a VS Code-like editing experience using Monaco Editor, featuring intelligent code insertion, auto-save functionality, theme integration, and Vim mode support. It serves as the primary interface for coding problem solutions.

## Core Components

### File Locations
- **Component**: `src/components/CodeEditor.tsx`
- **Settings**: `src/components/EditorSettings.tsx`
- **Themes**: `src/hooks/useEditorTheme.ts`
- **Auto-save**: `src/hooks/useAutoSave.ts`
- **Code Insertion**: `src/utils/codeInsertion.ts`

## Architecture Pattern: Enhanced Monaco with Smart Features

### Data Flow
```
User Input → Monaco Editor → Change Handler → Auto-save → Parent Update
     ↓              ↓              ↓              ↓              ↓
Live Typing    Syntax Highlight   Debounced Save   State Sync    Draft Storage
```

## Core Mechanisms

### 1. Monaco Editor Integration
- **Base**: Microsoft's Monaco Editor (VS Code editor)
- **Language**: Python with full IntelliSense support
- **Features**: Syntax highlighting, error detection, auto-completion
- **Configuration**:
  ```typescript
  const editorOptions = {
    minimap: { enabled: false },
    lineNumbers: "on",
    wordWrap: "on",
    theme: "vs-dark" | "vs-light",
    fontSize: 14,
    scrollBeyondLastLine: false,
    automaticLayout: true
  }
  ```

### 2. Auto-Save System
- **Trigger**: Debounced after 2 seconds of inactivity
- **Storage**: Saves drafts to Supabase automatically
- **Visual Feedback**: Save status indicator with timestamps
- **Recovery**: Loads last saved draft on component mount

### 3. Theme Integration
- **System Sync**: Automatically follows system dark/light mode
- **Custom Themes**: Custom Monaco themes for brand consistency
- **Persistence**: Theme preferences saved to localStorage
- **Real-time**: Theme changes apply immediately without restart

## Smart Code Insertion

### AI-Powered Placement
- **Context Analysis**: GPT analyzes code structure for optimal insertion
- **Function Scope**: Detects if cursor is inside function boundaries
- **Indentation**: Matches existing code formatting automatically
- **Position Calculation**: Smart positioning based on code semantics

### Insertion Types
```typescript
type InsertionType = 
  | 'smart'    // AI-guided optimal placement
  | 'cursor'   // At current cursor position
  | 'append'   // End of file
  | 'prepend'  // Beginning of file
  | 'replace'  // Replace selection
```

### Visual Feedback
- **Highlighting**: Inserted code highlighted with fade animation
- **Cursor Management**: Maintains logical cursor position after insertion
- **Undo Support**: Preserves Monaco's undo/redo functionality

## Editor Features

### Code Intelligence
- **Syntax Highlighting**: Python-specific highlighting with error detection
- **Auto-completion**: Context-aware suggestions
- **Bracket Matching**: Automatic bracket/quote completion
- **Code Folding**: Collapse functions and classes

### Vim Mode Support
- **Optional**: Toggle-able Vim keybindings
- **Full Featured**: Normal, insert, visual modes
- **Integration**: Works seamlessly with Monaco's native features
- **Persistence**: Mode preference saved across sessions

### Keyboard Shortcuts
- **Save**: Ctrl/Cmd + S (triggers manual save)
- **Find**: Ctrl/Cmd + F (Monaco's native search)
- **Format**: Shift + Alt + F (code formatting)
- **Run**: Ctrl/Cmd + Enter (execute code)

## Performance Optimizations

### Lazy Loading
- **Monaco Bundling**: Dynamically imported to reduce initial bundle size
- **Theme Loading**: Themes loaded on demand
- **Worker Integration**: Runs language services in web workers

### Memory Management
- **Model Disposal**: Properly disposes Monaco models on unmount
- **Event Cleanup**: Removes event listeners to prevent memory leaks
- **Change Debouncing**: Prevents excessive re-renders during typing

## State Management

### Local State
```typescript
interface EditorState {
  code: string;           // Current editor content
  isLoading: boolean;     // Initial load state
  lastSaved: Date | null; // Last auto-save timestamp
  hasChanges: boolean;    // Unsaved changes indicator
  cursorPosition: { line: number; column: number };
}
```

### Integration Points
- **Parent Component**: Communicates changes via callbacks
- **Auto-save Hook**: Manages draft persistence
- **AI Chat**: Provides current code for context
- **Test Runner**: Supplies code for execution

## Auto-Save Implementation

### Debouncing Strategy
```typescript
const debouncedSave = debounce(async (code: string) => {
  await UserAttemptsService.saveDraft(userId, problemId, code);
  setLastSaved(new Date());
}, 2000);
```

### Save States
- **Auto-saving**: Transparent background saves
- **Manual Save**: Explicit user-triggered save
- **Error Handling**: Retry logic for failed saves
- **Offline Support**: Queues saves when offline

## Theme System

### Theme Configuration
```typescript
interface EditorTheme {
  name: string;
  base: 'vs' | 'vs-dark' | 'hc-black';
  colors: Record<string, string>;
  rules: Array<{
    token: string;
    foreground: string;
    fontStyle?: string;
  }>;
}
```

### Dynamic Switching
- **Real-time**: Themes change without editor reload
- **System Integration**: Follows OS dark/light mode preferences
- **Accessibility**: High contrast mode support

## Integration with Problem Solver

### Ref Interface
```typescript
interface CodeEditorRef {
  getValue: () => string;
  setValue: (value: string) => void;
  getPosition: () => { lineNumber: number; column: number } | null;
  setPosition: (pos: { lineNumber: number; column: number }) => void;
  focus: () => void;
  deltaDecorations: (oldDecorations: string[], newDecorations: any[]) => string[];
}
```

### Data Flow
- **Initialization**: Loads problem's function signature as starter code
- **Change Propagation**: Notifies parent of code changes
- **External Updates**: Accepts code insertions from AI chat
- **State Persistence**: Maintains draft across component remounts

## Error Handling

### Monaco Errors
- **Loading Failures**: Fallback to basic textarea
- **Memory Issues**: Graceful degradation
- **Worker Failures**: Disable advanced features, maintain basic editing

### Save Failures
- **Network Issues**: Retry with exponential backoff
- **Authentication**: Redirect to login if session expired
- **Storage Limits**: Warning and cleanup of old drafts

## Future Enhancements

### Planned Features
- **Multi-language Support**: JavaScript, Java, C++ support
- **Live Collaboration**: Real-time collaborative editing
- **Git Integration**: Version control and diff viewing
- **Advanced IntelliSense**: AI-powered code completion

### Performance Improvements
- **Virtual Scrolling**: Handle very large files efficiently
- **Progressive Loading**: Load file content incrementally
- **WebAssembly**: Use WASM for faster syntax processing
- **Service Worker**: Offline editing capabilities

### User Experience
- **Split View**: Side-by-side editing and preview
- **Minimap**: Code overview for navigation
- **Breadcrumbs**: Context navigation for large files
- **Advanced Search**: Regex and multi-file search