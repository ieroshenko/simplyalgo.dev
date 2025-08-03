/**
 * Speech Recognition Service
 * 
 * This service provides a fallback for browsers that don't support Web Speech API.
 * It uses MediaRecorder to capture audio and can be extended to integrate with
 * external speech recognition services like OpenAI Whisper, Google Cloud Speech, etc.
 */

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

export class SpeechRecognitionService {
  private static instance: SpeechRecognitionService;
  
  public static getInstance(): SpeechRecognitionService {
    if (!SpeechRecognitionService.instance) {
      SpeechRecognitionService.instance = new SpeechRecognitionService();
    }
    return SpeechRecognitionService.instance;
  }

  /**
   * Convert audio blob to text using external service
   * In a production environment, you would integrate with:
   * - OpenAI Whisper API
   * - Google Cloud Speech-to-Text
   * - Azure Speech Service
   * - AWS Transcribe
   */
  async transcribeAudio(audioBlob: Blob): Promise<SpeechRecognitionResult> {
    try {
      // For demo purposes, we'll simulate a transcription service
      // In production, you would send the audioBlob to your chosen service
      
      // Example OpenAI Whisper integration (commented out - requires API key):
      /*
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });
      
      const result = await response.json();
      return {
        transcript: result.text,
        confidence: 0.9
      };
      */

      // For now, return a placeholder that shows the feature is working
      const audioSize = (audioBlob.size / 1024).toFixed(1);
      const duration = audioBlob.size > 50000 ? 'several seconds' : 'a moment';
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            transcript: `[Audio recorded (${audioSize}KB, ${duration}) - Connect to speech service for transcription]`,
            confidence: 0.8
          });
        }, 1500); // Simulate API call delay
      });

    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Check if audio recording is supported
   */
  isRecordingSupported(): boolean {
    return !!(navigator.mediaDevices && 
             navigator.mediaDevices.getUserMedia && 
             window.MediaRecorder);
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    const formats = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
    return formats.filter(format => MediaRecorder.isTypeSupported(format));
  }

  /**
   * Get optimal audio recording configuration
   */
  getRecordingConfig(): MediaRecorderOptions {
    const supportedFormats = this.getSupportedFormats();
    const preferredFormat = supportedFormats.find(format => 
      format.includes('webm') || format.includes('mp4')
    ) || supportedFormats[0];

    return {
      mimeType: preferredFormat,
      audioBitsPerSecond: 128000, // 128 kbps for good quality
    };
  }
}

export const speechRecognitionService = SpeechRecognitionService.getInstance();