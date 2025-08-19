import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface HighlightOverlayProps {
  isVisible: boolean;
  position: { x: number; y: number };
  placeholder: string;
  onSubmit: (response: string) => void;
  onCancel: () => void;
  isValidating?: boolean;
  maxLength?: number;
}

const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  isVisible,
  position,
  placeholder,
  onSubmit,
  onCancel,
  isValidating = false,
  maxLength = 500,
}) => {
  const [userInput, setUserInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when overlay becomes visible
  useEffect(() => {
    if (isVisible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isVisible]);

  // Reset input when overlay is hidden
  useEffect(() => {
    if (!isVisible) {
      setUserInput("");
    }
  }, [isVisible]);

  const handleSubmit = () => {
    const trimmedInput = userInput.trim();
    if (trimmedInput.length > 0) {
      onSubmit(trimmedInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="coach-input-overlay"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Input area */}
      <textarea
        ref={textareaRef}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="coach-input-textarea"
        maxLength={maxLength}
        disabled={isValidating}
      />

      {/* Character counter */}
      <div className="px-3 text-xs text-gray-500 dark:text-gray-400">
        {userInput.length}/{maxLength}
      </div>

      {/* Actions */}
      <div className="coach-input-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isValidating}
          className="h-8"
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={userInput.trim().length === 0 || isValidating}
          size="sm"
          className="h-8 bg-green-600 hover:bg-green-700 text-white"
        >
          {isValidating ? (
            <>
              <div className="w-3 h-3 mr-1 border border-white/30 border-t-white rounded-full animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Check className="w-3 h-3 mr-1" />
              Done
            </>
          )}
        </Button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="px-3 pb-2 text-xs text-gray-400 dark:text-gray-500">
        Press Ctrl+Enter to submit, Esc to cancel
      </div>
    </div>
  );
};

export default HighlightOverlay;