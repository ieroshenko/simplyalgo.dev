import { useCallback, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { EditorBoundsCalculator, type MonacoEditor } from '@/services/editorBoundsCalculator';
import type { EditorBounds } from '@/services/overlayPositionManager';
import type React from 'react';

type UseOverlayEditorBoundsParams = {
  editorRef?: React.RefObject<{
    getDomNode?: () => HTMLElement | null;
  } | null>;
  onBoundsChange?: (bounds: EditorBounds) => void;
};

export const useOverlayEditorBounds = ({
  editorRef,
  onBoundsChange,
}: UseOverlayEditorBoundsParams) => {
  // Initialize EditorBoundsCalculator
  const editorBoundsCalculator = useMemo(
    () =>
      new EditorBoundsCalculator({
        padding: { top: 5, right: 5, bottom: 5, left: 5 },
        minWidth: 200,
        minHeight: 150,
      }),
    [],
  );

  // Initialize editor bounds calculator when editor reference is available
  useEffect(() => {
    if (editorRef?.current && editorBoundsCalculator) {
      try {
        const monacoEditor = editorRef.current as MonacoEditor;
        editorBoundsCalculator.initialize(monacoEditor);

        const unsubscribe = onBoundsChange
          ? editorBoundsCalculator.onBoundsChange(onBoundsChange)
          : null;

        return () => {
          if (unsubscribe) {
            unsubscribe();
          }
          editorBoundsCalculator.cleanup();
        };
      } catch (error) {
        logger.warn('Failed to initialize editor bounds calculator', {
          component: 'useOverlayEditorBounds',
          error,
        });
      }
    }
  }, [editorRef, editorBoundsCalculator, onBoundsChange]);

  // Helper function to get editor bounds using the calculator with fallback
  const getEditorBounds = useCallback((): EditorBounds | null => {
    // Try using the bounds calculator first
    if (editorBoundsCalculator) {
      try {
        const bounds = editorBoundsCalculator.getEditorBounds();
        if (bounds && editorBoundsCalculator.areBoundsValid(bounds)) {
          return bounds;
        }
      } catch (error) {
        logger.warn('EditorBoundsCalculator failed', { component: 'useOverlayEditorBounds', error });
      }
    }

    // Fallback to manual calculation if calculator fails
    try {
      const editorDom = editorRef?.current?.getDomNode?.();
      if (!editorDom) {
        logger.warn('Editor DOM node not available for bounds calculation', {
          component: 'useOverlayEditorBounds',
        });
        return null;
      }

      const editorRect = editorDom.getBoundingClientRect();

      if (!editorRect || editorRect.width === 0 || editorRect.height === 0) {
        logger.warn('Invalid editor rect dimensions', { component: 'useOverlayEditorBounds' });
        return null;
      }

      return {
        left: editorRect.left,
        top: editorRect.top,
        right: editorRect.right,
        bottom: editorRect.bottom,
        width: editorRect.width,
        height: editorRect.height,
      };
    } catch (error) {
      logger.warn('Manual editor bounds calculation failed', {
        component: 'useOverlayEditorBounds',
        error,
      });
      return null;
    }
  }, [editorBoundsCalculator, editorRef]);

  return { getEditorBounds, editorBoundsCalculator };
};
