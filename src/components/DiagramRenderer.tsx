import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import Mermaid from "@/components/diagram/Mermaid";
import FlowCanvas from "@/components/diagram/FlowCanvas";
import type { ChatMessage, FlowGraph } from "@/types";

interface DiagramRendererProps {
  message: ChatMessage;
}

type DiagramData = 
  | { engine: "mermaid"; code: string }
  | { engine: "reactflow"; graph: FlowGraph };

interface MessageWithDiagram extends ChatMessage {
  diagram?: DiagramData;
}

/**
 * Component responsible for rendering diagram attachments on chat messages
 * and managing the full-screen diagram modal
 */
export const DiagramRenderer = ({ message }: DiagramRendererProps) => {
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [activeDiagram, setActiveDiagram] = useState<DiagramData | null>(null);

  // Extract diagram data from message
  const messageWithDiagram = message as MessageWithDiagram;
  const diagram = messageWithDiagram.diagram;

  if (!diagram || message.role !== "assistant") {
    return null;
  }

  const openDiagramDialog = (diagramData: DiagramData) => {
    setActiveDiagram(diagramData);
    setIsDiagramOpen(true);
  };

  const closeDiagramDialog = () => {
    setIsDiagramOpen(false);
    setActiveDiagram(null);
  };

  const renderMermaidDiagram = (diagramData: { engine: "mermaid"; code: string }) => (
    <div className="mt-3">
      <div className="border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">
            Diagram{" "}
            <span className="ml-1 inline-block px-1.5 py-0.5 rounded border border-accent/40 text-[10px] uppercase tracking-wide">
              Mermaid
            </span>
          </div>
          <button
            type="button"
            className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => openDiagramDialog(diagramData)}
            title="View full screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Expand
          </button>
        </div>
        <Mermaid chart={diagramData.code} />
      </div>
    </div>
  );

  const renderReactFlowDiagram = (diagramData: { engine: "reactflow"; graph: FlowGraph }) => (
    <div className="mt-3">
      <div className="border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">
            Diagram{" "}
            <span className="ml-1 inline-block px-1.5 py-0.5 rounded border border-accent/40 text-[10px] uppercase tracking-wide">
              React Flow
            </span>
          </div>
          <button
            type="button"
            className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => openDiagramDialog(diagramData)}
            title="View full screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Expand
          </button>
        </div>
        <FlowCanvas graph={diagramData.graph} />
      </div>
    </div>
  );

  return (
    <>
      {/* Render diagram based on engine type */}
      {diagram.engine === "mermaid" 
        ? renderMermaidDiagram(diagram as { engine: "mermaid"; code: string })
        : renderReactFlowDiagram(diagram as { engine: "reactflow"; graph: FlowGraph })
      }

      {/* Full-screen diagram modal */}
      {isDiagramOpen && activeDiagram && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={closeDiagramDialog}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] bg-background border rounded-lg shadow-lg p-4 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Diagram</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={closeDiagramDialog}
              >
                Close
              </Button>
            </div>
            {activeDiagram.engine === "mermaid" ? (
              <Mermaid chart={activeDiagram.code} />
            ) : (
              <FlowCanvas graph={activeDiagram.graph} height="80vh" />
            )}
          </div>
        </div>
      )}
    </>
  );
};