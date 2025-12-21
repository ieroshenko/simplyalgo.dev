import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import type { PositionPreset } from '../types';

type UseOverlayPresetParams = {
  overlayRef: React.RefObject<HTMLDivElement>;
  isMobile: boolean;
  logDebug?: (...args: unknown[]) => void;
};

export const useOverlayPreset = ({
  overlayRef,
  isMobile,
  logDebug,
}: UseOverlayPresetParams) => {
  const [positionPreset, setPositionPreset] = useState<PositionPreset>('auto');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('coach_overlay_position_preset') as PositionPreset | null;
      if (saved) {
        setPositionPreset(saved);
      } else {
        setPositionPreset('center');
      }
    } catch {
      // ignore
    }
  }, []);

  const applyPreset = useCallback(
    (preset: PositionPreset) => {
      logDebug?.('applyPreset', preset);
      setPositionPreset(preset);
      try {
        localStorage.setItem('coach_overlay_position_preset', preset);
      } catch {
        // ignore
      }
    },
    [logDebug],
  );

  const getPresetPosition = useCallback(
    (preset: PositionPreset) => {
      const viewportW = window.innerWidth || 1280;
      const viewportH = window.innerHeight || 720;

      const rect = overlayRef.current?.getBoundingClientRect();
      const w = rect?.width || (isMobile ? Math.min(viewportW - 32, 500) : 500);
      const h = rect?.height || 300;
      const margin = 24;

      const clamp = (val: number, min: number, max: number) =>
        Math.max(min, Math.min(max, val));

      let x = (viewportW - w) / 2;
      let y = (viewportH - h) / 2;

      switch (preset) {
        case 'center':
          break;
        case 'center-bottom':
          y = viewportH - h - margin;
          break;
        case 'left-top':
          x = margin;
          y = margin;
          break;
        case 'right-top':
          x = viewportW - w - margin;
          y = margin;
          break;
        case 'right-bottom':
          x = viewportW - w - margin;
          y = viewportH - h - margin;
          break;
        case 'left-bottom':
          x = margin;
          y = viewportH - h - margin;
          break;
        default:
          break;
      }

      const final = {
        x: clamp(Math.round(x), margin, Math.max(margin, viewportW - w - margin)),
        y: clamp(Math.round(y), margin, Math.max(margin, viewportH - h - margin)),
      };

      logDebug?.('getPresetPosition', { preset, viewportW, viewportH, w, h, final });
      return final;
    },
    [overlayRef, isMobile, logDebug],
  );

  return {
    positionPreset,
    setPositionPreset,
    applyPreset,
    getPresetPosition,
  };
};
