import { useCallback, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import type { EditorBounds, OverlayPositionManager } from '@/services/overlayPositionManager';
import type { PositionPreset } from '../types';

type Point = { x: number; y: number };

type UseOverlaySmartPositionParams = {
  isVisible: boolean;
  positionPreset: PositionPreset;
  customPosition: Point | null;
  setCustomPosition: (pos: Point | null) => void;
  isMobile: boolean;
  position: Point;
  positionManager?: OverlayPositionManager;
  problemId?: string;
  highlightedLine?: number;
  getEditorBounds: () => EditorBounds | null;
  getPresetPosition: (preset: PositionPreset) => Point;
  logDebug?: (...args: unknown[]) => void;
};

export const useOverlaySmartPosition = ({
  isVisible,
  positionPreset,
  customPosition,
  setCustomPosition,
  isMobile,
  position,
  positionManager,
  problemId,
  highlightedLine,
  getEditorBounds,
  getPresetPosition,
  logDebug,
}: UseOverlaySmartPositionParams) => {
  const getErrorRecoveryPosition = useCallback((): Point => {
    logger.warn('Using error recovery positioning', { component: 'useOverlaySmartPosition' });

    const viewportWidth = window.innerWidth || 1024;
    const viewportHeight = window.innerHeight || 768;

    const overlayWidth = isMobile ? Math.min(viewportWidth - 32, 400) : 420;
    const overlayHeight = 280;

    return {
      x: Math.max(16, (viewportWidth - overlayWidth) / 2),
      y: Math.max(30, (viewportHeight - overlayHeight) / 2),
    };
  }, [isMobile]);

  const getLegacyPosition = useCallback((): Point => {
    try {
      const overlayWidth = isMobile ? window.innerWidth - 32 : 420;
      const overlayHeight = 280;

      const editorBounds = getEditorBounds();

      if (!editorBounds) {
        logger.warn('Editor bounds not available, using error recovery positioning', {
          component: 'useOverlaySmartPosition',
        });
        return getErrorRecoveryPosition();
      }

      if (editorBounds.width <= 0 || editorBounds.height <= 0) {
        logger.warn('Invalid editor dimensions, using error recovery positioning', {
          component: 'useOverlaySmartPosition',
        });
        return getErrorRecoveryPosition();
      }

      const viewportX = editorBounds.left + position.x;
      const viewportY = editorBounds.top + position.y;

      if (isMobile) {
        return {
          x: Math.max(editorBounds.left + 16, 16),
          y: Math.min(editorBounds.bottom - 300, window.innerHeight - 300),
        };
      }

      const verticalOffset = 80;
      const horizontalPadding = 20;

      let idealX = viewportX;
      let idealY = viewportY + verticalOffset;

      const editorMinX = editorBounds.left + horizontalPadding;
      const editorMaxX = editorBounds.right - overlayWidth - horizontalPadding;

      if (idealX < editorMinX) {
        idealX = editorMinX;
      } else if (idealX > editorMaxX) {
        idealX = editorMaxX;
      }

      const editorMinY = editorBounds.top + 20;
      const editorMaxY = editorBounds.bottom - overlayHeight - 20;

      if (idealY > editorMaxY) {
        const aboveY = viewportY - overlayHeight - 20;
        idealY = aboveY >= editorMinY ? aboveY : editorMaxY;
      }

      if (idealY < editorMinY) {
        idealY = editorMinY;
      }

      return { x: idealX, y: idealY };
    } catch (error) {
      logger.error('Legacy positioning failed', error, { component: 'useOverlaySmartPosition' });
      return getErrorRecoveryPosition();
    }
  }, [isMobile, getEditorBounds, getErrorRecoveryPosition, position]);

  const getSmartPosition = useCallback((): Point => {
    if (customPosition) return customPosition;

    if (positionPreset !== 'auto' && positionPreset !== 'custom') {
      const p = getPresetPosition(positionPreset);
      logDebug?.('getSmartPosition -> preset immediate', positionPreset, p);
      return p;
    }

    if (positionPreset === 'custom' && customPosition) {
      logDebug?.('getSmartPosition -> custom', customPosition);
      return customPosition;
    }

    if (positionManager && problemId) {
      try {
        const editorBounds = getEditorBounds();

        if (editorBounds) {
          const overlayPosition = positionManager.getPositionWithFallback(editorBounds, highlightedLine);
          logger.debug('Using OverlayPositionManager position', { component: 'useOverlaySmartPosition', overlayPosition });
          return { x: overlayPosition.x, y: overlayPosition.y };
        }

        const fallbackPosition = positionManager.getPositionWithFallback();
        logger.debug('Using viewport fallback position', { component: 'useOverlaySmartPosition', fallbackPosition });
        return { x: fallbackPosition.x, y: fallbackPosition.y };
      } catch (error) {
        logger.warn('OverlayPositionManager failed, using fallback', { component: 'useOverlaySmartPosition', error });
        try {
          const fallbackPosition = positionManager.getPositionWithFallback();
          return { x: fallbackPosition.x, y: fallbackPosition.y };
        } catch (fallbackError) {
          logger.warn('Fallback positioning also failed', { component: 'useOverlaySmartPosition', error: fallbackError });
          return getPresetPosition('center');
        }
      }
    }

    return getLegacyPosition();
  }, [
    customPosition,
    positionPreset,
    getPresetPosition,
    logDebug,
    positionManager,
    problemId,
    getEditorBounds,
    highlightedLine,
    getLegacyPosition,
  ]);

  // Load a concrete position when overlay becomes visible (AUTO mode only)
  useEffect(() => {
    if (positionPreset !== 'auto') return;
    if (!isVisible) return;
    if (!positionManager || !problemId) return;
    if (customPosition) return;

    try {
      const editorBounds = getEditorBounds();
      if (editorBounds) {
        const resolved = positionManager.getPositionWithFallback(editorBounds, highlightedLine);
        setCustomPosition({ x: resolved.x, y: resolved.y });
        return;
      }

      const fallback = positionManager.getPositionWithFallback();
      setCustomPosition({ x: fallback.x, y: fallback.y });
    } catch (error) {
      logger.warn('Failed to load position, using default', { component: 'useOverlaySmartPosition', error });
    }
  }, [
    positionPreset,
    isVisible,
    positionManager,
    problemId,
    customPosition,
    getEditorBounds,
    highlightedLine,
    setCustomPosition,
  ]);

  // Persist the resolved position frequently for debugging/traceability
  useEffect(() => {
    if (!isVisible) return;
    const p = getSmartPosition();
    logDebug?.('persist resolved position', { preset: positionPreset, p });

    try {
      localStorage.setItem(
        'coach_overlay_position_last',
        JSON.stringify({
          preset: positionPreset,
          position: p,
          viewport: { w: window.innerWidth, h: window.innerHeight },
          at: Date.now(),
        }),
      );
    } catch {
      // ignore
    }
  }, [isVisible, positionPreset, getSmartPosition, logDebug]);

  const resolvedPosition = useMemo(() => {
    if (positionPreset !== 'auto' && positionPreset !== 'custom') {
      const p = getPresetPosition(positionPreset);
      logDebug?.('resolve -> preset', positionPreset, p);
      return p;
    }
    if (positionPreset === 'custom' && customPosition) {
      logDebug?.('resolve -> custom', customPosition);
      return customPosition;
    }
    const p = getSmartPosition();
    logDebug?.('resolve -> auto(manager/legacy)', p);
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionPreset, customPosition, isMobile, highlightedLine]);

  return {
    resolvedPosition,
    getSmartPosition,
  };
};
