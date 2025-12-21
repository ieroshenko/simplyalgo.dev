import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Check, Circle } from "lucide-react";
import { Problem } from "@/types";
import { cn } from "@/lib/utils";

interface ProblemSelectorProps {
  problems: Problem[];
  currentProblemId?: string;
  className?: string;
}

export const ProblemSelector = ({
  problems,
  currentProblemId,
  className
}: ProblemSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter out Data Structure Implementations and System Design (DSA problems only)
  const dsaProblems = problems.filter((problem) =>
    problem.category !== "Data Structure Implementations" &&
    problem.category !== "System Design"
  );

  // Filter problems based on search query
  const filteredProblems = dsaProblems.filter((problem) =>
    problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    problem.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    problem.difficulty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "hard":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status?: string) => {
    if (status === "solved") {
      return <Check className="w-4 h-4 text-green-500" />;
    }
    if (status === "attempted") {
      return <Circle className="w-4 h-4 text-yellow-500" />;
    }
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  const handleProblemSelect = (problemId: string) => {
    setIsOpen(false);
    setSearchQuery("");
    navigate(`/problems/${problemId}`);
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 min-w-[140px] justify-between"
      >
        <span className="text-sm font-medium">Problems</span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-[500px] bg-background border border-border rounded-lg shadow-lg z-50 max-h-[600px] flex flex-col">
          {/* Search bar */}
          <div className="p-3 border-b border-border">
            <input
              type="text"
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Problems list */}
          <div className="overflow-y-auto flex-1">
            {filteredProblems.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No problems found
              </div>
            ) : (
              filteredProblems.map((problem) => (
                <button
                  key={problem.id}
                  onClick={() => handleProblemSelect(problem.id)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center space-x-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0",
                    problem.id === currentProblemId && "bg-muted"
                  )}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(problem.status)}
                  </div>

                  {/* Problem info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        problem.id === currentProblemId && "text-primary"
                      )}>
                        {problem.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          getDifficultyColor(problem.difficulty)
                        )}
                      >
                        {problem.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {problem.category}
                      </span>
                    </div>
                  </div>

                  {/* Current indicator */}
                  {problem.id === currentProblemId && (
                    <div className="flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer with problem count */}
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="text-xs text-muted-foreground text-center">
              {filteredProblems.length} {filteredProblems.length === 1 ? 'problem' : 'problems'}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
