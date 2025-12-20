import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type React from 'react';
import { useOverlayPreset } from '../useOverlayPreset';

const createOverlayRef = (size?: { width: number; height: number }) => {
  return {
    current: {
      getBoundingClientRect: () => ({
        width: size?.width ?? 400,
        height: size?.height ?? 200,
      }),
    },
  } as unknown as React.RefObject<HTMLDivElement>;
};

describe('useOverlayPreset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads saved preset from localStorage', () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue('right-bottom');

    const { result } = renderHook(() =>
      useOverlayPreset({
        overlayRef: createOverlayRef(),
        isMobile: false,
      }),
    );

    return waitFor(() => {
      expect(result.current.positionPreset).toBe('right-bottom');
      expect(window.localStorage.getItem).toHaveBeenCalledWith('coach_overlay_position_preset');
    });
  });

  it('defaults to center when no saved preset exists', () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);

    const { result } = renderHook(() =>
      useOverlayPreset({
        overlayRef: createOverlayRef(),
        isMobile: false,
      }),
    );

    return waitFor(() => {
      expect(result.current.positionPreset).toBe('center');
    });
  });

  it('applyPreset updates state and persists to localStorage', () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue('center');

    const { result } = renderHook(() =>
      useOverlayPreset({
        overlayRef: createOverlayRef(),
        isMobile: false,
      }),
    );

    act(() => {
      result.current.applyPreset('left-top');
    });

    return waitFor(() => {
      expect(result.current.positionPreset).toBe('left-top');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('coach_overlay_position_preset', 'left-top');
    });
  });

  it('getPresetPosition returns deterministic centered position', () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue('center');

    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);

    const { result } = renderHook(() =>
      useOverlayPreset({
        overlayRef: createOverlayRef({ width: 400, height: 200 }),
        isMobile: false,
      }),
    );

    const pos = result.current.getPresetPosition('center');
    expect(pos).toEqual({ x: 300, y: 300 });
  });
});
