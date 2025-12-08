import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Send, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FeedbackService, type FeedbackSubmission } from "@/services/feedbackService";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";

interface FeedbackModalProps {
  children: React.ReactNode;
}

const FeedbackModal = ({ children }: FeedbackModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackCategories = [
    { value: "general", label: "General Feedback" },
    { value: "bug", label: "Bug Report" },
    { value: "feature", label: "Feature Request" },
    { value: "ui", label: "UI/UX Issue" },
    { value: "performance", label: "Performance Issue" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide your feedback before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData: FeedbackSubmission = {
        category: category as 'general' | 'bug' | 'feature' | 'ui' | 'performance',
        content: feedback.trim(),
        user_id: user?.id as string,
      };

      const result = await FeedbackService.submitFeedback(feedbackData);

      if (result.success) {
        toast({
          title: "Feedback Submitted",
          description: "Thank you for your feedback! We'll review it and get back to you if needed.",
        });

        // Reset form and close modal
        setFeedback("");
        setCategory("general");
        setOpen(false);
      } else {
        toast({
          title: "Submission Failed",
          description: result.error || "There was an error submitting your feedback. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Unexpected error submitting feedback', { error });
      toast({
        title: "Submission Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setFeedback("");
        setCategory("general");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span>Leave Feedback</span>
          </DialogTitle>
          <DialogDescription>
            Help us improve SimplyAlgo by sharing your thoughts, reporting bugs, or suggesting new features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-3">
            <Label htmlFor="category">Category</Label>
            <RadioGroup
              value={category}
              onValueChange={setCategory}
              className="grid grid-cols-1 gap-3"
            >
              {feedbackCategories.map((cat) => (
                <div key={cat.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={cat.value} id={cat.value} />
                  <Label htmlFor={cat.value} className="text-sm">
                    {cat.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Feedback Text */}
          <div className="space-y-3">
            <Label htmlFor="feedback">Your Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us what's on your mind... What did you like? What could be improved? Any bugs you encountered?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={2000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {feedback.length}/2000 characters
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !feedback.trim()}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p>
            <strong>What happens next?</strong> We review all feedback and use it to prioritize improvements.
          </p>
          <p>
            <strong>Need immediate help?</strong> Contact our support team for critical issues.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
