import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "./.env") });

const app = express();
const PORT = process.env.PORT || 3001;

// Judge0 configuration
const JUDGE0_API_URL =
  process.env.JUDGE0_API_URL || "https://judge0-extra-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug environment variables
console.log("🔧 Environment variables loaded:");
console.log("   SUPABASE_URL:", SUPABASE_URL ? "✅ Loaded" : "❌ Missing");
console.log(
  "   SUPABASE_SERVICE_ROLE_KEY:",
  SUPABASE_SERVICE_ROLE_KEY ? "✅ Loaded" : "❌ Missing",
);
console.log("   JUDGE0_API_KEY:", JUDGE0_API_KEY ? "✅ Loaded" : "❌ Missing");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required Supabase environment variables!");
  console.error("   Please check your .env file in code-executor-api/");
  process.exit(1);
}

// Initialize Supabase client (using service role key for server-side operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Language mapping to Judge0 Extra CE language IDs
const languageMap = {
  python: 10, // Python for ML (3.7.7)
  python3: 31, // Python for ML (3.12.5) - latest
  c: 1, // C (Clang 10.0.1)
  cpp: 2, // C++ (Clang 10.0.1)
  java: 4, // Java (OpenJDK 14.0.1)
  csharp: 21, // C# (.NET Core SDK 3.1.406)
};

// Problems that require smart comparison (order-independent array comparison)
const SMART_COMPARISON_PROBLEMS = new Set([
  "group-anagrams",
  "3sum",
  "combination-sum",
  "generate-parentheses",
  "top-k-frequent-elements",
  // Add more problems that return arrays where order doesn't matter
]);

// Smart comparison function for order-independent arrays
function smartCompare(actual, expected) {
  // First try exact comparison
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    return true;
  }

  // If both are arrays, try order-independent comparison
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      return false;
    }

    // For array of arrays (like group-anagrams), normalize both
    if (actual.length > 0 && Array.isArray(actual[0])) {
      // Sort each inner array and then sort the outer array
      const normalizeArrayOfArrays = (arr) => {
        return arr
          .map((innerArr) => [...innerArr].sort())
          .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      };

      const normalizedActual = normalizeArrayOfArrays(actual);
      const normalizedExpected = normalizeArrayOfArrays(expected);

      const result =
        JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected);
      return result;
    }

    // For simple arrays, just sort both
    const sortedActual = [...actual].sort((a, b) =>
      a > b ? 1 : a < b ? -1 : 0,
    );
    const sortedExpected = [...expected].sort((a, b) =>
      a > b ? 1 : a < b ? -1 : 0,
    );
    return JSON.stringify(sortedActual) === JSON.stringify(sortedExpected);
  }

  // If not arrays, fallback to exact comparison
  return false;
}

// Fetch test cases from Supabase database
async function fetchTestCasesFromDB(problemId) {
  try {
    console.log(`Fetching test cases for problem: ${problemId}`);

    // First, verify the problem exists
    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("id, title, function_signature")
      .eq("id", problemId)
      .single();

    if (problemError || !problem) {
      console.error("Problem not found:", problemError);
      return null;
    }

    console.log(`Found problem: ${problem.title}`);
    console.log(`Function signature: ${problem.function_signature}`);

    // Fetch test cases for this problem (include both legacy and JSON columns)
    const { data: testCases, error: testCasesError } = await supabase
      .from("test_cases")
      .select("input, expected_output, input_json, expected_json, is_example")
      .eq("problem_id", problemId)
      .order("is_example", { ascending: false });

    if (testCasesError) {
      console.error("Error fetching test cases:", testCasesError);
      return null;
    }

    if (!testCases || testCases.length === 0) {
      console.log("No test cases found for problem:", problemId);
      return null;
    }

    console.log(`Found ${testCases.length} test cases`);
    console.log("Raw test cases from DB:", JSON.stringify(testCases, null, 2));

    // Add detailed logging for each test case
    testCases.forEach((tc, index) => {
      console.log(`\n=== RAW TEST CASE ${index} ===`);
      console.log("Raw input string:", JSON.stringify(tc.input));
      console.log(
        "Raw expected_output string:",
        JSON.stringify(tc.expected_output),
      );
      console.log("Type of input:", typeof tc.input);
      console.log("Type of expected_output:", typeof tc.expected_output);
    });

    // Convert database format to our expected format
    const formattedTestCases = testCases.map((tc, index) => {
      console.log(`\n--- Processing test case ${index} ---`);

      let inputParams, expectedOutput;

      // Prefer JSON columns if available
      if (tc.input_json && tc.expected_json) {
        console.log("Using JSON-native columns");
        console.log("JSON input:", JSON.stringify(tc.input_json));
        console.log("JSON expected:", JSON.stringify(tc.expected_json));

        inputParams = tc.input_json;
        expectedOutput = tc.expected_json;
      } else {
        console.log("Using legacy text parsing");
        console.log("Raw input:", JSON.stringify(tc.input));
        console.log("Raw expected_output:", JSON.stringify(tc.expected_output));

        // Parse the input string to extract parameters (legacy method)
        console.log(
          "About to parse input with function signature:",
          problem.function_signature,
        );
        inputParams = parseTestCaseInput(tc.input, problem.function_signature);
        console.log(
          "Parsed input params result:",
          JSON.stringify(inputParams, null, 2),
        );

        // Parse expected output (handle different types)
        try {
          expectedOutput = JSON.parse(tc.expected_output);
        } catch {
          // If JSON parsing fails, treat as string/number
          expectedOutput = tc.expected_output;
        }
      }

      console.log("Final inputParams:", inputParams);
      console.log("Final expectedOutput:", expectedOutput);

      // For class-based problems, extract the clean array from nested structure
      if (expectedOutput && expectedOutput.expected_outputs) {
        expectedOutput = expectedOutput.expected_outputs;
        console.log("Extracted expected_outputs for class-based problem:", expectedOutput);
      }

      return {
        input: inputParams,
        expected: expectedOutput,
        isExample: tc.is_example,
      };
    });

    console.log(
      "Formatted test cases:",
      JSON.stringify(formattedTestCases, null, 2),
    );
    return formattedTestCases;
  } catch (error) {
    console.error("Error in fetchTestCasesFromDB:", error);
    return null;
  }
}

// Parse test case input string based on function signature
function parseTestCaseInput(inputString, functionSignature) {
  console.log("Raw input string:", JSON.stringify(inputString));
  console.log("Function signature:", functionSignature);

  // Extract parameter names from function signature
  const paramMatch = functionSignature.match(/def\s+\w+\s*\(([^)]+)\)/);
  if (!paramMatch) {
    console.warn("Could not parse function signature:", functionSignature);
    return {};
  }

  // Filter out 'self' parameter since we're calling as standalone function
  const params = paramMatch[1]
    .split(",")
    .map((p) => p.split(":")[0].trim())
    .filter((p) => p !== "self");

  console.log("Extracted parameters (filtered):", params);

  const inputParams = {};

  // Parse input string
  const lines = inputString
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);
  console.log("Split lines:", lines);

  // Check if it's Format 1 (with parameter names: "nums = [2,7,11,15]")
  const hasParameterNames = lines.some((line) => line.includes(" = "));
  console.log("Has parameter names:", hasParameterNames);

  if (hasParameterNames) {
    // Handle both formats:
    // Format 1a: "nums = [2,7,11,15]\ntarget = 9" (multi-line)
    // Format 1b: "s = \"anagram\", t = \"nagaram\"" (single line, comma-separated)

    if (
      // Single line with comma-separated assignments. We support arrays/objects by tracking bracket depth.
      lines.length === 1 &&
      lines[0].includes(",")
    ) {
      // Example: "p = [4,7], q = [4,null,7]" or "s = \"anagram\", t = \"nagaram\""
      const line = lines[0];
      console.log("Parsing single line with comma separation:", line);
      console.log("Line length:", line.length);
      console.log(
        "Line characters:",
        [...line].map((c, i) => `${i}:${c}`).join(" "),
      );

      // Split by comma, but be careful with commas inside quoted strings and arrays
      const parts = [];
      let current = "";
      let insideQuotes = false;
      let escapeNext = false;

      let bracketDepth = 0;
      let squareBracketDepth = 0;
      let curlyBracketDepth = 0;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        console.log(
          `Character ${i}: '${char}', bracketDepth: ${bracketDepth}, squareBracketDepth: ${squareBracketDepth}, insideQuotes: ${insideQuotes}`,
        );

        if (escapeNext) {
          current += char;
          escapeNext = false;
        } else if (char === "\\") {
          current += char;
          escapeNext = true;
        } else if (char === '"' && !escapeNext) {
          current += char;
          insideQuotes = !insideQuotes;
          console.log(`  Quote toggled, insideQuotes now: ${insideQuotes}`);
        } else if (char === "[" && !insideQuotes) {
          current += char;
          squareBracketDepth++;
          bracketDepth++;
          console.log(
            `  Opening bracket, depths: square=${squareBracketDepth}, total=${bracketDepth}`,
          );
        } else if (char === "]" && !insideQuotes) {
          current += char;
          // Prevent underflow on unmatched closing bracket
          const hadSquare = squareBracketDepth > 0;
          squareBracketDepth = Math.max(0, squareBracketDepth - 1);
          if (hadSquare) {
            bracketDepth = Math.max(0, bracketDepth - 1);
          } else {
            console.warn(`Unmatched ']' at index ${i}; depths unchanged`);
          }
          console.log(
            `  Closing bracket, depths: square=${squareBracketDepth}, total=${bracketDepth}`,
          );
        } else if (char === "{" && !insideQuotes) {
          current += char;
          curlyBracketDepth++;
          bracketDepth++;
          console.log(
            `  Opening brace, depths: curly=${curlyBracketDepth}, total=${bracketDepth}`,
          );
        } else if (char === "}" && !insideQuotes) {
          current += char;
          // Prevent underflow on unmatched closing brace
          const hadCurly = curlyBracketDepth > 0;
          curlyBracketDepth = Math.max(0, curlyBracketDepth - 1);
          if (hadCurly) {
            bracketDepth = Math.max(0, bracketDepth - 1);
          } else {
            console.warn(`Unmatched '}' at index ${i}; depths unchanged`);
          }
          console.log(
            `  Closing brace, depths: curly=${curlyBracketDepth}, total=${bracketDepth}`,
          );
        } else if (char === "," && !insideQuotes && bracketDepth === 0) {
          console.log(`  SPLIT POINT! Current part: '${current.trim()}'`);
          parts.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      if (current.trim()) {
        console.log(`  Final part: '${current.trim()}'`);
        parts.push(current.trim());
      }

      console.log("Split parts:", parts);

      // Now parse each part as "param = value"
      for (const part of parts) {
        if (part.includes(" = ")) {
          const [paramName, paramValue] = part.split(" = ", 2);
          const cleanParamName = paramName.trim();
          const cleanParamValue = paramValue.trim();

          console.log(`Parsing param: ${cleanParamName} = ${cleanParamValue}`);

          try {
            inputParams[cleanParamName] = JSON.parse(cleanParamValue);
          } catch {
            // Remove quotes if it's a quoted string (handle both escaped and unescaped quotes)
            let cleanValue = cleanParamValue;
            // First try to remove escaped quotes: \"abc\" -> abc
            cleanValue = cleanValue.replace(/^\\"(.*)\\"/,"$1");
            // Then try to remove regular quotes: "abc" -> abc
            cleanValue = cleanValue.replace(/^"(.*)"$/, "$1");
            inputParams[cleanParamName] = cleanValue;
          }
        }
      }
    } else {
      // Multi-line format: "nums = [2,7,11,15]\ntarget = 9"
      for (const line of lines) {
        if (line.includes(" = ")) {
          const [paramName, paramValue] = line.split(" = ", 2);
          const cleanParamName = paramName.trim();

          try {
            inputParams[cleanParamName] = JSON.parse(paramValue);
          } catch {
            // Remove quotes (handle both escaped and unescaped quotes)
            let cleanValue = paramValue;
            // First try to remove escaped quotes: \"abc\" -> abc
            cleanValue = cleanValue.replace(/^\\"(.*)\\\"$/, "$1");
            // Then try to remove regular quotes: "abc" -> abc
            cleanValue = cleanValue.replace(/^"(.*)"$/, "$1");
            inputParams[cleanParamName] = cleanValue;
          }
        }
      }
    }
  } else {
    // Format 2: "[2,7,11,15]\n9" - map values to parameter names
    console.log("Using Format 2 parsing");

    for (let i = 0; i < Math.min(params.length, lines.length); i++) {
      const paramName = params[i];
      const paramValue = lines[i];

      console.log(`Mapping param ${i}: ${paramName} = ${paramValue}`);

      try {
        inputParams[paramName] = JSON.parse(paramValue);
      } catch (e) {
        console.warn(`JSON parse failed for ${paramValue}:`, e.message);
        // If JSON parsing fails, treat as string (remove quotes if present)
        let cleanValue = paramValue;
        // First try to remove escaped quotes: \"abc\" -> abc
        cleanValue = cleanValue.replace(/^\\"(.*)\\\"$/, "$1");
        // Then try to remove regular quotes: "abc" -> abc
        cleanValue = cleanValue.replace(/^"(.*)"$/, "$1");
        inputParams[paramName] = cleanValue;
      }
    }
  }

  // Validate that we have all required parameters
  console.log("Required params:", params);
  console.log("Parsed inputParams:", inputParams);
  const missingParams = params.filter((param) => !(param in inputParams));
  if (missingParams.length > 0) {
    console.error("Missing parameters:", missingParams);
    // Try to handle missing parameters with appropriate defaults
    missingParams.forEach((param) => {
      // Log warning and use null to make the issue more apparent
      console.warn(`Missing parameter '${param}' - using null as default`);
      inputParams[param] = null;
    });
  }

  console.log(`Final parsed input parameters:`, inputParams);
  return inputParams;
}

// Process Python code to add imports and test case execution
function processPythonCode(userCode, testCases, problemId) {
  // Remove commented TreeNode/ListNode definitions if they exist
  // This handles cases where users submit code with commented class definitions
  // We'll remove them and let the logic below add proper definitions if needed
  let processedCode = userCode;
  
  // Remove commented TreeNode definition block
  if (/^#\s*class TreeNode:/m.test(processedCode)) {
    console.log("Removing commented TreeNode class definition");
    // Remove the entire commented TreeNode block (class line + __init__ + attributes)
    processedCode = processedCode.replace(
      /^#\s*Definition for a binary tree node\.\s*\n^#\s*class TreeNode:\s*\n(?:^#\s*.*\n)*/gm,
      ''
    );
  }
  
  // Remove commented ListNode definition block
  if (/^#\s*class ListNode:/m.test(processedCode)) {
    console.log("Removing commented ListNode class definition");
    // Remove the entire commented ListNode block
    processedCode = processedCode.replace(
      /^#\s*Definition for singly-linked list\.\s*\n^#\s*class ListNode:\s*\n(?:^#\s*.*\n)*/gm,
      ''
    );
  }

  // Add typing imports if needed
  const needsTyping = /\b(List|Dict|Set|Tuple|Optional|Union)\b/.test(processedCode);

  if (needsTyping && !processedCode.includes("from typing import")) {
    processedCode = `from typing import List, Dict, Set, Tuple, Optional, Union\n${processedCode}`;
  }

  // Add collections import if needed (for deque, defaultdict, Counter, etc.)
  const needsCollections = /\b(deque|defaultdict|Counter|OrderedDict|namedtuple)\b/.test(processedCode);
  if (needsCollections && !processedCode.includes("from collections import")) {
    processedCode = `from collections import deque, defaultdict, Counter\n${processedCode}`;
  }

  // Add ListNode definition if needed
  console.log("Checking if ListNode definition is needed...");
  console.log("User code contains ListNode:", /\bListNode\b/.test(processedCode));
  console.log(
    "User code already has ListNode class:",
    processedCode.includes("class ListNode"),
  );

  const needsListNode = /\bListNode\b/.test(processedCode);
  if (needsListNode && !processedCode.includes("class ListNode")) {
    console.log("Adding ListNode class definition");
    const listNodeDef = `# Definition for singly-linked list.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

`;
    processedCode = listNodeDef + processedCode;
    console.log("ListNode definition added");
  }

  // Add TreeNode definition if needed (for binary tree problems)
  console.log("Checking if TreeNode definition is needed...");
  const needsTreeNode = /\bTreeNode\b|['\"]TreeNode['\"]/.test(processedCode);
  if (needsTreeNode && !processedCode.includes("class TreeNode")) {
    console.log("Adding TreeNode class definition");
    const treeNodeDef = `# Definition for a binary tree node.\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n`;
    processedCode = treeNodeDef + processedCode;
    console.log("TreeNode definition added");
  }

  // Add helper functions for ListNode operations if needed (check both userCode and signature)
  console.log("Checking if ListNode helper functions are needed...");
  console.log("User code contains ListNode:", /\bListNode\b/.test(userCode));
  console.log(
    "Processed code contains ListNode:",
    /\bListNode\b/.test(processedCode),
  );
  console.log(
    "Processed code already has array_to_listnode:",
    processedCode.includes("def array_to_listnode"),
  );

  const needsListNodeHelpers =
    /\bListNode\b/.test(userCode) || /\bListNode\b/.test(processedCode);
  console.log("Needs ListNode helpers:", needsListNodeHelpers);

  if (
    needsListNodeHelpers &&
    !processedCode.includes("def array_to_listnode")
  ) {
    console.log("Adding ListNode helper functions");
    const helperFunctions = `# Helper functions for ListNode operations
def array_to_listnode(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    current = head
    for val in arr[1:]:
        current.next = ListNode(val)
        current = current.next
    return head

def listnode_to_array(head):
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result

`;
    processedCode = helperFunctions + processedCode;
    console.log("ListNode helper functions added");
  } else {
    console.log(
      "ListNode helper functions not added - either not needed or already present",
    );
  }

  // Check if this is a class-based problem (has class definition with __init__)
  // But exclude problems that are just using a class for organization (like Codec)
  // Class-based problems have test cases with "operations" array
  const hasClassWithInit = userCode.includes('class ') && userCode.includes('def __init__');
  const isClassBasedProblem = hasClassWithInit && testCases.some(tc => tc.input && tc.input.operations);

  // Check if code has methods with 'self' parameter - wrap in Solution class
  // BUT don't wrap if it's a class-based problem (user already defined their own class)
  const hasSelfParam = /def\s+\w+\s*\([^)]*self[^)]*\)/.test(userCode);
  if (hasSelfParam && !userCode.includes("class Solution") && !isClassBasedProblem) {
    console.log("Code has self parameter, wrapping in Solution class");

    // Extract imports, ListNode definition, and helper functions to keep them global
    const lines = processedCode.split("\n");
    const imports = [];
    const listNodeDef = [];
    const treeNodeDef = [];
    const helperFunctions = [];
    const userCodeLines = [];

    let inListNodeDef = false;
    let inTreeNodeDef = false;
    let inHelperFunctions = false;
    let inUserCode = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("from ") || line.startsWith("import ")) {
        imports.push(line);
      } else if (line.includes("# Definition for singly-linked list")) {
        inListNodeDef = true;
        listNodeDef.push(line);
      } else if (line.includes("# Definition for a binary tree node")) {
        inTreeNodeDef = true;
        treeNodeDef.push(line);
      } else if (
        inListNodeDef &&
        (line.startsWith("class ListNode") ||
          line.startsWith("    ") ||
          line.trim() === "")
      ) {
        listNodeDef.push(line);
        if (
          line.trim() === "" &&
          i < lines.length - 1 &&
          !lines[i + 1].startsWith("    ") &&
          lines[i + 1].trim() !== ""
        ) {
          inListNodeDef = false;
        }
      } else if (
        inTreeNodeDef &&
        (line.startsWith("class TreeNode") ||
          line.startsWith("    ") ||
          line.trim() === "")
      ) {
        treeNodeDef.push(line);
        if (
          line.trim() === "" &&
          i < lines.length - 1 &&
          !lines[i + 1].startsWith("    ") &&
          lines[i + 1].trim() !== ""
        ) {
          inTreeNodeDef = false;
        }
      } else if (line.includes("# Helper functions for ListNode operations")) {
        inHelperFunctions = true;
        helperFunctions.push(line);
      } else if (
        inHelperFunctions &&
        (line.startsWith("def ") ||
          line.startsWith("    ") ||
          line.trim() === "")
      ) {
        helperFunctions.push(line);
        if (
          line.trim() === "" &&
          i < lines.length - 1 &&
          !lines[i + 1].startsWith("    ") &&
          lines[i + 1].trim() !== "" &&
          !lines[i + 1].startsWith("def ")
        ) {
          inHelperFunctions = false;
        }
      } else if (line.trim() !== "") {
        inUserCode = true;
        userCodeLines.push(line);
      } else if (inUserCode) {
        userCodeLines.push(line);
      }
    }

    console.log("Extracted sections:");
    console.log("- Imports:", imports.length);
    console.log("- ListNode definition:", listNodeDef.length);
    console.log("- Helper functions:", helperFunctions.length);
    console.log("- User code:", userCodeLines.length);

    // Indent only the user code for the Solution class
    const indentedUserCode = userCodeLines
      .map((line) => {
        if (line.trim() === "") return line;
        return "    " + line;
      })
      .join("\n");

    // Reconstruct the code with proper structure
    const sections = [];
    if (imports.length > 0) sections.push(imports.join("\n"));
    if (listNodeDef.length > 0) sections.push(listNodeDef.join("\n"));
    if (treeNodeDef.length > 0) sections.push(treeNodeDef.join("\n"));
    if (helperFunctions.length > 0) sections.push(helperFunctions.join("\n"));

    processedCode =
      sections.join("\n\n") + "\n\nclass Solution:\n" + indentedUserCode;

    console.log("Restructured code with Solution class");
  }

  // Determine function name
  let functionName;

  if (isClassBasedProblem) {
    console.log("Detected class-based problem");
    // For class-based problems, we'll handle them specially in the execution code
    functionName = 'class_based';
  } else {
    // Extract function name from the code (exclude __init__ and other dunder methods)
    // Look for all function definitions and filter out __init__, __str__, etc.
    const allFunctionMatches = [...userCode.matchAll(/def\s+(\w+)\s*\(/g)];
    const validFunctions = allFunctionMatches
      .map(match => match[1])
      .filter(name => !name.startsWith('__')); // Exclude dunder methods
    
    if (validFunctions.length === 0) {
      throw new Error("No function definition found in Python code");
    }
    
    // Use the first non-dunder function found
    functionName = validFunctions[0];
    console.log(`Detected function: ${functionName}`);
  }

  // Analyze function signature to determine input format (including return type)
  // Use a balanced-parentheses scanner to handle complex nested type annotations
  const signature = extractFunctionSignature(userCode, functionName);
  
  // Helper function to extract function signature with balanced parentheses
  function extractFunctionSignature(code, funcName) {
    // Find the start of the function definition
    const defPattern = new RegExp(`def\\s+${funcName}\\s*\\(`, 'g');
    const match = defPattern.exec(code);
    
    if (!match) {
      console.warn(`Could not find function definition for ${funcName}`);
      return "";
    }
    
    const startIndex = match.index;
    let i = match.index + match[0].length; // Start after 'def funcName('
    
    // Count nested parentheses, brackets, and braces
    let parenDepth = 1; // We're already inside the opening (
    let bracketDepth = 0;
    let braceDepth = 0;
    let inString = false;
    let stringChar = null;
    let escaped = false;
    
    // Scan until we find the matching closing parenthesis
    while (i < code.length && parenDepth > 0) {
      const char = code[i];
      
      if (escaped) {
        escaped = false;
        i++;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        i++;
        continue;
      }
      
      // Handle strings
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = null;
      }
      
      // Only count brackets when not in a string
      if (!inString) {
        if (char === '(') parenDepth++;
        else if (char === ')') parenDepth--;
        else if (char === '[') bracketDepth++;
        else if (char === ']') bracketDepth--;
        else if (char === '{') braceDepth++;
        else if (char === '}') braceDepth--;
      }
      
      i++;
    }
    
    // Now we're at the closing ), look for optional return type annotation
    let endIndex = i;
    
    // Skip whitespace
    while (i < code.length && /\s/.test(code[i])) {
      i++;
    }
    
    // Check for return type annotation (->)
    if (i + 1 < code.length && code[i] === '-' && code[i + 1] === '>') {
      i += 2; // Skip ->
      
      // Skip whitespace
      while (i < code.length && /\s/.test(code[i])) {
        i++;
      }
      
      // Scan the return type until we hit ':'
      let returnTypeDepth = 0;
      inString = false;
      stringChar = null;
      escaped = false;
      
      while (i < code.length && (code[i] !== ':' || returnTypeDepth > 0 || inString)) {
        const char = code[i];
        
        if (escaped) {
          escaped = false;
          i++;
          continue;
        }
        
        if (char === '\\') {
          escaped = true;
          i++;
          continue;
        }
        
        if ((char === '"' || char === "'") && !inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar && inString) {
          inString = false;
          stringChar = null;
        }
        
        if (!inString) {
          if (char === '[' || char === '(' || char === '{') returnTypeDepth++;
          else if (char === ']' || char === ')' || char === '}') returnTypeDepth--;
        }
        
        i++;
      }
      
      endIndex = i;
    }
    
    // Find the colon
    while (endIndex < code.length && code[endIndex] !== ':') {
      endIndex++;
    }
    
    if (endIndex < code.length && code[endIndex] === ':') {
      endIndex++; // Include the colon
    }
    
    const extractedSignature = code.substring(startIndex, endIndex);
    console.log(`Extracted signature for ${funcName}:`, extractedSignature);
    return extractedSignature;
  }

  // Special-case detection: encode/decode and serialize/deserialize pair problems
  const isEncodeDecode = problemId === "encode-and-decode-strings";
  const isSerializeDeserialize = problemId === "serialize-and-deserialize-binary-tree" ||
    (userCode.includes('serialize') && userCode.includes('deserialize'));
  if (isEncodeDecode) {
    console.log(
      "🔎 Detected encode/decode pair — will validate decode(encode(strs))",
    );
  }
  if (isSerializeDeserialize) {
    console.log(
      "🔎 Detected serialize/deserialize pair — will validate deserialize(serialize(root))",
    );
  }

  // Generate test execution code with dynamic test cases
  const testExecutionCode = generateTestExecutionCode(
    functionName,
    signature,
    testCases,
    {
      encodeDecode: isEncodeDecode,
      serializeDeserialize: isSerializeDeserialize,
      problemId: problemId,
      isClassBasedProblem: isClassBasedProblem
    },
  );

  // Combine user code with test execution
  const finalCode = `${processedCode}

${testExecutionCode}`;

  console.log("Generated complete Python code:", finalCode);
  return finalCode;
}

// Generate test execution code with dynamic test cases
function generateTestExecutionCode(functionName, signature, testCases, options = {}) {
  const { encodeDecode = false, serializeDeserialize = false, problemId = '', isClassBasedProblem = false } = options;
  // Convert test cases to Python format
  const pythonTestCases = testCases.map((tc) => {
    console.log(
      "Test case expected output (raw):",
      tc.expected,
      "type:",
      typeof tc.expected,
    );

    // For class-based problems, extract the clean array from nested structure
    let expectedOutput = tc.expected;
    if (isClassBasedProblem && tc.expected && tc.expected.expected_outputs) {
      expectedOutput = tc.expected.expected_outputs;
      console.log("Extracted expected_outputs for class-based problem:", expectedOutput);
    }

    // Normalize class-based problem input: ensure we have "values" key
    let normalizedInput = { ...tc.input };
    if (isClassBasedProblem) {
      // If we only have operations but no values/args, we need to parse the operations array
      // Some test cases have operations and arguments mixed: ["Class", "method", "arg", "method", "arg"]
      if (normalizedInput.operations && !normalizedInput.values && !normalizedInput.args) {
        console.log("Parsing mixed operations/values array");
        const ops = normalizedInput.operations;
        const parsedOps = [];
        const parsedValues = [];
        
        // First element is always the constructor
        parsedOps.push(ops[0]);
        parsedValues.push([]);
        
        // Parse remaining elements - alternate between method and argument
        for (let i = 1; i < ops.length; i += 2) {
          if (i < ops.length) {
            parsedOps.push(ops[i]); // method name
            // Next element is the argument (if it exists)
            if (i + 1 < ops.length) {
              parsedValues.push([ops[i + 1]]);
            } else {
              parsedValues.push([]);
            }
          }
        }
        
        console.log("Parsed operations:", parsedOps);
        console.log("Parsed values:", parsedValues);
        
        normalizedInput.operations = parsedOps;
        normalizedInput.values = parsedValues;
      }
      
      // If we have "args" but not "values", copy args to values
      if (normalizedInput.args && !normalizedInput.values) {
        normalizedInput.values = normalizedInput.args;
      }
      // If we have "values" but not "args", copy values to args (for backwards compatibility)
      if (normalizedInput.values && !normalizedInput.args) {
        normalizedInput.args = normalizedInput.values;
      }
    }

    return {
      ...normalizedInput,
      expected: expectedOutput, // Keep as-is - don't convert to string!
    };
  });

  // Convert JavaScript booleans/null to Python equivalents in JSON string
  let testCasesJson = JSON.stringify(pythonTestCases, null, 2);
  testCasesJson = testCasesJson
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\bnull\b/g, "None");

  // Extract parameter names from signature and filter out 'self'
  const paramMatch = signature.match(/def\s+\w+\s*\(([^)]+)\)/);
  const params = paramMatch
    ? paramMatch[1]
      .split(",")
      .map((p) => p.split(":")[0].trim())
      .filter((p) => p !== "self")
    : [];

  // Generate function call based on parameters - handle both standalone and method calls
  let functionCall;

  // Check if original signature has 'self' parameter
  const originalSignature = signature;
  const hasSelfParam = originalSignature.includes("self");

  // Check if this is a ListNode/TreeNode/Node problem and if the return type is a node
  console.log("Function signature for ListNode/TreeNode/Node detection:", signature);
  const isListNodeProblem = /\bListNode\b/.test(signature);
  const isTreeNodeProblem = /\bTreeNode\b|['\"]TreeNode['\"]/.test(signature);
  const isGraphProblem = /\bNode\b|['\"]Node['\"]/.test(signature) && !isListNodeProblem && !isTreeNodeProblem;
  const returnsListNode = /->\s*[^\n#]*ListNode/.test(signature);
  const returnsTreeNode = /->\s*[^\n#]*TreeNode/.test(signature);
  const returnsNode = /->\s*[^\n#]*['\"]?Node['\"]?/.test(signature) && !returnsListNode && !returnsTreeNode;

  // Check if function returns None (in-place modification)
  const returnsNone = /->\s*None\s*:/.test(signature);

  // Check if this is a Linked List Cycle problem
  const isLinkedListCycleProblem = problemId === 'linked-list-cycle' || functionName === 'hasCycle';
  console.log("Is ListNode problem:", isListNodeProblem);
  console.log("Is TreeNode problem:", isTreeNodeProblem);
  console.log("Is Graph problem:", isGraphProblem);
  console.log("Is Linked List Cycle problem:", isLinkedListCycleProblem);
  console.log("Returns ListNode:", returnsListNode);
  console.log("Returns TreeNode:", returnsTreeNode);
  console.log("Returns Node (graph):", returnsNode);
  console.log("Returns None (in-place):", returnsNone);
  console.log("Function has self param:", hasSelfParam);
  console.log("Function parameters:", params);

  if (hasSelfParam || isClassBasedProblem) {
    // If function was defined with 'self' or it's a class-based problem, we need to create a class instance and call it as a method
    const className = "Solution";
    if (isClassBasedProblem) {
      // For class-based problems, we need to execute the operations sequence
      functionCall = `execute_class_operations(tc["operations"], tc["values"])`;
      console.log("Generated class-based operations call:", functionCall);
    } else if (encodeDecode) {
      // Expect first param to be the list of strings (e.g., 'strs')
      const arg = params[0] ? `tc["${params[0]}"]` : "tc.get('strs')";
      functionCall = `${className}().decode(${className}().encode(${arg}))`;
      console.log("Generated encode/decode pipeline call:", functionCall);
    } else if (serializeDeserialize) {
      // For serialize/deserialize problems, convert array to tree, serialize, deserialize, convert back
      // Always use 'root' as the parameter name for these problems
      functionCall = `treenode_to_array(${className}().Codec().deserialize(${className}().Codec().serialize(array_to_treenode(tc["root"]))))`;
      console.log("Generated serialize/deserialize pipeline call:", functionCall);
    } else if (isListNodeProblem) {
      console.log("Generating ListNode function call for method");
      
      // Special handling for merge-k-sorted-lists where input is list of lists
      const isMergeKLists = functionName.toLowerCase().includes('mergeklists') || 
                            functionName.toLowerCase().includes('merge_k_lists');
      
      if (isMergeKLists && params.length === 1) {
        // For mergeKLists: lists is a list of arrays, each needs to be converted to ListNode
        const param = params[0]; // Usually 'lists'
        functionCall = `listnode_to_array(${className}().${functionName}([array_to_listnode(arr) for arr in tc["${param}"]]))`;
        console.log("Generated merge-k-lists function call:", functionCall);
      } else {
        // Convert arrays to ListNodes for function call
        let paramList;
        if (isLinkedListCycleProblem) {
          // For cycle problems, use the cycle-aware helper
          paramList = params
            .map((p) => `array_to_listnode_with_cycle(tc["head"], tc.get("pos", -1))`)
            .join(", ");
        } else {
          // Only convert parameters that are likely to be lists (contain 'head', 'list', 'l1', 'l2', etc.)
          paramList = params
            .map((p) => {
              // Check if parameter name suggests it's a ListNode
              // Match: head, list, list1, list2, l1, l2, l3, etc.
              if (/^(head|list\d*|l\d+)$/i.test(p)) {
                return `array_to_listnode(tc["${p}"])`;
              } else {
                // For other parameters (like n, k, val), pass them directly
                return `tc["${p}"]`;
              }
            })
            .join(", ");
        }

        // Handle in-place modification for ListNode problems
        if (returnsNone && params.length === 1) {
          // For in-place modification, call function and return the modified list
          const param = params[0];
          const listVar = `list_${param}`;
          functionCall = `(lambda: (setattr(__import__('types').SimpleNamespace(), '${listVar}', array_to_listnode(tc["${param}"])), ${className}().${functionName}(getattr(__import__('types').SimpleNamespace(), '${listVar}')), listnode_to_array(getattr(__import__('types').SimpleNamespace(), '${listVar}')))[2])()`;
          // Simpler approach using a helper
          functionCall = `(lambda ${listVar}: (${className}().${functionName}(${listVar}), listnode_to_array(${listVar}))[1])(array_to_listnode(tc["${param}"]))`;
        } else {
          const call = `${className}().${functionName}(${paramList})`;
          functionCall = returnsListNode ? `listnode_to_array(${call})` : call;
        }
        console.log("Generated function call:", functionCall);
      }
    } else if (isTreeNodeProblem) {
      console.log("Generating TreeNode function call for method");
      
      // Special handling for LCA problems where p and q are node values, not arrays
      const isLCAProblem = functionName.toLowerCase().includes('lowestcommonancestor') || 
                           functionName.toLowerCase().includes('lca');
      
      if (isLCAProblem && params.length === 3) {
        // For LCA: root is array, p and q are node values
        // Build tree once and reuse it to find p and q nodes
        // Return just the node's value, not the entire subtree
        const rootParam = params[0]; // Usually 'root'
        const pParam = params[1];    // Usually 'p'
        const qParam = params[2];    // Usually 'q'
        
        functionCall = `(lambda tree: ${className}().${functionName}(tree, find_node(tree, tc["${pParam}"]), find_node(tree, tc["${qParam}"])).val)(array_to_treenode(tc["${rootParam}"]))`;
      } else {
        // Standard TreeNode problem - check which params should be converted
        const paramList = params
          .map((p) => {
            // Only convert parameters that are likely to be tree structures
            // Parameters like 'root', 'tree' should be converted
            // Parameters like 'preorder', 'inorder', 'postorder', 'val', 'key' should NOT
            if (/^(root|tree)$/i.test(p)) {
              return `array_to_treenode(tc["${p}"])`;
            } else {
              // For other parameters (like preorder, inorder, val), pass directly
              return `tc["${p}"]`;
            }
          })
          .join(", ");
        const call = `${className}().${functionName}(${paramList})`;
        functionCall = returnsTreeNode ? `treenode_to_array(${call})` : call;
      }
      console.log("Generated function call:", functionCall);
    } else if (isGraphProblem) {
      console.log("Generating Graph function call for method");
      // For graph problems like clone-graph, convert adjList to Node and back
      // The parameter name might be 'node' but test case has 'adjList'
      const paramList = params.map((p) => {
        // Check if test case has adjList instead of node
        return `adjlist_to_node(tc.get("adjList", tc.get("${p}")))`;
      }).join(", ");
      const call = `${className}().${functionName}(${paramList})`;
      functionCall = returnsNode ? `node_to_adjlist(${call})` : call;
      console.log("Generated function call:", functionCall);
    } else if (returnsNone && params.length === 1) {
      // For in-place modification, call function and return the modified parameter
      const param = params[0];
      functionCall = `(lambda: (${className}().${functionName}(tc["${param}"]), tc["${param}"])[1])()`;
    } else if (params.length === 1) {
      functionCall = `${className}().${functionName}(tc["${params[0]}"])`;
    } else if (params.length === 2) {
      functionCall = `${className}().${functionName}(tc["${params[0]}"], tc["${params[1]}"])`;
    } else {
      const paramList = params.map((p) => `tc["${p}"]`).join(", ");
      functionCall = `${className}().${functionName}(${paramList})`;
    }
  } else {
    // Standalone function call
    if (encodeDecode) {
      const arg = params[0] ? `tc["${params[0]}"]` : "tc.get('strs')";
      functionCall = `decode(encode(${arg}))`;
      console.log("Generated encode/decode pipeline call (standalone):", functionCall);
    } else if (isListNodeProblem) {
      // Convert arrays to ListNodes for function call
      let paramList;
      if (isLinkedListCycleProblem) {
        // For cycle problems, use the cycle-aware helper
        paramList = params
          .map((p) => `array_to_listnode_with_cycle(tc["head"], tc.get("pos", -1))`)
          .join(", ");
      } else {
        paramList = params
          .map((p) => `array_to_listnode(tc["${p}"])`)
          .join(", ");
      }
      const call = `${functionName}(${paramList})`;
      functionCall = returnsListNode ? `listnode_to_array(${call})` : call;
    } else if (isTreeNodeProblem) {
      const paramList = params
        .map((p) => `array_to_treenode(tc["${p}"])`)
        .join(", ");
      const call = `${functionName}(${paramList})`;
      functionCall = returnsTreeNode ? `treenode_to_array(${call})` : call;
    } else if (returnsNone && params.length === 1) {
      // For in-place modification, call function and return the modified parameter
      const param = params[0];
      functionCall = `(lambda: (${functionName}(tc["${param}"]), tc["${param}"])[1])()`;
    } else if (params.length === 1) {
      functionCall = `${functionName}(tc["${params[0]}"])`;
    } else if (params.length === 2) {
      functionCall = `${functionName}(tc["${params[0]}"], tc["${params[1]}"])`;
    } else {
      const paramList = params.map((p) => `tc["${p}"]`).join(", ");
      functionCall = `${functionName}(${paramList})`;
    }
  }

  return `
import sys
import json

# Read test case index from stdin
test_case_index = int(sys.stdin.read().strip())

# Dynamic test cases from database/API
test_cases = ${testCasesJson}

# Helpers for common DSA structures (ListNode, TreeNode)
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def array_to_listnode(arr):
    if arr is None:
        return None
    dummy = ListNode(0)
    cur = dummy
    for x in arr:
        cur.next = ListNode(x)
        cur = cur.next
    return dummy.next

def array_to_listnode_with_cycle(arr, pos):
    if arr is None or len(arr) == 0:
        return None
    
    # Create the linked list
    dummy = ListNode(0)
    cur = dummy
    nodes = []
    for x in arr:
        cur.next = ListNode(x)
        cur = cur.next
        nodes.append(cur)
    
    # Create cycle if pos is valid
    if 0 <= pos < len(nodes):
        nodes[-1].next = nodes[pos]
    
    return dummy.next

def listnode_to_array(head):
    res = []
    cur = head
    while cur is not None:
        res.append(cur.val)
        cur = cur.next
    return res

# Binary Tree helpers (level-order array <-> TreeNode)
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def array_to_treenode(arr):
    if arr is None or len(arr) == 0:
        return None
    nodes = [None if (x is None) else TreeNode(x) for x in arr]
    kids = nodes[::-1]
    root = kids.pop()
    for node in nodes:
        if node is not None:
            if kids:
                node.left = kids.pop()
            if kids:
                node.right = kids.pop()
    return root

def treenode_to_array(root):
    if root is None:
        return []
    res = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node is None:
            res.append(None)
        else:
            res.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
    while res and res[-1] is None:
        res.pop()
    return res

def find_node(root, val):
    """Find and return the node with the given value in the tree"""
    if root is None:
        return None
    if root.val == val:
        return root
    # Search in left subtree
    left_result = find_node(root.left, val)
    if left_result is not None:
        return left_result
    # Search in right subtree
    return find_node(root.right, val)

# Graph helpers (for clone-graph problem)
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def adjlist_to_node(adjList):
    """Convert adjacency list to graph Node"""
    if not adjList:
        return None
    
    # Create all nodes first
    nodes = {}
    for i in range(len(adjList)):
        nodes[i + 1] = Node(i + 1)
    
    # Add neighbors
    for i, neighbors in enumerate(adjList):
        node = nodes[i + 1]
        for neighbor_val in neighbors:
            node.neighbors.append(nodes[neighbor_val])
    
    return nodes.get(1)  # Return first node

def node_to_adjlist(node):
    """Convert graph Node to adjacency list"""
    if not node:
        return []
    
    # BFS to collect all nodes in order by their val
    visited = set()
    queue = [node]
    visited.add(node)
    nodes_by_val = {node.val: node}
    
    while queue:
        curr = queue.pop(0)
        for neighbor in curr.neighbors:
            if neighbor not in visited:
                visited.add(neighbor)
                nodes_by_val[neighbor.val] = neighbor
                queue.append(neighbor)
    
    # Build adjacency list in order of node values
    max_val = max(nodes_by_val.keys())
    adjList = []
    for i in range(1, max_val + 1):
        if i in nodes_by_val:
            n = nodes_by_val[i]
            neighbors = sorted([neighbor.val for neighbor in n.neighbors])
            adjList.append(neighbors)
    
    return adjList

def execute_class_operations(operations, values):
    """Execute class-based operations for problems like MedianFinder, WordDictionary, etc."""
    obj = None
    results = []
    
    for i, (op, val) in enumerate(zip(operations, values)):
        if i == 0:
            # First operation is always the constructor
            class_name = op
            # Try to get the class from global namespace first, then Solution namespace
            try:
                cls = globals()[class_name]
            except KeyError:
                cls = getattr(Solution, class_name)
            obj = cls()
            results.append(None)
        else:
            # Call the method with the provided arguments
            method = getattr(obj, op)
            if val:
                # If there are arguments, unpack them
                result = method(*val) if isinstance(val, list) else method(val)
            else:
                # No arguments
                result = method()
            results.append(result)
    
    return results

if 0 <= test_case_index < len(test_cases):
    tc = test_cases[test_case_index]
    result = ${functionCall}
    # Auto-convert ListNode outputs
    try:
        if isinstance(result, ListNode) or (hasattr(result, 'val') and hasattr(result, 'next')):
            out = listnode_to_array(result)
        else:
            out = result
        print(json.dumps(out))
    except Exception:
        try:
            print(json.dumps(result))
        except Exception:
            print("null")
else:
    print("Invalid test case index")`;
}

// Middleware
app.use(helmet());
const corsOptions = {
  origin: [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
    "https://preview--leetcoach-ai-guide.lovable.app",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "simplyalgo-code-executor",
  });
});

// Main code execution endpoint
app.post("/execute", async (req, res) => {
  try {
    let { language, code, problemId } = req.body;

    // Check if this problem requires smart comparison
    const requiresSmartComparison =
      problemId && SMART_COMPARISON_PROBLEMS.has(problemId);
    console.log(
      `🎯 Problem: ${problemId}, Requires smart comparison: ${requiresSmartComparison}`,
    );
    let { testCases } = req.body;

    // Validate request
    if (!language || !code) {
      return res.status(400).json({
        error: "Missing required fields: language, code",
      });
    }

    // If problemId is provided but no testCases, fetch from database
    if (problemId && !testCases) {
      console.log(`Fetching test cases for problem ID: ${problemId}`);
      testCases = await fetchTestCasesFromDB(problemId);
      if (!testCases || testCases.length === 0) {
        return res.status(400).json({
          error: `No test cases found for problem ID: ${problemId}`,
        });
      }
    }

    // Validate we have test cases
    if (!testCases || testCases.length === 0) {
      return res.status(400).json({
        error: "Missing test cases - provide either testCases or problemId",
      });
    }

    console.log(
      `Executing ${language} code with ${testCases.length} test cases`,
    );

    const languageId = languageMap[language.toLowerCase()];
    if (!languageId) {
      return res.status(400).json({
        error: `Language ${language} not supported. Supported languages: ${Object.keys(languageMap).join(", ")}`,
      });
    }

    console.log(`Received language: ${language}`);

    // Auto-process Python code for DSA-style execution
    if (
      language.toLowerCase() === "python" ||
      language.toLowerCase() === "python3"
    ) {
      code = processPythonCode(code, testCases, problemId);
    }

    // Prepare batched submissions for all test cases
    // Using batched submissions is efficient: 1 batch request counts as 1 API call
    // instead of N individual submissions (saves API quota)
    const submissions = testCases.map((testCase, index) => {
      // For Python functions, send test case index
      // For other languages, use the original input format
      let stdin;
      if (
        language.toLowerCase() === "python" ||
        language.toLowerCase() === "python3"
      ) {
        stdin = String(index); // Send test case index
      } else {
        stdin = Array.isArray(testCase.input)
          ? testCase.input.join("\n") // Join array elements with newlines
          : String(testCase.input); // Convert to string if not array
      }

      return {
        language_id: languageId,
        source_code: Buffer.from(code).toString("base64"),
        stdin: Buffer.from(stdin).toString("base64"),
        expected_output: testCase.expected
          ? Buffer.from(String(testCase.expected)).toString("base64")
          : undefined,
      };
    });

    console.log(`Submitting batch of ${submissions.length} test cases`);

    // Submit batch to Judge0
    const headers = {
      "Content-Type": "application/json",
    };

    // Add RapidAPI headers if using subscription service
    if (JUDGE0_API_KEY) {
      headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
      headers["X-RapidAPI-Host"] = "judge0-extra-ce.p.rapidapi.com";
    }

    console.log("Submitting to Judge0 with headers:", headers);

    const response = await fetch(
      `${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ submissions }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Judge0 API error: ${response.status} ${response.statusText}`,
      );
    }

    const batchResult = await response.json();
    const tokens = batchResult.map((item) => item.token);

    console.log(
      `Batch submitted, waiting for results for tokens: ${tokens.join(", ")}`,
    );

    // Wait for processing - adjust timeout based on batch size and complexity
    const waitTime = Math.max(1000, testCases.length * 500); // 500ms per test case, min 1s
    console.log(`Waiting ${waitTime}ms for batch processing...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    // Get batch results
    const resultResponse = await fetch(
      `${JUDGE0_API_URL}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true`,
      {
        method: "GET",
        headers,
      },
    );

    if (!resultResponse.ok) {
      throw new Error(
        `Judge0 batch result error: ${resultResponse.status} ${resultResponse.statusText}`,
      );
    }

    const batchResults = await resultResponse.json();

    // Process results
    const results = batchResults.submissions.map((result, index) => {
      const testCase = testCases[index];

      // Decode base64 outputs
      const stdout = result.stdout
        ? Buffer.from(result.stdout, "base64").toString().trim()
        : "";
      const stderr = result.stderr
        ? Buffer.from(result.stderr, "base64").toString().trim()
        : "";
      const statusDesc =
        result.status && result.status.description
          ? String(result.status.description)
          : "";

      // Parse actual output as JSON if possible
      let actualOutput;
      try {
        actualOutput = JSON.parse(stdout);
      } catch {
        actualOutput = stdout;
      }

      // Friendly error hints when there is no output or timeouts
      let friendlyError = null;
      if (!stdout && !stderr) {
        friendlyError =
          "No output produced. Common causes: returning None, printing instead of returning, or an infinite loop (e.g., not advancing pointers).";
      }
      if (/time limit exceeded|timeout/i.test(statusDesc)) {
        friendlyError =
          "Execution timed out. For pointer-based problems, ensure pointers advance each iteration (e.g., ptr1 = ptr1.next or ptr2 = ptr2.next).";
      }

      // Compare actual vs expected with conditional smart comparison
      const passed = requiresSmartComparison
        ? smartCompare(actualOutput, testCase.expected)
        : JSON.stringify(actualOutput) === JSON.stringify(testCase.expected);

      // Format input display for better readability
      const inputDisplay = Object.entries(testCase.input)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join("\n");

      // Format expected and actual outputs as compact JSON
      let formattedExpected = testCase.expected;
      let formattedActual = actualOutput;

      // Convert expected to compact format if it's an array/object
      if (
        Array.isArray(formattedExpected) ||
        (typeof formattedExpected === "object" && formattedExpected !== null)
      ) {
        formattedExpected = JSON.stringify(formattedExpected);
      } else if (typeof formattedExpected === "string") {
        try {
          const parsed = JSON.parse(formattedExpected);
          formattedExpected = JSON.stringify(parsed);
        } catch (e) {
          // Keep as string if can't parse
        }
      }

      // Convert actual to compact format if it's an array/object
      if (
        Array.isArray(formattedActual) ||
        (typeof formattedActual === "object" && formattedActual !== null)
      ) {
        formattedActual = JSON.stringify(formattedActual);
      }

      return {
        input: inputDisplay,
        expected: formattedExpected,
        actual: formattedActual || (friendlyError ? "" : formattedActual),
        passed,
        status: result.status.description,
        time: result.time,
        memory: result.memory,
        stderr: friendlyError || stderr || null,
      };
    });

    console.log(`Code execution completed with ${results.length} results`);
    res.json({ results });
  } catch (error) {
    console.error("Code execution error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      results: [],
    });
  }
});

// Judge0 system info endpoint
app.get("/judge0-info", async (req, res) => {
  try {
    // Check if Judge0 is available
    const headers = {};

    // Add RapidAPI headers if using subscription service
    if (JUDGE0_API_KEY) {
      headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
      headers["X-RapidAPI-Host"] = "judge0-extra-ce.p.rapidapi.com";
    }

    const response = await fetch(`${JUDGE0_API_URL}/system_info`, { headers });

    if (response.ok) {
      const systemInfo = await response.json();
      res.json({
        judge0Available: true,
        ready: true,
        executor: "judge0",
        systemInfo,
        supportedLanguages: Object.keys(languageMap),
        usingSubscription: !!JUDGE0_API_KEY,
      });
    } else {
      throw new Error(`Judge0 not responding: ${response.status}`);
    }
  } catch (error) {
    res.json({
      judge0Available: false,
      ready: false,
      executor: "judge0",
      error: error.message,
      supportedLanguages: Object.keys(languageMap),
      usingSubscription: !!JUDGE0_API_KEY,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 simplyalgo Code Executor API (Judge0) running on port ${PORT}`,
  );
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚖️  Judge0 info: http://localhost:${PORT}/judge0-info`);
  console.log(`⚡ Execute endpoint: POST http://localhost:${PORT}/execute`);
  console.log(`🔗 Judge0 API URL: ${JUDGE0_API_URL}`);
  console.log(`🌐 Supported languages: ${Object.keys(languageMap).join(", ")}`);
});
