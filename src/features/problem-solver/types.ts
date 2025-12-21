/**
 * Types for the Problem Solver feature
 */
import type { editor } from "monaco-editor";
import type { TestResult } from "@/types";

/**
 * Complexity analysis result from AI
 */
export interface ComplexityAnalysis {
    time_complexity: string;
    time_explanation: string;
    space_complexity: string;
    space_explanation: string;
    analysis: string;
}

/**
 * Panel visibility state
 */
export interface PanelState {
    showLeftPanel: boolean;
    showBottomPanel: boolean;
    showRightPanel: boolean;
}

/**
 * Large insert confirmation dialog state
 */
export interface LargeInsertConfirmState {
    open: boolean;
    lineCount: number;
    resolve: ((value: boolean) => void) | null;
}

/**
 * Fullscreen code viewer state
 */
export interface FullscreenState {
    open: boolean;
    code: string;
    lang: string;
    title: string;
}

/**
 * Replacement dialog state
 */
export interface ReplacementDialogState {
    showDialog: boolean;
    pendingCode: string | null;
    currentCodeForDiff: string;
}

/**
 * Code editor ref type
 */
export type CodeEditorRef = React.MutableRefObject<editor.IStandaloneCodeEditor | null>;

/**
 * Test results panel props
 */
export interface TestResultsPanelProps {
    testResults: TestResult[];
    activeTestCase: number;
    setActiveTestCase: (index: number) => void;
    renderValue: (value: unknown) => string;
}

/**
 * Left panel tabs configuration
 */
export const LEFT_PANEL_TABS = [
    { id: "question", label: "Question" },
    { id: "solution", label: "Solution" },
    { id: "submissions", label: "Submissions" },
    { id: "notes", label: "Notes" },
] as const;

export type LeftPanelTabId = typeof LEFT_PANEL_TABS[number]['id'];
