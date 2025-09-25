import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain,
  ArrowRight,
  Lightbulb,
  Code,
  Bot,
  User,
} from "lucide-react";
import { useFlashcards, type FlashcardDeck } from "@/hooks/useFlashcards";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import { supabase } from "@/integrations/supabase/client";

interface FlashcardReviewInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface AIMessage {
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

interface ReviewSession {
  deckId: string;
  problemTitle: string;
  solutionTitle: string;
  messages: AIMessage[];
  startTime: Date;
  currentQuestionIndex: number;
  totalQuestions: number;
  aiEvaluation?: any;
}

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Again", color: "bg-red-500", description: "I didn't remember this well" },
  { value: 2, label: "Hard", color: "bg-orange-500", description: "I remembered with difficulty" },
  { value: 3, label: "Good", color: "bg-green-500", description: "I remembered well" },
  { value: 4, label: "Easy", color: "bg-blue-500", description: "I remembered perfectly" },
];

export const FlashcardReviewInterface = ({
  isOpen,
  onClose,
  userId,
}: FlashcardReviewInterfaceProps) => {
  const { dueCards, submitReview, isSubmittingReview } = useFlashcards(userId);
  const { currentTheme: editorTheme, defineCustomThemes } = useEditorTheme();
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentSession, setCurrentSession] = useState<ReviewSession | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showRatingOptions, setShowRatingOptions] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completedCards, setCompletedCards] = useState(0);
  const [currentProblemData, setCurrentProblemData] = useState<any>(null);
  const [showSolution, setShowSolution] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<Date>(new Date());
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string>("");

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  // Initialize session when modal opens
  useEffect(() => {
    if (isOpen && dueCards.length > 0 && !currentSession) {
      startNewCard();
    }
  }, [isOpen, dueCards]);

  // Cleanup on unmount or modal close
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      currentSessionIdRef.current = "";
    }
  }, [isOpen]);

  // Debug logging - moved to top to fix hooks order
  useEffect(() => {
    const currentCard = dueCards[currentCardIndex];
    if (currentCard) {
      console.log('Current card data:', {
        deck_id: currentCard.deck_id,
        problem_id: currentCard.problem_id,
        solution_code: currentCard.solution_code ? 'EXISTS' : 'MISSING',
        solution_code_length: currentCard.solution_code?.length || 0,
        solution_title: currentCard.solution_title,
        is_custom_solution: currentCard.is_custom_solution,
        allKeys: Object.keys(currentCard)
      });
      
      if (currentCard.solution_code) {
        console.log('Solution code preview:', currentCard.solution_code.substring(0, 200) + '...');
      }
    }
  }, [dueCards, currentCardIndex]);

  // Start a new card review
  const startNewCard = async () => {
    if (currentCardIndex >= dueCards.length) {
      setSessionComplete(true);
      return;
    }

    const card = dueCards[currentCardIndex];
    if (!card) {
      console.error('No card found at index', currentCardIndex);
      setSessionComplete(true);
      return;
    }

    // Cancel any ongoing AI requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new session ID to track this specific card session
    const sessionId = `${currentCardIndex}-${Date.now()}`;
    currentSessionIdRef.current = sessionId;
    
    startTimeRef.current = new Date();
    
    // Fetch problem data for display
    let problemData = null;
    try {
      const { data: fetchedData, error } = await supabase
        .from("problems")
        .select("id, title, description, examples, function_signature")
        .eq("id", card.problem_id)
        .single();

      if (error) throw error;
      problemData = fetchedData;
      console.log('Fetched problem data for card index', currentCardIndex, ':', {
        problemId: card.problem_id,
        title: problemData?.title,
        descriptionLength: problemData?.description?.length
      });
      setCurrentProblemData(problemData);
    } catch (error) {
      console.error("Error fetching problem data:", error);
      setCurrentProblemData(null);
    }
    
    const newSession: ReviewSession = {
      deckId: card.deck_id,
      problemTitle: card.problem_title || card.problem_id,
      solutionTitle: card.solution_title || "Solution",
      messages: [],
      startTime: startTimeRef.current,
      currentQuestionIndex: 0,
      totalQuestions: 3, // We'll ask 3 questions per card
      aiEvaluation: null,
    };

    setCurrentSession(newSession);
    setShowRatingOptions(false);
    setUserInput("");
    setShowSolution(false); // Reset card flip state
    setIsLoadingAI(false); // Reset loading state

    // Start the AI conversation, passing the problem data directly
    await sendInitialAIMessage(newSession, problemData, sessionId);
  };

  // Send initial AI message to start the review
  const sendInitialAIMessage = async (session: ReviewSession, problemData: any = null, sessionId: string) => {
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoadingAI(true);
    const currentCard = dueCards[currentCardIndex];
    
    try {
      const description = problemData?.description || currentProblemData?.description || 'Problem description';
      console.log('Problem description source:', {
        fromParameter: problemData?.description,
        fromState: currentProblemData?.description,
        final: description
      });

      const requestBody = {
        action: 'flashcard_conversation',
        problemId: currentCard.problem_id,
        problemDescription: description,
        solutionCode: currentCard.solution_code || currentCard.code || 'No code available',
        solutionTitle: currentCard.solution_title || 'Solution',
        conversationHistory: [],
        currentQuestionIndex: 0,
        questionType: 'initial'
      };

      console.log('Sending flashcard conversation request:', requestBody);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal, // Add abort signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI endpoint error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to generate AI question'}`);
      }

      const responseText = await response.text();
      console.log('Raw AI endpoint response:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Empty response from AI endpoint');
      }
      
      const data = JSON.parse(responseText);

      console.log('AI endpoint response data:', data);

      // Check if this response is still for the current session
      if (currentSessionIdRef.current !== sessionId) {
        console.log('Ignoring response for old session:', sessionId, 'current:', currentSessionIdRef.current);
        return;
      }

      const aiMessage: AIMessage = {
        role: "assistant",
        content: data.response || data.message || data.content || 'Let\'s start reviewing your solution!',
        timestamp: new Date(),
      };

      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMessage]
      } : null);
      
    } catch (error) {
      // Don't show error if request was aborted (user navigated away)
      if (error.name === 'AbortError') {
        console.log('AI request aborted for session:', sessionId);
        return;
      }
      
      console.error("Error getting AI response:", error);
      
      // Check if this error is still for the current session
      if (currentSessionIdRef.current !== sessionId) {
        return;
      }
      
      toast.error("Failed to start AI review. Please try again.");
      
      // Fallback to static message
      const fallbackMessage: AIMessage = {
        role: "assistant",
        content: `Hi! Let's review your solution for "${session.problemTitle}". 

I'm going to ask you a few questions to help you recall the key concepts. Don't worry about writing code - just explain your thinking in your own words.

**Question 1:** What was the main algorithmic approach you used to solve this problem?`,
        timestamp: new Date(),
      };

      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, fallbackMessage]
      } : null);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Send user message and get AI response
  const sendMessage = async () => {
    if (!userInput.trim() || !currentSession) return;

    // Cancel any ongoing AI requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const sessionId = currentSessionIdRef.current;

    const userMessage: AIMessage = {
      role: "user",
      content: userInput,
      timestamp: new Date(),
    };

    // Add user message
    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage]
    } : null);
    
    const inputToSend = userInput;
    setUserInput("");
    setIsLoadingAI(true);

    const currentCard = dueCards[currentCardIndex];

    try {
      // Build conversation history for context
      const conversationHistory = [
        ...currentSession.messages,
        userMessage
      ].map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      }));

      const nextQuestionIndex = currentSession.currentQuestionIndex + 1;
      const isLastQuestion = nextQuestionIndex >= currentSession.totalQuestions;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'flashcard_conversation',
          problemId: currentCard.problem_id,
          problemDescription: currentProblemData?.description || 'Problem description',
          solutionCode: currentCard.solution_code || currentCard.code || 'No code available',
          solutionTitle: currentCard.solution_title || 'Solution',
          conversationHistory,
          currentQuestionIndex: nextQuestionIndex,
          questionType: isLastQuestion ? 'evaluation' : 'followup',
          userResponse: inputToSend
        }),
        signal: abortController.signal, // Add abort signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI endpoint error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to generate AI response'}`);
      }

      const responseText = await response.text();
      console.log('Raw AI endpoint response:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Empty response from AI endpoint');
      }
      
      const data = JSON.parse(responseText);

      // Check if this response is still for the current session
      if (currentSessionIdRef.current !== sessionId) {
        console.log('Ignoring sendMessage response for old session:', sessionId, 'current:', currentSessionIdRef.current);
        return;
      }

      const aiMessage: AIMessage = {
        role: "assistant",
        content: data.response || data.message || 'Great response!',
        timestamp: new Date(),
      };

      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMessage],
        currentQuestionIndex: nextQuestionIndex
      } : null);

      // Show rating options if this was the last question
      if (isLastQuestion) {
        setShowRatingOptions(true);
      }
      
    } catch (error) {
      // Don't show error if request was aborted (user navigated away)
      if (error.name === 'AbortError') {
        console.log('sendMessage request aborted for session:', sessionId);
        return;
      }
      
      // Check if this error is still for the current session
      if (currentSessionIdRef.current !== sessionId) {
        return;
      }
      
      console.error("Error getting AI response:", error);
      toast.error("Failed to get AI response. Using fallback.");
      
      // Fallback logic
      const nextQuestionIndex = currentSession.currentQuestionIndex + 1;
      let aiResponse = "";
      
      if (nextQuestionIndex < currentSession.totalQuestions) {
        const questions = [
          "Great! Now, can you explain the time and space complexity of your solution and why?",
          "Excellent! Finally, what edge cases did you consider when implementing this solution?"
        ];
        aiResponse = `Good response! 

**Question ${nextQuestionIndex + 1}:** ${questions[nextQuestionIndex - 1]}`;
      } else {
        aiResponse = `Perfect! You've demonstrated a solid understanding. You're ready to rate how well you remembered this solution.`;
        setShowRatingOptions(true);
      }

      const aiMessage: AIMessage = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };

      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMessage],
        currentQuestionIndex: nextQuestionIndex
      } : null);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle difficulty rating selection
  const handleRatingSelection = async (rating: number) => {
    if (!currentSession) return;

    const timeSpent = Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000);

    try {
      // Submit the review and wait for completion
      submitReview({
        deckId: currentSession.deckId,
        aiQuestions: currentSession.messages.filter(m => m.role === "assistant").map(m => m.content),
        userAnswers: currentSession.messages.filter(m => m.role === "user").map(m => m.content),
        aiEvaluation: { overallUnderstanding: "good" }, // TODO: Get from AI
        difficultyRating: rating,
        timeSpent,
      });

      // Update counters and advance to next card
      setCompletedCards(prev => prev + 1);
      const nextIndex = currentCardIndex + 1;
      
      console.log('Moving to next card:', { currentIndex: currentCardIndex, nextIndex, totalCards: dueCards.length });
      
      setCurrentCardIndex(nextIndex);
      
      // Reset UI state for next card
      setCurrentSession(null);
      setShowRatingOptions(false);
      setUserInput("");
      setShowSolution(false);
      
      // Small delay to ensure state updates, then start next card
      setTimeout(() => {
        startNewCard();
      }, 500);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    }
  };

  // Skip current card (moved to navigation controls)

  // Handle session completion
  const handleSessionComplete = () => {
    setSessionComplete(false);
    setCurrentCardIndex(0);
    setCurrentSession(null);
    setCompletedCards(0);
    onClose();
    toast.success(`Review session complete! Reviewed ${completedCards} cards.`);
  };

  if (!isOpen) return null;

  if (sessionComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Session Complete! 🎉</h2>
            <p className="text-muted-foreground mb-6">
              You reviewed {completedCards} flashcard{completedCards !== 1 ? 's' : ''} today.
              Great job strengthening your memory!
            </p>
            <Button onClick={handleSessionComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Finish Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (dueCards.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <Brain className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">All Caught Up!</h2>
            <p className="text-muted-foreground mb-6">
              No flashcards are due for review right now.
              Check back later for more practice!
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const progress = ((currentCardIndex + 1) / dueCards.length) * 100;
  const currentCard = dueCards[currentCardIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Flashcard Review
            </DialogTitle>
          </div>
          
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>Card {currentCardIndex + 1} of {dueCards.length}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Navigate:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (currentCardIndex > 0) {
                        // Cancel any ongoing requests
                        if (abortControllerRef.current) {
                          abortControllerRef.current.abort();
                        }
                        setCurrentCardIndex(prev => prev - 1);
                        setCurrentSession(null);
                        setShowRatingOptions(false);
                        setUserInput("");
                        setIsLoadingAI(false);
                        setTimeout(() => startNewCard(), 100);
                      }
                    }}
                    disabled={currentCardIndex === 0 || isLoadingAI}
                    className="h-6 w-6 p-0"
                    title="Previous card"
                  >
                    ←
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (currentCardIndex < dueCards.length - 1) {
                        // Cancel any ongoing requests
                        if (abortControllerRef.current) {
                          abortControllerRef.current.abort();
                        }
                        setCurrentCardIndex(prev => prev + 1);
                        setCurrentSession(null);
                        setShowRatingOptions(false);
                        setUserInput("");
                        setIsLoadingAI(false);
                        setTimeout(() => startNewCard(), 100);
                      }
                    }}
                    disabled={currentCardIndex >= dueCards.length - 1 || isLoadingAI}
                    className="h-6 w-6 p-0"
                    title="Next card"
                  >
                    →
                  </Button>
                </div>
              </div>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Problem Description Panel */}
          <div className="w-1/2 p-6 border-r bg-muted/20 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {currentSession?.problemTitle}
                </h3>
                <Badge variant="outline" className="mb-4">
                  {currentSession?.solutionTitle}
                </Badge>
              </div>
              
              {/* Problem Description */}
              {currentProblemData && (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <div 
                      className="text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: currentProblemData.description }}
                    />
                  </div>
                  
                  {/* Examples */}
                  {currentProblemData.examples && currentProblemData.examples.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Examples:</h4>
                      <div className="space-y-2">
                        {currentProblemData.examples.slice(0, 2).map((example: any, idx: number) => (
                          <div key={idx} className="bg-muted/50 p-3 rounded text-sm font-mono">
                            <div><strong>Input:</strong> {example.input}</div>
                            <div><strong>Output:</strong> {example.output}</div>
                            {example.explanation && (
                              <div><strong>Explanation:</strong> {example.explanation}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Solution Code Display - Anki Card Style */}
              {currentCard && (currentCard.solution_code || currentCard.solution_title) && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      <h4 className="font-medium text-sm">Your Solution</h4>
                      {currentCard.is_custom_solution && (
                        <Badge variant="secondary" className="text-xs">Custom</Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSolution(!showSolution)}
                      className="text-xs"
                    >
                      {showSolution ? "Hide Solution" : "Show Solution"}
                    </Button>
                  </div>
                  
                  {!showSolution ? (
                    <div className="rounded border bg-muted/20 p-8 text-center">
                      <div className="text-muted-foreground">
                        <Code className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Try to recall your solution first</p>
                        <p className="text-xs mt-1">Click "Show Solution" when ready</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentCard.solution_code ? (
                        <div className="rounded overflow-hidden border">
                          <Editor
                            height="300px"
                            language="python"
                            theme={editorTheme}
                            value={currentCard.solution_code}
                            loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              lineNumbers: 'on',
                              folding: false,
                              wordWrap: 'on',
                              scrollBeyondLastLine: false,
                              renderWhitespace: 'none',
                              fontSize: 12,
                              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                            }}
                            onMount={(editor, monaco) => {
                              defineCustomThemes(monaco);
                              setIsEditorReady(true);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="rounded border p-4 bg-red-50 dark:bg-red-950">
                          <p className="text-sm text-red-600 dark:text-red-400">
                            No solution code available for this card.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This might indicate the database migration hasn't been applied yet.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                  <Lightbulb className="h-4 w-4" />
                  <span className="font-medium">Review Tip</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Focus on explaining the concepts in your own words rather than memorizing code.
                  The AI will guide you through key aspects of your solution.
                </p>
              </div>
            </div>
          </div>

          {/* AI Conversation Panel */}
          <div className="w-1/2 flex flex-col">
            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-4">
                {currentSession?.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent text-accent-foreground">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "border border-primary/60 bg-card text-foreground"
                          : "border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoadingAI && (
                  <div className="flex justify-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent text-accent-foreground">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Rating Options */}
            {showRatingOptions && (
              <div className="p-6 border-t bg-muted/20">
                <h4 className="font-medium mb-3">How well did you remember this solution?</h4>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant="outline"
                      onClick={() => handleRatingSelection(option.value)}
                      disabled={isSubmittingReview}
                      className={`h-auto p-3 text-left ${option.color.replace('bg-', 'hover:bg-').replace('500', '50')}`}
                    >
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="p-4 border-t bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (currentCardIndex > 0) {
                        // Cancel any ongoing requests
                        if (abortControllerRef.current) {
                          abortControllerRef.current.abort();
                        }
                        setCurrentCardIndex(prev => prev - 1);
                        setCurrentSession(null);
                        setShowRatingOptions(false);
                        setUserInput("");
                        setIsLoadingAI(false);
                        setTimeout(() => startNewCard(), 100);
                      }
                    }}
                    disabled={currentCardIndex === 0 || isLoadingAI}
                    title="Previous card"
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextIndex = currentCardIndex + 1;
                      if (nextIndex < dueCards.length) {
                        // Cancel any ongoing requests
                        if (abortControllerRef.current) {
                          abortControllerRef.current.abort();
                        }
                        setCurrentCardIndex(nextIndex);
                        setCurrentSession(null);
                        setShowRatingOptions(false);
                        setUserInput("");
                        setIsLoadingAI(false);
                        setTimeout(() => startNewCard(), 100);
                      }
                    }}
                    disabled={currentCardIndex >= dueCards.length - 1 || isLoadingAI}
                    title="Next card"
                  >
                    Next →
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Cancel any ongoing requests
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                    }
                    // Skip to next card without rating
                    const nextIndex = currentCardIndex + 1;
                    setCurrentCardIndex(nextIndex);
                    setCurrentSession(null);
                    setShowRatingOptions(false);
                    setUserInput("");
                    setIsLoadingAI(false);
                    setTimeout(() => startNewCard(), 100);
                  }}
                  disabled={isLoadingAI}
                  title="Skip this card (no rating)"
                >
                  Skip Card
                </Button>
              </div>
            </div>

            {/* Input Area */}
            {!showRatingOptions && (
              <div className="p-6 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Explain your thinking..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="min-h-[60px]"
                    disabled={isLoadingAI}
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={sendMessage}
                      disabled={!userInput.trim() || isLoadingAI}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};