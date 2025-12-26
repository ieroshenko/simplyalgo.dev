import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Eye, Calendar, Award } from "lucide-react";
import type { SystemDesignSubmission } from "@/features/system-design/hooks/useSystemDesignSubmissions";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@/hooks/useTheme";

interface SystemDesignSubmissionsProps {
  submissions: SystemDesignSubmission[];
  loading: boolean;
  error: string | null;
  onViewDiagram: (submission: SystemDesignSubmission) => void;
}

const SystemDesignSubmissions = ({
  submissions,
  loading,
  error,
  onViewDiagram,
}: SystemDesignSubmissionsProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isDark } = useTheme();

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    if (score >= 60) return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    if (score >= 40) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading submissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Award className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground mb-2">No submissions yet</p>
        <p className="text-xs text-muted-foreground">
          Complete an evaluation to see your submissions here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {submissions.map((submission) => {
        const isExpanded = expandedId === submission.id;
        const nodeCount = submission.board_state?.nodes?.length || 0;
        const edgeCount = submission.board_state?.edges?.length || 0;

        return (
          <Card key={submission.id} className="overflow-hidden">
            {/* Header - Clickable */}
            <button
              onClick={() => toggleExpanded(submission.id)}
              className="w-full p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Score Badge */}
                  <div
                    className={`px-3 py-1.5 rounded-md border font-semibold text-sm shrink-0 ${getScoreColor(submission.score)}`}
                  >
                    {submission.score}
                  </div>

                  {/* Diagram Stats */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <span className="truncate">
                      {nodeCount} node{nodeCount !== 1 ? "s" : ""}
                    </span>
                    <span className="hidden xs:inline">•</span>
                    <span className="truncate hidden xs:inline">
                      {edgeCount} connection{edgeCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{formatDate(submission.completed_at)}</span>
                    <span className="sm:hidden">{formatDate(submission.completed_at).split(' ')[0]}</span>
                  </div>

                  {/* Expand Icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-border">
                {/* View Diagram Button */}
                <div className="p-4 border-b border-border bg-muted/20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDiagram(submission)}
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Diagram
                  </Button>
                </div>

                {/* AI Feedback */}
                {submission.evaluation_feedback && (
                  <div className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      AI Analysis
                    </h4>
                    <div
                      className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}
                    >
                      <ReactMarkdown>{submission.evaluation_feedback}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default SystemDesignSubmissions;
