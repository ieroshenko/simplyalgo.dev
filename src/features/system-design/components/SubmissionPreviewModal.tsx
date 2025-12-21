import { useEffect, useMemo, useState } from "react";
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
import type { SystemDesignSubmission } from "@/features/system-design/hooks/useSystemDesignSubmissions";
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
import { logger } from "@/utils/logger";

interface SubmissionPreviewModalProps {
  submission: SystemDesignSubmission | null;
  isOpen: boolean;
  onClose: () => void;
}

interface NodeData {
  label: string;
}

// Icon mapping (same as DesignCanvas)
const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
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
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
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
const createNodeType = (
  color: string,
  bgColor: string,
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>,
  shape?: string
) => {
  return ({ data }: { data: NodeData }) => (
    <ReadOnlyNode color={color} bgColor={bgColor} icon={icon} shape={shape}>
      {data.label}
    </ReadOnlyNode>
  );
};

const getNodeColors = (isDark: boolean) => ({
  client: { color: isDark ? "#bfdbfe" : "#2563eb", bgColor: isDark ? "#1d4ed8" : "#dbeafe" },
  api: { color: isDark ? "#bbf7d0" : "#059669", bgColor: isDark ? "#166534" : "#d1fae5" },
  database: { color: isDark ? "#e9d5ff" : "#7c3aed", bgColor: isDark ? "#5b21b6" : "#ede9fe" },
  cache: { color: isDark ? "#fed7aa" : "#ea580c", bgColor: isDark ? "#9a3412" : "#fed7aa" },
  loadbalancer: { color: isDark ? "#a5f3fc" : "#0891b2", bgColor: isDark ? "#155e75" : "#cffafe" },
  queue: { color: isDark ? "#fbcfe8" : "#db2777", bgColor: isDark ? "#9d174d" : "#fce7f3" },
  cdn: { color: isDark ? "#c7d2fe" : "#4f46e5", bgColor: isDark ? "#312e81" : "#e0e7ff" },
  storage: { color: isDark ? "#cbd5e1" : "#475569", bgColor: isDark ? "#0f172a" : "#e2e8f0" },
  worker: { color: isDark ? "#e2e8f0" : "#1e293b", bgColor: isDark ? "#0b1120" : "#f1f5f9" },
  gateway: { color: isDark ? "#e9d5ff" : "#7c3aed", bgColor: isDark ? "#4c1d95" : "#f3e8ff" },
  rectangle: { color: isDark ? "#e5e7eb" : "#1f2937", bgColor: isDark ? "#0f172a" : "#f9fafb" },
  circle: { color: isDark ? "#e5e7eb" : "#1f2937", bgColor: isDark ? "#0f172a" : "#f9fafb" },
  diamond: { color: isDark ? "#e5e7eb" : "#1f2937", bgColor: isDark ? "#0f172a" : "#f9fafb" },
});

const edgeTypes = {
  rough: RoughEdge,
};

const SubmissionPreviewModal = ({ submission, isOpen, onClose }: SubmissionPreviewModalProps) => {
  const { isDark } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<unknown>(null);
  const nodeColors = useMemo(() => getNodeColors(isDark), [isDark]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      client: createNodeType(nodeColors.client.color, nodeColors.client.bgColor, iconMap.client),
      api: createNodeType(nodeColors.api.color, nodeColors.api.bgColor, iconMap.api),
      database: createNodeType(
        nodeColors.database.color,
        nodeColors.database.bgColor,
        iconMap.database,
        "cylinder",
      ),
      cache: createNodeType(nodeColors.cache.color, nodeColors.cache.bgColor, iconMap.cache),
      loadbalancer: createNodeType(
        nodeColors.loadbalancer.color,
        nodeColors.loadbalancer.bgColor,
        iconMap.loadbalancer,
        "diamond",
      ),
      queue: createNodeType(nodeColors.queue.color, nodeColors.queue.bgColor, iconMap.queue),
      cdn: createNodeType(nodeColors.cdn.color, nodeColors.cdn.bgColor, iconMap.cdn),
      storage: createNodeType(
        nodeColors.storage.color,
        nodeColors.storage.bgColor,
        iconMap.storage,
        "cylinder",
      ),
      worker: createNodeType(nodeColors.worker.color, nodeColors.worker.bgColor, iconMap.worker),
      gateway: createNodeType(
        nodeColors.gateway.color,
        nodeColors.gateway.bgColor,
        iconMap.gateway,
        "diamond",
      ),
      rectangle: createNodeType(nodeColors.rectangle.color, nodeColors.rectangle.bgColor),
      circle: createNodeType(
        nodeColors.circle.color,
        nodeColors.circle.bgColor,
        undefined,
        "circle",
      ),
      diamond: createNodeType(
        nodeColors.diamond.color,
        nodeColors.diamond.bgColor,
        undefined,
        "diamond",
      ),
      text: ({ data }: { data: NodeData }) => (
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
    }),
    [nodeColors],
  );

  // Load submission board state when modal opens
  useEffect(() => {
    if (isOpen && submission?.board_state) {
      const loadedNodes = submission.board_state.nodes || [];
      const loadedEdges = submission.board_state.edges || [];

      logger.debug("[SubmissionPreview] Loading board state:", {
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

      logger.debug("[SubmissionPreview] Processed nodes:", { count: processedNodes.length });

      setNodes(processedNodes);
      setEdges(loadedEdges);
    }
  }, [isOpen, submission, setNodes, setEdges]);

  // Fit view after React Flow instance is ready
  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      logger.debug("[SubmissionPreview] Fitting view with nodes", { count: nodes.length });
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

  logger.debug("[SubmissionPreview] Rendering with submission:", {
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
                  logger.debug("[SubmissionPreview] ReactFlow initialized");
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
                  style: { stroke: isDark ? "#818cf8" : "#6366f1", strokeWidth: 3 },
                  animated: false,
                }}
              >
                <Background
                  variant="dots"
                  gap={15}
                  size={1}
                  color="hsl(var(--muted-foreground))"
                />
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
