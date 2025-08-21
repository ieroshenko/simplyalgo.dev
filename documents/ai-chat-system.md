# AI Chat System Architecture

## Overview
The AI Chat system provides intelligent code assistance through GPT-5 integration, featuring code snippet insertion, visual diagram generation, and Socratic teaching methodology. It operates as a context-aware coding companion that understands the current problem and user's code state.

## Core Components

### File Locations
- **Component**: `src/components/AIChat.tsx`
- **Hook**: `src/hooks/useChatSession.ts`
- **Backend**: `supabase/functions/ai-chat/index.ts`
- **Types**: `src/types/index.ts` (CodeSnippet, Message interfaces)

## Architecture Pattern: Context-Aware AI Assistant

### Data Flow
```
User Input → Chat Session → GPT-5 API → Response Processing → UI Update
     ↓              ↓              ↓              ↓              ↓
Context        Conversation    AI Analysis    Code Snippets    Live Feedback
```

## Core Mechanisms

### 1. Chat Session Management
- **Persistent Sessions**: Each problem gets a dedicated chat session
- **Context Preservation**: Maintains conversation history and problem context
- **State Management**: 
  ```typescript
  interface ChatSession {
    id: string;
    messages: Message[];
    isLoading: boolean;
    error: string | null;
  }
  ```

### 2. Code Snippet Detection & Insertion
- **Analysis**: AI responses automatically analyzed for executable code
- **Validation**: Snippets validated for syntax and relevance
- **Smart Insertion**: GPT-guided placement in user's code
- **Direct Integration**: "Add to Editor" buttons on code blocks

### 3. Context Awareness
- **Problem Context**: Current problem description and test cases
- **Code State**: Real-time access to user's current code
- **Incremental Assistance**: Provides next logical steps, not complete solutions
- **Socratic Method**: Guides learning through questions and hints

## AI Integration Details

### GPT-4 Integration
- **Model**: GPT-5-mini for performance and cost optimization
- **Token Management**: Optimized prompts with context limiting
- **Streaming**: Real-time response rendering
- **Error Handling**: Graceful fallbacks and retry logic

### Prompt Engineering
```typescript
// Context-aware prompt structure
const prompt = {
  system: "Expert coding tutor using Socratic method",
  context: {
    problem: problemDescription,
    currentCode: userCode,
    testCases: problemTestCases
  },
  instructions: "Provide incremental hints, not complete solutions"
}
```

## Performance Optimizations

### Response Processing
- **Parallel Analysis**: Code snippet detection runs alongside response streaming
- **Selective Parsing**: Only analyzes Python code blocks for snippets
- **Debounced Updates**: Prevents UI thrashing during rapid responses

### Context Management
- **Incremental Context**: Sends only current code state, not full history
- **Token Optimization**: Truncates old messages to stay within limits
- **Caching**: Reuses context for similar queries

## User Experience Features

### Visual Elements
- **Markdown Rendering**: Full markdown support with syntax highlighting
- **Code Blocks**: Syntax-highlighted with direct insertion buttons
- **Diagram Generation**: Mermaid diagrams for visual explanations
- **Interactive Demos**: Algorithm visualization components

### Input Methods
- **Text Input**: Auto-resizing textarea with send button
- **Voice Input**: Speech-to-text for hands-free interaction
- **Quick Actions**: Pre-defined prompt buttons
- **Clear History**: Session reset functionality

## Code Snippet System

### Detection Logic
```typescript
interface CodeSnippet {
  id: string;
  code: string;
  language: string;
  isValidated: boolean;
  insertionType: 'smart' | 'cursor' | 'append';
  insertionHint: {
    type: 'function' | 'statement' | 'import';
    scope: 'global' | 'function';
    description: string;
  };
}
```

### Insertion Strategy
1. **AI-Guided Placement**: GPT analyzes code structure for optimal insertion
2. **Smart Positioning**: Considers function scope, indentation, and context
3. **Visual Feedback**: Highlights inserted code with fade animation
4. **Error Recovery**: Fallbacks if AI placement fails

## Integration Points

### Monaco Editor
- **Direct Manipulation**: Uses Monaco API for precise code insertion
- **Cursor Management**: Maintains user focus and position
- **Highlighting**: Temporary visual feedback for inserted code

### Problem Context
- **Test Cases**: Access to problem's test cases for relevant suggestions
- **Constraints**: Considers problem-specific limitations
- **Examples**: References problem examples in responses

## Backend Architecture

### Supabase Edge Function
- **Endpoint**: `/functions/ai-chat`
- **Actions**: 
  - `send_message`: Standard chat interaction
  - `insert_snippet`: Code placement analysis
  - `generate_component`: Visualization creation
- **Error Handling**: Comprehensive error responses with fallbacks

### Database Schema
```sql
-- Chat sessions table
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  problem_id STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Messages table  
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES ai_chat_sessions(id),
  role STRING, -- 'user' | 'assistant'
  content TEXT,
  code_snippets JSONB,
  created_at TIMESTAMP
);
```

## Visualization Features

### Interactive Demos
- **Algorithm Visualization**: Step-by-step execution demos
- **Component Generation**: AI creates React components for demonstrations
- **Modal Display**: Full-screen visualization viewer

### Diagram Support
- **Mermaid Integration**: Flowcharts, sequence diagrams, graphs
- **Dynamic Generation**: AI creates diagrams based on problem context
- **Responsive Rendering**: Adapts to different screen sizes

## Error Handling & Reliability

### Network Resilience
- **Retry Logic**: Automatic retries for failed requests
- **Offline Handling**: Graceful degradation when network unavailable
- **Timeout Management**: Prevents hanging requests

### AI Response Validation
- **Content Filtering**: Ensures appropriate responses
- **Code Validation**: Syntax checking for generated snippets
- **Relevance Scoring**: Filters out off-topic responses

## Future Enhancements

### Planned Features
- **Multi-Language Support**: Beyond Python code assistance
- **Advanced Visualizations**: 3D algorithm demonstrations
- **Collaborative Sessions**: Shared chat sessions for pair programming
- **Custom Personas**: Different AI teaching styles

### Technical Improvements
- **Real-time Collaboration**: WebSocket-based live assistance
- **Advanced Context**: Git history and project-wide awareness
- **Performance Monitoring**: Response time and quality metrics
- **A/B Testing**: Prompt optimization through experimentation