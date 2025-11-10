import { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  NodeTypes,
  MarkerType,
  NodeResizer,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Puzzle,
  Monitor,
  Server,
  Loader,
  Database,
  Zap,
  MessageSquare,
  Globe,
  HardDrive,
  Clock,
  Network,
  MousePointer2,
  Eraser,
  Trash2,
} from "lucide-react";
import NodePalette from "./NodePalette";
import TextEditModal from "./TextEditModal";
import type { SystemDesignBoardState } from "@/types";

interface DesignCanvasProps {
  boardState: SystemDesignBoardState;
  onBoardChange: (state: SystemDesignBoardState) => void;
}

// Icon mapping
const iconMap: Record<string, any> = {
  client: Monitor,
  api: Server,
  loadbalancer: Loader,
  database: Database,
  cache: Zap,
  queue: MessageSquare,
  cdn: Globe,
  storage: HardDrive,
  worker: Clock,
  gateway: Network,
};

// Resizable wrapper with handles
const ResizableNode = ({
  children,
  selected,
  color,
}: {
  children: React.ReactNode;
  selected: boolean;
  color: string;
}) => {
  return (
    <>
      {selected && (
        <NodeResizer
          minWidth={100}
          minHeight={60}
          handleStyle={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: color,
            border: "2px solid white",
          }}
        />
      )}
      {children}
      {/* Connection handles - visible colored dots for sources */}
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: color,
          border: "2px solid white",
        }}
      />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: color,
          border: "2px solid white",
        }}
      />
      <Handle
        id="left-source"
        type="source"
        position={Position.Left}
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: color,
          border: "2px solid white",
        }}
      />
      <Handle
        id="top-source"
        type="source"
        position={Position.Top}
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: color,
          border: "2px solid white",
        }}
      />
      {/* Target handles - invisible but functional */}
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
      <Handle
        id="bottom-target"
        type="target"
        position={Position.Bottom}
        style={{ opacity: 0 }}
      />
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        style={{ opacity: 0 }}
      />
    </>
  );
};

// Simple CSS-based hand-drawn node
const HandDrawnNode = ({
  children,
  color,
  bgColor,
  shape = "rectangle",
  icon: Icon,
  selected,
}: {
  children: React.ReactNode;
  color: string;
  bgColor: string;
  shape?: string;
  icon?: any;
  selected: boolean;
}) => {
  const baseClasses = "relative flex items-center gap-2 px-4 py-3 transition-all h-full w-full";
  const borderClasses = `border-2 shadow-md hover:shadow-lg`;

  if (shape === "diamond") {
    return (
      <div className="relative h-full w-full flex items-center justify-center">
        <ResizableNode selected={selected} color={color}>
          <div
            className={`${baseClasses} ${borderClasses} justify-center`}
            style={{
              borderColor: color,
              backgroundColor: bgColor,
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              boxShadow: `3px 3px 0px ${color}40`,
            }}
          >
            <div className="flex flex-col items-center gap-1">
              {Icon && <Icon className="w-5 h-5" style={{ color }} />}
              <div className="font-semibold text-xs text-center whitespace-nowrap" style={{ color }}>
                {children}
              </div>
            </div>
          </div>
        </ResizableNode>
      </div>
    );
  }

  if (shape === "circle") {
    return (
      <div className="relative h-full w-full flex items-center justify-center">
        <ResizableNode selected={selected} color={color}>
          <div
            className={`${baseClasses} ${borderClasses} justify-center`}
            style={{
              borderColor: color,
              backgroundColor: bgColor,
              borderRadius: "50%",
              borderStyle: "dashed",
            }}
          >
            <div className="flex flex-col items-center gap-1">
              {Icon && <Icon className="w-5 h-5" style={{ color }} />}
              <div className="font-semibold text-xs text-center" style={{ color }}>
                {children}
              </div>
            </div>
          </div>
        </ResizableNode>
      </div>
    );
  }

  if (shape === "cylinder") {
    return (
      <div className="relative h-full w-full">
        <ResizableNode selected={selected} color={color}>
          <div
            className={`${baseClasses} ${borderClasses} justify-center`}
            style={{
              borderColor: color,
              backgroundColor: bgColor,
              borderRadius: "20px / 40px",
              position: "relative",
              boxShadow: `3px 3px 0px ${color}40`,
            }}
          >
            <div className="flex flex-col items-center gap-1">
              {Icon && <Icon className="w-5 h-5" style={{ color }} />}
              <div className="font-semibold text-xs text-center" style={{ color }}>
                {children}
              </div>
            </div>
            {/* Horizontal line to simulate cylinder look */}
            <div
              style={{
                position: "absolute",
                top: "25%",
                left: 0,
                right: 0,
                height: "2px",
                backgroundColor: color,
                opacity: 0.3,
              }}
            />
          </div>
        </ResizableNode>
      </div>
    );
  }

  // Default rectangle with hand-drawn style
  return (
    <div className="relative h-full w-full">
      <ResizableNode selected={selected} color={color}>
        <div
          className={`${baseClasses} ${borderClasses}`}
          style={{
            borderColor: color,
            backgroundColor: bgColor,
            borderRadius: "8px",
            borderStyle: "solid",
            boxShadow: `3px 3px 0px ${color}40`,
          }}
        >
          {Icon && <Icon className="w-5 h-5" style={{ color }} />}
          <div className="font-semibold" style={{ color }}>
            {children}
          </div>
        </div>
      </ResizableNode>
    </div>
  );
};

// Custom node types with icons
const createNodeType = (color: string, bgColor: string, icon?: any, shape?: string) => {
  return ({ data, selected }: { data: any; selected: boolean }) => (
    <HandDrawnNode color={color} bgColor={bgColor} icon={icon} shape={shape} selected={selected}>
      {data.label}
    </HandDrawnNode>
  );
};

const nodeTypes: NodeTypes = {
  // System Design Components (with icons)
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

  // Basic Shapes
  rectangle: createNodeType("#1f2937", "#f9fafb"),
  circle: createNodeType("#1f2937", "#f9fafb", undefined, "circle"),
  diamond: createNodeType("#1f2937", "#f9fafb", undefined, "diamond"),

  // Text node
  text: ({ data, selected }: { data: any; selected: boolean }) => (
    <div className="relative">
      {selected && <NodeResizer minWidth={50} minHeight={20} />}
      <div className="px-2 py-1 bg-transparent">
        <div className="font-medium text-foreground whitespace-pre-wrap">{data.label || "Text"}</div>
      </div>
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

const DesignCanvas = ({ boardState, onBoardChange }: DesignCanvasProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(boardState.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(boardState.edges || []);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<"select" | "eraser">("select");
  const [editModal, setEditModal] = useState<{ isOpen: boolean; nodeId: string; initialValue: string }>({
    isOpen: false,
    nodeId: "",
    initialValue: "",
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Pan/Zoom state
  const [panZoom, setPanZoom] = useState<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  // Sync external board state with internal state
  const prevBoardStateRef = useRef(boardState);
  useEffect(() => {
    const nodesChanged =
      JSON.stringify(boardState.nodes) !== JSON.stringify(prevBoardStateRef.current.nodes);
    const edgesChanged =
      JSON.stringify(boardState.edges) !== JSON.stringify(prevBoardStateRef.current.edges);

    if (nodesChanged || edgesChanged) {
      setNodes(boardState.nodes || []);
      setEdges(boardState.edges || []);
      prevBoardStateRef.current = boardState;
    }
  }, [boardState, setNodes, setEdges]);

  // Notify parent of changes (debounced)
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return;
    }

    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    changeTimeoutRef.current = setTimeout(() => {
      onBoardChange({ nodes, edges });
    }, 500);
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, [nodes, edges, onBoardChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#6366f1", strokeWidth: 3 },
            type: "smoothstep",
            animated: false,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "a": {
            // Select all nodes
            e.preventDefault();
            setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
            break;
          }
          case "c": {
            const selected = nodes.filter((node) => node.selected);
            if (selected.length > 0) {
              e.preventDefault();
              setCopiedNodes(selected);
            }
            break;
          }
          case "v": {
            if (copiedNodes.length > 0) {
              e.preventDefault();
              const newNodes = copiedNodes.map((node) => ({
                ...node,
                id: `${node.id}-copy-${Date.now()}`,
                position: {
                  x: node.position.x + 50,
                  y: node.position.y + 50,
                },
                selected: false,
              }));
              setNodes((nds) => [...nds, ...newNodes]);
            }
            break;
          }
          default:
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [nodes, setNodes]);

  // Copy/Paste
  const [copiedNodes, setCopiedNodes] = useState<any[]>([]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: type === "default" ? undefined : type,
        position,
        data: { label: type.charAt(0).toUpperCase() + type.slice(1) },
        style: { width: 180, height: 80 }, // Default size
      };

      setNodes((nds) => [...(Array.isArray(nds) ? nds : []), newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  // Add node at center
  const handleAddNode = useCallback(
    (nodeType: string) => {
      if (!reactFlowInstance) {
        return;
      }

      const { x, y, zoom } = reactFlowInstance.getViewport();
      const centerX = (window.innerWidth / 2 - x) / zoom;
      const centerY = (window.innerHeight / 2 - y) / zoom;

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType === "default" ? undefined : nodeType,
        position: { x: centerX - 90, y: centerY - 40 },
        data: { label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1) },
        style: { width: 180, height: 80 },
      };

      setNodes((nds) => [...(Array.isArray(nds) ? nds : []), newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  // Double-click to edit
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setEditModal({
      isOpen: true,
      nodeId: node.id,
      initialValue: node.data.label || "",
    });
  }, []);

  const handleSaveEdit = useCallback(
    (newLabel: string) => {
      setNodes((nds) =>
        (Array.isArray(nds) ? nds : []).map((n) =>
          n.id === editModal.nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
        )
      );
    },
    [editModal.nodeId, setNodes]
  );

  // Eraser mode - click to delete
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (selectedTool === "eraser") {
        event.preventDefault();
        setNodes((nds) => nds.filter((n) => n.id !== node.id));
        // Also delete connected edges
        setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
      }
    },
    [selectedTool, setNodes, setEdges]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (selectedTool === "eraser") {
        event.preventDefault();
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
    },
    [selectedTool, setEdges]
  );

  // Clear canvas
  const handleClearCanvas = useCallback(() => {
    if (confirm("Are you sure you want to clear the entire canvas?")) {
      setNodes([]);
      setEdges([]);
    }
  }, [setNodes, setEdges]);

  // Pan/zoom tracking
  const onMoveEnd = useCallback((event: any, viewport: any) => {
    setPanZoom({ x: viewport.x, y: viewport.y, zoom: viewport.zoom });
  }, []);

  return (
    <>
      <div className="flex h-full relative">
        {/* Node Palette */}
        <NodePalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onAddNode={handleAddNode}
        />

        {/* Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-background">
            <div className="flex items-center gap-2">
              {/* Tool Selection */}
              <div className="flex items-center gap-1 mr-2 border-r border-border pr-2">
                <Button
                  variant={selectedTool === "select" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedTool("select")}
                  title="Select Tool (V)"
                >
                  <MousePointer2 className="w-4 h-4" />
                </Button>
                <Button
                  variant={selectedTool === "eraser" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedTool("eraser")}
                  title="Eraser (E) - Click items to delete"
                >
                  <Eraser className="w-4 h-4" />
                </Button>
              </div>

              {/* Zoom Controls */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactFlowInstance?.zoomIn()}
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactFlowInstance?.zoomOut()}
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactFlowInstance?.fitView()}
                title="Fit View"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>

              {/* Clear Canvas */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCanvas}
                title="Clear Canvas"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                {selectedTool === "eraser" ? "Eraser Mode: Click to delete" : "Drag from colored dots to connect"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                title="Show Shapes"
              >
                <Puzzle className="w-4 h-4 mr-2" />
                Shapes
              </Button>
            </div>
          </div>

          {/* React Flow Canvas */}
          <div ref={reactFlowWrapper} className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeDoubleClick={onNodeDoubleClick}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onMoveEnd={onMoveEnd}
              onNodesChange={onNodesChange}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              deleteKeyCode={selectedTool === "select" ? ["Backspace", "Delete"] : []}
              defaultViewport={panZoom}
              minZoom={0.1}
              maxZoom={2}
              connectionLineStyle={{ stroke: "#6366f1", strokeWidth: 3 }}
              defaultEdgeOptions={{
                type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { stroke: "#6366f1", strokeWidth: 3 },
              }}
              selectionOnDrag={selectedTool === "select"}
              panOnDrag={selectedTool === "select" ? [1, 2] : true}
              selectNodesOnDrag={selectedTool === "select"}
            >
              <Background variant="dots" gap={15} size={1} />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        </div>
      </div>

      {/* Text Edit Modal */}
      <TextEditModal
        isOpen={editModal.isOpen}
        initialValue={editModal.initialValue}
        onSave={handleSaveEdit}
        onClose={() => setEditModal({ isOpen: false, nodeId: "", initialValue: "" })}
        title="Edit Node Text"
      />
    </>
  );
};

export default DesignCanvas;
