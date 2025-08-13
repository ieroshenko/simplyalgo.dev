import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Trash2, Loader2, Mic, MicOff, ChartNetwork as DiagramIcon, Maximize2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
// Using a lightweight custom fullscreen overlay instead of Radix Dialog to avoid MIME issues in some dev setups
import { useChatSession } from '@/hooks/useChatSession';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import TextareaAutosize from 'react-textarea-autosize';
import { CodeSnippet } from '@/types';
import Mermaid from '@/components/diagram/Mermaid';
import FlowCanvas from '@/components/diagram/FlowCanvas';
import type { FlowGraph } from '@/types';
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
  type ActiveDiagram = { engine: 'mermaid'; code: string } | { engine: 'reactflow'; graph: FlowGraph };
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [activeDiagram, setActiveDiagram] = useState<ActiveDiagram | null>(null);
  const [hiddenVisualizeForIds, setHiddenVisualizeForIds] = useState<Set<string>>(new Set());
  const { 
    session, 
    messages, 
    loading, 
    isTyping, 
    sendMessage, 
    clearConversation,
    requestDiagram,
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

  const handleVisualize = async (sourceMessageContent: string, messageId: string) => {
    // Request a diagram separately without adding a user message bubble
    setHiddenVisualizeForIds(prev => new Set(prev).add(messageId));
    await requestDiagram(sourceMessageContent);
  };

  const openDiagramDialog = (diagram: ActiveDiagram) => {
    setActiveDiagram(diagram);
    setIsDiagramOpen(true);
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
                            ? 'border border-primary/40 bg-primary/10 text-foreground dark:border-primary/30 dark:bg-primary/15'
                            : 'border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15'
                        }`}>
                          {message.role === 'user' ? (
                            <p className="text-sm whitespace-pre-wrap break-words text-left">{message.content}</p>
                          ) : (
                            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown
                                components={{
                                  code({inline, className, children, ...props}: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    if (!inline && match && match[1] === 'mermaid') {
                                      return (
                                        <Mermaid chart={String(children)} />
                                      );
                                    }
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
                                  p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                  ul: ({children}) => <ul className="list-disc list-outside pl-5 mb-2">{children}</ul>,
                                  ol: ({children}) => <ol className="list-decimal list-outside pl-5 mb-2">{children}</ol>,
                                  li: ({children}: { children?: React.ReactNode }) => (
                                    <li className="mb-1">{children}</li>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {/* Mermaid diagram bubble if attached as structured payload */}
                        {message.role === 'assistant' && (message as unknown as { diagram?: { engine: 'mermaid'; code: string } }).diagram?.engine === 'mermaid' && (
                          <div className="mt-3">
                            <div className="border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-muted-foreground">Diagram <span className="ml-1 inline-block px-1.5 py-0.5 rounded border border-accent/40 text-[10px] uppercase tracking-wide">Mermaid</span></div>
                                <button
                                  type="button"
                                  className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                  onClick={() => openDiagramDialog({ engine: 'mermaid', code: (message as unknown as { diagram: { code: string } }).diagram.code })}
                                  title="View full screen"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  Expand
                                </button>
                              </div>
                              <Mermaid chart={(message as unknown as { diagram: { code: string } }).diagram.code} />
                            </div>
                          </div>
                        )}

                        {/* React Flow diagram bubble if attached */}
                        {message.role === 'assistant' && (message as unknown as { diagram?: { engine: 'reactflow'; graph: FlowGraph } }).diagram?.engine === 'reactflow' && (
                          <div className="mt-3">
                            <div className="border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-muted-foreground">Diagram <span className="ml-1 inline-block px-1.5 py-0.5 rounded border border-accent/40 text-[10px] uppercase tracking-wide">React Flow</span></div>
                                <button
                                  type="button"
                                  className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                  onClick={() => openDiagramDialog({ engine: 'reactflow', graph: (message as unknown as { diagram: { graph: FlowGraph } }).diagram.graph })}
                                  title="View full screen"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  Expand
                                </button>
                              </div>
                              <FlowCanvas graph={(message as unknown as { diagram: { graph: FlowGraph } }).diagram.graph} />
                            </div>
                          </div>
                        )}
                        
                        {/* Actions: Visualize button and code snippets */}
                        {message.role === 'assistant' && (
                          <div className="mt-3 space-y-3">
                            {(() => {
                              const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
                              const userAsked = /(visualize|diagram|draw|flowchart|mermaid)/i.test(lastUserMsg);
                              const hasDiagram = Boolean((message as unknown as { diagram?: unknown }).diagram);
                              const shouldShow = !hasDiagram && (userAsked || (message as unknown as { suggestDiagram?: boolean }).suggestDiagram === true) && !hiddenVisualizeForIds.has(message.id);
                              return shouldShow ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 gap-1.5 text-foreground border-accent/40 hover:bg-accent/10"
                                    onClick={() => handleVisualize(message.content, message.id)}
                                    title="Ask the AI to generate a diagram"
                                  >
                                    <DiagramIcon className="w-4 h-4" />
                                    <span className="text-sm">Visualize</span>
                                  </Button>
                                </div>
                              ) : null;
                            })()}
                            {message.codeSnippets && message.codeSnippets.length > 0 && (
                              <div className="space-y-3">
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
      {isDiagramOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80" onClick={() => setIsDiagramOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] bg-background border rounded-lg shadow-lg p-4 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Diagram</div>
              <Button size="sm" variant="ghost" onClick={() => setIsDiagramOpen(false)}>Close</Button>
            </div>
            {activeDiagram && (
              activeDiagram.engine === 'mermaid' ? (
                <Mermaid chart={activeDiagram.code} />
              ) : (
                <FlowCanvas graph={activeDiagram.graph} height="80vh" />
              )
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AIChat;
