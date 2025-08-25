import { CodeSnippet } from "@/types";

interface SmartInsertionResult {
  newCode: string;
  insertedAtLine: number;
  newCursorPosition: { line: number; column: number };
  action: 'replace' | 'insert' | 'modify';
}

/**
 * Smart code insertion that can replace, modify, or insert code intelligently
 */
export function smartInsertCode(
  currentCode: string,
  codeToAdd: string,
  targetLine?: number
): SmartInsertionResult {
  console.log("🧠 Smart code insertion:", { codeToAdd, targetLine });
  
  const lines = currentCode.split('\n');
  const codeLines = codeToAdd.split('\n').map(line => line.trim()).filter(Boolean);
  
  if (!codeLines.length) {
    return {
      newCode: currentCode,
      insertedAtLine: 0,
      newCursorPosition: { line: 1, column: 1 },
      action: 'insert'
    };
  }

  // Find function body start (after function signature)
  let functionBodyStart = 1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('def ') && lines[i].includes(':')) {
      functionBodyStart = i + 1;
      break;
    }
  }

  // Analyze what needs to be done
  const existingBodyLines = lines.slice(functionBodyStart).filter(line => line.trim() && !line.trim().startsWith('#'));
  
  if (existingBodyLines.length === 0) {
    // Empty function body - simple insertion
    return insertAtLine(lines, codeLines, functionBodyStart);
  }

  // Check if we need to replace existing implementation
  const hasIncorrectImplementation = existingBodyLines.some(line => {
    const trimmed = line.trim();
    return trimmed.includes('append(bin(') || 
           trimmed.includes('res.append(') ||
           trimmed.includes('result.append(') ||
           trimmed.includes('return res') ||
           trimmed.includes('return result');
  });

  if (hasIncorrectImplementation) {
    // Replace the entire function body
    return replaceImplementation(lines, codeLines, functionBodyStart);
  }

  // Check if we need to add missing parts
  const needsResultArray = !existingBodyLines.some(line => 
    line.includes('= []') || line.includes('= [0]')
  );
  
  const needsLoop = !existingBodyLines.some(line => 
    line.includes('for ') || line.includes('while ')
  );

  const needsReturn = !existingBodyLines.some(line => 
    line.trim().startsWith('return ')
  );

  if (needsResultArray || needsLoop || needsReturn) {
    // Add missing parts incrementally
    return addMissingParts(lines, codeLines, functionBodyStart, {
      needsResultArray,
      needsLoop, 
      needsReturn
    });
  }

  // Default: insert at target line or end of function
  const insertLine = targetLine || functionBodyStart;
  return insertAtLine(lines, codeLines, insertLine);
}

function insertAtLine(lines: string[], codeLines: string[], insertLine: number): SmartInsertionResult {
  const indentation = '    '; // 4 spaces for Python
  const indentedCode = codeLines.map(line => indentation + line);
  
  const newLines = [...lines];
  newLines.splice(insertLine, 0, ...indentedCode);
  
  return {
    newCode: newLines.join('\n'),
    insertedAtLine: insertLine,
    newCursorPosition: { 
      line: insertLine + indentedCode.length, 
      column: indentedCode[indentedCode.length - 1].length 
    },
    action: 'insert'
  };
}

function replaceImplementation(lines: string[], codeLines: string[], functionBodyStart: number): SmartInsertionResult {
  const indentation = '    ';
  const indentedCode = codeLines.map(line => indentation + line);
  
  // Find the end of the function (next function or end of file)
  let functionEnd = lines.length;
  for (let i = functionBodyStart; i < lines.length; i++) {
    if (lines[i].trim().startsWith('def ') || 
        lines[i].trim().startsWith('class ') ||
        (lines[i].trim() && !lines[i].startsWith(' ') && !lines[i].startsWith('\t'))) {
      functionEnd = i;
      break;
    }
  }

  // Remove existing function body and replace with new code
  const newLines = [
    ...lines.slice(0, functionBodyStart),
    ...indentedCode,
    ...lines.slice(functionEnd)
  ];

  return {
    newCode: newLines.join('\n'),
    insertedAtLine: functionBodyStart,
    newCursorPosition: { 
      line: functionBodyStart + indentedCode.length, 
      column: indentedCode[indentedCode.length - 1].length 
    },
    action: 'replace'
  };
}

function addMissingParts(
  lines: string[], 
  codeLines: string[], 
  functionBodyStart: number,
  needs: { needsResultArray: boolean; needsLoop: boolean; needsReturn: boolean }
): SmartInsertionResult {
  const indentation = '    ';
  let insertLine = functionBodyStart;
  
  // Find where to insert based on what's missing
  for (let i = functionBodyStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    
    if (needs.needsResultArray && (line.includes('= []') || line.includes('= [0]'))) {
      needs.needsResultArray = false;
    }
    
    if (needs.needsLoop && (line.includes('for ') || line.includes('while '))) {
      needs.needsLoop = false;
    }
    
    if (line.startsWith('return ')) {
      insertLine = i;
      break;
    }
    
    insertLine = i + 1;
  }

  const indentedCode = codeLines.map(line => indentation + line);
  const newLines = [...lines];
  newLines.splice(insertLine, 0, ...indentedCode);

  return {
    newCode: newLines.join('\n'),
    insertedAtLine: insertLine,
    newCursorPosition: { 
      line: insertLine + indentedCode.length, 
      column: indentedCode[indentedCode.length - 1].length 
    },
    action: 'modify'
  };
}
