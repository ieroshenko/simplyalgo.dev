import type { ParsedContent } from "../types";

/**
 * Format timestamp to locale time string
 */
export const formatTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Extract hints, solutions, and hints for next step sections from AI response content.
 * Separates the main body from special sections that should be hidden/blurred.
 */
export const splitContentAndHint = (content: string): ParsedContent => {
  const lines = content.split("\n");
  let inCode = false;
  let hint: string | undefined;
  let hintsForNextStep: string | undefined;
  let solution: string | undefined;
  const bodyLines: string[] = [];

  let captureMode: "none" | "hintsForNextStep" | "solution" = "none";
  const capturedHintsLines: string[] = [];
  const capturedSolutionLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track code fence state
    if (
      trimmed.startsWith("```") &&
      (trimmed === "```" || /^```\w+/.test(trimmed))
    ) {
      inCode = !inCode;

      // If we're capturing, add to capture buffer
      if (captureMode === "hintsForNextStep") {
        capturedHintsLines.push(line);
        continue;
      } else if (captureMode === "solution") {
        capturedSolutionLines.push(line);
        continue;
      } else {
        bodyLines.push(line);
        continue;
      }
    }

    // Look for special sections when not in code
    if (!inCode) {
      // Single-line hint pattern
      const hintMatch = trimmed.match(/^Hint\s*:\s*(.+)$/i);
      if (hintMatch) {
        hint = hintMatch[1];
        continue; // Don't add this line to body
      }

      // Match various hint patterns:
      // - "Hints for Next Step:"
      // - "Hint:"
      // - "Hints:"
      // - "Next Step Hint:"
      // - "Think about:"
      if (
        trimmed.match(/^Hints?\s+for\s+(the\s+)?Next\s+Step\s*:?$/i) ||
        trimmed.match(/^Hints?\s*:$/i) ||
        trimmed.match(/^Next\s+Step\s+Hints?\s*:?$/i) ||
        trimmed.match(/^Think\s+about\s*:?$/i)
      ) {
        // Finalize previous capture before switching
        if (captureMode === "hintsForNextStep" && capturedHintsLines.length > 0) {
          hintsForNextStep = capturedHintsLines.join("\n").trim();
          capturedHintsLines.length = 0;
        } else if (captureMode === "solution" && capturedSolutionLines.length > 0) {
          solution = capturedSolutionLines.join("\n").trim();
          capturedSolutionLines.length = 0;
        }
        captureMode = "hintsForNextStep";
        continue;
      }

      // "Solution:" or "Complete Solution:" section
      if (trimmed.match(/^(Complete\s+)?Solution\s*:?$/i)) {
        // Finalize previous capture before switching
        if (captureMode === "hintsForNextStep" && capturedHintsLines.length > 0) {
          hintsForNextStep = capturedHintsLines.join("\n").trim();
          capturedHintsLines.length = 0;
        } else if (captureMode === "solution" && capturedSolutionLines.length > 0) {
          solution = capturedSolutionLines.join("\n").trim();
          capturedSolutionLines.length = 0;
        }
        captureMode = "solution";
        continue;
      }

      // Check if we hit a new major section (stop capturing)
      // Look for patterns like "Question:", "Approach:", etc. but not numbered lists
      if (
        captureMode !== "none" &&
        trimmed.match(/^[A-Z][a-z]*(\s+[A-Z][a-z]*)*\s*:$/) &&
        !trimmed.match(/^\d+\./)
      ) {
        // New section detected, stop capturing current mode
        if (captureMode === "hintsForNextStep") {
          hintsForNextStep = capturedHintsLines.join("\n").trim();
          capturedHintsLines.length = 0;
        } else if (captureMode === "solution") {
          solution = capturedSolutionLines.join("\n").trim();
          capturedSolutionLines.length = 0;
        }
        captureMode = "none";
        bodyLines.push(line);
        continue;
      }
    }

    // Add lines to appropriate buffer
    if (captureMode === "hintsForNextStep") {
      capturedHintsLines.push(line);
    } else if (captureMode === "solution") {
      capturedSolutionLines.push(line);
    } else {
      bodyLines.push(line);
    }
  }

  // Capture any remaining content
  if (captureMode === "hintsForNextStep" && capturedHintsLines.length > 0) {
    hintsForNextStep = capturedHintsLines.join("\n").trim();
  }
  if (captureMode === "solution" && capturedSolutionLines.length > 0) {
    solution = capturedSolutionLines.join("\n").trim();
  }

  return {
    body: bodyLines.join("\n").trim(),
    hint,
    hintsForNextStep,
    solution,
  };
};
