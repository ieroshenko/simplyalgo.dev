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
  TbZoomIn,
  TbZoomOut,
  TbMaximize,
  TbPuzzle,
  TbPointer,
  TbEraser,
  TbTrash,
} from "react-icons/tb";
import NodePalette from "./NodePalette";
import TextEditModal from "./TextEditModal";
import { RoughIcon } from "./RoughIcon";
import { RoughShape } from "./RoughShapes";
import { RoughEdge } from "./RoughEdge";
import type { SystemDesignBoardState } from "@/types";

interface DesignCanvasProps {
  boardState: SystemDesignBoardState;
  onBoardChange: (state: SystemDesignBoardState) => void;
}

interface NodeData {
  label: string;
}

// Icon mapping with Tabler icons
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

// Default labels for node types
const nodeLabelMap: Record<string, string> = {
  client: "Client",
  api: "Server",
  loadbalancer: "Load Balancer",
  database: "Database",
  cache: "Cache",
  queue: "Queue",
  cdn: "CDN",
  storage: "Storage",
  worker: "Cron/Worker",
  gateway: "DNS/Gateway",
  rectangle: "Rectangle",
  circle: "Circle",
  diamond: "Diamond",
  text: "Text",
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

// Hand-drawn node using RoughShape and RoughIcon
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
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  selected: boolean;
}) => {
  return (
    <div className="relative h-full w-full">
      <ResizableNode selected={selected} color={color}>
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
      </ResizableNode>
    </div>
  );
};

// Custom node types with icons
const createNodeType = (
  color: string,
  bgColor: string,
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>,
  shape?: string
) => {
  return ({ data, selected }: { data: NodeData; selected: boolean }) => (
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
  text: ({ data, selected }: { data: NodeData; selected: boolean }) => (
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

// Edge types with RoughEdge
const edgeTypes = {
  rough: RoughEdge,
};

// Normalize incoming edges so they always use the rough edge renderer and consistent styling
const ensureRoughEdges = (edgeList: Edge[] = []) =>
  edgeList.map((edge) => ({
    ...edge,
    type: edge.type || "rough",
    markerEnd: edge.markerEnd || { type: MarkerType.ArrowClosed },
    style: {
      stroke: edge.style?.stroke || "#6366f1",
      strokeWidth: edge.style?.strokeWidth ?? 3,
    },
  }));

const DesignCanvas = ({ boardState, onBoardChange }: DesignCanvasProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(boardState.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(ensureRoughEdges(boardState.edges || []));
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<"select" | "eraser">("select");
  const [editModal, setEditModal] = useState<{ isOpen: boolean; nodeId: string; initialValue: string }>({
    isOpen: false,
    nodeId: "",
    initialValue: "",
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<unknown>(null);

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
      setEdges(ensureRoughEdges(boardState.edges || []));
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
            type: "rough",
            animated: false,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Copy/Paste state
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);

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
  }, [nodes, setNodes, copiedNodes, setCopiedNodes]);

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
        data: { label: nodeLabelMap[type] || type.charAt(0).toUpperCase() + type.slice(1) },
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
        data: { label: nodeLabelMap[nodeType] || nodeType.charAt(0).toUpperCase() + nodeType.slice(1) },
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

  // Centralized delete helpers (can be extended to push undo operations)
  const deleteNodeWithEdges = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  const deleteEdgeById = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  // Keep click handlers for eraser mode (explicit action vs accidental hover)
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (selectedTool === "eraser") {
        event.preventDefault();
        deleteNodeWithEdges(node.id);
      }
    },
    [selectedTool, deleteNodeWithEdges]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      if (selectedTool === "eraser") {
        deleteEdgeById(edge.id);
        return;
      }

      const multi = event.metaKey || event.ctrlKey || event.shiftKey;

      setEdges((eds) =>
        eds.map((e) => {
          if (multi) {
            if (e.id === edge.id) {
              return { ...e, selected: !e.selected };
            }
            return e;
          }

          // Single select: clear others
          return { ...e, selected: e.id === edge.id };
        })
      );

      if (!multi) {
        // Clear node selection when focusing an edge
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
      }
    },
    [selectedTool, deleteEdgeById, setNodes, setEdges]
  );

  // Clear canvas
  const handleClearCanvas = useCallback(() => {
    if (confirm("Are you sure you want to clear the entire canvas?")) {
      setNodes([]);
      setEdges([]);
    }
  }, [setNodes, setEdges]);

  // Pan/zoom tracking
  const onMoveEnd = useCallback((_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
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
                  <TbPointer className="w-4 h-4" />
                </Button>
                <Button
                  variant={selectedTool === "eraser" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedTool("eraser")}
                  title="Eraser (E) - Click items to delete"
                >
                  <TbEraser className="w-4 h-4" />
                </Button>
              </div>

              {/* Zoom Controls */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactFlowInstance?.zoomIn()}
                title="Zoom In"
              >
                <TbZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactFlowInstance?.zoomOut()}
                title="Zoom Out"
              >
                <TbZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactFlowInstance?.fitView()}
                title="Fit View"
              >
                <TbMaximize className="w-4 h-4" />
              </Button>

              {/* Clear Canvas */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCanvas}
                title="Clear Canvas"
                className="text-destructive hover:text-destructive"
              >
                <TbTrash className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                {selectedTool === "eraser" ? "Eraser Mode: Hover to delete" : "Drag from colored dots to connect"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                title="Show Shapes"
              >
                <TbPuzzle className="w-4 h-4 mr-2" />
                Shapes
              </Button>
            </div>
          </div>

          {/* React Flow Canvas */}
          <div
            ref={reactFlowWrapper}
            className={`flex-1 ${selectedTool === "eraser" ? "eraser-mode" : ""}`}
          >
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
              edgeTypes={edgeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              deleteKeyCode={selectedTool === "select" ? ["Backspace", "Delete"] : []}
              // Enable edge selection/hit testing
              edgesUpdatable={true}
              edgesSelectable={true}
              defaultViewport={panZoom}
              minZoom={0.1}
              maxZoom={2}
              connectionLineStyle={{ stroke: "#6366f1", strokeWidth: 3 }}
              defaultEdgeOptions={{
                type: "rough",
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { stroke: "#6366f1", strokeWidth: 3 },
                interactionWidth: 24,
              }}
              panOnDrag={selectedTool === "select" ? [1, 2] : true}
              selectNodesOnDrag={selectedTool === "select"}
              elementsSelectable={selectedTool === "select"}
              selectionOnDrag={selectedTool === "select"}
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
