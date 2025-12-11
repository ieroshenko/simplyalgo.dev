import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

import { useAutoDiagramRequests } from '../useAutoDiagramRequests';

describe('useAutoDiagramRequests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return hasAutoRequested function', () => {
        const mockRequestDiagram = vi.fn();
        const { result } = renderHook(() => useAutoDiagramRequests([], mockRequestDiagram));

        expect(typeof result.current.hasAutoRequested).toBe('function');
    });

    it('should return clearAutoRequestHistory function', () => {
        const mockRequestDiagram = vi.fn();
        const { result } = renderHook(() => useAutoDiagramRequests([], mockRequestDiagram));

        expect(typeof result.current.clearAutoRequestHistory).toBe('function');
    });

    it('should track auto-requested messages', () => {
        const mockRequestDiagram = vi.fn();
        const { result } = renderHook(() => useAutoDiagramRequests([], mockRequestDiagram));

        // Initially no messages have been auto-requested
        expect(result.current.hasAutoRequested('msg-1')).toBe(false);
    });

    it('should clear auto-request history', () => {
        const mockRequestDiagram = vi.fn();
        const { result } = renderHook(() => useAutoDiagramRequests([], mockRequestDiagram));

        // Should not throw
        result.current.clearAutoRequestHistory();
        expect(result.current.hasAutoRequested('msg-1')).toBe(false);
    });
});
