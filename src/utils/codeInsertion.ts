import { CodeSnippet } from '@/types';

export interface CodeContext {
  imports: string[];
  functions: string[];
  classes: string[];
  currentScope: string;
  indentationLevel: number;
  lastLineType: 'import' | 'function' | 'class' | 'statement' | 'empty';
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
  const lines = code.split('\n');
  const imports: string[] = [];
  const functions: string[] = [];
  const classes: string[] = [];
  
  // Detect indentation style from first indented line
  let indentationChar = ' ';
  let indentationSize = 4;
  
  for (const line of lines) {
    if (line.startsWith('  ') || line.startsWith('\t')) {
      indentationChar = line.startsWith('\t') ? '\t' : ' ';
      if (indentationChar === ' ') {
        // Count leading spaces
        const leadingSpaces = line.match(/^ */)?.[0].length || 0;
        if (leadingSpaces > 0) {
          indentationSize = leadingSpaces;
        }
      }
      break;
    }
  }
  
  let currentScope = 'global';
  let indentationLevel = 0;
  let lastLineType: CodeContext['lastLineType'] = 'empty';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      imports.push(trimmed);
      lastLineType = 'import';
    } else if (trimmed.startsWith('def ')) {
      const funcName = trimmed.match(/def\s+(\w+)/)?.[1];
      if (funcName) functions.push(funcName);
      lastLineType = 'function';
      currentScope = funcName || 'function';
    } else if (trimmed.startsWith('class ')) {
      const className = trimmed.match(/class\s+(\w+)/)?.[1];
      if (className) classes.push(className);
      lastLineType = 'class';
      currentScope = className || 'class';
    } else if (trimmed === '') {
      lastLineType = 'empty';
    } else {
      lastLineType = 'statement';
    }
    
    // Calculate current indentation level
    const leadingSpaces = line.match(/^ */)?.[0].length || 0;
    if (indentationChar === ' ') {
      indentationLevel = Math.floor(leadingSpaces / indentationSize);
    } else {
      indentationLevel = line.match(/^\t*/)?.[0].length || 0;
    }
  }
  
  return {
    imports,
    functions,
    classes,
    currentScope,
    indentationLevel,
    lastLineType,
    indentationChar,
    indentationSize
  };
}

export function analyzeSnippetType(code: string): CodeSnippet['insertionHint']['type'] {
  const trimmed = code.trim();
  
  if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
    return 'import';
  } else if (trimmed.startsWith('def ')) {
    return 'function';
  } else if (trimmed.startsWith('class ')) {
    return 'class';
  } else if (trimmed.includes('=') && !trimmed.includes('==') && !trimmed.includes('!=')) {
    return 'variable';
  } else {
    return 'statement';
  }
}

export function findOptimalInsertionPoint(
  code: string, 
  snippet: CodeSnippet, 
  cursorPosition?: { line: number; column: number }
): InsertionPoint {
  const lines = code.split('\n');
  const context = analyzeCodeContext(code);
  const snippetType = snippet.insertionHint?.type || analyzeSnippetType(snippet.code);
  
  let insertionLine = 0;
  let needsNewlineBefore = false;
  let needsNewlineAfter = false;
  let indentationLevel = 0;
  
  switch (snippetType) {
    case 'import':
      // Insert after last import, or at the beginning if no imports
      insertionLine = findLastImportLine(lines);
      needsNewlineAfter = true;
      break;
      
    case 'function':
    case 'class':
      // Insert at global level, with proper spacing
      insertionLine = findNextGlobalInsertionPoint(lines);
      needsNewlineBefore = true;
      needsNewlineAfter = true;
      break;
      
    case 'variable':
    case 'statement':
      // Insert in current function scope or at cursor
      if (cursorPosition && isInsideFunctionScope(lines, cursorPosition.line)) {
        insertionLine = cursorPosition.line;
        indentationLevel = getFunctionIndentationLevel(lines, cursorPosition.line);
      } else {
        insertionLine = findCurrentFunctionInsertionPoint(lines, cursorPosition);
        indentationLevel = 1; // Assume inside function
      }
      break;
  }
  
  const indentation = context.indentationChar.repeat(
    indentationLevel * (context.indentationChar === ' ' ? context.indentationSize : 1)
  );
  
  return {
    line: insertionLine,
    column: 0,
    indentation,
    needsNewlineBefore,
    needsNewlineAfter
  };
}

function findLastImportLine(lines: string[]): number {
  let lastImportLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || line.startsWith('from ')) {
      lastImportLine = i;
    } else if (line && !line.startsWith('#')) {
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
    if (line.startsWith('def ') || line.startsWith('class ')) {
      // Insert before existing functions/classes
      insertionPoint = i;
      break;
    }
  }
  
  return insertionPoint;
}

function findCurrentFunctionInsertionPoint(
  lines: string[], 
  cursorPosition?: { line: number; column: number }
): number {
  if (!cursorPosition) {
    // Find the first function and insert at the beginning
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('def ')) {
        return i + 1; // Insert after function definition
      }
    }
    return lines.length;
  }
  
  return cursorPosition.line;
}

function isInsideFunctionScope(lines: string[], lineNumber: number): boolean {
  // Check if the given line is inside a function
  for (let i = lineNumber; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('def ')) {
      return true;
    }
    if (line.startsWith('class ') || (line && !line.startsWith(' ') && !line.startsWith('\t'))) {
      // Hit class or global level code
      break;
    }
  }
  return false;
}

function getFunctionIndentationLevel(lines: string[], lineNumber: number): number {
  // Find the indentation level inside the current function
  for (let i = lineNumber; i >= 0; i--) {
    const line = lines[i];
    if (line.trim().startsWith('def ')) {
      // Look at the next non-empty line to determine function body indentation
      for (let j = i + 1; j < lines.length; j++) {
        const bodyLine = lines[j];
        if (bodyLine.trim()) {
          const leadingSpaces = bodyLine.match(/^ */)?.[0].length || 0;
          return Math.floor(leadingSpaces / 4); // Assuming 4-space indentation
        }
      }
      return 1; // Default to one level inside function
    }
  }
  return 0;
}

export function insertCodeSnippet(
  currentCode: string,
  snippet: CodeSnippet,
  cursorPosition?: { line: number; column: number }
): { newCode: string; newCursorPosition: { line: number; column: number } } {
  const insertionPoint = findOptimalInsertionPoint(currentCode, snippet, cursorPosition);
  const lines = currentCode.split('\n');
  
  // Prepare the snippet with proper indentation
  const snippetLines = snippet.code.split('\n');
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
  if (insertionPoint.needsNewlineBefore && 
      insertionPoint.line > 0 && 
      newLines[insertionPoint.line - 1].trim() !== '') {
    indentedSnippet.unshift('');
  }
  
  if (insertionPoint.needsNewlineAfter) {
    indentedSnippet.push('');
  }
  
  // Insert the snippet
  newLines.splice(insertionPoint.line, 0, ...indentedSnippet);
  
  const newCode = newLines.join('\n');
  const newCursorLine = insertionPoint.line + indentedSnippet.length - 1;
  const newCursorColumn = indentedSnippet[indentedSnippet.length - 1].length;
  
  return {
    newCode,
    newCursorPosition: {
      line: newCursorLine,
      column: newCursorColumn
    }
  };
}