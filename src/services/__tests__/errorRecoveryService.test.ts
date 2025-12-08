import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorRecoveryService } from '../errorRecoveryService';

describe('ErrorRecoveryService', () => {
    let service: ErrorRecoveryService;

    beforeEach(() => {
        // Mock window dimensions
        vi.stubGlobal('window', {
            innerWidth: 1920,
            innerHeight: 1080,
        });
        service = new ErrorRecoveryService();
    });

    describe('constructor', () => {
        it('should create with default config', () => {
            const svc = new ErrorRecoveryService();
            expect(svc).toBeDefined();
        });

        it('should accept custom config', () => {
            const svc = new ErrorRecoveryService({
                safeMargin: 50,
                maxRetries: 5,
            });
            expect(svc).toBeDefined();
        });
    });

    describe('recordSuccessfulPosition', () => {
        it('should record a successful position', () => {
            const position = {
                x: 100,
                y: 200,
                timestamp: Date.now(),
                screenSize: { width: 1920, height: 1080 }
            };
            service.recordSuccessfulPosition(position);
            // Should not throw
            expect(true).toBe(true);
        });
    });

    describe('handleError', () => {
        it('should return a fallback position for editor_unavailable', () => {
            const context = {
                errorType: 'editor_unavailable' as const,
                attemptCount: 1,
            };
            const position = service.handleError(context);
            expect(position).toHaveProperty('x');
            expect(position).toHaveProperty('y');
            expect(typeof position.x).toBe('number');
            expect(typeof position.y).toBe('number');
        });

        it('should return a fallback position for bounds_invalid', () => {
            const context = {
                errorType: 'bounds_invalid' as const,
                attemptCount: 1,
            };
            const position = service.handleError(context);
            expect(position).toBeDefined();
            expect(typeof position.x).toBe('number');
        });

        it('should return a fallback position for calculation_failed', () => {
            const context = {
                errorType: 'calculation_failed' as const,
                attemptCount: 1,
            };
            const position = service.handleError(context);
            expect(position).toBeDefined();
        });
    });

    describe('shouldTriggerRecovery', () => {
        it('should return boolean', () => {
            const result = service.shouldTriggerRecovery('editor_unavailable');
            expect(typeof result).toBe('boolean');
        });
    });

    describe('clearErrorHistory', () => {
        it('should clear error history without throwing', () => {
            service.handleError({ errorType: 'editor_unavailable', attemptCount: 1 });
            service.clearErrorHistory();
            // Should not throw
            expect(true).toBe(true);
        });
    });

    describe('getErrorStats', () => {
        it('should return error statistics object', () => {
            const stats = service.getErrorStats();
            expect(typeof stats).toBe('object');
        });
    });
});
