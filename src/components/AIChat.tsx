import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Trash2, Loader2, Mic, MicOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useChatSession } from '@/hooks/useChatSession';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import TextareaAutosize from 'react-textarea-autosize';
import { CodeSnippet } from '@/types';
import CodeSnippetButton from '@/components/CodeSnippetButton';

interface AIChatProps {
  problemId: string;
  problemDescription: string;
  onInsertCodeSnippet?: (snippet: CodeSnippet) => void;
}

const AIChat = ({ problemId, problemDescription, onInsertCodeSnippet }: AIChatProps) => {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { 
    session, 
    messages, 
    loading, 
    isTyping, 
    sendMessage, 
    clearConversation 
  } = useChatSession({ problemId, problemDescription });

  // Speech-to-text functionality
  const { 
    isListening, 
    isSupported: speechSupported,
    hasNativeSupport,
    isProcessing,
    startListening, 
    stopListening, 
    error: speechError 
  } = useSpeechToText({
    onResult: (transcript) => {
      setInput(prev => {
        const currentText = prev.trim();
        return currentText ? `${currentText} ${transcript}` : transcript;
      });
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
    }
  });


  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMicrophone = async () => {
    if (!hasNativeSupport) return;

    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="h-full flex flex-col border-l border-border rounded-none shadow-none">
      {/* Chat Header */}
      <div className="flex-shrink-0 h-12 px-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-medium text-foreground">AI Coach</div>
            <div className="text-xs text-muted-foreground">
              {loading ? 'Loading chat...' : session ? 'Chat loaded' : 'Online'}
            </div>
          </div>
        </div>
        {session && messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearConversation}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full min-h-[400px] p-4" ref={scrollAreaRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading chat history...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 min-h-full flex flex-col">
              {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Start a conversation with your AI coach!</p>
                    <p className="text-xs mt-1">Ask questions about the problem or get hints.</p>
                  </div>
                </div>
              )}
              <div className={messages.length === 0 ? '' : 'flex-1 space-y-4'}>
                {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                <div className={`flex space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-accent' 
                      : 'bg-primary'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-accent-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    )}
                  </div>
                  <div className={`space-y-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-secondary text-foreground'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Render code snippet buttons for AI messages */}
                      {message.role === 'assistant' && message.codeSnippets && message.codeSnippets.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.codeSnippets.map((snippet) => (
                            <div key={snippet.id} className="bg-black/5 rounded p-2 border-l-2 border-primary/30">
                              <pre className="text-xs font-mono text-muted-foreground mb-2 overflow-x-auto">
                                <code>{snippet.code}</code>
                              </pre>
                              {onInsertCodeSnippet && (
                                <CodeSnippetButton
                                  snippet={snippet}
                                  onInsert={onInsertCodeSnippet}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  </div>
                </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex space-x-2 max-w-[80%]">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <div className="bg-secondary text-foreground p-3 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <TextareaAutosize
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isListening ? "🎤 Listening..." : 
                isProcessing ? "🔄 Processing audio..." :
                "Ask your AI coach anything..."
              }
              disabled={loading || isTyping}
              className={`w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                hasNativeSupport ? 'pr-10' : 'pr-3'
              }`}
              minRows={1}
              maxRows={6}
            />
            {hasNativeSupport && (
              <button
                type="button"
                onClick={toggleMicrophone}
                disabled={loading || isTyping}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded ${
                  isListening ? 'text-red-500 animate-pulse' : 
                  isProcessing ? 'text-blue-500' :
                  'text-gray-500 hover:text-gray-700'
                }`}
                title={isListening ? 'Stop listening' : isProcessing ? 'Processing...' : 'Start voice input'}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
            {speechError && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-red-500 opacity-80" title={speechError}>
                ⚠️
              </div>
            )}
          </div>
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isTyping || loading}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4"
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AIChat;
