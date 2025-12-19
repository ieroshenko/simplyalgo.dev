import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Brain,
  Code,
  Lightbulb,
} from "lucide-react";
import { useFlashcards } from "@/hooks/useFlashcards";
import type { FlashcardDeck } from "@/types/api";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/hooks/useTheme";
import "katex/dist/katex.min.css";

interface FlashcardReviewInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface ReviewSession {
  deckId: string;
  problemTitle: string;
  solutionTitle: string;
  startTime: Date;
  currentQuestionIndex: number;
  totalQuestions: number;
  cardData: FlashcardDeck; // Store the complete card data to avoid sync issues
}

interface ProblemData {
  id: string;
  title: string;
  description: string;
  examples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  function_signature?: string;
}

const REVIEW_QUESTIONS = [
  {
    id: 1,
    question: "What is the main trick and technique to solve this problem?",
    description: "Think about the core algorithmic approach or pattern"
  },
  {
    id: 2,
    question: "What data structures did you use?",
    description: "Arrays, hash maps, trees, etc."
  },
  {
    id: 3,
    question: "What are the time and space complexities?",
    description: "You can check the solution to remember"
  }
];

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
  const { isDark } = useTheme();

  // Select syntax highlighting theme based on current color scheme
  const syntaxTheme = isDark ? vscDarkPlus : vs;
  const [isEditorReady, setIsEditorReady] = useState(false);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentSession, setCurrentSession] = useState<ReviewSession | null>(null);
  const [showRatingOptions, setShowRatingOptions] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completedCards, setCompletedCards] = useState(0);
  const [currentProblemData, setCurrentProblemData] = useState<ProblemData | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const startTimeRef = useRef<Date>(new Date());

  // Initialize session when modal opens
  useEffect(() => {
    if (isOpen && dueCards.length > 0 && !currentSession) {
      startNewCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dueCards, currentSession]);

  // Start new card when currentCardIndex changes (for navigation/skip)
  useEffect(() => {
    if (isOpen && dueCards.length > 0 && currentSession === null) {
      logger.debug('currentCardIndex changed, starting new card', { component: 'FlashcardReview', currentCardIndex });
      // Add a small delay to ensure state is properly updated
      setTimeout(() => {
        startNewCard();
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardIndex, isOpen, dueCards.length, currentSession]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentSession(null);
    }
  }, [isOpen]);

  // Start a new card review
  const startNewCard = async () => {
    logger.debug('startNewCard called', { component: 'FlashcardReview', currentCardIndex });

    if (currentCardIndex >= dueCards.length) {
      setSessionComplete(true);
      return;
    }

    const card = dueCards[currentCardIndex];
    logger.debug('Using card', {
      component: 'FlashcardReview',
      index: currentCardIndex,
      problemId: card?.problem_id,
      problemTitle: card?.problem_title,
      solutionTitle: card?.solution_title,
      solutionCodeLength: card?.solution_code?.length
    });

    if (!card) {
      logger.error('No card found at index', null, { component: 'FlashcardReview', currentCardIndex });
      setSessionComplete(true);
      return;
    }

    // Clear old problem data first to prevent stale data
    setCurrentProblemData(null);

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
      logger.debug('Fetched problem data for card', {
        component: 'FlashcardReview',
        currentCardIndex,
        problemId: card.problem_id,
        title: problemData?.title,
        descriptionLength: problemData?.description?.length
      });
      setCurrentProblemData(problemData);
      logger.debug('Set currentProblemData', { component: 'FlashcardReview', title: problemData?.title });
    } catch (error) {
      logger.error("Error fetching problem data", error, { component: 'FlashcardReview' });
      setCurrentProblemData(null);
    }

    startTimeRef.current = new Date();

    const newSession: ReviewSession = {
      deckId: card.deck_id || card.id, // Use deck_id if available, fallback to id
      problemTitle: problemData?.title || card.problem_title || card.problem_id,
      solutionTitle: card.solution_title || "Solution",
      startTime: startTimeRef.current,
      currentQuestionIndex: 0,
      totalQuestions: 3, // 3 hardcoded questions
      cardData: card, // Store the card data to avoid sync issues
    };

    logger.debug('Creating new session', {
      component: 'FlashcardReview',
      cardIndex: currentCardIndex,
      cardProblemId: card.problem_id,
      problemDataTitle: problemData?.title,
      finalTitle: newSession.problemTitle
    });

    setCurrentSession(newSession);
    setShowRatingOptions(false);
    setShowSolution(false); // Reset card flip state
  };

  // Move to next question or show rating
  const nextQuestion = () => {
    if (!currentSession) return;

    const nextIndex = currentSession.currentQuestionIndex + 1;

    if (nextIndex >= currentSession.totalQuestions) {
      // All questions completed, show rating options
      setShowRatingOptions(true);
    } else {
      // Move to next question for the same card
      setCurrentSession(prev => prev ? {
        ...prev,
        currentQuestionIndex: nextIndex
      } : null);
    }
  };

  // Handle difficulty rating selection
  const handleRatingSelection = async (rating: number) => {
    if (!currentSession) return;

    const timeSpent = Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000);

    try {
      // Submit the review
      submitReview({
        deckId: currentSession.deckId,
        reviewQuestions: REVIEW_QUESTIONS.map(q => q.question),
        userAnswers: ["Self-evaluated"], // No actual answers since it's self-evaluation
        evaluationSummary: "self-evaluated",
        difficultyRating: rating,
        timeSpent,
      });

      // Update counters and advance to next card
      setCompletedCards(prev => prev + 1);
      const nextIndex = currentCardIndex + 1;

      setCurrentCardIndex(nextIndex);

      // Reset UI state for next card
      setCurrentSession(null);
      setShowRatingOptions(false);
      setShowSolution(false);
      setCurrentProblemData(null);

      // The useEffect will trigger startNewCard when currentCardIndex changes

    } catch (error) {
      logger.error('Error submitting review', error, { component: 'FlashcardReview' });
      toast.error('Failed to submit review. Please try again.');
    }
  };

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
  const currentCard = currentSession?.cardData || dueCards[currentCardIndex];
  const currentQuestion = REVIEW_QUESTIONS[currentSession?.currentQuestionIndex || 0];

  // Debug: Log what card is being rendered
  logger.debug('Rendering with currentCard', {
    component: 'FlashcardReview',
    index: currentCardIndex,
    problemId: currentCard?.problem_id,
    problemDataTitle: currentProblemData?.title,
    usingSessionCard: !!currentSession?.cardData
  });

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
                        logger.debug('Previous button clicked', { component: 'FlashcardReview', from: currentCardIndex, to: currentCardIndex - 1 });
                        setCurrentSession(null);
                        setShowRatingOptions(false);
                        setCurrentProblemData(null);
                        setShowSolution(false);
                        setCurrentCardIndex(prev => prev - 1);
                        // The useEffect will trigger startNewCard when currentCardIndex changes
                      }
                    }}
                    disabled={currentCardIndex === 0}
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
                        logger.debug('Next button clicked', { component: 'FlashcardReview', from: currentCardIndex, to: currentCardIndex + 1 });
                        setCurrentSession(null);
                        setShowRatingOptions(false);
                        setCurrentProblemData(null);
                        setShowSolution(false);
                        setCurrentCardIndex(prev => prev + 1);
                        // The useEffect will trigger startNewCard when currentCardIndex changes
                      }
                    }}
                    disabled={currentCardIndex >= dueCards.length - 1}
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
              {currentProblemData ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-foreground prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-foreground prose-code:bg-transparent prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-img:border prose-img:border-border prose-strong:text-foreground prose-strong:font-semibold prose-headings:text-foreground">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const codeString = String(children).replace(/\n$/, "");
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={syntaxTheme}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                borderRadius: "0.375rem",
                                fontSize: "0.875rem",
                              }}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className}>{children}</code>
                          );
                        },
                        img({ src, alt }: { src?: string; alt?: string }) {
                          return (
                            <div className="my-4 p-3 bg-white dark:bg-gray-100 rounded-lg border border-border">
                              <img
                                src={src}
                                alt={alt || "Problem illustration"}
                                className="max-w-full h-auto rounded shadow-sm mx-auto"
                                style={{
                                  maxHeight: "300px",
                                  objectFit: "contain",
                                }}
                                loading="lazy"
                              />
                            </div>
                          );
                        },
                      }}
                    >
                      {currentProblemData.description}
                    </ReactMarkdown>
                  </div>

                  {/* Examples */}
                  {currentProblemData.examples && currentProblemData.examples.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Examples:</h4>
                      <div className="space-y-2">
                        {currentProblemData.examples.slice(0, 2).map((example, idx: number) => (
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
              ) : (
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              )}

              {/* Solution Code Display */}
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
                      onClick={() => {
                        const newShowSolution = !showSolution;
                        logger.debug('Toggling solution visibility', { component: 'FlashcardReview', showSolution: newShowSolution, problemId: currentCard?.problem_id });
                        setShowSolution(newShowSolution);
                      }}
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
                            key={`${currentCard.problem_id}-${currentCardIndex}`}
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
                  Think through each question carefully. You can check your solution code to help remember the details.
                </p>
              </div>
            </div>
          </div>

          {/* Practice Code Panel */}
          <div className="w-1/2 flex flex-col">
            {!showRatingOptions ? (
              <>
                {/* Code Practice Area */}
                <div className="flex-1 p-6 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Try to Recall Your Solution</h3>
                    <p className="text-sm text-muted-foreground">
                      Write out your solution or pseudocode below. Click "Show Solution" when ready to compare.
                    </p>
                  </div>

                  {/* Editable Code Editor */}
                  <div className="flex-1 min-h-0">
                    {currentProblemData?.function_signature ? (
                      <div className="h-full rounded overflow-hidden border">
                        <Editor
                          key={`practice-${currentCard?.problem_id}-${currentCardIndex}`}
                          height="100%"
                          language="python"
                          theme={editorTheme}
                          defaultValue={currentProblemData.function_signature}
                          loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
                          options={{
                            minimap: { enabled: false },
                            lineNumbers: 'on',
                            folding: false,
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            renderWhitespace: 'none',
                            fontSize: 13,
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            readOnly: false, // Allow editing
                            tabSize: 4,
                            insertSpaces: true,
                          }}
                          onMount={(editor, monaco) => {
                            defineCustomThemes(monaco);
                            setIsEditorReady(true);
                            // Focus the editor
                            editor.focus();
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center border rounded bg-muted/20">
                        <div className="text-center">
                          <Code className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            Loading problem signature...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="p-6 border-t">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentSession(null);
                        setShowRatingOptions(false);
                        setShowSolution(false);
                        setCurrentProblemData(null);
                        setCurrentCardIndex(prev => prev + 1);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Skip Card
                    </Button>

                    <Button onClick={() => setShowRatingOptions(true)}>
                      Rate My Memory
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Rating Options */
              <div className="flex-1 p-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">How well did you remember this solution?</h3>
                    <p className="text-muted-foreground">
                      Rate your overall recall of the technique, data structures, and complexity.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        onClick={() => handleRatingSelection(option.value)}
                        disabled={isSubmittingReview}
                        className={`h-auto p-4 text-left flex flex-col items-start justify-start hover:${option.color.replace('bg-', 'bg-').replace('500', '50')} hover:border-${option.color.replace('bg-', '').replace('500', '300')}`}
                      >
                        <div className="w-full">
                          <div className="font-medium text-sm mb-1">{option.label}</div>
                          <div className="text-xs text-muted-foreground leading-tight">
                            {option.description}
                          </div>
                        </div>
                      </Button>
                    ))}
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