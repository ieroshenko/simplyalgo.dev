import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/utils/logger';
import type React from 'react';
import type { EditorBounds, OverlayPosition, OverlayPositionManager } from '@/services/overlayPositionManager';
import type { PositionPreset } from '../types';

type UseOverlayDragParams = {
  overlayRef: React.RefObject<HTMLDivElement>;
  customPosition: { x: number; y: number } | null;
  setCustomPosition: (pos: { x: number; y: number } | null) => void;
  position: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
  positionManager?: OverlayPositionManager;
  problemId?: string;
  getEditorBounds: () => EditorBounds | null;
  applyPreset: (preset: PositionPreset) => void;
};

export const useOverlayDrag = ({
  overlayRef,
  customPosition,
  setCustomPosition,
  position,
  onPositionChange,
  positionManager,
  problemId,
  getEditorBounds,
  applyPreset,
}: UseOverlayDragParams) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const debouncedSavePosition = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
        try {
          localStorage.setItem('coach_overlay_position_preset', 'custom');
        } catch {
          // ignore
        }

        applyPreset('custom');

        setIsDragging(true);
        const rect = overlayRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
      }
    },
    [applyPreset, overlayRef],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        };
        setCustomPosition(newPosition);
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      setIsDragging(false);
      const pos = customPosition || position;

      if (debouncedSavePosition.current) {
        clearTimeout(debouncedSavePosition.current);
        debouncedSavePosition.current = null;
      }

      if (pos && positionManager && problemId) {
        try {
          const editorBounds = getEditorBounds();

          const overlayPosition: OverlayPosition = {
            x: pos.x,
            y: pos.y,
            timestamp: Date.now(),
            screenSize: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          };

          if (editorBounds) {
            const isValid = positionManager.isPositionValid(overlayPosition, editorBounds);
            if (!isValid) {
              logger.debug("User placed overlay outside editor bounds - allowing it", { component: "SimpleOverlay" });
            }
          }

          positionManager.savePosition(overlayPosition);
          logger.debug("User drag position saved", { component: "SimpleOverlay", overlayPosition });
        } catch (error) {
          logger.warn("Failed to save position", { component: "SimpleOverlay", error });
        }
      }

      if (pos && onPositionChange) {
        onPositionChange(pos);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (debouncedSavePosition.current) {
        clearTimeout(debouncedSavePosition.current);
        debouncedSavePosition.current = null;
      }
    };
  }, [
    isDragging,
    dragOffset.x,
    dragOffset.y,
    customPosition,
    position,
    onPositionChange,
    positionManager,
    problemId,
    getEditorBounds,
    setCustomPosition,
  ]);

  return {
    isDragging,
    handleMouseDown,
  };
};
