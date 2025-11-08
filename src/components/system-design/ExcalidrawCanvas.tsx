import { useState, useEffect, useRef, useCallback } from "react";
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import type { ExcalidrawElement, AppState, BinaryFiles } from "@excalidraw/excalidraw/types/types";
import type { SystemDesignBoardState } from "@/types";
import { useTheme } from "@/hooks/useTheme";

interface ExcalidrawCanvasProps {
  boardState: SystemDesignBoardState;
  onBoardChange: (state: SystemDesignBoardState) => void;
}

const MINIMUM_CANVAS_WIDTH = 400;
const MINIMUM_CANVAS_HEIGHT = 300;

const ExcalidrawCanvas = ({ boardState, onBoardChange }: ExcalidrawCanvasProps) => {
  const { isDark } = useTheme();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [canRender, setCanRender] = useState(false);
  const [tooSmall, setTooSmall] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Wait for container to have valid dimensions before rendering Excalidraw
  useEffect(() => {
    let rafId: number;
    let timeoutId: NodeJS.Timeout;

    const checkDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        console.log('[ExcalidrawCanvas] Checking dimensions:', { width, height });

        if (width < MINIMUM_CANVAS_WIDTH || height < MINIMUM_CANVAS_HEIGHT) {
          console.warn(`[ExcalidrawCanvas] ⚠️ Container too small: ${width}x${height} (minimum: ${MINIMUM_CANVAS_WIDTH}x${MINIMUM_CANVAS_HEIGHT})`);
          setTooSmall(true);
          setCanRender(false);
        } else if (width > 0 && height > 0) {
          console.log('[ExcalidrawCanvas] ✅ Valid dimensions, allowing render');
          setTooSmall(false);
          setCanRender(true);
        } else {
          console.warn('[ExcalidrawCanvas] ❌ Invalid dimensions, blocking render');
          setCanRender(false);
        }
      }
    };

    // Wait for browser layout to settle using requestAnimationFrame
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => {
        checkDimensions();

        // Double-check after a delay in case first check fails
        timeoutId = setTimeout(checkDimensions, 250);
      });
    });

    // Also check on window resize
    window.addEventListener('resize', checkDimensions);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkDimensions);
    };
  }, []);

  // Initialize Excalidraw with saved board state
  useEffect(() => {
    if (excalidrawAPI && boardState.elements) {
      // Only update if elements actually changed (prevent infinite loops)
      const currentElements = excalidrawAPI.getSceneElements();
      const elementsChanged = JSON.stringify(currentElements) !== JSON.stringify(boardState.elements);

      if (elementsChanged && boardState.elements.length > 0) {
        excalidrawAPI.updateScene({
          elements: boardState.elements,
          appState: boardState.appState || {},
        });
      }
    }
  }, [boardState, excalidrawAPI]);

  // Handle changes from Excalidraw
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      // Debounce changes to avoid too frequent saves
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }

      changeTimeoutRef.current = setTimeout(() => {
        // Only save essential appState properties (viewBackgroundColor, viewport, etc.)
        const essentialAppState = {
          viewBackgroundColor: appState.viewBackgroundColor,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
          currentItemFillStyle: appState.currentItemFillStyle,
          currentItemStrokeWidth: appState.currentItemStrokeWidth,
          currentItemRoughness: appState.currentItemRoughness,
          currentItemOpacity: appState.currentItemOpacity,
        };

        onBoardChange({
          elements: elements as any[],
          appState: essentialAppState,
          files: files as any,
        });
      }, 500); // Debounce for 500ms
    },
    [onBoardChange]
  );

  // Log container dimensions right before rendering
  if (canRender && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    console.log('[ExcalidrawCanvas] 🎨 Rendering Excalidraw with container dimensions:', rect);
  }

  return (
    <div ref={containerRef} className="h-full w-full" style={{ position: 'relative' }}>
      {tooSmall ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-lg font-semibold text-foreground mb-2">
            Canvas Too Small
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            The drawing canvas needs at least {MINIMUM_CANVAS_WIDTH}×{MINIMUM_CANVAS_HEIGHT}px to render properly.
          </div>
          <div className="text-sm text-muted-foreground">
            Try:
          </div>
          <ul className="text-sm text-muted-foreground list-disc list-inside mt-2">
            <li>Expand your browser window</li>
            <li>Press <kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd+B</kbd> to hide left panel</li>
            <li>Press <kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd+L</kbd> to hide right panel</li>
          </ul>
        </div>
      ) : canRender ? (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleChange}
          initialData={{
            elements: boardState.elements || [],
            files: boardState.files || {},
            appState: {
              zoom: { value: 1 },
              scrollX: 0,
              scrollY: 0,
              viewBackgroundColor: isDark ? "#1e1e1e" : "#ffffff",
              ...boardState.appState,  // Preserve any saved viewport state
            },
          }}
          theme={isDark ? "dark" : "light"}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: {
                saveFileToDisk: true,
              },
              changeViewBackgroundColor: true,
              clearCanvas: true,
              toggleTheme: false,
            },
          }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.Help />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ToggleTheme />
          </MainMenu>
          <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint />
            <WelcomeScreen.Hints.ToolbarHint />
          </WelcomeScreen>
        </Excalidraw>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Initializing canvas...</div>
        </div>
      )}
    </div>
  );
};

export default ExcalidrawCanvas;
