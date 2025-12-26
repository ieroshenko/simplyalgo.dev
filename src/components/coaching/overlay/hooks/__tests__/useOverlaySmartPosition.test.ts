import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { EditorBounds, OverlayPositionManager } from '@/services/overlayPositionManager';
import { useOverlaySmartPosition } from '../useOverlaySmartPosition';

describe('useOverlaySmartPosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeBounds = (): EditorBounds => ({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
  });

  it('uses preset position when preset is not auto/custom', () => {
    const getPresetPosition = vi.fn(() => ({ x: 11, y: 22 }));

    const { result } = renderHook(() =>
      useOverlaySmartPosition({
        isVisible: true,
        positionPreset: 'center',
        customPosition: null,
        setCustomPosition: vi.fn(),
        isMobile: false,
        position: { x: 1, y: 2 },
        positionManager: undefined,
        problemId: undefined,
        highlightedLine: undefined,
        getEditorBounds: () => makeBounds(),
        getPresetPosition,
        logDebug: vi.fn(),
      }),
    );

    expect(result.current.resolvedPosition).toEqual({ x: 11, y: 22 });
    expect(getPresetPosition).toHaveBeenCalledWith('center');
  });

  it('uses OverlayPositionManager when preset is auto and bounds exist', () => {
    const getPresetPosition = vi.fn(() => ({ x: 0, y: 0 }));

    const positionManager = {
      getPositionWithFallback: vi.fn(() => ({ x: 100, y: 200, timestamp: 0, screenSize: { width: 1, height: 1 } })),
    } as unknown as OverlayPositionManager;

    const { result } = renderHook(() =>
      useOverlaySmartPosition({
        isVisible: true,
        positionPreset: 'auto',
        customPosition: null,
        setCustomPosition: vi.fn(),
        isMobile: false,
        position: { x: 1, y: 2 },
        positionManager,
        problemId: 'p1',
        highlightedLine: 10,
        getEditorBounds: () => makeBounds(),
        getPresetPosition,
        logDebug: vi.fn(),
      }),
    );

    expect(result.current.resolvedPosition).toEqual({ x: 100, y: 200 });
    expect(positionManager.getPositionWithFallback).toHaveBeenCalled();
  });

  it('falls back to legacy positioning when no manager provided', () => {
    const getPresetPosition = vi.fn(() => ({ x: 0, y: 0 }));

    const { result } = renderHook(() =>
      useOverlaySmartPosition({
        isVisible: true,
        positionPreset: 'auto',
        customPosition: null,
        setCustomPosition: vi.fn(),
        isMobile: false,
        position: { x: 10, y: 10 },
        positionManager: undefined,
        problemId: undefined,
        highlightedLine: undefined,
        getEditorBounds: () => makeBounds(),
        getPresetPosition,
        logDebug: vi.fn(),
      }),
    );

    // Should be a reasonable in-bounds placement
    expect(result.current.resolvedPosition.x).toBeGreaterThanOrEqual(0);
    expect(result.current.resolvedPosition.y).toBeGreaterThanOrEqual(0);
  });
});
