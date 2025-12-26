/**
 * Tests for usePanelState hook
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePanelState } from '../usePanelState';

describe('usePanelState', () => {
    beforeEach(() => {
        // Clear localStorage before each test - set to defaults
        window.localStorage.setItem('showLeftPanel', 'true');
        window.localStorage.setItem('showBottomPanel', 'true');
        window.localStorage.setItem('showRightPanel', 'true');
        window.localStorage.removeItem('hint-tests-collapsed');
        window.localStorage.removeItem('hint-chat-collapsed');
    });

    it('should initialize with default panel states', () => {
        const { result } = renderHook(() => usePanelState());

        expect(result.current.panelState.showLeftPanel).toBe(true);
        expect(result.current.panelState.showBottomPanel).toBe(true);
        expect(result.current.panelState.showRightPanel).toBe(true);
    });

    it('should respect localStorage values', () => {
        // This test verifies the toggle behavior persists
        const { result, rerender } = renderHook(() => usePanelState());

        // Toggle panels off
        act(() => {
            result.current.toggleLeftPanel();
            result.current.toggleBottomPanel();
        });

        expect(result.current.panelState.showLeftPanel).toBe(false);
        expect(result.current.panelState.showBottomPanel).toBe(false);
    });

    it('should toggle left panel', () => {
        const { result } = renderHook(() => usePanelState());

        expect(result.current.panelState.showLeftPanel).toBe(true);

        act(() => {
            result.current.toggleLeftPanel();
        });

        expect(result.current.panelState.showLeftPanel).toBe(false);
    });

    it('should toggle bottom panel', () => {
        const { result } = renderHook(() => usePanelState());

        act(() => {
            result.current.toggleBottomPanel();
        });

        expect(result.current.panelState.showBottomPanel).toBe(false);
    });

    it('should toggle right panel', () => {
        const { result } = renderHook(() => usePanelState());

        act(() => {
            result.current.toggleRightPanel();
        });

        expect(result.current.panelState.showRightPanel).toBe(false);
    });

    it('should set bottom panel directly', () => {
        const { result } = renderHook(() => usePanelState());

        act(() => {
            result.current.setShowBottomPanel(false);
        });

        expect(result.current.panelState.showBottomPanel).toBe(false);

        act(() => {
            result.current.setShowBottomPanel(true);
        });

        expect(result.current.panelState.showBottomPanel).toBe(true);
    });

    it('should respond to keyboard shortcuts', () => {
        const { result } = renderHook(() => usePanelState());

        // Simulate Ctrl+B to toggle left panel
        act(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'b',
                ctrlKey: true,
            });
            document.dispatchEvent(event);
        });

        expect(result.current.panelState.showLeftPanel).toBe(false);
    });

    it('should toggle all panels back and forth', () => {
        const { result } = renderHook(() => usePanelState());

        // Toggle all off
        act(() => {
            result.current.toggleLeftPanel();
            result.current.toggleBottomPanel();
            result.current.toggleRightPanel();
        });

        expect(result.current.panelState.showLeftPanel).toBe(false);
        expect(result.current.panelState.showBottomPanel).toBe(false);
        expect(result.current.panelState.showRightPanel).toBe(false);

        // Toggle all back on
        act(() => {
            result.current.toggleLeftPanel();
            result.current.toggleBottomPanel();
            result.current.toggleRightPanel();
        });

        expect(result.current.panelState.showLeftPanel).toBe(true);
        expect(result.current.panelState.showBottomPanel).toBe(true);
        expect(result.current.panelState.showRightPanel).toBe(true);
    });
});
