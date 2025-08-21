import React from "react";
import CanvasModal from "./CanvasModal";
import { getDemoComponent } from "@/components/visualizations/registry";

interface CanvasContainerProps {
  initialCode?: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  problemId?: string;
}

export default function CanvasContainer({
  initialCode = "",
  title = "Interactive Component",
  isOpen,
  onClose,
  problemId,
}: CanvasContainerProps) {
  return (
    <CanvasModal isOpen={isOpen} onClose={onClose} title={title}>
      {/* Direct component rendering - no compilation needed */}
      <div className="h-full overflow-auto">
        {(() => {
          const Demo = getDemoComponent(problemId);
          if (Demo) return <Demo />;
          // Placeholder if no registered demo exists
          return (
            <div className="w-full h-full flex items-center justify-center p-6 text-sm text-muted-foreground">
              <>No interactive demo for this problem yet — coming soon.</>
            </div>
          );
        })()}
      </div>
    </CanvasModal>
  );
}

