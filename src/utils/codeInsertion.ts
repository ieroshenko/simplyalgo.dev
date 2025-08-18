import { CodeSnippet } from "@/types";

export interface CodeContext {
  imports: string[];
  functions: string[];
  classes: string[];
  currentScope: string;
  indentationLevel: number;
  lastLineType: "import" | "function" | "class" | "statement" | "empty";
  indentationChar: string; // ' ' or '\t'
  indentationSize: number; // 2, 4, etc.
}

export interface InsertionPoint {
  line: number;
  column: number;
  indentation: string;
  needsNewlineBefore: boolean;
  needsNewlineAfter: boolean;
}

export function analyzeCodeContext(code: string): CodeContext {
  const lines = code.split("\n");
  const imports: string[] = [];
  const functions: string[] = [];
  const classes: string[] = [];

  // Detect indentation style from first indented line
  let indentationChar = " ";
  let indentationSize = 4;

  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    // Look for a line followed by an indented line (e.g., function/class definition)
    if (
      currentLine.trim().endsWith(":") &&
      (nextLine.startsWith("  ") || nextLine.startsWith("\t"))
    ) {
      indentationChar = nextLine.startsWith("\t") ? "\t" : " ";
      if (indentationChar === " ") {
        const leadingSpaces = nextLine.match(/^ */)?.[0].length || 0;
        // For the first level of indentation after a colon
        indentationSize = leadingSpaces;
      }
      break;
    }
  }

  let currentScope = "global";
  let indentationLevel = 0;
  let lastLineType: CodeContext["lastLineType"] = "empty";
  let lastNonEmptyIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const currentIndent = line.match(/^ */)?.[0].length || 0;

    // Reset scope when returning to global level
    if (currentIndent === 0 && trimmed !== "") {
      currentScope = "global";
    }

    if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
      imports.push(trimmed);
      lastLineType = "import";
    } else if (trimmed.startsWith("def ")) {
      const funcName = trimmed.match(/def\s+(\w+)/)?.[1];
      if (funcName) functions.push(funcName);
      lastLineType = "function";
      currentScope = funcName || "function";
    } else if (trimmed.startsWith("class ")) {
      const className = trimmed.match(/class\s+(\w+)/)?.[1];
      if (className) classes.push(className);
      lastLineType = "class";
      currentScope = className || "class";
    } else if (trimmed === "") {
      lastLineType = "empty";
    } else {
      lastLineType = "statement";
    }

    // Track last non-empty line's indentation
    if (trimmed !== "") {
      lastNonEmptyIndent = currentIndent;
    }
  }

  // Calculate final indentation level
  if (indentationChar === " " && indentationSize > 0) {
    indentationLevel = Math.floor(lastNonEmptyIndent / indentationSize);
  } else {
    const lastNonEmptyLine =
      [...lines].reverse().find((l) => l.trim() !== "") || "";
    indentationLevel = lastNonEmptyLine.match(/^\t*/)?.[0].length || 0;
  }

  return {
    imports,
    functions,
    classes,
    currentScope,
    indentationLevel,
    lastLineType,
    indentationChar,
    indentationSize,
  };
}

export function analyzeSnippetType(
  code: string,
): CodeSnippet["insertionHint"]["type"] {
  const trimmed = code.trim();

  if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
    return "import";
  } else if (trimmed.startsWith("def ")) {
    return "function";
  } else if (trimmed.startsWith("class ")) {
    return "class";
  } else if (
    trimmed.includes("=") &&
    !trimmed.includes("==") &&
    !trimmed.includes("!=") &&
    !trimmed.includes("<=") &&
    !trimmed.includes(">=")
  ) {
    return "variable";
  } else {
    return "statement";
  }
}

export function findOptimalInsertionPoint(
  code: string,
  snippet: CodeSnippet,
  cursorPosition?: { line: number; column: number },
): InsertionPoint {
  const lines = code.split("\n");
  const context = analyzeCodeContext(code);
  const snippetType =
    snippet.insertionHint?.type || analyzeSnippetType(snippet.code);

  let insertionLine = 0;
  let needsNewlineBefore = false;
  let needsNewlineAfter = false;
  let indentationLevel = 0;

  switch (snippetType) {
    case "import":
      // Insert after last import, or at the beginning if no imports
      insertionLine = findLastImportLine(lines);
      needsNewlineAfter = true;
      break;

    case "function":
    case "class":
      // Insert at global level, with proper spacing
      insertionLine = findNextGlobalInsertionPoint(lines);
      needsNewlineBefore = true;
      needsNewlineAfter = true;
      break;

    case "variable":
    case "statement":
      // Insert in current function scope or at cursor
      if (cursorPosition && isInsideFunctionScope(lines, cursorPosition.line)) {
        insertionLine = cursorPosition.line;
        indentationLevel = getFunctionIndentationLevel(
          lines,
          cursorPosition.line,
        );
      } else {
        insertionLine = findCurrentFunctionInsertionPoint(
          lines,
          cursorPosition,
        );
        indentationLevel = 1; // Assume inside function
      }
      break;
  }

  const indentation = context.indentationChar.repeat(
    indentationLevel *
      (context.indentationChar === " " ? context.indentationSize : 1),
  );

  return {
    line: insertionLine,
    column: 0,
    indentation,
    needsNewlineBefore,
    needsNewlineAfter,
  };
}

function findLastImportLine(lines: string[]): number {
  let lastImportLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("import ") || line.startsWith("from ")) {
      lastImportLine = i;
    } else if (line && !line.startsWith("#")) {
      // Stop at first non-import, non-comment line
      break;
    }
  }

  return lastImportLine + 1;
}

function findNextGlobalInsertionPoint(lines: string[]): number {
  // Find a good place to insert a function or class at global level
  let insertionPoint = lines.length;

  // Look for the end of imports and find next good spot
  const lastImportLine = findLastImportLine(lines);

  for (let i = Math.max(lastImportLine, 0); i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("def ") || line.startsWith("class ")) {
      // Insert before existing functions/classes
      insertionPoint = i;
      break;
    }
  }

  return insertionPoint;
}

function findCurrentFunctionInsertionPoint(
  lines: string[],
  cursorPosition?: { line: number; column: number },
): number {
  if (!cursorPosition) {
    // Find the first function and insert at the beginning of function body
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("def ")) {
        // Look for the first indented line after the function definition (function body)
        for (let j = i + 1; j < lines.length; j++) {
          const line = lines[j];
          if (line.trim() === "") continue; // Skip empty lines

          // Check if this line is indented (part of function body)
          const defIndentation = lines[i].match(/^ */)?.[0].length || 0;
          const lineIndentation = line.match(/^ */)?.[0].length || 0;

          if (lineIndentation > defIndentation) {
            // This is the first line of the function body, insert here
            return j;
          }
        }
        return i + 1; // If no function body found, insert right after def
      }
    }
    return lines.length;
  }

  // If cursor is provided, find the appropriate insertion point within the current function
  const currentLine = cursorPosition.line;

  // Find the function that contains the cursor by looking backwards
  let functionStartLine = -1;
  let functionIndentation = 0;

  for (let i = currentLine; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("def ")) {
      functionStartLine = i;
      functionIndentation = lines[i].match(/^ */)?.[0].length || 0;
      break;
    }
    // Stop if we hit another function or class at same or lower indentation level
    if (
      (line.startsWith("def ") || line.startsWith("class ")) &&
      i !== currentLine
    ) {
      const lineIndentation = lines[i].match(/^ */)?.[0].length || 0;
      if (lineIndentation <= functionIndentation) {
        break;
      }
    }
  }

  if (functionStartLine === -1) {
    // Not inside a function, insert at cursor position
    return currentLine;
  }

  // Check if cursor is actually inside the function body
  const cursorLineIndentation =
    lines[currentLine].match(/^ */)?.[0].length || 0;
  if (cursorLineIndentation <= functionIndentation) {
    // Cursor is not inside function body, insert at cursor position
    return currentLine;
  }

  // Insert at cursor position if we're inside the function
  return currentLine;
}

function isInsideFunctionScope(lines: string[], lineNumber: number): boolean {
  // Check if the given line is inside a function
  let functionStartLine = -1;
  let functionIndentation = 0;

  // Look backwards to find the containing function
  for (let i = lineNumber; i >= 0; i--) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("def ")) {
      functionStartLine = i;
      functionIndentation = line.match(/^ */)?.[0].length || 0;
      break;
    }

    // Stop if we hit a class or global level code at same or lower indentation
    if (trimmed.startsWith("class ")) {
      const lineIndentation = line.match(/^ */)?.[0].length || 0;
      if (lineIndentation <= functionIndentation) {
        break;
      }
    }
  }

  if (functionStartLine === -1) {
    return false; // No function found
  }

  // Check if current line is actually inside the function body
  if (lineNumber < lines.length) {
    const currentLineIndentation =
      lines[lineNumber].match(/^ */)?.[0].length || 0;
    return currentLineIndentation > functionIndentation;
  }

  return true;
}

function getFunctionIndentationLevel(
  lines: string[],
  lineNumber: number,
): number {
  // Find the function that contains this line
  let functionStartLine = -1;
  let functionIndentation = 0;

  for (let i = lineNumber; i >= 0; i--) {
    const line = lines[i];
    if (line.trim().startsWith("def ")) {
      functionStartLine = i;
      functionIndentation = line.match(/^ */)?.[0].length || 0;
      break;
    }
  }

  if (functionStartLine === -1) {
    // Not inside a function, return current line indentation level
    if (lineNumber < lines.length) {
      const currentLine = lines[lineNumber];
      const indentation = currentLine.match(/^ */)?.[0].length || 0;
      return Math.floor(indentation / 4);
    }
    return 0;
  }

  // Look for existing function body to match indentation
  for (let j = functionStartLine + 1; j < lines.length; j++) {
    const bodyLine = lines[j];
    const lineContent = bodyLine.trim();

    if (lineContent === "") continue; // Skip empty lines

    const bodyIndentation = bodyLine.match(/^ */)?.[0].length || 0;

    // If this line is less indented than or equal to function def, we've left the function
    if (bodyIndentation <= functionIndentation) {
      break;
    }

    // This is a function body line, return its indentation level
    return Math.floor(bodyIndentation / 4);
  }

  // No existing function body found, use standard indentation (1 level more than def line)
  const standardBodyIndentation = functionIndentation + 4;
  return Math.floor(standardBodyIndentation / 4);
}

export function insertCodeSnippet(
  currentCode: string,
  snippet: CodeSnippet,
  cursorPosition?: { line: number; column: number },
): { newCode: string; newCursorPosition: { line: number; column: number } } {
  console.log("🔍 Starting code insertion:", {
    currentCodeLines: currentCode.split("\n").length,
    snippetType: snippet.insertionHint?.type,
    cursorPosition,
  });

  const insertionPoint = findOptimalInsertionPoint(
    currentCode,
    snippet,
    cursorPosition,
  );
  console.log("📍 Found insertion point:", insertionPoint);

  const lines = currentCode.split("\n");

  // Prepare the snippet with proper indentation
  const snippetLines = snippet.code.split("\n");
  const indentedSnippet = snippetLines.map((line, index) => {
    if (index === 0) {
      return insertionPoint.indentation + line.trim();
    } else {
      // Preserve relative indentation for multi-line snippets
      return insertionPoint.indentation + line;
    }
  });

  // Build the new code
  const newLines = [...lines];

  // Add newlines if needed
  if (
    insertionPoint.needsNewlineBefore &&
    insertionPoint.line > 0 &&
    newLines[insertionPoint.line - 1].trim() !== ""
  ) {
    indentedSnippet.unshift("");
  }

  if (insertionPoint.needsNewlineAfter) {
    indentedSnippet.push("");
  }

  // Insert the snippet
  newLines.splice(insertionPoint.line, 0, ...indentedSnippet);

  const newCode = newLines.join("\n");
  const newCursorLine = insertionPoint.line + indentedSnippet.length - 1;
  const newCursorColumn = indentedSnippet[indentedSnippet.length - 1].length;

  console.log("✅ Code insertion complete:", {
    originalLines: lines.length,
    newLines: newLines.length,
    insertedAt: insertionPoint.line,
    newCursorLine,
    newCursorColumn,
  });

  return {
    newCode,
    newCursorPosition: {
      line: newCursorLine,
      column: newCursorColumn,
    },
  };
}
