import { vi } from 'vitest';

// Mock Monaco editor instance
export const createMonacoEditorMock = () => ({
  getValue: vi.fn().mockReturnValue(''),
  setValue: vi.fn(),
  getModel: vi.fn().mockReturnValue({
    getValue: vi.fn().mockReturnValue(''),
    setValue: vi.fn(),
    getLineCount: vi.fn().mockReturnValue(1),
    getLineContent: vi.fn().mockReturnValue(''),
    getFullModelRange: vi.fn().mockReturnValue({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    }),
    onDidChangeContent: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  }),
  getPosition: vi.fn().mockReturnValue({ lineNumber: 1, column: 1 }),
  setPosition: vi.fn(),
  getSelection: vi.fn().mockReturnValue({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 1,
  }),
  setSelection: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  layout: vi.fn(),
  getDomNode: vi.fn().mockReturnValue(document.createElement('div')),
  getContainerDomNode: vi.fn().mockReturnValue(document.createElement('div')),
  onDidChangeModelContent: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidFocusEditorWidget: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidBlurEditorWidget: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidChangeCursorPosition: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidChangeCursorSelection: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidScrollChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  getScrollTop: vi.fn().mockReturnValue(0),
  getScrollLeft: vi.fn().mockReturnValue(0),
  setScrollTop: vi.fn(),
  setScrollLeft: vi.fn(),
  revealLine: vi.fn(),
  revealLineInCenter: vi.fn(),
  revealPosition: vi.fn(),
  revealPositionInCenter: vi.fn(),
  executeEdits: vi.fn(),
  pushUndoStop: vi.fn(),
  updateOptions: vi.fn(),
  addAction: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  addCommand: vi.fn().mockReturnValue(null),
  dispose: vi.fn(),
});

// Mock Monaco namespace
export const createMonacoMock = () => ({
  editor: {
    create: vi.fn().mockReturnValue(createMonacoEditorMock()),
    createModel: vi.fn().mockReturnValue({
      getValue: vi.fn().mockReturnValue(''),
      setValue: vi.fn(),
      dispose: vi.fn(),
    }),
    setModelLanguage: vi.fn(),
    defineTheme: vi.fn(),
    setTheme: vi.fn(),
    EditorOption: {
      readOnly: 0,
      fontSize: 1,
      tabSize: 2,
      minimap: 3,
      lineNumbers: 4,
    },
  },
  languages: {
    register: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
    setLanguageConfiguration: vi.fn(),
    registerCompletionItemProvider: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    registerHoverProvider: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    typescript: {
      typescriptDefaults: {
        setDiagnosticsOptions: vi.fn(),
        setCompilerOptions: vi.fn(),
        addExtraLib: vi.fn(),
      },
      javascriptDefaults: {
        setDiagnosticsOptions: vi.fn(),
        setCompilerOptions: vi.fn(),
        addExtraLib: vi.fn(),
      },
    },
  },
  KeyMod: {
    CtrlCmd: 2048,
    Shift: 1024,
    Alt: 512,
    WinCtrl: 256,
  },
  KeyCode: {
    Enter: 3,
    Escape: 9,
    Space: 10,
    Tab: 2,
    Backspace: 1,
    Delete: 20,
  },
  MarkerSeverity: {
    Hint: 1,
    Info: 2,
    Warning: 4,
    Error: 8,
  },
  Range: vi.fn().mockImplementation((startLine, startCol, endLine, endCol) => ({
    startLineNumber: startLine,
    startColumn: startCol,
    endLineNumber: endLine,
    endColumn: endCol,
  })),
  Position: vi.fn().mockImplementation((line, col) => ({
    lineNumber: line,
    column: col,
  })),
});

// Mock the @monaco-editor/react component
export const mockMonacoReact = () => {
  vi.mock('@monaco-editor/react', () => ({
    default: vi.fn(({ value, onChange, onMount }) => {
      const editorMock = createMonacoEditorMock();
      editorMock.getValue.mockReturnValue(value || '');

      // Simulate mount callback
      if (onMount) {
        setTimeout(() => onMount(editorMock, createMonacoMock()), 0);
      }

      return (
        <div data-testid="monaco-editor">
          <textarea
            data-testid="monaco-textarea"
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
          />
        </div>
      );
    }),
    Editor: vi.fn(({ value, onChange }) => (
      <div data-testid="monaco-editor">
        <textarea
          data-testid="monaco-textarea"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    )),
    useMonaco: vi.fn().mockReturnValue(createMonacoMock()),
    loader: {
      init: vi.fn().mockResolvedValue(createMonacoMock()),
    },
  }));
};

// Export types
export type MonacoEditorMock = ReturnType<typeof createMonacoEditorMock>;
export type MonacoMock = ReturnType<typeof createMonacoMock>;
