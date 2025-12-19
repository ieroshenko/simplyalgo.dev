import { useState, useRef, useCallback } from "react";
import { speechRecognitionService } from "@/services/speechRecognition";
import { logger } from "@/utils/logger";

interface SpeechToTextOptions {
  onResult: (transcript: string) => void;
  onError: (error: string) => void;
  onProcessing?: (isProcessing: boolean) => void;
}

interface SpeechToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  hasNativeSupport: boolean;
  isProcessing: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
}

export const useSpeechToText = (
  options: SpeechToTextOptions,
): SpeechToTextReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [hasNativeSupport, setHasNativeSupport] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize speech recognition capabilities
  const initializeSpeechRecognition = useCallback(() => {
    // Check for native Web Speech API support
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      setIsSupported(true);
      setHasNativeSupport(true);
      const SpeechRecognition =
        (window as unknown).SpeechRecognition ||
        (window as unknown).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          options.onResult(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        setError(event.error);
        options.onError(event.error);
        setIsListening(false);
      };

      return true;
    }

    // Note: We could enable MediaRecorder fallback here, but for now we only show
    // the mic icon for browsers with native Web Speech API support
    setHasNativeSupport(false);
    setIsSupported(false);
    return false;
  }, [options]);

  // Web Speech API implementation
  const startWebSpeechRecognition = useCallback(async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        logger.error('[useSpeechToText] Failed to start speech recognition', { error });
        setError("Failed to start speech recognition");
        options.onError("Failed to start speech recognition");
      }
    }
  }, [options]);

  // MediaRecorder fallback implementation
  const startMediaRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const recordingConfig = speechRecognitionService.getRecordingConfig();
      const mediaRecorder = new MediaRecorder(stream, recordingConfig);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        setIsListening(false);
        setIsProcessing(true);
        options.onProcessing?.(true);

        try {
          const result =
            await speechRecognitionService.transcribeAudio(audioBlob);
          options.onResult(result.transcript);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Transcription failed";
          setError(errorMsg);
          options.onError(errorMsg);
        } finally {
          setIsProcessing(false);
          options.onProcessing?.(false);
        }
      };

      mediaRecorder.onerror = (event) => {
        logger.error('[useSpeechToText] MediaRecorder error', { event });
        setError("Recording failed");
        options.onError("Recording failed");
        setIsListening(false);
      };

      setIsListening(true);
      mediaRecorder.start(1000); // Collect data every second

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 30000);
    } catch (error) {
      logger.error('[useSpeechToText] Failed to start recording', { error });
      setError("Microphone access denied");
      options.onError("Microphone access denied");
    }
  }, [options]);

  const startListening = useCallback(async () => {
    setError(null);

    if (!hasNativeSupport) {
      const supported = initializeSpeechRecognition();
      if (!supported) {
        const errorMsg = "Speech recognition not supported in this browser";
        setError(errorMsg);
        options.onError(errorMsg);
        return;
      }
    }

    // Only use native Web Speech API
    if (recognitionRef.current) {
      await startWebSpeechRecognition();
    }
  }, [
    hasNativeSupport,
    initializeSpeechRecognition,
    startWebSpeechRecognition,
  ]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
  }, [isListening]);

  // Initialize on first render
  useState(() => {
    initializeSpeechRecognition();
  });

  return {
    isListening,
    isSupported,
    hasNativeSupport,
    isProcessing,
    startListening,
    stopListening,
    error,
  };
};
