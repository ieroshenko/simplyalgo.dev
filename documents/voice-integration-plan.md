# Google Live API Voice Integration Feature Plan

## Overview
This document outlines the implementation plan for integrating Google's Live API SDK to enable voice-based AI conversations in the LeetCode coaching platform. This feature will be implemented behind a feature flag to ensure safe, gradual rollout.

## Research Summary

### Google Live API Capabilities
- **Real-time bidirectional audio streaming** with Gemini models
- **WebSocket-based communication** for low-latency voice interactions
- **Built-in speech recognition and synthesis** eliminating need for separate TTS services
- **Conversation continuity** with context awareness across voice sessions
- **Multi-turn dialogue support** perfect for coaching scenarios

### Technical Architecture
- **JavaScript/TypeScript SDK**: `@google/generative-ai` with Live API extensions
- **Authentication**: Service account with API key management
- **Audio Processing**: WebCodecs API for efficient audio handling
- **Streaming Protocol**: WebSocket with binary audio data transmission

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 Feature Flag Infrastructure
```typescript
// src/config/features.ts
export const FEATURES = {
  VOICE_CHAT: import.meta.env.VITE_ENABLE_VOICE_CHAT === 'true',
  // other features...
} as const;

export const useFeatureFlag = (feature: keyof typeof FEATURES) => FEATURES[feature];
```

#### 1.2 Dependencies Installation
```bash
npm install @google/generative-ai
npm install --save-dev @types/dom-webcodecs-api
```

#### 1.3 Environment Configuration
```bash
# .env.local
VITE_ENABLE_VOICE_CHAT=false  # Default disabled
VITE_GOOGLE_LIVE_API_KEY=your_api_key
```

### Phase 2: Core Voice Service Layer

#### 2.1 Google Live Service (`src/services/googleLiveService.ts`)
```typescript
interface VoiceSession {
  id: string;
  isActive: boolean;
  audioStream: MediaStream | null;
  conversationHistory: VoiceMessage[];
}

interface VoiceMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

class GoogleLiveService {
  // WebSocket connection management
  // Audio stream processing  
  // Session state management
  // Error handling and reconnection
}
```

#### 2.2 Voice Chat Hook (`src/hooks/useVoiceChat.ts`)
```typescript
interface VoicechatReturn {
  // Existing speech-to-text functionality
  isListening: boolean;
  isSupported: boolean;
  
  // New voice conversation capabilities  
  isVoiceEnabled: boolean;
  isSpeaking: boolean;
  startVoiceConversation: () => Promise<void>;
  sendVoiceMessage: (audioBlob: Blob) => Promise<void>;
  stopVoiceConversation: () => void;
  
  // Session management
  voiceSession: VoiceSession | null;
  conversationHistory: VoiceMessage[];
}
```

### Phase 3: UI Component Integration

#### 3.1 Voice-Enabled AI Chat (`src/components/AIChat.tsx`)
- **Conditional voice controls** based on feature flag
- **Voice status indicators** (listening, processing, speaking)
- **Audio message rendering** with playback controls
- **Seamless fallback** to text-based chat

#### 3.2 Coaching Overlay Enhancement (`src/components/coaching/SimpleOverlay.tsx`)
- **Voice-first coaching mode** for natural Q&A flow
- **Spoken explanations** of code analysis and suggestions
- **Voice commands** for common actions (run code, next step, hint)

#### 3.3 Voice Control Components
```typescript
// src/components/voice/VoiceControls.tsx
interface VoiceControlsProps {
  onStartVoice: () => void;
  onStopVoice: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  isEnabled: boolean;
}
```

### Phase 4: Backend Integration

#### 4.1 Supabase Edge Function Updates
```typescript
// supabase/functions/ai-chat/index.ts
// Add voice session handling
// Integrate with Google Live API for streaming responses
// Maintain conversation context across voice and text
```

#### 4.2 Database Schema Extensions
```sql
-- Add voice session tracking
CREATE TABLE voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  problem_id text,
  session_data jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### Phase 5: Advanced Features

#### 5.1 Voice Shortcuts & Commands
- **"Run my code"** - Execute current solution
- **"Show hint"** - Request coaching guidance
- **"Next step"** - Progress in coaching flow
- **"Explain complexity"** - Voice-based analysis

#### 5.2 Conversation Management
- **Session persistence** across page reloads
- **Voice history playback** for review
- **Export capabilities** for voice sessions
- **Smart interruption handling** during AI responses

#### 5.3 Accessibility & UX
- **Visual indicators** for deaf/hard-of-hearing users
- **Keyboard shortcuts** for voice controls
- **Mobile optimization** for voice interactions
- **Background noise filtering** for better recognition

## Technical Implementation Details

### Audio Processing Pipeline
1. **Microphone Input** → MediaRecorder API
2. **Audio Chunking** → WebCodecs for efficient processing  
3. **Streaming Upload** → Google Live API WebSocket
4. **Real-time Processing** → Gemini model analysis
5. **Audio Response** → Text-to-speech synthesis
6. **Playback** → Web Audio API

### Integration with Existing Systems
- **Build on `useSpeechToText.ts`** - Extend existing speech capabilities
- **Leverage current AI chat flow** - Voice as alternative input/output
- **Maintain coaching state** - Voice doesn't disrupt existing session management
- **Preserve fallback options** - Text remains primary interface

### Security & Privacy Considerations
- **API key management** through environment variables
- **Audio data handling** - No permanent storage of voice recordings
- **User consent** - Clear opt-in for voice features
- **Secure transmission** - Encrypted audio streaming

## Feature Flag Strategy

### Development Phase
```typescript
if (FEATURES.VOICE_CHAT && import.meta.env.DEV) {
  // Enable for development testing
}
```

### Gradual Rollout
1. **Internal testing** - Development team only
2. **Beta users** - Opt-in for early adopters  
3. **Limited release** - Percentage-based rollout
4. **Full deployment** - General availability

### Configuration Management
```typescript
// src/config/voice.ts
export const VOICE_CONFIG = {
  maxSessionDuration: 30 * 60 * 1000, // 30 minutes
  audioQuality: 'high' as const,
  autoStopOnInactivity: 60 * 1000, // 1 minute
  fallbackToText: true,
} as const;
```

## Success Metrics

### User Engagement
- Voice session initiation rate
- Average voice conversation duration
- Voice vs text preference ratio
- Coaching completion rates with voice

### Technical Performance  
- Audio latency measurements
- WebSocket connection stability
- API response times
- Error rates and fallback usage

### Educational Impact
- User learning progression with voice coaching
- Code problem completion rates
- User satisfaction scores
- Accessibility improvements

## Risk Mitigation

### Technical Risks
- **API rate limits** - Implement usage throttling and monitoring
- **Network connectivity** - Robust fallback to text-based interaction
- **Browser compatibility** - Progressive enhancement approach
- **Audio quality** - Multiple codec support and quality adaptation

### User Experience Risks
- **Privacy concerns** - Clear data handling policies and opt-out options
- **Accessibility** - Maintain full feature parity with text interface  
- **Performance impact** - Lazy loading and conditional resource usage
- **Learning curve** - Comprehensive onboarding and help documentation

## Timeline Estimate

### Phase 1 (Week 1-2): Foundation
- Feature flag infrastructure
- SDK integration and authentication
- Basic service layer implementation

### Phase 2 (Week 3-4): Core Functionality
- Voice chat hook development
- Google Live API integration
- Basic UI controls

### Phase 3 (Week 5-6): Integration
- AI chat voice capabilities
- Coaching overlay enhancement
- Session management

### Phase 4 (Week 7-8): Polish & Testing
- Advanced features implementation
- Comprehensive testing
- Performance optimization
- Documentation and rollout preparation

## Future Enhancements

### Advanced Voice Features
- **Multi-language support** - Coaching in different languages
- **Voice cloning** - Personalized AI coaching voices
- **Emotion detection** - Adaptive responses based on user tone
- **Background learning** - Passive voice-based code explanations

### Platform Integration
- **Mobile app integration** - Native voice capabilities
- **Smart device support** - Voice coaching through speakers
- **API exposure** - Voice capabilities for third-party integrations
- **Analytics dashboard** - Voice usage and effectiveness metrics