import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock console methods
vi.spyOn(console, 'debug').mockImplementation(() => { });
vi.spyOn(console, 'info').mockImplementation(() => { });
vi.spyOn(console, 'warn').mockImplementation(() => { });
vi.spyOn(console, 'error').mockImplementation(() => { });

// Mock import.meta.env
vi.stubGlobal('import', {
    meta: {
        env: {
            DEV: true,
            MODE: 'development',
        },
    },
});

import { logger } from '../logger';

describe('Logger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('debug', () => {
        it('should call console.debug in development', () => {
            logger.debug('Test debug message');
            expect(console.debug).toHaveBeenCalled();
        });

        it('should include context in message', () => {
            logger.debug('Test message', { userId: '123' });
            expect(console.debug).toHaveBeenCalled();
        });
    });

    describe('info', () => {
        it('should call console.info in development', () => {
            logger.info('Test info message');
            expect(console.info).toHaveBeenCalled();
        });
    });

    describe('warn', () => {
        it('should always call console.warn', () => {
            logger.warn('Test warning');
            expect(console.warn).toHaveBeenCalled();
        });

        it('should format message with context', () => {
            logger.warn('Warning message', { component: 'TestComponent' });
            expect(console.warn).toHaveBeenCalled();
        });
    });

    describe('error', () => {
        it('should always call console.error', () => {
            logger.error('Test error');
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle Error objects', () => {
            const error = new Error('Test error');
            logger.error('Error occurred', error);
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle non-Error objects', () => {
            logger.error('Error occurred', 'string error');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('specialized methods', () => {
        it('apiCall should log API requests', () => {
            logger.apiCall('GET', '/api/test');
            expect(console.debug).toHaveBeenCalled();
        });

        it('apiResponse should log API responses', () => {
            logger.apiResponse('GET', '/api/test', 200, 150);
            expect(console.debug).toHaveBeenCalled();
        });

        it('userAction should log user actions', () => {
            logger.userAction('button_click', { component: 'Button' });
            expect(console.info).toHaveBeenCalled();
        });

        it('codeAnalysis should log code analysis', () => {
            logger.codeAnalysis('Analyzing code');
            expect(console.debug).toHaveBeenCalled();
        });

        it('aiChat should log AI chat', () => {
            logger.aiChat('Processing message');
            expect(console.debug).toHaveBeenCalled();
        });
    });
});
