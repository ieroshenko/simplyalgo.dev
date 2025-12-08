import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { CanvasContainer } from "@/components/canvas";
import { hasInteractiveDemo } from "@/components/visualizations/registry";
import { logger } from "@/utils/logger";
import type { ChatMessage, Problem } from "@/types";

interface CanvasRendererProps {
  message: ChatMessage;
  problem?: Problem;
}

interface MessageWithDiagram extends ChatMessage {
  diagram?: unknown;
}

/**
 * Component responsible for rendering interactive demo buttons and managing canvas modals
 * Only shows interactive demo option for problems that have registered interactive demos
 * and messages that contain diagrams
 */
export const CanvasRenderer = ({ message, problem }: CanvasRendererProps) => {
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasTitle, setCanvasTitle] = useState("Interactive Component");

  // Only show for assistant messages that have diagrams and problems with interactive demos
  const messageWithDiagram = message as MessageWithDiagram;
  const hasDiagram = Boolean(messageWithDiagram.diagram);
  const hasDemo = hasInteractiveDemo(problem?.id);
  const isAssistantMessage = message.role === "assistant";

  if (!isAssistantMessage || !hasDiagram || !hasDemo) {
    return null;
  }

  const handleGenerateComponent = async (messageContent: string) => {
    if (!problem) {
      logger.error("[CanvasRenderer] No problem context available for visualization");
      return;
    }

    // Open the canvas modal with the problem-specific interactive demo
    setCanvasTitle(`${problem.title} - Interactive Demo`);
    setIsCanvasOpen(true);
    logger.debug("[CanvasRenderer] Opening visualization for", { title: problem.title });
  };

  return (
    <>
      {/* Interactive Demo Button */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 gap-1.5 text-foreground border-accent/40 hover:bg-accent/10"
            onClick={() => handleGenerateComponent(message.content)}
            title="Generate an interactive component demo"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">Interactive Demo</span>
          </Button>
        </div>
      </div>

      {/* Canvas Modal for Interactive Components */}
      <CanvasContainer
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        title={canvasTitle}
        problemId={problem?.id}
      />
    </>
  );
};