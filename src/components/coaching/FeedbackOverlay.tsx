import React, { useEffect, useState } from "react";
import { Check, X, Sparkles } from "lucide-react";

interface FeedbackOverlayProps {
  isVisible: boolean;
  type: "success" | "error" | "hint" | null;
  message: string;
  onClose: () => void;
  showConfetti?: boolean;
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
  isVisible,
  type,
  message,
  onClose,
  showConfetti = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // Auto-close after 3 seconds for success, 5 seconds for others
      const timeout = setTimeout(onClose, type === "success" ? 3000 : 5000);
      return () => clearTimeout(timeout);
    } else {
      setIsAnimating(false);
    }
  }, [isVisible, type, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <Check className="w-6 h-6 text-green-500" />;
      case "error":
        return <X className="w-6 h-6 text-red-500" />;
      case "hint":
        return <Sparkles className="w-6 h-6 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStyles = () => {
    const baseStyles = {
      position: "fixed" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
      padding: "20px 24px",
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      maxWidth: "400px",
      opacity: isAnimating ? 1 : 0,
      transform: isAnimating 
        ? "translate(-50%, -50%) scale(1)" 
        : "translate(-50%, -50%) scale(0.9)",
      transition: "all 0.3s ease",
    };

    switch (type) {
      case "success":
        return {
          ...baseStyles,
          backgroundColor: "#10b981",
          color: "white",
        };
      case "error":
        return {
          ...baseStyles,
          backgroundColor: "#ef4444",
          color: "white",
        };
      case "hint":
        return {
          ...baseStyles,
          backgroundColor: "#3b82f6",
          color: "white",
        };
      default:
        return {
          ...baseStyles,
          backgroundColor: "#6b7280",
          color: "white",
        };
    }
  };

  return (
    <>
      {/* Simple confetti effect for success */}
      {showConfetti && type === "success" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 9998,
          }}
        >
          {/* Simple animated sparkles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`,
                width: "8px",
                height: "8px",
                backgroundColor: ["#fbbf24", "#10b981", "#3b82f6", "#8b5cf6"][i % 4],
                borderRadius: "50%",
                animation: `sparkle 2s ease-out forwards`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}
      
      <div style={getStyles()}>
        {getIcon()}
        <div style={{ fontSize: "14px", fontWeight: "500", lineHeight: "1.4" }}>
          {message}
        </div>
      </div>

      <style jsx>{`
        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: scale(0) translateY(0);
          }
          50% {
            opacity: 1;
            transform: scale(1) translateY(-20px);
          }
          100% {
            opacity: 0;
            transform: scale(0) translateY(-40px);
          }
        }
      `}</style>
    </>
  );
};

export default FeedbackOverlay;