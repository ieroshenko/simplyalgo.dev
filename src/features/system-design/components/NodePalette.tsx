import { Button } from "@/components/ui/button";
import {
  Square,
  Circle,
  Diamond,
  Type,
} from "lucide-react";
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

// Consolidated NodePaletteProps is defined below with onAddNode

const nodeTypes = [
  // System Design Components
  { id: "client", label: "Client", icon: TbDeviceDesktop, color: "bg-blue-500" },
  { id: "api", label: "Server", icon: TbServer, color: "bg-green-500" },
  {
    id: "loadbalancer",
    label: "Load Balancer",
    icon: TbRouteAltLeft,
    color: "bg-cyan-500",
  },
  { id: "database", label: "Database", icon: TbDatabase, color: "bg-purple-500" },
  { id: "cache", label: "Cache", icon: TbDatabaseImport, color: "bg-orange-500" },
  { id: "queue", label: "Queue", icon: TbList, color: "bg-pink-500" },
  { id: "cdn", label: "CDN", icon: TbWorld, color: "bg-indigo-500" },
  { id: "storage", label: "Storage", icon: TbDeviceFloppy, color: "bg-gray-500" },
  { id: "worker", label: "Cron/Worker", icon: TbClockPlay, color: "bg-slate-500" },
  { id: "gateway", label: "DNS/Gateway", icon: TbNetwork, color: "bg-violet-500" },

  // Basic Shapes (Excalidraw-like)
  { id: "rectangle", label: "Rectangle", icon: Square, color: "bg-gray-700" },
  { id: "circle", label: "Circle", icon: Circle, color: "bg-gray-700" },
  { id: "diamond", label: "Diamond", icon: Diamond, color: "bg-gray-700" },
  { id: "text", label: "Text", icon: Type, color: "bg-gray-700" },
];

interface NodePaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode?: (nodeType: string) => void;
}

const NodePalette = ({ isOpen, onClose, onAddNode }: NodePaletteProps) => {
  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
    logger.debug("[NodePalette] Drag started for:", { nodeType });
    // Close palette on drag start so it doesn't block the drop
    onClose();
  };

  const handleNodeClick = (nodeType: string) => {
    logger.debug("[NodePalette] Node clicked:", { nodeType });
    if (onAddNode) {
      onAddNode(nodeType);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Add Node</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            title="Close"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Click to add or drag to place on canvas
        </p>
        <div className="grid grid-cols-3 gap-3">
          {nodeTypes.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <div
                key={nodeType.id}
                draggable
                onDragStart={(e) => onDragStart(e, nodeType.id)}
                onClick={() => handleNodeClick(nodeType.id)}
                className="flex flex-col items-center gap-2 p-4 h-auto border border-border rounded-lg hover:bg-accent hover:border-accent-foreground cursor-pointer transition-colors"
                title={`${nodeType.label} - Click to add or drag to place`}
              >
                <div className={`${nodeType.color} p-2 rounded`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-center">{nodeType.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NodePalette;
