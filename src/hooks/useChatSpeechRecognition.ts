import { useState, useEffect, useRef } from 'react';
import { logger } from "@/utils/logger";
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface UseChatSpeechRecognitionOptions {
  onTranscriptReceived: (transcript: string) => void;
}

/**
 * Custom hook for managing speech recognition functionality in chat interfaces
 * Handles microphone toggling, transcript processing, and error states
 */
export const useChatSpeechRecognition = (options: UseChatSpeechRecognitionOptions) => {
  const { onTranscriptReceived } = options;
  
  // Speech-to-text functionality
  const {
    isListening,
    isSupported: speechSupported,
    hasNativeSupport,
    isProcessing,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechToText({
    onResult: (transcript) => {
      // Process the transcript and merge with existing input
      onTranscriptReceived(transcript);
    },
    onError: (error) => {
      logger.error("Speech recognition error", error, {
        component: "useChatSpeechRecognition",
      });
    },
  });

  const toggleMicrophone = async () => {
    if (!hasNativeSupport) return;

    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const getMicrophoneButtonProps = (loading: boolean, isTyping: boolean) => ({
    onClick: toggleMicrophone,
    disabled: loading || isTyping,
    className: `absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded ${
      isListening
        ? "text-red-500 animate-pulse"
        : isProcessing
          ? "text-blue-500"
          : "text-gray-500 hover:text-gray-700"
    }`,
    title: isListening
      ? "Stop listening"
      : isProcessing
        ? "Processing..."
        : "Start voice input",
  });

  const getInputPlaceholder = (defaultPlaceholder: string) => {
    if (isListening) return "🎤 Listening...";
    if (isProcessing) return "🔄 Processing audio...";
    return defaultPlaceholder;
  };

  return {
    isListening,
    speechSupported,
    hasNativeSupport,
    isProcessing,
    speechError,
    toggleMicrophone,
    getMicrophoneButtonProps,
    getInputPlaceholder,
  };
};