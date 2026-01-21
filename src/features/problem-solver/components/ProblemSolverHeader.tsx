/**
 * Header component for Problem Solver page
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, StarOff, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProblemSelector } from "@/features/problems/components/ProblemSelector";
import Timer from "@/components/Timer";
import FeedbackButton from "@/components/FeedbackButton";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import { FlashcardButton } from "@/components/flashcards/FlashcardButton";
import { getDifficultyColor } from "../utils/problemSolverUtils";
import type { Problem } from "@/types";

interface ProblemSolverHeaderProps {
    problem: Problem;
    problems: Problem[];
    problemId: string | undefined;
    userId: string | undefined;
    isDark: boolean;
    isDemoMode?: boolean;
    hasSubscription?: boolean;
    onToggleTheme: () => void;
    onToggleStar: () => void;
}

export const ProblemSolverHeader: React.FC<ProblemSolverHeaderProps> = ({
    problem,
    problems,
    problemId,
    userId,
    isDark,
    isDemoMode = false,
    hasSubscription = false,
    onToggleTheme,
    onToggleStar,
}) => {
    const navigate = useNavigate();

    // Hide back button and problem selector for new users in demo mode (no subscription)
    // Show them for admins testing demo (have subscription)
    const showNavigation = !isDemoMode || hasSubscription;

    return (
        <div className="border-b border-border bg-background p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    {showNavigation && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/problems")}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <ProblemSelector
                                problems={problems}
                                currentProblemId={problemId}
                            />
                        </>
                    )}
                    <div className="flex items-center space-x-3">
                        <h1 className="text-xl font-bold text-foreground">
                            {problem.title}
                        </h1>
                        <Badge className={getDifficultyColor(problem.difficulty)}>
                            {problem.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground">
                            {problem.category}
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <FeedbackButton />
                    <Timer />
                    <ShortcutsHelp />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleTheme}
                        className="text-muted-foreground hover:text-foreground"
                        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDark ? (
                            <Sun className="w-4 h-4" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleStar}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {problem.isStarred ? (
                            <Star className="w-4 h-4 fill-current" />
                        ) : (
                            <StarOff className="w-4 h-4" />
                        )}
                    </Button>
                    <div data-tour="flashcard-button">
                        <FlashcardButton
                            problemId={problem.id}
                            problemStatus={problem.status}
                            userId={userId}
                            className="ml-2"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
