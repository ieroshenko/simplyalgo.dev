import { useState, useRef, useCallback, useEffect } from "react";
import { logger } from "@/utils/logger";

interface TestCase {
  input: unknown;
  expected: unknown;
}

interface TechnicalInterviewFeedback {
  passed: boolean;
  overall_score: number;
  problem_solving_score: number;
  code_quality_score: number;
  communication_score: number;
  strengths: string[];
  areas_for_improvement: string[];
  detailed_feedback: string;
  interviewer_notes: string;
}

interface UseTechnicalInterviewProps {
  problemTitle: string;
  problemDescription: string;
  problemId: string;
  testCases: TestCase[];
  voice: string;
  onConnectionStatusChange: (status: "disconnected" | "connecting" | "connected") => void;
  onTranscript?: (role: "user" | "assistant", content: string) => void;
  onTimeUp?: () => void;
  onFeedbackReceived?: (feedback: TechnicalInterviewFeedback) => void;
}

interface UseTechnicalInterviewReturn {
  startInterview: () => Promise<void>;
  stopInterview: () => void;
  sendCodeUpdate: (code: string) => void;
  requestEvaluation: () => void;
  audioAnalyser: AnalyserNode | null;
  timeRemaining: number; // seconds
  error: string | null;
}

// Debounce utility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Extract feedback from AI transcript using structured keywords
function extractFeedbackFromTranscript(transcript: string): TechnicalInterviewFeedback | null {
  const upperTranscript = transcript.toUpperCase();
  
  // Check if this contains the structured feedback format
  const hasStructuredFeedback = 
    upperTranscript.includes('OVERALL_RESULT') ||
    upperTranscript.includes('OVERALL_SCORE') ||
    (upperTranscript.includes('PROBLEM_CORRECTNESS') && upperTranscript.includes('CODE_QUALITY'));
  
  if (!hasStructuredFeedback) return null;
  
  logger.debug("Detected structured feedback, parsing...", { component: "TechnicalInterview" });
  
  // Extract OVERALL_RESULT (PASS or FAIL)
  const resultMatch = transcript.match(/OVERALL_RESULT:\s*(PASS|FAIL)/i);
  const passed = resultMatch ? resultMatch[1].toUpperCase() === 'PASS' : false;
  
  // Extract OVERALL_SCORE
  const overallScoreMatch = transcript.match(/OVERALL_SCORE:\s*(\d+)/i);
  const overall_score = overallScoreMatch ? parseInt(overallScoreMatch[1]) : 0;
  
  // Extract detailed scores
  const problemCorrectnessMatch = transcript.match(/PROBLEM_CORRECTNESS:\s*(\d+)/i);
  const codeQualityMatch = transcript.match(/CODE_QUALITY:\s*(\d+)/i);
  const algorithmKnowledgeMatch = transcript.match(/ALGORITHM_KNOWLEDGE:\s*(\d+)/i);
  const communicationMatch = transcript.match(/COMMUNICATION:\s*(\d+)/i);
  const thinkingProcessMatch = transcript.match(/THINKING_PROCESS:\s*(\d+)/i);
  const engagementMatch = transcript.match(/ENGAGEMENT:\s*(\d+)/i);
  
  const problem_correctness = problemCorrectnessMatch ? parseInt(problemCorrectnessMatch[1]) : 0;
  const code_quality = codeQualityMatch ? parseInt(codeQualityMatch[1]) : 0;
  const algorithm_knowledge = algorithmKnowledgeMatch ? parseInt(algorithmKnowledgeMatch[1]) : 0;
  const communication = communicationMatch ? parseInt(communicationMatch[1]) : 0;
  const thinking_process = thinkingProcessMatch ? parseInt(thinkingProcessMatch[1]) : 0;
  const engagement = engagementMatch ? parseInt(engagementMatch[1]) : 0;
  
  // Calculate average scores for the 3 main categories
  const problem_solving_score = Math.round((problem_correctness + algorithm_knowledge + thinking_process) / 3);
  const code_quality_score = code_quality;
  const communication_score = Math.round((communication + engagement) / 2);
  
  // Extract STRENGTHS
  const strengthsMatch = transcript.match(/STRENGTHS:\s*((?:[-•*]\s*.+?\n?)+)/i);
  const strengths: string[] = [];
  if (strengthsMatch) {
    const lines = strengthsMatch[1].split('\n');
    lines.forEach(line => {
      const cleaned = line.replace(/^[-•*\s]+/, '').trim();
      if (cleaned && cleaned.length > 5) {
        strengths.push(cleaned);
      }
    });
  }
  
  // Extract IMPROVEMENTS
  const improvementsMatch = transcript.match(/IMPROVEMENTS:\s*((?:[-•*]\s*.+?\n?)+)/i);
  const improvements: string[] = [];
  if (improvementsMatch) {
    const lines = improvementsMatch[1].split('\n');
    lines.forEach(line => {
      const cleaned = line.replace(/^[-•*\s]+/, '').trim();
      if (cleaned && cleaned.length > 5) {
        improvements.push(cleaned);
      }
    });
  }
  
  // Extract DETAILED_FEEDBACK
  const detailedFeedbackMatch = transcript.match(/DETAILED_FEEDBACK:\s*([\s\S]+?)(?=INTERVIEWER_NOTES:|$)/i);
  const detailed_feedback = detailedFeedbackMatch 
    ? detailedFeedbackMatch[1].trim() 
    : transcript.substring(0, 500);
  
  // Extract INTERVIEWER_NOTES
  const interviewerNotesMatch = transcript.match(/INTERVIEWER_NOTES:\s*([\s\S]+?)$/i);
  const interviewer_notes = interviewerNotesMatch 
    ? interviewerNotesMatch[1].trim() 
    : 'Candidate performed interview';
  
  logger.debug("Successfully parsed feedback", {
    component: "TechnicalInterview",
    passed,
    overall_score,
    problem_solving_score,
    code_quality_score,
    communication_score,
    strengthsCount: strengths.length,
    improvementsCount: improvements.length
  });
  
  return {
    passed,
    overall_score,
    problem_solving_score,
    code_quality_score,
    communication_score,
    strengths: strengths.length > 0 ? strengths : ['Completed the interview'],
    areas_for_improvement: improvements.length > 0 ? improvements : ['Continue practicing technical interviews'],
    detailed_feedback,
    interviewer_notes,
  };
}

export const useTechnicalInterview = ({
  problemTitle,
  problemDescription,
  problemId,
  testCases,
  voice,
  onConnectionStatusChange,
  onTranscript,
  onTimeUp,
  onFeedbackReceived,
}: UseTechnicalInterviewProps): UseTechnicalInterviewReturn => {
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");

  // Cleanup function
  const cleanup = useCallback(() => {
    logger.debug("Cleaning up resources...", { component: "TechnicalInterview" });

    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

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

  // Debounced code update sender
  const sendCodeUpdate = useCallback(
    debounce((code: string) => {
      if (dataChannelRef.current?.readyState === 'open') {
        logger.debug("Sending code update to AI", { component: "TechnicalInterview" });
        dataChannelRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{
              type: 'input_text',
              text: `[CODE UPDATE]\n\`\`\`python\n${code}\n\`\`\``
            }]
          }
        }));
      }
    }, 2500),
    []
  );

  // Request evaluation (user clicks "Evaluate Now" button)
  const requestEvaluation = useCallback(() => {
    if (dataChannelRef.current?.readyState === 'open') {
      logger.debug("User requested evaluation", { component: "TechnicalInterview" });
      dataChannelRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: '[EVALUATE NOW] The candidate has pressed the Evaluate button and is ready for feedback. Please provide your comprehensive evaluation using the structured feedback format with all scores, strengths, improvements, and detailed feedback.'
          }]
        }
      }));
    }
  }, []);

  // Start interview
  const startInterview = useCallback(async () => {
    try {
      setError(null);
      onConnectionStatusChange("connecting");
      logger.debug("Starting interview...", { component: "TechnicalInterview" });

      // Get ephemeral token from backend
      logger.debug("Requesting ephemeral token...", { component: "TechnicalInterview" });
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
      logger.debug("Received ephemeral token", { component: "TechnicalInterview" });

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
      logger.debug("Requesting microphone access...", { component: "TechnicalInterview" });
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
      logger.debug("Local audio track added", { component: "TechnicalInterview" });

      // Create data channel for control events
      const dataChannel = pc.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;

      // Handle data channel events
      dataChannel.addEventListener("open", () => {
        logger.debug("Data channel opened", { component: "TechnicalInterview" });

        // Send session configuration with technical interview prompt
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
            instructions: `# Role & Objective
You are a senior FAANG software engineer conducting a 30-minute technical interview.

Success means:
- Evaluating the candidate's problem-solving ability
- Assessing code quality and algorithm knowledge
- Determining PASS or FAIL based on realistic FAANG standards

# Personality & Tone
## Personality
Professional, encouraging, and observant technical interviewer.

## Tone
Friendly but professional. Clear and direct. Never condescending.Speak at 2x pace.

## Length
Keep responses brief: 1-2 sentences per turn unless giving final feedback.

## Pacing
Deliver audio responses at a natural pace. Do not sound rushed or robotic.

## Variety
DO NOT repeat the same sentence twice. Vary your responses.

# Language
- Respond in the same language as the candidate unless directed otherwise.
- Default to English if input language is unclear.
- Only respond to clear audio or text.
- IF audio is unclear, ambiguous, or has background noise, ask for clarification:
  * "Sorry, I didn't catch that—could you repeat?"
  * "There's some background noise. What did you say after ___?"
  * "I only heard part of that. Could you say it again?"

# Problem Context
Problem: ${problemTitle}

Description:
${problemDescription}

Test Cases:
${JSON.stringify(testCases, null, 2)}

# Code Visibility
You receive real-time code updates marked as [CODE UPDATE].

Watch for:
- Algorithm choice and correctness
- Code quality and readability
- Edge case handling
- Time and space complexity awareness
- Problem-solving approach

# Conversation Flow
## Phase 1: Greeting (30 seconds)
Goal: Welcome candidate and introduce problem.

Sample phrases (vary these):
- "Hi! Let's get started with your technical interview today."
- "Welcome! I'll be your interviewer for the next 30 minutes."

What to say:
- Identify yourself as a FAANG technical interviewer
- Introduce the problem: "${problemTitle}"
- Explain requirements clearly and concisely
- Ask: "Do you have any clarifying questions before we begin?"

Exit when: Candidate understands problem and is ready to start.

## Phase 2: Problem Solving (main phase)
Goal: Observe candidate's approach and code in real-time.

What to do:
- Listen to their thought process
- Watch code updates as they write
- Ask clarifying questions about their approach when helpful
- IF candidate gets stuck for 2+ minutes, offer a subtle hint
- DO NOT give the full solution
- Encourage systematic thinking

Sample phrases (vary these):
- "That's an interesting approach. Walk me through your logic."
- "How are you handling edge cases here?"
- "What's the time complexity of this solution?"

## Phase 3: Optimization Discussion (if applicable)
Goal: Explore improvements if solution works but isn't optimal.

WHEN: Candidate completes a working solution that could be improved.

What to say:
- "Your solution works correctly! Do you see any way to optimize this further?"
- "Could you improve the time or space complexity?"

IF they want to try: Give them space to work on optimization.
IF they're unsure: "That's okay. Would you like me to evaluate what you have now?"

Exit when: Candidate signals they're done OR presses "Evaluate Now" button OR time expires.

## Phase 4: Final Evaluation
Triggered by:
- Time expires (30 minutes)
- Candidate presses "Evaluate Now" button
- You receive [EVALUATE NOW] or [SYSTEM] message

What to do: Provide structured feedback using EXACT format below.

# Instructions & Rules
## General Rules
- Be honest but encouraging
- Evaluate based on realistic FAANG interview standards
- Consider that candidates may be nervous
- Hints should guide, NOT solve
- IF candidate asks for human escalation or expresses severe frustration, acknowledge politely

## Red Flags (note these)
- Gives up easily without trying
- Doesn't ask clarifying questions
- Poor communication or doesn't explain thinking
- Doesn't consider edge cases

## Green Flags (note these)
- Good communication
- Systematic approach
- Considers edge cases
- Thinks about optimization
- Asks good clarifying questions

# Evaluation Criteria
Score each criterion from 0 to 100:

1. PROBLEM_CORRECTNESS: Does solution solve the problem? Handles edge cases?
2. CODE_QUALITY: Readable? Well-structured? Best practices?
3. ALGORITHM_KNOWLEDGE: Good data structure and algorithm choices? Complexity awareness?
4. COMMUNICATION: Explains thinking clearly? Asks good questions?
5. THINKING_PROCESS: Systematic problem breakdown? Logical reasoning?
6. ENGAGEMENT: Active participation? Responsive to feedback?

Overall: PASS or FAIL based on FAANG standards.

# Feedback Format — CRITICAL
WHEN providing final evaluation, you MUST use this EXACT structure with these EXACT keywords:

"Let me provide your interview evaluation.

OVERALL_RESULT: PASS
OVERALL_SCORE: 75

DETAILED_SCORES:
PROBLEM_CORRECTNESS: 80
CODE_QUALITY: 75
ALGORITHM_KNOWLEDGE: 70
COMMUNICATION: 80
THINKING_PROCESS: 75
ENGAGEMENT: 70

STRENGTHS:
- Clear communication and systematic approach
- Good edge case handling
- Asked clarifying questions upfront

IMPROVEMENTS:
- Could optimize time complexity further
- Consider alternative data structures
- Practice explaining complexity analysis

DETAILED_FEEDBACK:
The candidate demonstrated solid problem-solving skills with a working solution. Communication was clear throughout, and they asked good clarifying questions. The initial solution was correct but not optimal. With some hints, they identified a better approach. Overall performance meets FAANG standards for this level.

INTERVIEWER_NOTES:
Candidate showed strong fundamentals. Needed hints for optimization but caught on quickly. Good interview presence and communication."

IMPORTANT: Replace values with actual scores. Use exact keywords: OVERALL_RESULT, OVERALL_SCORE, DETAILED_SCORES, STRENGTHS, IMPROVEMENTS, DETAILED_FEEDBACK, INTERVIEWER_NOTES.

# Safety & Escalation
WHEN to acknowledge out-of-scope:
- Candidate asks to stop interview entirely
- Expresses severe frustration or distress
- Requests human intervention explicitly

What to say:
- "I understand. Let me provide your evaluation based on what we've covered so far."
- Then proceed with structured feedback.

# Start Now
Begin by greeting the candidate and introducing the problem "${problemTitle}".`,
          },
        };

        logger.debug("Sending session configuration", { component: "TechnicalInterview" });
        dataChannel.send(JSON.stringify(sessionConfig));

        // Send initial greeting trigger after a short delay
        setTimeout(() => {
          logger.debug("Sending response.create to start interview", { component: "TechnicalInterview" });
          const responseCreate = {
            type: "response.create",
            response: {
              instructions: `Greet the candidate and introduce the problem "${problemTitle}". Explain the requirements clearly and ask if they have any clarifying questions before starting.`
            }
          };
          dataChannel.send(JSON.stringify(responseCreate));
        }, 1000);

        // Start the 30-minute timer
        startTimeRef.current = Date.now();
        timerIntervalRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - (startTimeRef.current || 0)) / 1000);
          const remaining = Math.max(0, 30 * 60 - elapsed);
          setTimeRemaining(remaining);

          if (remaining === 0) {
            logger.debug("Time is up!", { component: "TechnicalInterview" });
            // Send time-up message to AI
            if (dataChannelRef.current?.readyState === 'open') {
              dataChannelRef.current.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [{
                    type: 'input_text',
                    text: '[SYSTEM] Time is up. The 30-minute interview period has ended. Please conclude the interview now and provide your comprehensive feedback including: overall Pass/Fail decision, scores for problem-solving (0-100), code quality (0-100), and communication (0-100), list of strengths, areas for improvement, detailed feedback, and your interviewer notes.'
                  }]
                }
              }));
            }
            // Notify parent component
            if (onTimeUp) {
              onTimeUp();
            }
            // Stop the timer
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
          }
        }, 1000);
      });

      dataChannel.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          logger.debug("Server event", { component: "TechnicalInterview", eventType: event.type });

          if (event.type === "session.updated") {
            logger.debug("Session updated successfully", { component: "TechnicalInterview" });
            onConnectionStatusChange("connected");
          } else if (event.type === "error") {
            logger.error("Server error", event, { component: "TechnicalInterview" });
            setError(event.error?.message || "Server error occurred");
          } else if (event.type === "conversation.item.input_audio_transcription.completed") {
            // User speech transcribed
            logger.debug("User transcript received", { component: "TechnicalInterview", transcript: event.transcript });
            if (onTranscript && event.transcript) {
              onTranscript("user", event.transcript);
            }
          } else if (event.type === "response.audio_transcript.done") {
            // Assistant response transcribed
            logger.debug("Assistant transcript received", { component: "TechnicalInterview", transcript: event.transcript });
            if (event.transcript) {
              accumulatedTranscriptRef.current += event.transcript + " ";
              
              // Try to extract feedback from accumulated transcript
              if (onFeedbackReceived) {
                const feedback = extractFeedbackFromTranscript(accumulatedTranscriptRef.current);
                if (feedback) {
                  logger.debug("Extracted feedback", { component: "TechnicalInterview", feedback });
                  onFeedbackReceived(feedback);
                }
              }
              
              if (onTranscript) {
                onTranscript("assistant", event.transcript);
              }
            }
          } else if (event.type === "input_audio_buffer.speech_started") {
            logger.debug("User started speaking", { component: "TechnicalInterview" });
          } else if (event.type === "input_audio_buffer.speech_stopped") {
            logger.debug("User stopped speaking", { component: "TechnicalInterview" });
          }
        } catch (err) {
          logger.error("Failed to parse server message", err, { component: "TechnicalInterview" });
        }
      });

      dataChannel.addEventListener("error", (e) => {
        logger.error("Data channel error", e, { component: "TechnicalInterview" });
        setError("Connection error occurred");
      });

      dataChannel.addEventListener("close", () => {
        logger.debug("Data channel closed", { component: "TechnicalInterview" });
        cleanup();
      });

      // Handle incoming audio (AI voice)
      pc.addEventListener("track", (e) => {
        logger.debug("Received remote audio track", { component: "TechnicalInterview" });
        const remoteStream = e.streams[0];
        if (!remoteAudioRef.current) {
          const audioEl = document.createElement("audio");
          audioEl.style.display = "none";
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', 'true');
          document.body.appendChild(audioEl);
          remoteAudioRef.current = audioEl;
        }
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current
          .play()
          .catch((err) => logger.warn("Autoplay blocked", { component: "TechnicalInterview", error: err }));

        // Connect to analyser for visualization
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(remoteStream);
        source.connect(analyser);
        source.connect(audioContext.destination);

        setAudioAnalyser(analyser);
        logger.debug("Audio analyser connected", { component: "TechnicalInterview" });
      });

      // Handle connection state changes
      pc.addEventListener("connectionstatechange", () => {
        logger.debug("Connection state changed", { component: "TechnicalInterview", connectionState: pc.connectionState });
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          setError("Connection lost");
          cleanup();
        }
      });

      // Create offer
      logger.debug("Creating SDP offer...", { component: "TechnicalInterview" });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI Realtime API using ephemeral token
      logger.debug("Sending offer to OpenAI...", { component: "TechnicalInterview" });
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
      logger.debug("Received answer from OpenAI", { component: "TechnicalInterview" });

      // Set remote description
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      logger.debug("WebRTC connection established", { component: "TechnicalInterview" });
    } catch (err) {
      logger.error("Failed to start interview", err, { component: "TechnicalInterview" });
      setError(err instanceof Error ? err.message : "Failed to start interview");
      cleanup();
    }
  }, [problemTitle, problemDescription, problemId, testCases, voice, onConnectionStatusChange, onTranscript, onTimeUp, cleanup]);

  // Stop interview
  const stopInterview = useCallback(() => {
    logger.debug("Stopping interview...", { component: "TechnicalInterview" });
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
    sendCodeUpdate,
    requestEvaluation,
    audioAnalyser,
    timeRemaining,
    error,
  };
};

