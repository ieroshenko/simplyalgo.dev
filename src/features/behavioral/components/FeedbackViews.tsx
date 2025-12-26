import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";
import type { STARScore, CustomMetrics, AnswerFeedback } from "@/types";

interface FeedbackData {
  star_score?: STARScore;
  content_score: number;
  delivery_score: number;
  overall_score: number;
  custom_metrics?: CustomMetrics;
  feedback: AnswerFeedback;
}

interface FeedbackViewsProps {
  feedback: FeedbackData;
  evaluationType: 'star' | 'none' | 'custom';
  onTryAgain: () => void;
}

// STAR Feedback View
const STARFeedbackView = ({ feedback, onTryAgain }: { feedback: FeedbackData; onTryAgain: () => void }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          AI Feedback - STAR Method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className="text-2xl font-bold">{feedback.overall_score}%</span>
          </div>
          <Progress value={feedback.overall_score} className="h-2" />
        </div>

        {/* STAR Scores */}
        {feedback.star_score && (
          <div>
            <div className="text-sm font-medium mb-3">STAR Method Breakdown</div>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(feedback.star_score).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground capitalize">
                      {key}
                    </span>
                    <span className="text-sm font-medium">{value}%</span>
                  </div>
                  <Progress value={value} className="h-1" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content & Delivery Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Content Quality</div>
            <Progress value={feedback.content_score} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {feedback.content_score}%
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Delivery</div>
            <Progress value={feedback.delivery_score} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {feedback.delivery_score}%
            </div>
          </div>
        </div>

        {/* Strengths */}
        {feedback.feedback.strengths.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-green-600">
              Strengths
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.feedback.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {feedback.feedback.improvements.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-orange-600">
              Areas for Improvement
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.feedback.improvements.map((improvement, idx) => (
                <li key={idx}>{improvement}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {feedback.feedback.next_steps && feedback.feedback.next_steps.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Next Steps</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.feedback.next_steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Default Feedback View (for 'none' evaluation type)
const DefaultFeedbackView = ({ feedback, onTryAgain }: { feedback: FeedbackData; onTryAgain: () => void }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          AI Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className="text-2xl font-bold">{feedback.overall_score}%</span>
          </div>
          <Progress value={feedback.overall_score} className="h-2" />
        </div>

        {/* Content & Delivery Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Content Quality</div>
            <Progress value={feedback.content_score} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {feedback.content_score}%
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Delivery</div>
            <Progress value={feedback.delivery_score} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {feedback.delivery_score}%
            </div>
          </div>
        </div>

        {/* Strengths */}
        {feedback.feedback.strengths.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-green-600">
              Strengths
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.feedback.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {feedback.feedback.improvements.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-orange-600">
              Areas for Improvement
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.feedback.improvements.map((improvement, idx) => (
                <li key={idx}>{improvement}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {feedback.feedback.next_steps && feedback.feedback.next_steps.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Next Steps</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.feedback.next_steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Custom Feedback View (for 'custom' evaluation type)
const CustomFeedbackView = ({ feedback, onTryAgain }: { feedback: FeedbackData; onTryAgain: () => void }) => {
  const renderMetricValue = (value: number | string) => {
    if (typeof value === 'number') {
      return (
        <div>
          <Progress value={value} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            {value}%
          </div>
        </div>
      );
    }
    return <div className="text-sm text-muted-foreground">{value}</div>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          AI Feedback - Custom Evaluation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className="text-2xl font-bold">{feedback.overall_score}%</span>
          </div>
          <Progress value={feedback.overall_score} className="h-2" />
        </div>

        {/* Custom Metrics */}
        {feedback.custom_metrics && Object.keys(feedback.custom_metrics).length > 0 && (
          <div>
            <div className="text-sm font-medium mb-3">Custom Metrics</div>
            <div className="space-y-4">
              {Object.entries(feedback.custom_metrics).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {renderMetricValue(value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content & Delivery Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Content Quality</div>
            <Progress value={feedback.content_score} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {feedback.content_score}%
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Delivery</div>
            <Progress value={feedback.delivery_score} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {feedback.delivery_score}%
            </div>
          </div>
        </div>

        {/* Strengths */}
        {feedback.feedback.strengths.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-green-600">
              Strengths
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.feedback.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {feedback.feedback.improvements.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-orange-600">
              Areas for Improvement
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.feedback.improvements.map((improvement, idx) => (
                <li key={idx}>{improvement}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {feedback.feedback.next_steps && feedback.feedback.next_steps.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Next Steps</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.feedback.next_steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main component that renders the appropriate view
export const FeedbackViews = ({ feedback, evaluationType, onTryAgain }: FeedbackViewsProps) => {
  if (evaluationType === 'star') {
    return <STARFeedbackView feedback={feedback} onTryAgain={onTryAgain} />;
  } else if (evaluationType === 'custom') {
    return <CustomFeedbackView feedback={feedback} onTryAgain={onTryAgain} />;
  } else {
    return <DefaultFeedbackView feedback={feedback} onTryAgain={onTryAgain} />;
  }
};

