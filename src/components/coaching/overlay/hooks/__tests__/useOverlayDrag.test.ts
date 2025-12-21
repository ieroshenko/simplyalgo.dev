import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type React from 'react';
import { useOverlayDrag } from '../useOverlayDrag';
import type { EditorBounds, OverlayPositionManager } from '@/services/overlayPositionManager';

const createOverlayRef = (left = 10, top = 20) => {
  return {
    current: {
      getBoundingClientRect: () => ({ left, top }),
    },
  } as unknown as React.RefObject<HTMLDivElement>;
};

describe('useOverlayDrag', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const makeMouseDownEvent = (clientX: number, clientY: number) => {
    const el = {
      classList: {
        contains: () => false,
      },
    };

    return {
      clientX,
      clientY,
      currentTarget: el,
      target: el,
    } as any;
  };

  it('sets preset to custom and starts dragging on mousedown', () => {
    const applyPreset = vi.fn();
    const setCustomPosition = vi.fn();

    const { result } = renderHook(() =>
      useOverlayDrag({
        overlayRef: createOverlayRef(),
        customPosition: null,
        setCustomPosition,
        position: { x: 1, y: 2 },
        onPositionChange: vi.fn(),
        positionManager: undefined,
        problemId: undefined,
        getEditorBounds: () => null,
        applyPreset,
      }),
    );

    act(() => {
      result.current.handleMouseDown(makeMouseDownEvent(100, 200));
    });

    expect(applyPreset).toHaveBeenCalledWith('custom');
    expect(result.current.isDragging).toBe(true);
  });

  it('updates position on mousemove while dragging', () => {
    const applyPreset = vi.fn();
    const setCustomPosition = vi.fn();

    const { result } = renderHook(() =>
      useOverlayDrag({
        overlayRef: createOverlayRef(10, 20),
        customPosition: null,
        setCustomPosition,
        position: { x: 0, y: 0 },
        onPositionChange: vi.fn(),
        positionManager: undefined,
        problemId: undefined,
        getEditorBounds: () => null,
        applyPreset,
      }),
    );

    act(() => {
      result.current.handleMouseDown(makeMouseDownEvent(110, 220));
    });

    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 260 }));
    });

    // offset should be (100,200), so new position should be (50,60)
    expect(setCustomPosition).toHaveBeenCalledWith({ x: 50, y: 60 });
  });

  it('saves position and calls onPositionChange on mouseup', () => {
    const applyPreset = vi.fn();
    const onPositionChange = vi.fn();
    const setCustomPosition = vi.fn();

    const savePosition = vi.fn();
    const isPositionValid = vi.fn().mockReturnValue(true);

    const positionManager = {
      savePosition,
      isPositionValid,
    } as unknown as OverlayPositionManager;

    const editorBounds: EditorBounds = {
      left: 0,
      top: 0,
      right: 1000,
      bottom: 1000,
      width: 1000,
      height: 1000,
    };

    const { result, rerender } = renderHook(
      ({ customPosition }) =>
        useOverlayDrag({
          overlayRef: createOverlayRef(10, 20),
          customPosition,
          setCustomPosition,
          position: { x: 5, y: 6 },
          onPositionChange,
          positionManager,
          problemId: 'p1',
          getEditorBounds: () => editorBounds,
          applyPreset,
        }),
      {
        initialProps: { customPosition: null as { x: number; y: number } | null },
      },
    );

    act(() => {
      result.current.handleMouseDown(makeMouseDownEvent(110, 220));
    });

    // Move once so we can assert the saved value uses new coordinates
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 260 }));
    });

    // Rerender with a customPosition that matches what the hook would set
    rerender({ customPosition: { x: 50, y: 60 } });

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(savePosition).toHaveBeenCalledTimes(1);
    expect(onPositionChange).toHaveBeenCalledWith({ x: 50, y: 60 });
    expect(result.current.isDragging).toBe(false);
  });
});
