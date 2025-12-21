/**
 * Diagram Modal component for viewing diagrams in full screen
 */
import { Button } from "@/components/ui/button";
import Mermaid from "@/components/diagram/Mermaid";
import FlowCanvas from "@/components/diagram/FlowCanvas";
import type { FlowGraph } from "@/types";

type ActiveDiagram =
    | { engine: "mermaid"; code: string }
    | { engine: "reactflow"; graph: FlowGraph };

interface DiagramModalProps {
    isOpen: boolean;
    onClose: () => void;
    diagram: ActiveDiagram | null;
}

export const DiagramModal: React.FC<DiagramModalProps> = ({
    isOpen,
    onClose,
    diagram,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/80"
                onClick={onClose}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] bg-background border rounded-lg shadow-lg p-4 overflow-auto">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Diagram</div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>
                {diagram &&
                    (diagram.engine === "mermaid" ? (
                        <Mermaid chart={diagram.code} />
                    ) : (
                        <FlowCanvas graph={diagram.graph} height="80vh" />
                    ))}
            </div>
        </div>
    );
};
