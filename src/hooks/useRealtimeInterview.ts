import { useState, useRef, useCallback, useEffect } from "react";
import { logger } from "@/utils/logger";

interface UseRealtimeInterviewProps {
  resumeText: string;
  voice: string;
  onConnectionStatusChange: (status: "disconnected" | "connecting" | "connected") => void;
  onTranscript?: (role: "user" | "assistant", content: string) => void;
}

interface UseRealtimeInterviewReturn {
  startInterview: () => Promise<void>;
  stopInterview: () => void;
  audioAnalyser: AnalyserNode | null;
  error: string | null;
}

export const useRealtimeInterview = ({
  resumeText,
  voice,
  onConnectionStatusChange,
  onTranscript,
}: UseRealtimeInterviewProps): UseRealtimeInterviewReturn => {
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    logger.debug("Cleaning up resources...", { component: "Realtime" });

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }

    setAudioAnalyser(null);
    onConnectionStatusChange("disconnected");
  }, [onConnectionStatusChange]);

  // Start interview
  const startInterview = useCallback(async () => {
    try {
      setError(null);
      onConnectionStatusChange("connecting");
      logger.debug("Starting interview...", { component: "Realtime" });

      // Get ephemeral token from backend
      logger.debug("Requesting ephemeral token...", { component: "Realtime" });
      const tokenResponse = await fetch("/api/ephemeral-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-realtime",
          voice: voice,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || "Failed to get ephemeral token");
      }

      const { token } = await tokenResponse.json();
      logger.debug("Received ephemeral token", { component: "Realtime" });

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Set up audio context for visualization
      const audioContext = new AudioContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(() => undefined);
      }
      audioContextRef.current = audioContext;

      // Get user media (microphone)
      logger.debug("Requesting microphone access...", { component: "Realtime" });
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = localStream;

      // Add local audio track to peer connection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
      logger.debug("Local audio track added", { component: "Realtime" });

      // Create data channel for control events
      const dataChannel = pc.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;

      // Handle data channel events
      dataChannel.addEventListener("open", () => {
        logger.debug("Data channel opened", { component: "Realtime" });

        // Send session configuration
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice,
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad"
            },
            instructions: `# Role
You are a voice-enabled assistant conducting behavioral interviews for software engineering positions.

# Pacing
SPEAK AT A FAST TEMPO (APPROX 1.25X). KEEP RESPONSES BRISK WITHOUT SOUNDING RUSHED.

# Output
Always answer aloud and include a concise text transcription.

# Interview Brief
You are a senior software engineering interviewer recruiting this candidate. Tailor each question to their background using the STAR method (Situation, Task, Action, Result).

# Resume Context
${resumeText.slice(0, 20000)}`,
          },
        };

        logger.debug("Sending session configuration", { component: "Realtime", sessionConfig });
        dataChannel.send(JSON.stringify(sessionConfig));

        // Send initial greeting trigger after a short delay
        setTimeout(() => {
          logger.debug("Sending response.create to start interview", { component: "Realtime" });
          const responseCreate = {
            type: "response.create",
            response: {
              instructions: "Please begin the software engineering behavioral interview now. Greet the candidate and ask your first question based on their resume."
            }
          };
          dataChannel.send(JSON.stringify(responseCreate));
        }, 1000);
      });

      dataChannel.addEventListener("message", (e) => {
        // try {
        //   const event = JSON.parse(e.data);
        //   console.log("[Realtime] Server event:", event.type, event);

        //   // Log full details for conversation items to debug user speech
        //   if (event.type === "conversation.item.created") {
        //     console.log("🔍 ITEM ROLE:", event.item?.role);
        //     console.log("🔍 ITEM TYPE:", event.item?.type);
        //     console.log("🔍 ITEM STATUS:", event.item?.status);
        //   }

        //   if (event.type === "session.updated") {
        //     console.log("[Realtime] Session updated successfully");
        //     onConnectionStatusChange("connected");
        //   } else if (event.type === "error") {
        //     console.error("[Realtime] Server error:", event);
        //     setError(event.error?.message || "Server error occurred");
        //   } else if (event.type === "conversation.item.input_audio_transcription.completed") {
        //     // User speech transcribed
        //     console.log("🗣️ [Realtime] USER TRANSCRIPT:", event.transcript);
        //     console.log("🔍 onTranscript callback defined?", !!onTranscript);
        //     if (onTranscript && event.transcript) {
        //       console.log("✅ Calling onTranscript with user transcript");
        //       onTranscript("user", event.transcript);
        //     } else {
        //       console.warn("❌ NOT calling onTranscript - callback:", !!onTranscript, "transcript:", !!event.transcript);
        //     }
        //   } else if (event.type === "response.audio_transcript.delta") {
        //     // Assistant response transcription in progress
        //     console.log("[Realtime] Assistant transcript delta:", event.delta);
        //   } else if (event.type === "response.audio_transcript.done") {
        //     // Assistant response transcribed
        //     console.log("🤖 [Realtime] ASSISTANT TRANSCRIPT:", event.transcript);
        //     console.log("🔍 onTranscript callback defined?", !!onTranscript);
        //     if (onTranscript && event.transcript) {
        //       console.log("✅ Calling onTranscript with assistant transcript");
        //       onTranscript("assistant", event.transcript);
        //     } else {
        //       console.warn("❌ NOT calling onTranscript - callback:", !!onTranscript, "transcript:", !!event.transcript);
        //     }
        //   } else if (event.type === "response.done") {
        //     // Alternative: extract assistant transcript from response
        //     console.log("[Realtime] Response done:", event.response);
        //     if (onTranscript && event.response?.output) {
        //       for (const output of event.response.output) {
        //         if (output.type === "message" && output.content) {
        //           for (const content of output.content) {
        //             if (content.type === "audio" && content.transcript) {
        //               onTranscript("assistant", content.transcript);
        //             }
        //           }
        //         }
        //       }
        //     }
        //   } else if (event.type === "input_audio_buffer.speech_started") {
        //     console.log("🎤 [Realtime] User STARTED speaking - microphone is detecting audio!");
        //   } else if (event.type === "input_audio_buffer.speech_stopped") {
        //     console.log("🎤 [Realtime] User STOPPED speaking - processing speech...");
        //   } else if (event.type === "input_audio_buffer.committed") {
        //     console.log("✅ [Realtime] Audio committed to conversation");
        //   } else if (event.type === "conversation.item.created") {
        //     console.log("📝 [Realtime] Conversation item created:", event.item);
        //     // Check if this is a user message
        //     if (event.item?.role === "user") {
        //       console.log("👤 [Realtime] USER MESSAGE DETECTED!");
        //       console.log("Content:", event.item?.content);
        //       // Try to find transcript in different places
        //       if (event.item?.content) {
        //         const audioContent = event.item.content.find((c: any) => c.type === "input_audio");
        //         if (audioContent) {
        //           console.log("🎤 Audio content found:", audioContent);
        //           if (audioContent.transcript) {
        //             console.log("🗣️ [Realtime] USER SAID:", audioContent.transcript);
        //             if (onTranscript) {
        //               onTranscript("user", audioContent.transcript);
        //             }
        //           }
        //         }
        //       }
        //     }
        //   } else if (event.type === "conversation.item.input_audio_transcription.completed") {
        //     console.log("🗣️ [Realtime] USER TRANSCRIPT:", event.transcript);
        //     if (onTranscript && event.transcript) {
        //       onTranscript("user", event.transcript);
        //     }
        //   } else if (event.type === "conversation.item.input_audio_transcription.failed") {
        //     console.error("❌ [Realtime] Transcription FAILED:", event.error);
        //   } else if (event.type === "response.created") {
        //     console.log("💬 [Realtime] AI Response created:", event.response);
        //   } else if (event.type === "response.output_item.added") {
        //     console.log("[Realtime] Output item added");
        //   } else if (event.type === "response.content_part.added") {
        //     console.log("[Realtime] Content part added");
        //   } else if (event.type === "response.audio.delta") {
        //     console.log("[Realtime] Audio delta received");
        //   } else if (event.type === "response.audio.done") {
        //     console.log("[Realtime] Audio done");
        //   }
        // } catch (err) {
        //   console.error("[Realtime] Failed to parse server message:", err);
        // }
      });

      dataChannel.addEventListener("error", (e) => {
        logger.error("Data channel error", e, { component: "Realtime" });
        setError("Connection error occurred");
      });

      dataChannel.addEventListener("close", () => {
        logger.debug("Data channel closed", { component: "Realtime" });
        cleanup();
      });

      // Handle connection state changes
      pc.addEventListener("connectionstatechange", () => {
        logger.debug("Connection state changed", { component: "Realtime", connectionState: pc.connectionState });
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          setError("Connection lost");
          cleanup();
        }
      });

      // Create offer
      logger.debug("Creating SDP offer...", { component: "Realtime" });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI Realtime API using ephemeral token
      logger.debug("Sending offer to OpenAI...", { component: "Realtime" });
      const model = "gpt-realtime";
      const response = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to connect: ${response.status} ${errorText}`);
      }

      // Get answer SDP
      const answerSdp = await response.text();
      logger.debug("Received answer from OpenAI", { component: "Realtime" });

      // Set remote description
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      logger.debug("WebRTC connection established", { component: "Realtime" });
    } catch (err) {
      logger.error("Failed to start interview", err, { component: "Realtime" });
      setError(err instanceof Error ? err.message : "Failed to start interview");
      cleanup();
    }
  }, [resumeText, voice, onConnectionStatusChange, cleanup]);

  // Stop interview
  const stopInterview = useCallback(() => {
    logger.debug("Stopping interview...", { component: "Realtime" });
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    startInterview,
    stopInterview,
    audioAnalyser,
    error,
  };
};
