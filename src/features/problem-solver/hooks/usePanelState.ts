/**
 * Hook for managing panel visibility state in Problem Solver
 */
import { useState, useCallback, useEffect } from "react";
import type { PanelState } from "../types";

const STORAGE_KEYS = {
    leftPanel: "showLeftPanel",
    bottomPanel: "showBottomPanel",
    rightPanel: "showRightPanel",
} as const;

/**
 * Load panel state from localStorage with fallback to default
 */
const loadPanelState = (key: string, defaultValue: boolean): boolean => {
    try {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            return JSON.parse(saved);
        }
    } catch {
        // Invalid JSON in localStorage, use default
    }
    return defaultValue;
};

export interface UsePanelStateResult {
    /** Panel visibility state */
    panelState: PanelState;
    /** Toggle left panel visibility */
    toggleLeftPanel: () => void;
    /** Toggle bottom panel visibility */
    toggleBottomPanel: () => void;
    /** Toggle right panel visibility */
    toggleRightPanel: () => void;
    /** Set bottom panel visibility directly */
    setShowBottomPanel: (show: boolean) => void;
}

/**
 * Hook to manage panel visibility with localStorage persistence
 */
export const usePanelState = (): UsePanelStateResult => {
    const [showLeftPanel, setShowLeftPanel] = useState(() =>
        loadPanelState(STORAGE_KEYS.leftPanel, true)
    );
    const [showBottomPanel, setShowBottomPanel] = useState(() =>
        loadPanelState(STORAGE_KEYS.bottomPanel, true)
    );
    const [showRightPanel, setShowRightPanel] = useState(() =>
        loadPanelState(STORAGE_KEYS.rightPanel, true)
    );

    const toggleLeftPanel = useCallback(() => {
        const newValue = !showLeftPanel;
        setShowLeftPanel(newValue);
        localStorage.setItem(STORAGE_KEYS.leftPanel, JSON.stringify(newValue));
    }, [showLeftPanel]);

    const toggleBottomPanel = useCallback(() => {
        const newValue = !showBottomPanel;
        setShowBottomPanel(newValue);
        localStorage.setItem(STORAGE_KEYS.bottomPanel, JSON.stringify(newValue));
        if (!newValue) {
            localStorage.setItem("hint-tests-collapsed", "1");
        }
    }, [showBottomPanel]);

    const toggleRightPanel = useCallback(() => {
        const newValue = !showRightPanel;
        setShowRightPanel(newValue);
        localStorage.setItem(STORAGE_KEYS.rightPanel, JSON.stringify(newValue));
        if (!newValue) {
            localStorage.setItem("hint-chat-collapsed", "1");
        }
    }, [showRightPanel]);

    const handleSetShowBottomPanel = useCallback((show: boolean) => {
        setShowBottomPanel(show);
        localStorage.setItem(STORAGE_KEYS.bottomPanel, JSON.stringify(show));
    }, []);

    // Register keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case "b":
                        e.preventDefault();
                        toggleLeftPanel();
                        break;
                    case "j":
                        e.preventDefault();
                        toggleBottomPanel();
                        break;
                    case "l":
                        e.preventDefault();
                        toggleRightPanel();
                        break;
                    default:
                        break;
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [toggleLeftPanel, toggleBottomPanel, toggleRightPanel]);

    return {
        panelState: {
            showLeftPanel,
            showBottomPanel,
            showRightPanel,
        },
        toggleLeftPanel,
        toggleBottomPanel,
        toggleRightPanel,
        setShowBottomPanel: handleSetShowBottomPanel,
    };
};
