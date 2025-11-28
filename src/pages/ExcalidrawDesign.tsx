import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Excalidraw } from "@excalidraw/excalidraw";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

const ExcalidrawDesign = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Minimal Header */}
      <div className="border-b border-border bg-background px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            System Design Canvas
          </h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Fullscreen Excalidraw - No Connection to Problems or Database */}
      <div className="flex-1 overflow-hidden">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme={isDark ? "dark" : "light"}
        />
      </div>
    </div>
  );
};

export default ExcalidrawDesign;
