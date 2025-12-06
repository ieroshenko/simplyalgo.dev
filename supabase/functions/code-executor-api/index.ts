// @ts-expect-error - Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-expect-error - Deno URL import
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// New Strategy Pattern Architecture (feature-flagged)
import { StrategyRegistry } from "./strategies/registry.ts";
import { ExecutorRegistry } from "./executors/registry.ts";

// Ambient declaration for Deno types
declare const Deno: { env: { get(name: string): string | undefined } };

// Feature flag for new architecture
const USE_STRATEGY_PATTERN = Deno.env.get("USE_STRATEGY_PATTERN") === "true";

// Initialize registries if feature flag is enabled
const strategyRegistry = USE_STRATEGY_PATTERN ? new StrategyRegistry() : null;
const executorRegistry = USE_STRATEGY_PATTERN ? new ExecutorRegistry() : null;

if (USE_STRATEGY_PATTERN) {
  console.log("[CODE-EXECUTOR] 🚀 Using new Strategy Pattern architecture");
  console.log("[CODE-EXECUTOR] Registered strategies:", strategyRegistry?.getAllStrategyTypes());
  console.log("[CODE-EXECUTOR] Supported languages:", executorRegistry?.getSupportedLanguages());
} else {
  console.log("[CODE-EXECUTOR] Using legacy monolithic architecture");
}

// Judge0 configuration
const JUDGE0_API_URL =
  Deno.env.get("JUDGE0_API_URL") || "https://judge0-extra-ce.p.rapidapi.com";
const JUDGE0_API_KEY = Deno.env.get("JUDGE0_API_KEY");

// Supabase configuration
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required Supabase environment variables");
}

// Initialize Supabase client (using service role key for server-side operations)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Language mapping to Judge0 Extra CE language IDs
const languageMap: Record<string, number> = {
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
function smartCompare(actual: any, expected: any): boolean {
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
      const normalizeArrayOfArrays = (arr: any[]) => {
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
async function fetchTestCasesFromDB(problemId: string) {
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

    // Convert database format to our expected format
    const formattedTestCases = testCases.map((tc) => {
      let inputParams: any, expectedOutput: any;

      // Prefer JSON columns if available
      if (tc.input_json && tc.expected_json) {
        inputParams = tc.input_json;
        expectedOutput = tc.expected_json;
      } else {
        // Parse the input string to extract parameters (legacy method)
        inputParams = parseTestCaseInput(tc.input, problem.function_signature);

        // Parse expected output (handle different types)
        try {
          expectedOutput = JSON.parse(tc.expected_output);
        } catch {
          // If JSON parsing fails, treat as string/number
          expectedOutput = tc.expected_output;
        }
      }

      // For class-based problems, extract the clean array from nested structure
      if (expectedOutput && expectedOutput.expected_outputs) {
        expectedOutput = expectedOutput.expected_outputs;
      }

      return {
        input: inputParams,
        expected: expectedOutput,
        isExample: tc.is_example,
        functionSignature: problem.function_signature, // Add function signature for main function detection
      };
    });

    return formattedTestCases;
  } catch (error) {
    console.error("Error in fetchTestCasesFromDB:", error);
    return null;
  }
}

// Parse test case input string based on function signature
function parseTestCaseInput(inputString: string, functionSignature: string) {
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

  const inputParams: Record<string, any> = {};

  // Parse input string
  const lines = inputString
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  // Check if it's Format 1 (with parameter names: "nums = [2,7,11,15]")
  const hasParameterNames = lines.some((line) => line.includes(" = "));

  if (hasParameterNames) {
    // Handle both formats:
    // Format 1a: "nums = [2,7,11,15]\ntarget = 9" (multi-line)
    // Format 1b: "s = \"anagram\", t = \"nagaram\"" (single line, comma-separated)

    if (lines.length === 1 && lines[0].includes(",")) {
      // Single line with comma-separated assignments
      const line = lines[0];

      // Split by comma, but be careful with commas inside quoted strings and arrays
      const parts: string[] = [];
      let current = "";
      let insideQuotes = false;
      let escapeNext = false;

      let bracketDepth = 0;
      let squareBracketDepth = 0;
      let curlyBracketDepth = 0;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (escapeNext) {
          current += char;
          escapeNext = false;
        } else if (char === "\\") {
          current += char;
          escapeNext = true;
        } else if (char === '"' && !escapeNext) {
          current += char;
          insideQuotes = !insideQuotes;
        } else if (char === "[" && !insideQuotes) {
          current += char;
          squareBracketDepth++;
          bracketDepth++;
        } else if (char === "]" && !insideQuotes) {
          current += char;
          const hadSquare = squareBracketDepth > 0;
          squareBracketDepth = Math.max(0, squareBracketDepth - 1);
          if (hadSquare) {
            bracketDepth = Math.max(0, bracketDepth - 1);
          }
        } else if (char === "{" && !insideQuotes) {
          current += char;
          curlyBracketDepth++;
          bracketDepth++;
        } else if (char === "}" && !insideQuotes) {
          current += char;
          const hadCurly = curlyBracketDepth > 0;
          curlyBracketDepth = Math.max(0, curlyBracketDepth - 1);
          if (hadCurly) {
            bracketDepth = Math.max(0, bracketDepth - 1);
          }
        } else if (char === "," && !insideQuotes && bracketDepth === 0) {
          parts.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      if (current.trim()) {
        parts.push(current.trim());
      }

      // Now parse each part as "param = value"
      for (const part of parts) {
        if (part.includes(" = ")) {
          const [paramName, paramValue] = part.split(" = ", 2);
          const cleanParamName = paramName.trim();
          const cleanParamValue = paramValue.trim();

          try {
            inputParams[cleanParamName] = JSON.parse(cleanParamValue);
          } catch {
            // Remove quotes if it's a quoted string
            let cleanValue = cleanParamValue;
            cleanValue = cleanValue.replace(/^\\"(.*)\\\"$/, "$1");
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
            // Remove quotes
            let cleanValue = paramValue;
            cleanValue = cleanValue.replace(/^\\"(.*)\\\"$/, "$1");
            cleanValue = cleanValue.replace(/^"(.*)"$/, "$1");
            inputParams[cleanParamName] = cleanValue;
          }
        }
      }
    }
  } else {
    // Format 2: "[2,7,11,15]\n9" - map values to parameter names
    for (let i = 0; i < Math.min(params.length, lines.length); i++) {
      const paramName = params[i];
      const paramValue = lines[i];

      try {
        inputParams[paramName] = JSON.parse(paramValue);
      } catch (e) {
        // If JSON parsing fails, treat as string (remove quotes if present)
        let cleanValue = paramValue;
        cleanValue = cleanValue.replace(/^\\"(.*)\\\"$/, "$1");
        cleanValue = cleanValue.replace(/^"(.*)"$/, "$1");
        inputParams[paramName] = cleanValue;
      }
    }
  }

  // Validate that we have all required parameters
  const missingParams = params.filter((param) => !(param in inputParams));
  if (missingParams.length > 0) {
    missingParams.forEach((param) => {
      console.warn(`Missing parameter '${param}' - using null as default`);
      inputParams[param] = null;
    });
  }

  return inputParams;
}

// Process Python code to add imports and test case execution
function processPythonCode(
  userCode: string,
  testCases: any[],
  problemId: string,
): string {
  let processedCode = userCode;

  // Remove commented TreeNode/ListNode definitions if they exist
  if (/^#\s*class TreeNode:/m.test(processedCode)) {
    processedCode = processedCode.replace(
      /^#\s*Definition for a binary tree node\.\s*\n^#\s*class TreeNode:\s*\n(?:^#\s*.*\n)*/gm,
      "",
    );
  }

  if (/^#\s*class ListNode:/m.test(processedCode)) {
    processedCode = processedCode.replace(
      /^#\s*Definition for singly-linked list\.\s*\n^#\s*class ListNode:\s*\n(?:^#\s*.*\n)*/gm,
      "",
    );
  }

  // Add typing imports if needed
  const needsTyping = /\b(List|Dict|Set|Tuple|Optional|Union)\b/.test(
    processedCode,
  );

  if (needsTyping && !processedCode.includes("from typing import")) {
    processedCode = `from typing import List, Dict, Set, Tuple, Optional, Union\n${processedCode}`;
  }

  // Add collections import if needed
  const needsCollections = /\b(deque|defaultdict|Counter|OrderedDict|namedtuple)\b/.test(
    processedCode,
  );
  if (needsCollections && !processedCode.includes("from collections import")) {
    processedCode = `from collections import deque, defaultdict, Counter\n${processedCode}`;
  }

  // Add ListNode definition if needed
  const needsListNode = /\bListNode\b/.test(processedCode);
  if (needsListNode && !processedCode.includes("class ListNode")) {
    const listNodeDef = `# Definition for singly-linked list.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

`;
    processedCode = listNodeDef + processedCode;
  }

  // Add TreeNode definition if needed
  const needsTreeNode = /\bTreeNode\b|['\"]TreeNode['\"]/.test(processedCode);
  if (needsTreeNode && !processedCode.includes("class TreeNode")) {
    const treeNodeDef = `# Definition for a binary tree node.\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n`;
    processedCode = treeNodeDef + processedCode;
  }

  // Add helper functions for ListNode operations if needed
  const needsListNodeHelpers =
    /\bListNode\b/.test(userCode) || /\bListNode\b/.test(processedCode);

  if (
    needsListNodeHelpers &&
    !processedCode.includes("def array_to_listnode")
  ) {
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
  }

  // Check if this is a class-based problem
  const hasClassWithInit =
    userCode.includes("class ") && userCode.includes("def __init__");
  const isClassBasedProblem =
    hasClassWithInit && testCases.some((tc) => tc.input && tc.input.operations);

  // Check if code has methods with 'self' parameter - wrap in Solution class
  const hasSelfParam = /def\s+\w+\s*\([^)]*self[^)]*\)/.test(userCode);
  if (hasSelfParam && !userCode.includes("class Solution") && !isClassBasedProblem) {
    const lines = processedCode.split("\n");
    const imports: string[] = [];
    const listNodeDef: string[] = [];
    const treeNodeDef: string[] = [];
    const helperFunctions: string[] = [];
    const userCodeLines: string[] = [];

    let inListNodeDef = false;
    let inTreeNodeDef = false;
    let inHelperFunctions = false;

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
          !lines[i + 1].startsWith("def ")
        ) {
          inHelperFunctions = false;
        }
      } else if (line.trim() !== "") {
        userCodeLines.push(line);
      } else if (userCodeLines.length > 0) {
        userCodeLines.push(line);
      }
    }

    // Indent only the user code for the Solution class
    const indentedUserCode = userCodeLines
      .map((line) => {
        if (line.trim() === "") return line;
        return "    " + line;
      })
      .join("\n");

    // Reconstruct the code with proper structure
    const sections: string[] = [];
    if (imports.length > 0) sections.push(imports.join("\n"));
    if (listNodeDef.length > 0) sections.push(listNodeDef.join("\n"));
    if (treeNodeDef.length > 0) sections.push(treeNodeDef.join("\n"));
    if (helperFunctions.length > 0) sections.push(helperFunctions.join("\n"));

    processedCode =
      sections.join("\n\n") + "\n\nclass Solution:\n" + indentedUserCode;
  }

  // Determine function name
  let functionName: string;

  if (isClassBasedProblem) {
    functionName = "class_based";
  } else {
    // Extract all function names from user code
    const allFunctionMatches = [...userCode.matchAll(/def\s+(\w+)\s*\(/g)];
    const validFunctions = allFunctionMatches
      .map((match) => match[1])
      .filter((name) => !name.startsWith("__"));

    if (validFunctions.length === 0) {
      throw new Error("No function definition found in Python code");
    }

    // Try to determine the main function from the problem's function signature
    // This helps distinguish between main functions and helper functions
    let mainFunctionName: string | null = null;

    // Check if we have a function signature from the problem (passed via testCases metadata or problemId lookup)
    // The function signature should be in the format: "def functionName(params): ..."
    if (testCases.length > 0 && testCases[0].functionSignature) {
      const sigMatch = testCases[0].functionSignature.match(/def\s+(\w+)\s*\(/);
      if (sigMatch) {
        mainFunctionName = sigMatch[1];
      }
    }

    // If we found a main function name from the signature, use it if it exists in the user's code
    if (mainFunctionName && validFunctions.includes(mainFunctionName)) {
      functionName = mainFunctionName;
      console.log(`Using main function from signature: ${functionName}`);
    } else {
      // Fallback: Use the first function (legacy behavior)
      functionName = validFunctions[0];
      if (validFunctions.length > 1) {
        console.warn(`Multiple functions found: ${validFunctions.join(", ")}. Using first function: ${functionName}. Consider adding function signature to problem definition.`);
      }
    }
  }

  // Extract function signature
  const signature = extractFunctionSignature(userCode, functionName);

  // Special-case detection
  const isEncodeDecode = problemId === "encode-and-decode-strings";
  const isSerializeDeserialize =
    problemId === "serialize-and-deserialize-binary-tree" ||
    (userCode.includes("serialize") && userCode.includes("deserialize"));

  // Generate test execution code
  const testExecutionCode = generateTestExecutionCode(
    functionName,
    signature,
    testCases,
    {
      encodeDecode: isEncodeDecode,
      serializeDeserialize: isSerializeDeserialize,
      problemId: problemId,
      isClassBasedProblem: isClassBasedProblem,
    },
  );

  // Combine user code with test execution
  const finalCode = `${processedCode}

${testExecutionCode}`;

  return finalCode;
}

// Helper function to extract function signature with balanced parentheses
function extractFunctionSignature(code: string, funcName: string): string {
  const defPattern = new RegExp(`def\\s+${funcName}\\s*\\(`, "g");
  const match = defPattern.exec(code);

  if (!match) {
    console.warn(`Could not find function definition for ${funcName}`);
    return "";
  }

  const startIndex = match.index;
  let i = match.index + match[0].length;

  let parenDepth = 1;
  let bracketDepth = 0;
  let braceDepth = 0;
  let inString = false;
  let stringChar: string | null = null;
  let escaped = false;

  while (i < code.length && parenDepth > 0) {
    const char = code[i];

    if (escaped) {
      escaped = false;
      i++;
      continue;
    }

    if (char === "\\") {
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
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;
      else if (char === "[") bracketDepth++;
      else if (char === "]") bracketDepth--;
      else if (char === "{") braceDepth++;
      else if (char === "}") braceDepth--;
    }

    i++;
  }

  let endIndex = i;

  while (i < code.length && /\s/.test(code[i])) {
    i++;
  }

  if (i + 1 < code.length && code[i] === "-" && code[i + 1] === ">") {
    i += 2;

    while (i < code.length && /\s/.test(code[i])) {
      i++;
    }

    let returnTypeDepth = 0;
    inString = false;
    stringChar = null;
    escaped = false;

    while (
      i < code.length &&
      (code[i] !== ":" || returnTypeDepth > 0 || inString)
    ) {
      const char = code[i];

      if (escaped) {
        escaped = false;
        i++;
        continue;
      }

      if (char === "\\") {
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
        if (char === "[" || char === "(" || char === "{") returnTypeDepth++;
        else if (char === "]" || char === ")" || char === "}") returnTypeDepth--;
      }

      i++;
    }

    endIndex = i;
  }

  while (endIndex < code.length && code[endIndex] !== ":") {
    endIndex++;
  }

  if (endIndex < code.length && code[endIndex] === ":") {
    endIndex++;
  }

  const extractedSignature = code.substring(startIndex, endIndex);
  return extractedSignature;
}

// Generate test execution code with dynamic test cases
function generateTestExecutionCode(
  functionName: string,
  signature: string,
  testCases: any[],
  options: {
    encodeDecode?: boolean;
    serializeDeserialize?: boolean;
    problemId?: string;
    isClassBasedProblem?: boolean;
  } = {},
): string {
  const {
    encodeDecode = false,
    serializeDeserialize = false,
    problemId = "",
    isClassBasedProblem = false,
  } = options;

  // Convert test cases to Python format
  const pythonTestCases = testCases.map((tc) => {
    let expectedOutput = tc.expected;
    if (isClassBasedProblem && tc.expected && tc.expected.expected_outputs) {
      expectedOutput = tc.expected.expected_outputs;
    }

    let normalizedInput = { ...tc.input };
    if (isClassBasedProblem) {
      if (
        normalizedInput.operations &&
        !normalizedInput.values &&
        !normalizedInput.args
      ) {
        const ops = normalizedInput.operations;
        const parsedOps: string[] = [];
        const parsedValues: any[] = [];

        parsedOps.push(ops[0]);
        parsedValues.push([]);

        for (let i = 1; i < ops.length; i += 2) {
          if (i < ops.length) {
            parsedOps.push(ops[i]);
            if (i + 1 < ops.length) {
              parsedValues.push([ops[i + 1]]);
            } else {
              parsedValues.push([]);
            }
          }
        }

        normalizedInput.operations = parsedOps;
        normalizedInput.values = parsedValues;
      }

      if (normalizedInput.args && !normalizedInput.values) {
        normalizedInput.values = normalizedInput.args;
      }
      if (normalizedInput.values && !normalizedInput.args) {
        normalizedInput.args = normalizedInput.values;
      }
    }

    return {
      ...normalizedInput,
      expected: expectedOutput,
    };
  });

  // Convert JavaScript booleans/null to Python equivalents
  let testCasesJson = JSON.stringify(pythonTestCases, null, 2);
  testCasesJson = testCasesJson
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\bnull\b/g, "None");

  // Extract parameter names from signature
  const paramMatch = signature.match(/def\s+\w+\s*\(([^)]+)\)/);
  const params = paramMatch
    ? paramMatch[1]
      .split(",")
      .map((p) => p.split(":")[0].trim())
      .filter((p) => p !== "self")
    : [];

  // Generate function call
  let functionCall: string;

  const hasSelfParam = signature.includes("self");
  const isListNodeProblem = /\bListNode\b/.test(signature);
  const isTreeNodeProblem = /\bTreeNode\b|['\"]TreeNode['\"]/.test(signature);
  const isGraphProblem =
    /\bNode\b|['\"]Node['\"]/.test(signature) &&
    !isListNodeProblem &&
    !isTreeNodeProblem;
  const returnsListNode = /->\s*[^\n#]*ListNode/.test(signature);
  const returnsTreeNode = /->\s*[^\n#]*TreeNode/.test(signature);
  const returnsNode =
    /->\s*[^\n#]*['\"]?Node['\"]?/.test(signature) &&
    !returnsListNode &&
    !returnsTreeNode;
  const returnsNone = /->\s*None\s*:/.test(signature);
  const isLinkedListCycleProblem =
    problemId === "linked-list-cycle" || functionName === "hasCycle";

  if (hasSelfParam || isClassBasedProblem) {
    const className = "Solution";
    if (isClassBasedProblem) {
      functionCall = `execute_class_operations(tc["operations"], tc["values"])`;
    } else if (encodeDecode) {
      const arg = params[0] ? `tc["${params[0]}"]` : "tc.get('strs')";
      functionCall = `${className}().decode(${className}().encode(${arg}))`;
    } else if (serializeDeserialize) {
      functionCall = `treenode_to_array(${className}().Codec().deserialize(${className}().Codec().serialize(array_to_treenode(tc["root"]))))`;
    } else if (isListNodeProblem) {
      const isMergeKLists =
        functionName.toLowerCase().includes("mergeklists") ||
        functionName.toLowerCase().includes("merge_k_lists");

      if (isMergeKLists && params.length === 1) {
        const param = params[0];
        functionCall = `listnode_to_array(${className}().${functionName}([array_to_listnode(arr) for arr in tc["${param}"]]))`;
      } else {
        let paramList: string;
        if (isLinkedListCycleProblem) {
          paramList = params
            .map(
              () =>
                `array_to_listnode_with_cycle(tc["head"], tc.get("pos", -1))`,
            )
            .join(", ");
        } else {
          paramList = params
            .map((p) => {
              if (/^(head|list\d*|l\d+)$/i.test(p)) {
                return `array_to_listnode(tc["${p}"])`;
              } else {
                return `tc["${p}"]`;
              }
            })
            .join(", ");
        }

        if (returnsNone && params.length === 1) {
          const param = params[0];
          const listVar = `list_${param}`;
          functionCall = `(lambda ${listVar}: (${className}().${functionName}(${listVar}), listnode_to_array(${listVar}))[1])(array_to_listnode(tc["${param}"]))`;
        } else {
          const call = `${className}().${functionName}(${paramList})`;
          functionCall = returnsListNode ? `listnode_to_array(${call})` : call;
        }
      }
    } else if (isTreeNodeProblem) {
      const isLCAProblem =
        functionName.toLowerCase().includes("lowestcommonancestor") ||
        functionName.toLowerCase().includes("lca");

      if (isLCAProblem && params.length === 3) {
        const rootParam = params[0];
        const pParam = params[1];
        const qParam = params[2];

        functionCall = `(lambda tree: ${className}().${functionName}(tree, find_node(tree, tc["${pParam}"]), find_node(tree, tc["${qParam}"])).val)(array_to_treenode(tc["${rootParam}"]))`;
      } else {
        const paramList = params
          .map((p) => {
            if (/^(root\d*|tree\d*|subroot|p|q|s|t)$/i.test(p)) {
              return `array_to_treenode(tc["${p}"])`;
            } else {
              return `tc["${p}"]`;
            }
          })
          .join(", ");
        const call = `${className}().${functionName}(${paramList})`;
        functionCall = returnsTreeNode ? `treenode_to_array(${call})` : call;
      }
    } else if (isGraphProblem) {
      const paramList = params
        .map(() => `adjlist_to_node(tc.get("adjList", tc.get("node")))`)
        .join(", ");
      const call = `${className}().${functionName}(${paramList})`;
      functionCall = returnsNode ? `node_to_adjlist(${call})` : call;
    } else if (returnsNone && params.length === 1) {
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
    } else if (isListNodeProblem) {
      let paramList: string;
      if (isLinkedListCycleProblem) {
        paramList = params
          .map(
            () =>
              `array_to_listnode_with_cycle(tc["head"], tc.get("pos", -1))`,
          )
          .join(", ");
      } else {
        paramList = params.map((p) => `array_to_listnode(tc["${p}"])`).join(", ");
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

/**
 * CORS headers for all responses
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const pathSegments = path.split("/").filter(Boolean);
    const endpoint = pathSegments[pathSegments.length - 1] || "";

    // Debug logging
    console.log(`[code-executor-api] ${req.method} ${path}, endpoint: "${endpoint}"`);

    // Health check endpoint (GET /health or GET /code-executor-api/health)
    if (req.method === "GET" && (endpoint === "health" || path.endsWith("/health"))) {
      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          service: "simplyalgo-code-executor",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Judge0 system info endpoint (GET /judge0-info or GET /code-executor-api/judge0-info)
    if (req.method === "GET" && (endpoint === "judge0-info" || path.endsWith("/judge0-info"))) {
      try {
        const headers: Record<string, string> = {};

        if (JUDGE0_API_KEY) {
          headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
          headers["X-RapidAPI-Host"] = "judge0-extra-ce.p.rapidapi.com";
        }

        const response = await fetch(`${JUDGE0_API_URL}/system_info`, {
          headers,
        });

        if (response.ok) {
          const systemInfo = await response.json();
          return new Response(
            JSON.stringify({
              judge0Available: true,
              ready: true,
              executor: "judge0",
              systemInfo,
              supportedLanguages: Object.keys(languageMap),
              usingSubscription: !!JUDGE0_API_KEY,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        } else {
          throw new Error(`Judge0 not responding: ${response.status}`);
        }
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            judge0Available: false,
            ready: false,
            executor: "judge0",
            error: error.message,
            supportedLanguages: Object.keys(languageMap),
            usingSubscription: !!JUDGE0_API_KEY,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Main code execution endpoint
    // Handle POST requests (when called via supabase.functions.invoke, path will be /code-executor-api or /)
    // Also handle POST /execute for direct URL access
    if (req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON in request body",
            message: error.message,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { language, code, problemId, testCases: providedTestCases } = body;

      // Check if this problem requires smart comparison
      const requiresSmartComparison =
        problemId && SMART_COMPARISON_PROBLEMS.has(problemId);

      // Validate request
      if (!language || !code) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: language, code",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // If problemId is provided but no testCases, fetch from database
      let testCases = providedTestCases;
      if (problemId && !testCases) {
        console.log(`Fetching test cases for problem ID: ${problemId}`);
        testCases = await fetchTestCasesFromDB(problemId);
        if (!testCases || testCases.length === 0) {
          return new Response(
            JSON.stringify({
              error: `No test cases found for problem ID: ${problemId}`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      // Validate we have test cases
      if (!testCases || testCases.length === 0) {
        return new Response(
          JSON.stringify({
            error: "Missing test cases - provide either testCases or problemId",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(
        `Executing ${language} code with ${testCases.length} test cases`,
      );

      const languageId = languageMap[language.toLowerCase()];
      if (!languageId) {
        return new Response(
          JSON.stringify({
            error: `Language ${language} not supported. Supported languages: ${Object.keys(languageMap).join(", ")}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Auto-process code using Strategy Pattern (if enabled) or legacy processing
      let processedCode = code;

      if (USE_STRATEGY_PATTERN && strategyRegistry && executorRegistry) {
        // NEW: Use Strategy Pattern architecture
        console.log(`[NEW-EXECUTOR] Processing ${language} code for problem ${problemId}`);

        try {
          // Select appropriate strategy based on problem characteristics
          const problem = await supabase
            .from("problems")
            .select("function_signature")
            .eq("id", problemId)
            .single();

          const strategy = strategyRegistry.selectStrategy(
            problemId || "",
            code,
            problem?.data?.function_signature
          );

          console.log(`[NEW-EXECUTOR] Selected strategy: ${strategy.getType()}`);

          // Prepare code with strategy (adds helpers, imports, etc.)
          processedCode = strategy.prepareCode(code, language);
          console.log(`[NEW-EXECUTOR] Code prepared (${processedCode.length} chars)`);

        } catch (error: any) {
          console.error("[NEW-EXECUTOR] Strategy processing failed, falling back to legacy:", error);
          // Fall back to legacy processing on error
          if (
            language.toLowerCase() === "python" ||
            language.toLowerCase() === "python3"
          ) {
            processedCode = processPythonCode(code, testCases, problemId || "");
          }
        }
      } else {
        // LEGACY: Use monolithic processing
        if (
          language.toLowerCase() === "python" ||
          language.toLowerCase() === "python3"
        ) {
          processedCode = processPythonCode(code, testCases, problemId || "");
        }
      }

      // Prepare batched submissions for all test cases
      const submissions = testCases.map((testCase: any, index: number) => {
        // For Python functions, send test case index
        // For other languages, use the original input format
        let stdin: string;
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

        // Encode to base64 using TextEncoder for proper string handling
        const encoder = new TextEncoder();
        return {
          language_id: languageId,
          source_code: base64Encode(encoder.encode(processedCode)),
          stdin: base64Encode(encoder.encode(stdin)),
          expected_output: testCase.expected
            ? base64Encode(encoder.encode(String(testCase.expected)))
            : undefined,
        };
      });

      console.log(`Submitting batch of ${submissions.length} test cases`);

      // Submit batch to Judge0
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add RapidAPI headers if using subscription service
      if (JUDGE0_API_KEY) {
        headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
        headers["X-RapidAPI-Host"] = "judge0-extra-ce.p.rapidapi.com";
      }

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
      const tokens = batchResult.map((item: any) => item.token);

      console.log(
        `Batch submitted, waiting for results for tokens: ${tokens.join(", ")}`,
      );

      // Wait for processing
      const waitTime = Math.max(1000, testCases.length * 500);
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
      const results = batchResults.submissions.map((result: any, index: number) => {
        const testCase = testCases[index];

        // Decode base64 outputs
        const decoder = new TextDecoder();
        const stdout = result.stdout
          ? decoder.decode(base64Decode(result.stdout)).trim()
          : "";
        const stderr = result.stderr
          ? decoder.decode(base64Decode(result.stderr)).trim()
          : "";
        const statusDesc =
          result.status && result.status.description
            ? String(result.status.description)
            : "";

        // Parse actual output as JSON if possible
        let actualOutput: any;
        try {
          actualOutput = JSON.parse(stdout);
        } catch {
          actualOutput = stdout;
        }

        // Friendly error hints
        let friendlyError: string | null = null;
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

        // Format input display
        const inputDisplay = Object.entries(testCase.input)
          .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
          .join("\n");

        // Format expected and actual outputs
        let formattedExpected: any = testCase.expected;
        let formattedActual: any = actualOutput;

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
      return new Response(
        JSON.stringify({ results }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 404 handler
    return new Response(
      JSON.stringify({ error: "Endpoint not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Code execution error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
        results: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

