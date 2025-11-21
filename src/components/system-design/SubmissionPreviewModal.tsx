import { useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeTypes,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { X, Calendar, Award, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@/hooks/useTheme";
import { RoughIcon } from "./RoughIcon";
import { RoughShape } from "./RoughShapes";
import { RoughEdge } from "./RoughEdge";
import type { SystemDesignSubmission } from "@/hooks/useSystemDesignSubmissions";
import {
  TbDeviceDesktop,
  TbServer,
  TbRouteAltLeft,
  TbDatabase,
  TbDatabaseImport,
  TbList,
  TbWorld,
  TbDeviceFloppy,
  TbClockPlay,
  TbNetwork,
} from "react-icons/tb";

interface SubmissionPreviewModalProps {
  submission: SystemDesignSubmission | null;
  isOpen: boolean;
  onClose: () => void;
}

// Icon mapping (same as DesignCanvas)
const iconMap: Record<string, any> = {
  client: TbDeviceDesktop,
  api: TbServer,
  loadbalancer: TbRouteAltLeft,
  database: TbDatabase,
  cache: TbDatabaseImport,
  queue: TbList,
  cdn: TbWorld,
  storage: TbDeviceFloppy,
  worker: TbClockPlay,
  gateway: TbNetwork,
};

// Read-only node component (Rough.js Excalidraw-style with handles)
const ReadOnlyNode = ({
  children,
  color,
  bgColor,
  shape = "rectangle",
  icon: Icon,
}: {
  children: React.ReactNode;
  color: string;
  bgColor: string;
  shape?: string;
  icon?: any;
}) => {
  // Invisible handles for edge connections
  const Handles = () => (
    <>
      <Handle id="right-source" type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="left-source" type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="top-source" type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="right-target" type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="left-target" type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="top-target" type="target" position={Position.Top} style={{ opacity: 0 }} />
    </>
  );

  return (
    <div className="relative h-full w-full">
      <Handles />
      <RoughShape
        width={180}
        height={80}
        color={color}
        bgColor={bgColor}
        shape={shape as "rectangle" | "circle" | "diamond" | "cylinder"}
        roughness={1.5}
        bowing={0.8}
        strokeWidth={2}
      >
        <div className="flex items-center gap-2">
          {Icon && <RoughIcon Icon={Icon} size={20} color={color} roughness={1.8} bowing={1.0} />}
          <div className="font-semibold text-sm" style={{ color }}>
            {children}
          </div>
        </div>
      </RoughShape>
    </div>
  );
};

// Custom node types (same as DesignCanvas but read-only)
const createNodeType = (color: string, bgColor: string, icon?: any, shape?: string) => {
  return ({ data }: { data: any }) => (
    <ReadOnlyNode color={color} bgColor={bgColor} icon={icon} shape={shape}>
      {data.label}
    </ReadOnlyNode>
  );
};

const nodeTypes: NodeTypes = {
  client: createNodeType("#2563eb", "#dbeafe", iconMap.client),
  api: createNodeType("#059669", "#d1fae5", iconMap.api),
  database: createNodeType("#7c3aed", "#ede9fe", iconMap.database, "cylinder"),
  cache: createNodeType("#ea580c", "#fed7aa", iconMap.cache),
  loadbalancer: createNodeType("#0891b2", "#cffafe", iconMap.loadbalancer, "diamond"),
  queue: createNodeType("#db2777", "#fce7f3", iconMap.queue),
  cdn: createNodeType("#4f46e5", "#e0e7ff", iconMap.cdn),
  storage: createNodeType("#475569", "#e2e8f0", iconMap.storage, "cylinder"),
  worker: createNodeType("#1e293b", "#f1f5f9", iconMap.worker),
  gateway: createNodeType("#7c3aed", "#f3e8ff", iconMap.gateway, "diamond"),
  rectangle: createNodeType("#1f2937", "#f9fafb"),
  circle: createNodeType("#1f2937", "#f9fafb", undefined, "circle"),
  diamond: createNodeType("#1f2937", "#f9fafb", undefined, "diamond"),
  text: ({ data }: { data: any }) => (
    <div className="relative px-2 py-1 bg-transparent">
      <div className="font-medium text-foreground whitespace-pre-wrap">{data.label || "Text"}</div>
      <Handle id="text-right-source" type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="text-bottom-source" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="text-left-source" type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="text-top-source" type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="text-right-target" type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="text-bottom-target" type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="text-left-target" type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="text-top-target" type="target" position={Position.Top} style={{ opacity: 0 }} />
    </div>
  ),
};

const edgeTypes = {
  rough: RoughEdge,
};

const SubmissionPreviewModal = ({ submission, isOpen, onClose }: SubmissionPreviewModalProps) => {
  const { isDark } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Load submission board state when modal opens
  useEffect(() => {
    if (isOpen && submission?.board_state) {
      const loadedNodes = submission.board_state.nodes || [];
      const loadedEdges = submission.board_state.edges || [];

      console.log("[SubmissionPreview] Loading board state:", {
        nodes: loadedNodes.length,
        edges: loadedEdges.length,
        firstNode: loadedNodes[0],
        firstEdge: loadedEdges[0],
      });

      // Ensure nodes have required properties
      const processedNodes = loadedNodes.map(node => ({
        ...node,
        width: node.width || node.style?.width || 180,
        height: node.height || node.style?.height || 80,
        dragging: false,
        selected: false,
      }));

      console.log("[SubmissionPreview] Processed nodes:", processedNodes.length);

      setNodes(processedNodes);
      setEdges(loadedEdges);
    }
  }, [isOpen, submission, setNodes, setEdges]);

  // Fit view after React Flow instance is ready
  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      console.log("[SubmissionPreview] Fitting view with", nodes.length, "nodes");
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 50);
    }
  }, [reactFlowInstance, nodes]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    if (score >= 60) return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    if (score >= 40) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen || !submission) {
    return null;
  }

  console.log("[SubmissionPreview] Rendering with submission:", {
    id: submission.id,
    score: submission.score,
    hasNodes: !!submission.board_state?.nodes,
    nodeCount: submission.board_state?.nodes?.length,
    hasEdges: !!submission.board_state?.edges,
    edgeCount: submission.board_state?.edges?.length,
    hasFeedback: !!submission.evaluation_feedback,
    feedbackLength: submission.evaluation_feedback?.length,
  });

  const nodeCount = submission.board_state?.nodes?.length || 0;
  const edgeCount = submission.board_state?.edges?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Layers className="w-6 h-6" />
              Submission Preview
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`px-4 py-1.5 rounded-md border font-semibold text-sm ${getScoreColor(submission.score)}`}>
              {submission.score}/100
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {formatDate(submission.completed_at)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="w-4 h-4" />
              {nodeCount} node{nodeCount !== 1 ? "s" : ""} • {edgeCount} connection{edgeCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Content - Split View */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left: Diagram Preview */}
          <div className="flex-1 border-r border-border bg-muted/5" style={{ position: 'relative', minHeight: 0 }}>
            {/* Debug overlay */}
            <div className="absolute top-2 left-2 z-10 bg-background/90 p-2 rounded-md text-xs border shadow-md">
              <div>Nodes: {nodes.length}</div>
              <div>Edges: {edges.length}</div>
              <div>Instance: {reactFlowInstance ? "✓" : "✗"}</div>
            </div>

            <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={(instance) => {
                  console.log("[SubmissionPreview] ReactFlow initialized");
                  setReactFlowInstance(instance);
                }}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={true}
                zoomOnScroll={true}
                minZoom={0.1}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                  type: "rough",
                  markerEnd: { type: MarkerType.ArrowClosed },
                  style: { stroke: "#6366f1", strokeWidth: 3 },
                  animated: false,
                }}
              >
                <Background variant="dots" gap={15} size={1} color="#94a3b8" />
                <Controls showInteractive={false} />
                <MiniMap nodeStrokeWidth={3} zoomable pannable />
              </ReactFlow>
            </div>
          </div>

          {/* Right: AI Feedback */}
          <div className="w-96 overflow-y-auto flex-shrink-0 bg-background">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">AI Evaluation</h3>
              </div>

              {/* Debug Info */}
              <div className="mb-4 p-3 bg-muted rounded-md text-xs">
                <div>Has Feedback: {submission.evaluation_feedback ? "✓" : "✗"}</div>
                <div>Feedback Length: {submission.evaluation_feedback?.length || 0}</div>
                <div>Score: {submission.score}</div>
              </div>

              {submission.evaluation_feedback ? (
                <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
                  <ReactMarkdown>{submission.evaluation_feedback}</ReactMarkdown>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground italic mb-4">No evaluation feedback available.</p>
                  <details className="text-xs text-muted-foreground">
                    <summary>Debug Data</summary>
                    <pre className="mt-2 overflow-auto">{JSON.stringify(submission, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-end flex-shrink-0">
          <Button onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
};

export default SubmissionPreviewModal;
