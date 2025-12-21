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
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Puzzle,
} from "lucide-react";
import NodePalette from "./NodePalette";
import type { SystemDesignBoardState } from "@/types";

interface DesignCanvasProps {
  boardState: SystemDesignBoardState;
  onBoardChange: (state: SystemDesignBoardState) => void;
}

// Custom node types with enhanced editing
const nodeTypes: NodeTypes = {
  client: ({ data }) => (
    <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg border-2 border-blue-300 dark:border-blue-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-blue-900 dark:text-blue-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  api: ({ data }) => (
    <div className="px-4 py-2 bg-green-100 dark:bg-green-900 rounded-lg border-2 border-green-300 dark:border-green-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-green-900 dark:text-green-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-green-700 dark:text-green-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  database: ({ data }) => (
    <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900 rounded-lg border-2 border-purple-300 dark:border-purple-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-purple-900 dark:text-purple-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-purple-700 dark:text-purple-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  cache: ({ data }) => (
    <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900 rounded-lg border-2 border-orange-300 dark:border-orange-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-orange-900 dark:text-orange-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-orange-700 dark:text-orange-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  loadbalancer: ({ data }) => (
    <div className="px-4 py-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg border-2 border-cyan-300 dark:border-cyan-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-cyan-900 dark:text-cyan-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-cyan-700 dark:text-cyan-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  queue: ({ data }) => (
    <div className="px-4 py-2 bg-pink-100 dark:bg-pink-900 rounded-lg border-2 border-pink-300 dark:border-pink-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-pink-900 dark:text-pink-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-pink-700 dark:text-pink-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  cdn: ({ data }) => (
    <div className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg border-2 border-indigo-300 dark:border-indigo-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-indigo-900 dark:text-indigo-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  metrics: ({ data }) => (
    <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg border-2 border-yellow-300 dark:border-yellow-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-yellow-900 dark:text-yellow-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  auth: ({ data }) => (
    <div className="px-4 py-2 bg-red-100 dark:bg-red-900 rounded-lg border-2 border-red-300 dark:border-red-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-red-900 dark:text-red-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-red-700 dark:text-red-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  external: ({ data }) => (
    <div className="px-4 py-2 bg-teal-100 dark:bg-teal-900 rounded-lg border-2 border-teal-300 dark:border-teal-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-teal-900 dark:text-teal-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-teal-700 dark:text-teal-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  storage: ({ data }) => (
    <div className="px-4 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg border-2 border-gray-300 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-gray-900 dark:text-gray-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  worker: ({ data }) => (
    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg border-2 border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-slate-900 dark:text-slate-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-slate-700 dark:text-slate-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
  gateway: ({ data }) => (
    <div className="px-4 py-2 bg-violet-100 dark:bg-violet-900 rounded-lg border-2 border-violet-300 dark:border-violet-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-violet-900 dark:text-violet-100">
        {data.label}
      </div>
      {data.note && (
        <div className="text-xs text-violet-700 dark:text-violet-300 mt-1 italic">
          {data.note}
        </div>
      )}
    </div>
  ),
};

const DesignCanvas = ({
  boardState,
  onBoardChange,
}: DesignCanvasProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(boardState.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(boardState.edges);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Pan/Zoom state for persistence
  const [panZoom, setPanZoom] = useState<{ x: number; y: number; zoom: number }>({
    x: 0, y: 0, zoom: 1
  });

  // Sync external board state with internal state (only when external state changes)
  const prevBoardStateRef = useRef(boardState);
  useEffect(() => {
    const nodesChanged =
      JSON.stringify(boardState.nodes) !==
      JSON.stringify(prevBoardStateRef.current.nodes);
    const edgesChanged =
      JSON.stringify(boardState.edges) !==
      JSON.stringify(prevBoardStateRef.current.edges);

    if (nodesChanged || edgesChanged) {
      setNodes(boardState.nodes);
      setEdges(boardState.edges);
      prevBoardStateRef.current = boardState;
    }
  }, [boardState, setNodes, setEdges]);

  // Load saved pan/zoom state
  useEffect(() => {
    const saved = localStorage.getItem("system-design-pan-zoom");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPanZoom(parsed);
        if (reactFlowInstance) {
          reactFlowInstance.setCenter(parsed.x, parsed.y, { zoom: parsed.zoom });
        }
      } catch (e) {
        console.error("Failed to load pan/zoom state", e);
      }
    }
  }, [reactFlowInstance]);

  // Save pan/zoom state
  useEffect(() => {
    localStorage.setItem("system-design-pan-zoom", JSON.stringify(panZoom));
  }, [panZoom]);

  // Notify parent of changes (debounced)
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Only notify if we have valid nodes and edges arrays
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return;
    }

    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    changeTimeoutRef.current = setTimeout(() => {
      onBoardChange({ nodes, edges });
    }, 100);
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
            style: { stroke: "#6366f1", strokeWidth: 2 },
            type: "smoothstep",
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // Copy/Paste functionality using nodes state directly
  const [copiedNodes, setCopiedNodes] = useState<any[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "c": {
            // Get currently selected nodes from the nodes state
            const selected = nodes.filter(node => node.selected);
            if (selected.length > 0) {
              e.preventDefault();
              setCopiedNodes(selected);
            }
            break;
          }
          case "v": {
            if (copiedNodes.length > 0) {
              e.preventDefault();
              const newNodes = copiedNodes.map(node => ({
                ...node,
                id: `${node.id}-copy-${Date.now()}`,
                position: {
                  x: node.position.x + 50,
                  y: node.position.y + 50,
                },
                selected: false,
              }));
              setNodes(nds => [...nds, ...newNodes]);
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
  }, [copiedNodes, nodes, setNodes]);


  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance) {
        console.log("[DesignCanvas] Drop failed - missing type or instance", { type, hasInstance: !!reactFlowInstance });
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
      };

      console.log("[DesignCanvas] Adding node via drop:", newNode);
      setNodes((nds) => {
        // Safety check: if nds is undefined, initialize as empty array
        const currentNodes = Array.isArray(nds) ? nds : [];
        return [...currentNodes, newNode];
      });
    },
    [reactFlowInstance, setNodes],
  );

  // Add node at center of canvas (for click-to-add)
  const handleAddNode = useCallback(
    (nodeType: string) => {
      if (!reactFlowInstance) {
        console.warn("[DesignCanvas] Cannot add node - React Flow not initialized");
        return;
      }

      // Get the center of the visible viewport
      const { x, y, zoom } = reactFlowInstance.getViewport();
      const centerX = (window.innerWidth / 2 - x) / zoom;
      const centerY = (window.innerHeight / 2 - y) / zoom;

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType === "default" ? undefined : nodeType,
        position: { x: centerX - 50, y: centerY - 50 }, // Center and offset by half node size
        data: { label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1) },
      };

      console.log("[DesignCanvas] Adding node via click:", newNode);
      setNodes((nds) => {
        // Safety check: if nds is undefined, initialize as empty array
        const currentNodes = Array.isArray(nds) ? nds : [];
        return [...currentNodes, newNode];
      });
    },
    [reactFlowInstance, setNodes],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      setNodes((nds) => {
        const currentNodes = Array.isArray(nds) ? nds : [];
        return currentNodes.filter((n) => !deleted.includes(n));
      });
    },
    [setNodes],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      setEdges((eds) => {
        const currentEdges = Array.isArray(eds) ? eds : [];
        return currentEdges.filter((e) => !deleted.includes(e));
      });
    },
    [setEdges],
  );

  // Context menu for adding notes
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const note = prompt("Add a note to this node:");
    if (note) {
      setNodes((nds) => {
        const currentNodes = Array.isArray(nds) ? nds : [];
        return currentNodes.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, note } }
            : n
        );
      });
    }
  }, [setNodes]);

  // Double-click to rename
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const newLabel = prompt("Rename node:", node.data.label);
    if (newLabel) {
      setNodes((nds) => {
        const currentNodes = Array.isArray(nds) ? nds : [];
        return currentNodes.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, label: newLabel } }
            : n
        );
      });
    }
  }, [setNodes]);

  // Pan/zoom tracking
  const onMoveEnd = useCallback((event: any, viewport: any) => {
    setPanZoom({ x: viewport.x, y: viewport.y, zoom: viewport.zoom });
  }, []);


  return (
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
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            title="Show Nodes"
          >
            <Puzzle className="w-4 h-4 mr-2" />
            Nodes
          </Button>
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
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onNodeContextMenu={onNodeContextMenu}
            onNodeDoubleClick={onNodeDoubleClick}
            onMoveEnd={onMoveEnd}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            deleteKeyCode={["Backspace", "Delete"]}
            defaultViewport={panZoom}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background variant="dots" gap={15} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default DesignCanvas;

