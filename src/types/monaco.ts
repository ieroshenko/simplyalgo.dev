/**
 * Monaco Editor types
 * These provide type safety for editor references and operations
 */

// Basic Monaco Editor interface for refs
export interface MonacoEditorRef {
  getValue(): string;
  setValue(value: string): void;
  focus(): void;
  getPosition(): { lineNumber: number; column: number } | undefined;
  setPosition(position: { lineNumber: number; column: number }): void;
  getModel(): MonacoEditorModel | null;
  addAction(action: MonacoEditorAction): void;
  deltaDecorations(oldDecorations: string[], newDecorations: unknown[]): string[];
  getVisibleRanges(): unknown[];
  layout(): void;
  onDidLayoutChange(listener: () => void): { dispose(): void };
}

export interface MonacoEditorModel {
  getLinesContent(): string[];
  getLineCount(): number;
  getValueInRange(range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }): string;
}

export interface MonacoEditorAction {
  id: string;
  label: string;
  run(editor: MonacoEditorRef): void;
}

// Vim mode interface (for vim plugin integration)
export interface MonacoVimRef {
  getState(): MonacoVimState;
  setState(state: MonacoVimState): void;
}

export interface MonacoVimState {
  mode: 'normal' | 'insert' | 'visual';
  isRecording: boolean;
  macro?: string;
}

// TODO: Expand these as we need more Monaco functionality
// - Editor options
// - Language services
// - Theme types
// - Command palette types
