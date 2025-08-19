import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface SimpleOverlayProps {
  isVisible: boolean;
  position: { x: number; y: number };
  placeholder: string;
  onSubmit: (response: string) => void;
  onCancel: () => void;
  isValidating?: boolean;
  maxLength?: number;
  // Coaching specific props
  question?: string;
  hint?: string;
  stepInfo?: { current: number; total: number };
  elapsedTime?: string;
}

const SimpleOverlay: React.FC<SimpleOverlayProps> = ({
  isVisible,
  position,
  placeholder,
  onSubmit,
  onCancel,
  isValidating = false,
  maxLength = 500,
  question,
  hint,
  stepInfo,
  elapsedTime,
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
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 1000,
        backgroundColor: "white",
        border: "2px solid #3b82f6",
        borderRadius: "12px",
        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
        minWidth: "350px",
        maxWidth: "500px",
      }}
      className="dark:bg-gray-800 dark:border-blue-500"
    >
      {/* Header with progress and timer */}
      {(stepInfo || elapsedTime) && (
        <div 
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8fafc",
            borderRadius: "10px 10px 0 0",
          }}
          className="dark:bg-gray-700 dark:border-gray-600"
        >
          {stepInfo && (
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#3b82f6" }}>
              Step {stepInfo.current} of {stepInfo.total}
            </div>
          )}
          {elapsedTime && (
            <div style={{ fontSize: "12px", color: "#6b7280" }} className="dark:text-gray-400">
              {elapsedTime}
            </div>
          )}
        </div>
      )}

      {/* Question section */}
      {question && (
        <div style={{ padding: "16px" }}>
          <div 
            style={{ 
              fontSize: "14px", 
              fontWeight: "500", 
              marginBottom: "8px",
              color: "#1f2937",
              lineHeight: "1.5"
            }}
            className="dark:text-gray-100"
          >
            {question}
          </div>
          {hint && (
            <div 
              style={{ 
                fontSize: "12px", 
                color: "#6b7280",
                fontStyle: "italic",
                marginBottom: "12px"
              }}
              className="dark:text-gray-400"
            >
              💡 {hint}
            </div>
          )}
        </div>
      )}
      {/* Input area */}
      <div style={{ padding: "0 16px" }}>
        <textarea
          ref={textareaRef}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isValidating}
          style={{
            width: "100%",
            minHeight: "80px",
            maxHeight: "150px",
            padding: "12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            outline: "none",
            resize: "vertical",
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            lineHeight: "1.5",
            backgroundColor: "#fafafa",
          }}
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Character counter and actions */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderTop: "1px solid #e5e7eb",
        }}
        className="dark:border-gray-600"
      >
        <div style={{ fontSize: "11px", color: "#9ca3af" }}>
          {userInput.length}/{maxLength} characters
        </div>
        
        <div style={{ display: "flex", gap: "8px" }}>
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
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="px-3 pb-2 text-xs text-gray-400 dark:text-gray-500">
        Press Ctrl+Enter to submit, Esc to cancel
      </div>
    </div>
  );
};

export default SimpleOverlay;