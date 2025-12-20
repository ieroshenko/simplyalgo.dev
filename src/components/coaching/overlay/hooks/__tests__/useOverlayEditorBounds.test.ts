import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type React from 'react';
import type { EditorBounds } from '@/services/overlayPositionManager';

// Mock the calculator so we can precisely control behavior
vi.mock('@/services/editorBoundsCalculator', () => {
  const actual: any = {};

  class EditorBoundsCalculator {
    initialize = vi.fn();
    cleanup = vi.fn();
    areBoundsValid = vi.fn(() => true);
    getEditorBounds = vi.fn(() => null);
    onBoundsChange = vi.fn((cb: any) => {
      // Return unsubscribe
      return () => {
        void cb;
      };
    });
  }

  return {
    ...actual,
    EditorBoundsCalculator,
  };
});

import { useOverlayEditorBounds } from '../useOverlayEditorBounds';

const createEditorRef = (rect?: Partial<DOMRect>) => {
  const el = {
    getBoundingClientRect: () => ({
      left: rect?.left ?? 10,
      top: rect?.top ?? 20,
      right: rect?.right ?? 110,
      bottom: rect?.bottom ?? 220,
      width: rect?.width ?? 100,
      height: rect?.height ?? 200,
    }),
  } as any;

  return {
    current: {
      getDomNode: () => el,
    },
  } as unknown as React.RefObject<{ getDomNode?: () => HTMLElement | null } | null>;
};

describe('useOverlayEditorBounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns manual bounds fallback when calculator returns null', () => {
    const editorRef = createEditorRef();

    const { result } = renderHook(() =>
      useOverlayEditorBounds({
        editorRef,
      }),
    );

    const bounds = result.current.getEditorBounds();

    expect(bounds).toEqual<EditorBounds>({
      left: 10,
      top: 20,
      right: 110,
      bottom: 220,
      width: 100,
      height: 200,
    });
  });

  it('returns null when editor DOM node is unavailable', () => {
    const editorRef = {
      current: {
        getDomNode: () => null,
      },
    } as unknown as React.RefObject<{ getDomNode?: () => HTMLElement | null } | null>;

    const { result } = renderHook(() => useOverlayEditorBounds({ editorRef }));

    expect(result.current.getEditorBounds()).toBeNull();
  });
});
