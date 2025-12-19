import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/hooks/useTheme";
import type { SystemDesignSpec } from "@/types";

interface ProblemContextSidebarProps {
  spec: SystemDesignSpec;
}

const ProblemContextSidebar = ({ spec }: ProblemContextSidebarProps) => {
  const [showRubric, setShowRubric] = useState(false);
  const { isDark } = useTheme();

  // Select syntax highlighting theme based on current color scheme
  const syntaxTheme = isDark ? vscDarkPlus : vs;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-success text-success-foreground";
      case "Medium":
        return "bg-amber-500 text-white";
      case "Hard":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Summary - Main Description */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Problem Description
        </h2>
        <div className="prose prose-sm max-w-none text-foreground prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-foreground">
          <ReactMarkdown
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
            }}
          >
            {spec.summary}
          </ReactMarkdown>
        </div>
      </div>

      {/* Functional Requirements */}
      {spec.functional_requirements.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-foreground mb-3">
            Functional Requirements
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {spec.functional_requirements.map((req, idx) => (
              <li key={idx}>• {req}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Non-functional Requirements */}
      {spec.nonfunctional_requirements.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-foreground mb-3">
            Non-functional Requirements
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {spec.nonfunctional_requirements.map((req, idx) => (
              <li key={idx}>• {req}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Scale Estimates */}
      {Object.keys(spec.scale_estimates).length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-foreground mb-3">
            Scale Estimates
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {Object.entries(spec.scale_estimates).map(([key, value]) => (
              <li key={key}>
                • <strong>{key}:</strong> {String(value)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions */}
      {spec.assumptions.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-foreground mb-3">
            Assumptions
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {spec.assumptions.map((assumption, idx) => (
              <li key={idx}>• {assumption}</li>
            ))}
          </ul>
        </div>
      )}

      {/* View Rubric Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowRubric(true)}
      >
        <FileText className="w-4 h-4 mr-2" />
        View Rubric
      </Button>

      {/* Rubric Modal */}
      <Dialog open={showRubric} onOpenChange={setShowRubric}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evaluation Rubric</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Evaluation Axes</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {spec.rubric.axes.map((axis) => (
                  <li key={axis}>{axis}</li>
                ))}
              </ul>
            </div>
            {Object.keys(spec.rubric.weights).length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Weights</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(spec.rubric.weights).map(([axis, weight]) => (
                    <div key={axis}>
                      <strong>{axis}:</strong> {(weight * 100).toFixed(0)}%
                    </div>
                  ))}
                </div>
              </div>
            )}
            {spec.rubric.must_have.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Must Have Components</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {spec.rubric.must_have.map((component) => (
                    <li key={component}>{component}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProblemContextSidebar;

