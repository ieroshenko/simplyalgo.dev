import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
const MAX_SAFE_SCROLL = 10000;
const MAX_SCENE_DIMENSION = 20000; // Keep scene smaller than browser canvas limits
const MAX_COORDINATE = MAX_SCENE_DIMENSION / 2;

// Guard against corrupted board/app state values that can blow up the Excalidraw canvas.
const clampNumber = (value: any, fallback: number, limit: number) => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  if (Math.abs(numericValue) > limit) return Math.sign(numericValue) * limit;
  return numericValue;
};

const sanitizeElements = (elements?: readonly ExcalidrawElement[]) => {
  if (!Array.isArray(elements)) return [];
  const validElements = elements.filter((el) => {
    const coords = [el.x, el.y, el.width, el.height];
    return coords.every((val) => Number.isFinite(val) && Math.abs(val) <= MAX_COORDINATE);
  });

  if (validElements.length === 0) return [];

  // If the overall bounding box is still huge, reset to empty to prevent canvas explosion.
  const bounds = validElements.reduce(
    (acc, el) => ({
      minX: Math.min(acc.minX, el.x),
      minY: Math.min(acc.minY, el.y),
      maxX: Math.max(acc.maxX, el.x + (el.width || 0)),
      maxY: Math.max(acc.maxY, el.y + (el.height || 0)),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (width > MAX_SCENE_DIMENSION || height > MAX_SCENE_DIMENSION) {
    console.warn("[ExcalidrawCanvas] Scene bounding box too large, clearing elements to avoid DOMException.", {
      width,
      height,
      elementCount: validElements.length,
    });
    return [];
  }

  return validElements;
};

const sanitizeAppState = (appState: any, backgroundColor: string) => {
  const zoomValue = clampNumber(appState?.zoom?.value ?? appState?.zoom, 1, 4);
  const scrollX = clampNumber(appState?.scrollX, 0, MAX_SAFE_SCROLL);
  const scrollY = clampNumber(appState?.scrollY, 0, MAX_SAFE_SCROLL);

  return {
    viewBackgroundColor: typeof appState?.viewBackgroundColor === "string" ? appState.viewBackgroundColor : backgroundColor,
    zoom: { value: zoomValue as AppState["zoom"]["value"] },
    scrollX,
    scrollY,
    currentItemStrokeColor: appState?.currentItemStrokeColor,
    currentItemBackgroundColor: appState?.currentItemBackgroundColor,
    currentItemFillStyle: appState?.currentItemFillStyle,
    currentItemStrokeWidth: appState?.currentItemStrokeWidth,
    currentItemRoughness: appState?.currentItemRoughness,
    currentItemOpacity: appState?.currentItemOpacity,
  };
};

const sanitizeBoardState = (state: SystemDesignBoardState, backgroundColor: string): SystemDesignBoardState => ({
  elements: sanitizeElements(state.elements as readonly ExcalidrawElement[]),
  appState: sanitizeAppState(state.appState, backgroundColor),
  files: (state.files && typeof state.files === "object") ? state.files : {},
  nodes: Array.isArray(state.nodes) ? state.nodes : undefined,
  edges: Array.isArray(state.edges) ? state.edges : undefined,
});

const ExcalidrawCanvas = ({ boardState, onBoardChange }: ExcalidrawCanvasProps) => {
  const { isDark } = useTheme();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [canRender, setCanRender] = useState(false);
  const [tooSmall, setTooSmall] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const themeBackground = useMemo(() => {
    if (typeof window === "undefined") {
      return isDark ? "hsl(222 47% 11%)" : "hsl(0 0% 100%)";
    }
    const cssValue = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
    return cssValue ? `hsl(${cssValue})` : isDark ? "hsl(222 47% 11%)" : "hsl(0 0% 100%)";
  }, [isDark]);
  const safeBoardState = useMemo(
    () => sanitizeBoardState(boardState, themeBackground),
    [boardState, themeBackground],
  );

  // Wait for container to have valid dimensions before rendering Excalidraw
  useEffect(() => {
    let rafId: number;
    let timeoutId: NodeJS.Timeout;

    const checkDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // debug: dimension check removed for production

        if (width < MINIMUM_CANVAS_WIDTH || height < MINIMUM_CANVAS_HEIGHT) {
          // debug: warning removed for production
          setTooSmall(true);
          setCanRender(false);
        } else if (width > 0 && height > 0) {
          // debug: log removed for production
          setTooSmall(false);
          setCanRender(true);
        } else {
          // debug: warning removed for production
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
    if (excalidrawAPI && safeBoardState.elements && Array.isArray(safeBoardState.elements)) {
      // Only update if elements actually changed (prevent infinite loops)
      const currentElements = excalidrawAPI.getSceneElements();
      const elementsChanged = JSON.stringify(currentElements) !== JSON.stringify(safeBoardState.elements);

      if (elementsChanged && safeBoardState.elements.length > 0) {
        excalidrawAPI.updateScene({
          elements: safeBoardState.elements,
          appState: safeBoardState.appState || {},
          files: safeBoardState.files || {},
        });
      }
    }
  }, [safeBoardState, excalidrawAPI]);

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

        const sanitizedState = sanitizeBoardState(
          {
            elements: elements as any[],
            appState: essentialAppState,
            files: files as any,
          },
          themeBackground,
        );

        onBoardChange(sanitizedState);
      }, 500); // Debounce for 500ms
    },
    [onBoardChange, themeBackground]
  );

  // debug: render log removed for production

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
            elements: safeBoardState.elements || [],
            files: safeBoardState.files || {},
            appState: {
              viewBackgroundColor: themeBackground,
              ...safeBoardState.appState,  // Preserve any saved viewport state
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
