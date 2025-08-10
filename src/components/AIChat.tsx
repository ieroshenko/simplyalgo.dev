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
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AIChatProps {
  problemId: string;
  problemDescription: string;
  onInsertCodeSnippet?: (snippet: CodeSnippet) => void;
  problemTestCases?: unknown[];
}

const AIChat = ({ problemId, problemDescription, onInsertCodeSnippet, problemTestCases }: AIChatProps) => {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Function to clean mathematical notation in message content
  const cleanMathNotation = (content: string): string => {
    if (typeof content !== 'string') return String(content);
    
    // Guard: don't process content that contains backticks (code blocks/inline code)
    if (/`/.test(content)) {
      return content;
    }
    
    return content
      // Clean LaTeX notation
      .replace(/\\cdot/g, '·')
      .replace(/\\log/g, 'log')
      .replace(/\\times/g, '×')
      .replace(/\\le/g, '≤')
      .replace(/\\ge/g, '≥')
      .replace(/\\ne/g, '≠')
      .replace(/\\infty/g, '∞')
      // Clean up escaped parentheses
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      // Remove extra backslashes
      .replace(/\s*\\\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };
  const { 
    session, 
    messages, 
    loading, 
    isTyping, 
    sendMessage, 
    clearConversation 
  } = useChatSession({ problemId, problemDescription, problemTestCases });

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
                  <div key={message.id} className="mb-6">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-accent text-accent-foreground'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className={`inline-block max-w-[85%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {message.role === 'user' ? (
                            <p className="text-sm whitespace-pre-wrap break-words text-left">{message.content}</p>
                          ) : (
                            <div className="text-sm prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  code({inline, className, children, ...props}: {
                                    inline?: boolean;
                                    className?: string;
                                    children?: React.ReactNode;
                                    [key: string]: unknown;
                                  }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                      <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        className="rounded-md !mt-2 !mb-2"
                                        {...props}
                                      >
                                        {String(children).replace(/\n$/, '')}
                                      </SyntaxHighlighter>
                                    ) : (
                                      <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                                        {children}
                                      </code>
                                    );
                                  },
                                  p: ({children}) => (
                                    <p className="mb-2 last:mb-0 leading-relaxed text-left">
                                      {children}
                                    </p>
                                  ),
                                  ul: ({children}) => (
                                    <ul className="list-disc list-inside mb-3 space-y-1 pl-2">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({children}) => (
                                    <ol className="list-decimal mb-3 pl-4">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({children}) => (
                                    <li className="mb-1 text-left leading-relaxed">
                                      {children}
                                    </li>
                                  ),
                                  strong: ({children}) => (
                                    <strong className="font-semibold text-foreground">{children}</strong>
                                  ),
                                  em: ({children}) => (
                                    <em className="italic text-muted-foreground">{children}</em>
                                  ),
                                  h1: ({children}) => (
                                    <h1 className="text-lg font-bold mb-3 mt-4 text-left first:mt-0">{children}</h1>
                                  ),
                                  h2: ({children}) => (
                                    <h2 className="text-base font-bold mb-2 mt-3 text-left first:mt-0">{children}</h2>
                                  ),
                                  h3: ({children}) => (
                                    <h3 className="text-sm font-bold mb-2 mt-2 text-left first:mt-0">{children}</h3>
                                  ),
                                  blockquote: ({children}) => (
                                    <blockquote className="border-l-4 border-primary pl-4 py-2 my-3 bg-muted/30 italic rounded-r-md">
                                      {children}
                                    </blockquote>
                                  ),
                                }}
                              >
                                {cleanMathNotation(message.content)}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        
                        {/* Code Snippet Buttons for AI messages */}
                        {message.role === 'assistant' && message.codeSnippets && message.codeSnippets.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {message.codeSnippets.map((snippet) => (
                              <div 
                                key={snippet.id} 
                                className="bg-card border rounded-lg p-4 shadow-sm"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                      {snippet.insertionHint?.type || 'Code'}
                                    </span>
                                  </div>
                                  {onInsertCodeSnippet && (
                                    <CodeSnippetButton
                                      snippet={snippet}
                                      onInsert={onInsertCodeSnippet}
                                      className="shadow-sm"
                                    />
                                  )}
                                </div>
                                
                                <div className="bg-slate-900 rounded-md p-3 mb-3">
                                  <SyntaxHighlighter
                                    language={snippet.language}
                                    style={vscDarkPlus}
                                    customStyle={{
                                      margin: 0,
                                      padding: 0,
                                      background: 'transparent',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    {snippet.code}
                                  </SyntaxHighlighter>
                                </div>
                                
                                {snippet.insertionHint?.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {snippet.insertionHint.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Timestamp */}
                        <div className="text-xs text-muted-foreground mt-2 text-left">
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
              onKeyDown={handleKeyDown}
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
