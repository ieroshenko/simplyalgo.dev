import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'user-123' },
    }),
}));

vi.mock('@/services/userAttempts', () => ({
    UserAttemptsService: {
        saveDraft: vi.fn().mockResolvedValue({ id: 'draft-1' }),
        getLatestAttempt: vi.fn().mockResolvedValue({ code: 'saved code' }),
    },
}));

import { useAutoSave } from '../useAutoSave';
import { UserAttemptsService } from '@/services/userAttempts';

describe('useAutoSave', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial state', () => {
        const { result } = renderHook(() => useAutoSave('problem-1'));

        expect(result.current.isSaving).toBe(false);
        expect(result.current.lastSaved).toBeNull();
        expect(result.current.hasUnsavedChanges).toBe(false);
        expect(typeof result.current.saveCode).toBe('function');
        expect(typeof result.current.loadLatestCode).toBe('function');
    });

    it('should debounce save calls', async () => {
        const { result } = renderHook(() => useAutoSave('problem-1'));

        act(() => {
            result.current.saveCode('code 1');
            result.current.saveCode('code 2');
            result.current.saveCode('code 3');
        });

        // Should not have called save yet
        expect(UserAttemptsService.saveDraft).not.toHaveBeenCalled();

        // Fast forward past debounce time
        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        // Should have called save only once with last value
        expect(UserAttemptsService.saveDraft).toHaveBeenCalledTimes(1);
    });

    it('should set hasUnsavedChanges when saveCode is called', () => {
        const { result } = renderHook(() => useAutoSave('problem-1'));

        act(() => {
            result.current.saveCode('new code');
        });

        expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should load latest code', async () => {
        const { result } = renderHook(() => useAutoSave('problem-1'));

        let loadedCode: string | null = null;
        await act(async () => {
            loadedCode = await result.current.loadLatestCode();
        });

        expect(loadedCode).toBe('saved code');
        expect(UserAttemptsService.getLatestAttempt).toHaveBeenCalledWith('user-123', 'problem-1');
    });

    it('should call onSaveSuccess callback', async () => {
        const onSaveSuccess = vi.fn();
        const { result } = renderHook(() =>
            useAutoSave('problem-1', { onSaveSuccess })
        );

        act(() => {
            result.current.saveCode('code');
        });

        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        expect(onSaveSuccess).toHaveBeenCalled();
    });

    it('should use custom debounce time', async () => {
        const { result } = renderHook(() =>
            useAutoSave('problem-1', { debounceMs: 5000 })
        );

        act(() => {
            result.current.saveCode('code');
        });

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        // Should not have saved yet
        expect(UserAttemptsService.saveDraft).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        // Now should have saved
        expect(UserAttemptsService.saveDraft).toHaveBeenCalled();
    });
});
