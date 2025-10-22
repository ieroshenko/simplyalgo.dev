import React from "react";
import { Button } from "@/components/ui/button";
import { Hand, MessageSquare } from "lucide-react";
import FeedbackModal from "./FeedbackModal";

const FeedbackButton = () => {
  return (
    <FeedbackModal>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground"
        title="Leave Feedback"
      >
        <MessageSquare className="w-4 h-4" />
      </Button>
    </FeedbackModal>
  );
};

export default FeedbackButton;
