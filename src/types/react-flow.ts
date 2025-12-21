/**
 * React Flow types
 * These provide type safety for diagram/flow components
 */

// Re-export existing React Flow types from index.ts for now
// We'll expand these as we need more specific typing
export type {
  FlowNode,
  FlowEdge,
  FlowGraph,
  FlowNodePosition,
  FlowNodeData,
} from './index';

// React Flow instance type for refs
export interface ReactFlowInstance {
  getNodes(): unknown[];
  getEdges(): unknown[];
  setNodes(nodes: unknown[]): void;
  setEdges(edges: unknown[]): void;
  fitView(options?: { padding?: number; includeHiddenNodes?: boolean }): void;
  zoomTo(level: number): void;
  project(position: { x: number; y: number }): { x: number; y: number };
  toObject(): { nodes: unknown[]; edges: unknown[] };
}

// Node type definitions for system design
export interface SystemDesignNodeType {
  type: string;
  label: string;
  icon?: unknown; // TODO: type this properly when we have icon library types
  shape?: string;
  color: string;
  backgroundColor: string;
}

// TODO: Expand these as we need more React Flow functionality
// - Custom node types
// - Edge types
// - Viewport types
// - Event handler types
