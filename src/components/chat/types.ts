import type { FlowGraph, CodeSnippet, Problem } from "@/types";

export interface AIChatProps {
  problemId: string;
  problemDescription: string;
  onInsertCodeSnippet?: (snippet: CodeSnippet) => void;
  problemTestCases?: unknown[];
  problem?: Problem;
  currentCode?: string;
}

export type ActiveDiagram =
  | { engine: "mermaid"; code: string }
  | { engine: "reactflow"; graph: FlowGraph };

export interface ParsedContent {
  body: string;
  hint?: string;
  hintsForNextStep?: string;
  solution?: string;
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  codeSnippets?: CodeSnippet[];
  diagram?: ActiveDiagram;
  suggestDiagram?: boolean;
}
