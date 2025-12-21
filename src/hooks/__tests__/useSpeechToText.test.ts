/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the speech recognition service
vi.mock('@/services/speechRecognition', () => ({
    speechRecognitionService: {
        getRecordingConfig: vi.fn(() => ({ mimeType: 'audio/webm' })),
        transcribeAudio: vi.fn().mockResolvedValue({ transcript: 'Test transcript' }),
    },
}));

// Mock SpeechRecognition API
const mockRecognition = {
    continuous: false,
    interimResults: false,
    lang: '',
    onstart: null as any,
    onend: null as any,
    onresult: null as any,
    onerror: null as any,
    start: vi.fn(),
    stop: vi.fn(),
};

// Add mock to window
(global as any).webkitSpeechRecognition = vi.fn(() => mockRecognition);

import { useSpeechToText } from '../useSpeechToText';

describe('useSpeechToText', () => {
    const mockOptions = {
        onResult: vi.fn(),
        onError: vi.fn(),
        onProcessing: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockRecognition.start.mockClear();
        mockRecognition.stop.mockClear();
    });

    describe('Initial State', () => {
        it('should not be listening initially', () => {
            const { result } = renderHook(() => useSpeechToText(mockOptions));

            expect(result.current.isListening).toBe(false);
        });

        it('should detect native speech recognition support', () => {
            const { result } = renderHook(() => useSpeechToText(mockOptions));

            // webkitSpeechRecognition is mocked, so should be supported
            expect(result.current.isSupported).toBe(true);
            expect(result.current.hasNativeSupport).toBe(true);
        });

        it('should not be processing initially', () => {
            const { result } = renderHook(() => useSpeechToText(mockOptions));

            expect(result.current.isProcessing).toBe(false);
        });

        it('should have no error initially', () => {
            const { result } = renderHook(() => useSpeechToText(mockOptions));

            expect(result.current.error).toBeNull();
        });
    });

    describe('startListening', () => {
        it('should provide startListening function', () => {
            const { result } = renderHook(() => useSpeechToText(mockOptions));

            expect(result.current.startListening).toBeDefined();
            expect(typeof result.current.startListening).toBe('function');
        });

        it('should start recognition when called', async () => {
            const { result } = renderHook(() => useSpeechToText(mockOptions));

            await act(async () => {
                await result.current.startListening();
            });

            expect(mockRecognition.start).toHaveBeenCalled();
        });
    });

    describe('stopListening', () => {
        it('should provide stopListening function', () => {
            const { result } = renderHook(() => useSpeechToText(mockOptions));

            expect(result.current.stopListening).toBeDefined();
            expect(typeof result.current.stopListening).toBe('function');
        });
    });

    describe('Speech Recognition Events', () => {
        it('should handle transcript results', async () => {
            const { result } = renderHook(() => useSpeechToText(mockOptions));

            // Start listening to initialize the recognition
            await act(async () => {
                await result.current.startListening();
            });

            // Simulate receiving a result
            const mockEvent = {
                resultIndex: 0,
                results: [
                    {
                        isFinal: true,
                        0: { transcript: 'Hello world' },
                        length: 1,
                    },
                ],
            };

            act(() => {
                mockRecognition.onresult?.(mockEvent);
            });

            expect(mockOptions.onResult).toHaveBeenCalledWith('Hello world');
        });

        it('should handle recognition errors', async () => {
            const { result } = renderHook(() => useSpeechToText(mockOptions));

            await act(async () => {
                await result.current.startListening();
            });

            act(() => {
                mockRecognition.onerror?.({ error: 'no-speech' });
            });

            expect(mockOptions.onError).toHaveBeenCalledWith('no-speech');
            expect(result.current.error).toBe('no-speech');
        });
    });

    describe('Browser Compatibility', () => {
        it('should report lack of support when Web Speech API unavailable', () => {
            // Temporarily remove the mock
            const original = (global as any).webkitSpeechRecognition;
            delete (global as any).webkitSpeechRecognition;
            delete (global as any).SpeechRecognition;

            const { result } = renderHook(() => useSpeechToText(mockOptions));

            // Without the API, should not be supported
            expect(result.current.hasNativeSupport).toBe(false);

            // Restore mock
            (global as any).webkitSpeechRecognition = original;
        });
    });
});
