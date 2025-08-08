import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const app = express();
const PORT = process.env.PORT || 3001; 

// Judge0 configuration
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-extra-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY; 

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug environment variables
console.log('🔧 Environment variables loaded:');
console.log('   SUPABASE_URL:', SUPABASE_URL ? '✅ Loaded' : '❌ Missing');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Loaded' : '❌ Missing');
console.log('   JUDGE0_API_KEY:', JUDGE0_API_KEY ? '✅ Loaded' : '❌ Missing');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required Supabase environment variables!');
  console.error('   Please check your .env file in code-executor-api/');
  process.exit(1);
}

// Initialize Supabase client (using service role key for server-side operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Language mapping to Judge0 Extra CE language IDs
const languageMap = {
  python: 10,        // Python for ML (3.7.7)
  python3: 31,       // Python for ML (3.12.5) - latest
  c: 1,              // C (Clang 10.0.1)
  cpp: 2,            // C++ (Clang 10.0.1)
  java: 4,           // Java (OpenJDK 14.0.1)
  csharp: 21,        // C# (.NET Core SDK 3.1.406)
};

// Problems that require smart comparison (order-independent array comparison)
const SMART_COMPARISON_PROBLEMS = new Set([
  'group-anagrams',
  '3sum',
  'combination-sum',
  'generate-parentheses',
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
          .map(innerArr => [...innerArr].sort())
          .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      };
      
      const normalizedActual = normalizeArrayOfArrays(actual);
      const normalizedExpected = normalizeArrayOfArrays(expected);
      
      const result = JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected);
      return result;
    }
    
    // For simple arrays, just sort both
    const sortedActual = [...actual].sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
    const sortedExpected = [...expected].sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
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
      .from('problems')
      .select('id, title, function_signature')
      .eq('id', problemId)
      .single();
    
    if (problemError || !problem) {
      console.error('Problem not found:', problemError);
      return null;
    }
    
    console.log(`Found problem: ${problem.title}`);
    console.log(`Function signature: ${problem.function_signature}`);
    
    // Fetch test cases for this problem
    const { data: testCases, error: testCasesError } = await supabase
      .from('test_cases')
      .select('input, expected_output, is_example')
      .eq('problem_id', problemId)
      .order('is_example', { ascending: false });
    
    if (testCasesError) {
      console.error('Error fetching test cases:', testCasesError);
      return null;
    }
    
    if (!testCases || testCases.length === 0) {
      console.log('No test cases found for problem:', problemId);
      return null;
    }
    
    console.log(`Found ${testCases.length} test cases`);
    console.log('Raw test cases from DB:', JSON.stringify(testCases, null, 2));
    
    // Add detailed logging for each test case
    testCases.forEach((tc, index) => {
      console.log(`\n=== RAW TEST CASE ${index} ===`);
      console.log('Raw input string:', JSON.stringify(tc.input));
      console.log('Raw expected_output string:', JSON.stringify(tc.expected_output));
      console.log('Type of input:', typeof tc.input);
      console.log('Type of expected_output:', typeof tc.expected_output);
    });
    
    // Convert database format to our expected format
    const formattedTestCases = testCases.map((tc, index) => {
      console.log(`\n--- Processing test case ${index} ---`);
      console.log('Raw input:', JSON.stringify(tc.input));
      console.log('Raw expected_output:', JSON.stringify(tc.expected_output));
      
      // Parse the input string to extract parameters
      console.log('About to parse input with function signature:', problem.function_signature);
      const inputParams = parseTestCaseInput(tc.input, problem.function_signature);
      console.log('Parsed input params result:', JSON.stringify(inputParams, null, 2));
      
      // Parse expected output (handle different types)
      let expectedOutput;
      try {
        expectedOutput = JSON.parse(tc.expected_output);
      } catch {
        // If JSON parsing fails, treat as string/number
        expectedOutput = tc.expected_output;
      }
      
      console.log('Final inputParams:', inputParams);
      console.log('Final expectedOutput:', expectedOutput);
      
      return {
        input: inputParams,
        expected: expectedOutput,
        isExample: tc.is_example
      };
    });
    
    console.log('Formatted test cases:', JSON.stringify(formattedTestCases, null, 2));
    return formattedTestCases;
    
  } catch (error) {
    console.error('Error in fetchTestCasesFromDB:', error);
    return null;
  }
}

// Parse test case input string based on function signature
function parseTestCaseInput(inputString, functionSignature) {
  console.log('Raw input string:', JSON.stringify(inputString));
  console.log('Function signature:', functionSignature);
  
  // Extract parameter names from function signature
  const paramMatch = functionSignature.match(/def\s+\w+\s*\(([^)]+)\)/);
  if (!paramMatch) {
    console.warn('Could not parse function signature:', functionSignature);
    return {};
  }
  
  // Filter out 'self' parameter since we're calling as standalone function
  const params = paramMatch[1]
    .split(',')
    .map(p => p.split(':')[0].trim())
    .filter(p => p !== 'self');
  
  console.log('Extracted parameters (filtered):', params);
  
  const inputParams = {};
  
  // Parse input string
  const lines = inputString.split('\n').map(line => line.trim()).filter(line => line);
  console.log('Split lines:', lines);
  
  // Check if it's Format 1 (with parameter names: "nums = [2,7,11,15]")
  const hasParameterNames = lines.some(line => line.includes(' = '));
  console.log('Has parameter names:', hasParameterNames);
  
  if (hasParameterNames) {
    // Handle both formats:
    // Format 1a: "nums = [2,7,11,15]\ntarget = 9" (multi-line)
    // Format 1b: "s = \"anagram\", t = \"nagaram\"" (single line, comma-separated)
    
    if (lines.length === 1 && lines[0].includes(',') && !lines[0].includes('[') && !lines[0].includes(']')) {
      // Single line with comma-separated parameters: "s = \"anagram\", t = \"nagaram\""
      // BUT NOT arrays like: "strs = [\"eat\",\"tea\"]"
      const line = lines[0];
      console.log('Parsing single line with comma separation:', line);
      
      // Split by comma, but be careful with commas inside quoted strings
      const parts = [];
      let current = '';
      let insideQuotes = false;
      let escapeNext = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (escapeNext) {
          current += char;
          escapeNext = false;
        } else if (char === '\\') {
          current += char;
          escapeNext = true;
        } else if (char === '"') {
          current += char;
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      if (current.trim()) {
        parts.push(current.trim());
      }
      
      console.log('Split parts:', parts);
      
      // Now parse each part as "param = value"
      for (const part of parts) {
        if (part.includes(' = ')) {
          const [paramName, paramValue] = part.split(' = ', 2);
          const cleanParamName = paramName.trim();
          const cleanParamValue = paramValue.trim();
          
          console.log(`Parsing param: ${cleanParamName} = ${cleanParamValue}`);
          
          try {
            inputParams[cleanParamName] = JSON.parse(cleanParamValue);
          } catch {
            // Remove quotes if it's a quoted string
            inputParams[cleanParamName] = cleanParamValue.replace(/^"(.*)"$/, '$1');
          }
        }
      }
    } else {
      // Multi-line format: "nums = [2,7,11,15]\ntarget = 9"
      for (const line of lines) {
        if (line.includes(' = ')) {
          const [paramName, paramValue] = line.split(' = ', 2);
          const cleanParamName = paramName.trim();
          
          try {
            inputParams[cleanParamName] = JSON.parse(paramValue);
          } catch {
            inputParams[cleanParamName] = paramValue.replace(/^"(.*)"$/, '$1');
          }
        }
      }
    }
  } else {
    // Format 2: "[2,7,11,15]\n9" - map values to parameter names
    console.log('Using Format 2 parsing');
    
    for (let i = 0; i < Math.min(params.length, lines.length); i++) {
      const paramName = params[i];
      const paramValue = lines[i];
      
      console.log(`Mapping param ${i}: ${paramName} = ${paramValue}`);
      
      try {
        inputParams[paramName] = JSON.parse(paramValue);
      } catch (e) {
        console.warn(`JSON parse failed for ${paramValue}:`, e.message);
        // If JSON parsing fails, treat as string (remove quotes if present)
        inputParams[paramName] = paramValue.replace(/^"(.*)"$/, '$1');
      }
    }
  }
  
  // Validate that we have all required parameters
  console.log('Required params:', params);
  console.log('Parsed inputParams:', inputParams);
  const missingParams = params.filter(param => !(param in inputParams));
  if (missingParams.length > 0) {
    console.error('Missing parameters:', missingParams);
    // Try to handle missing parameters with appropriate defaults
    missingParams.forEach(param => {
      // Log warning and use null to make the issue more apparent
      console.warn(`Missing parameter '${param}' - using null as default`);
      inputParams[param] = null;
    });
  }
  
  console.log(`Final parsed input parameters:`, inputParams);
  return inputParams;
}

// Process Python code to add imports and test case execution
function processPythonCode(userCode, testCases) {
  // Add typing imports if needed
  const needsTyping = /\b(List|Dict|Set|Tuple|Optional|Union)\b/.test(userCode);
  let processedCode = userCode;
  
  if (needsTyping && !userCode.includes('from typing import')) {
    processedCode = `from typing import List, Dict, Set, Tuple, Optional, Union\n${userCode}`;
  }
  
  // Check if code has methods with 'self' parameter - wrap in Solution class
  const hasSelfParam = /def\s+\w+\s*\([^)]*self[^)]*\)/.test(userCode);
  if (hasSelfParam && !userCode.includes('class Solution')) {
    // Indent all function definitions to be inside Solution class
    const indentedCode = processedCode
      .split('\n')
      .map(line => {
        // Only indent lines that are function definitions or their content
        if (line.trim().startsWith('def ') || (line.startsWith('    ') && line.trim() !== '')) {
          return '    ' + line;
        } else if (line.trim() === '' || line.startsWith('from ') || line.startsWith('import ')) {
          return line; // Keep imports and empty lines as-is
        } else {
          return '    ' + line; // Indent everything else
        }
      })
      .join('\n');
    
    processedCode = `${processedCode.split('\n').filter(line => line.startsWith('from ') || line.startsWith('import ')).join('\n')}

class Solution:
${indentedCode.split('\n').filter(line => !line.startsWith('from ') && !line.startsWith('import ')).join('\n')}`;
  }
  
  // Extract function name from the code
  const functionMatch = userCode.match(/def\s+(\w+)\s*\(/);
  if (!functionMatch) {
    throw new Error('No function definition found in Python code');
  }
  
  const functionName = functionMatch[1];
  console.log(`Detected function: ${functionName}`);
  
  // Analyze function signature to determine input format
  const signatureMatch = userCode.match(/def\s+\w+\s*\([^)]+\)/);
  const signature = signatureMatch ? signatureMatch[0] : '';
  
  // Generate test execution code with dynamic test cases
  const testExecutionCode = generateTestExecutionCode(functionName, signature, testCases);
  
  // Combine user code with test execution
  const finalCode = `${processedCode}

${testExecutionCode}`;
  
  console.log('Generated complete Python code:', finalCode);
  return finalCode;
}

// Generate test execution code with dynamic test cases
function generateTestExecutionCode(functionName, signature, testCases) {
  // Convert test cases to Python format
  const pythonTestCases = testCases.map(tc => ({
    ...tc.input,
    expected: tc.expected
  }));
  
  // Convert JavaScript booleans to Python booleans in JSON string
  let testCasesJson = JSON.stringify(pythonTestCases, null, 2);
  testCasesJson = testCasesJson.replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False');
  
  // Extract parameter names from signature and filter out 'self'
  const paramMatch = signature.match(/def\s+\w+\s*\(([^)]+)\)/);
  const params = paramMatch ? paramMatch[1]
    .split(',')
    .map(p => p.split(':')[0].trim())
    .filter(p => p !== 'self') : [];
  
  // Generate function call based on parameters - handle both standalone and method calls
  let functionCall;
  
  // Check if original signature has 'self' parameter
  const originalSignature = signature;
  const hasSelfParam = originalSignature.includes('self');
  
  if (hasSelfParam) {
    // If function was defined with 'self', we need to create a class instance and call it as a method
    const className = 'Solution';
    if (params.length === 1) {
      functionCall = `${className}().${functionName}(tc["${params[0]}"])`;
    } else if (params.length === 2) {
      functionCall = `${className}().${functionName}(tc["${params[0]}"], tc["${params[1]}"])`;
    } else {
      const paramList = params.map(p => `tc["${p}"]`).join(', ');
      functionCall = `${className}().${functionName}(${paramList})`;
    }
  } else {
    // Standalone function call
    if (params.length === 1) {
      functionCall = `${functionName}(tc["${params[0]}"])`;
    } else if (params.length === 2) {
      functionCall = `${functionName}(tc["${params[0]}"], tc["${params[1]}"])`;
    } else {
      const paramList = params.map(p => `tc["${p}"]`).join(', ');
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

if 0 <= test_case_index < len(test_cases):
    tc = test_cases[test_case_index]
    result = ${functionCall}
    print(json.dumps(result))
else:
    print("Invalid test case index")`;
}

// Middleware
app.use(helmet());
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'https://preview--leetcoach-ai-guide.lovable.app'
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'simplyalgo-code-executor'
  });
});

// Main code execution endpoint
app.post('/execute', async (req, res) => {
  try {
    let { language, code, problemId } = req.body;
    
    // Check if this problem requires smart comparison
    const requiresSmartComparison = problemId && SMART_COMPARISON_PROBLEMS.has(problemId);
    console.log(`🎯 Problem: ${problemId}, Requires smart comparison: ${requiresSmartComparison}`);
    let { testCases } = req.body;

    // Validate request
    if (!language || !code) {
      return res.status(400).json({
        error: 'Missing required fields: language, code'
      });
    }

    // If problemId is provided but no testCases, fetch from database
    if (problemId && !testCases) {
      console.log(`Fetching test cases for problem ID: ${problemId}`);
      testCases = await fetchTestCasesFromDB(problemId);
      if (!testCases || testCases.length === 0) {
        return res.status(400).json({
          error: `No test cases found for problem ID: ${problemId}`
        });
      }
    }

    // Validate we have test cases
    if (!testCases || testCases.length === 0) {
      return res.status(400).json({
        error: 'Missing test cases - provide either testCases or problemId'
      });
    }

    console.log(`Executing ${language} code with ${testCases.length} test cases`);

    const languageId = languageMap[language.toLowerCase()];
    if (!languageId) {
      return res.status(400).json({
        error: `Language ${language} not supported. Supported languages: ${Object.keys(languageMap).join(', ')}`
      });
    }

    console.log(`Received language: ${language}`);

    // Auto-process Python code for LeetCode-style execution
    if (language.toLowerCase() === 'python' || language.toLowerCase() === 'python3') {
      code = processPythonCode(code, testCases);
    }

    // Prepare batched submissions for all test cases
    // Using batched submissions is efficient: 1 batch request counts as 1 API call
    // instead of N individual submissions (saves API quota)
    const submissions = testCases.map((testCase, index) => {
      // For Python functions, send test case index
      // For other languages, use the original input format
      let stdin;
      if (language.toLowerCase() === 'python' || language.toLowerCase() === 'python3') {
        stdin = String(index); // Send test case index
      } else {
        stdin = Array.isArray(testCase.input) 
          ? testCase.input.join('\n')  // Join array elements with newlines
          : String(testCase.input);    // Convert to string if not array
      }

      return {
        language_id: languageId,
        source_code: Buffer.from(code).toString('base64'),
        stdin: Buffer.from(stdin).toString('base64'),
        expected_output: testCase.expected ? Buffer.from(String(testCase.expected)).toString('base64') : undefined
      };
    });

    console.log(`Submitting batch of ${submissions.length} test cases`);

    // Submit batch to Judge0
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add RapidAPI headers if using subscription service
    if (JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = 'judge0-extra-ce.p.rapidapi.com';
    }

    console.log('Submitting to Judge0 with headers:', headers);

    const response = await fetch(`${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ submissions })
    });

    if (!response.ok) {
      throw new Error(`Judge0 API error: ${response.status} ${response.statusText}`);
    }

    const batchResult = await response.json();
    const tokens = batchResult.map(item => item.token);
    
    console.log(`Batch submitted, waiting for results for tokens: ${tokens.join(', ')}`);

    // Wait for processing - adjust timeout based on batch size and complexity
    const waitTime = Math.max(1000, testCases.length * 500); // 500ms per test case, min 1s
    console.log(`Waiting ${waitTime}ms for batch processing...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Get batch results
    const resultResponse = await fetch(`${JUDGE0_API_URL}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=true`, {
      method: 'GET',
      headers
    });

    if (!resultResponse.ok) {
      throw new Error(`Judge0 batch result error: ${resultResponse.status} ${resultResponse.statusText}`);
    }

    const batchResults = await resultResponse.json();
    
    // Process results
    const results = batchResults.submissions.map((result, index) => {
      const testCase = testCases[index];
      
      // Decode base64 outputs
      const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString().trim() : '';
      const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString().trim() : '';
      
      // Parse actual output as JSON if possible
      let actualOutput;
      try {
        actualOutput = JSON.parse(stdout);
      } catch {
        actualOutput = stdout;
      }
      
      // Compare actual vs expected with conditional smart comparison
      const passed = requiresSmartComparison 
        ? smartCompare(actualOutput, testCase.expected)
        : JSON.stringify(actualOutput) === JSON.stringify(testCase.expected);
      
      // Format input display for better readability
      const inputDisplay = Object.entries(testCase.input)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join('\n');
      
      return {
        input: inputDisplay,
        expected: testCase.expected,
        actual: actualOutput,
        passed,
        status: result.status.description,
        time: result.time,
        memory: result.memory,
        stderr: stderr || null
      };
    });
    
    console.log(`Code execution completed with ${results.length} results`);
    res.json({ results });

  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      results: []
    });
  }
});

// Judge0 system info endpoint
app.get('/judge0-info', async (req, res) => {
  try {
    // Check if Judge0 is available
    const headers = {};
    
    // Add RapidAPI headers if using subscription service
    if (JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = 'judge0-extra-ce.p.rapidapi.com';
    }

    const response = await fetch(`${JUDGE0_API_URL}/system_info`, { headers });
    
    if (response.ok) {
      const systemInfo = await response.json();
      res.json({
        judge0Available: true,
        ready: true,
        executor: 'judge0',
        systemInfo,
        supportedLanguages: Object.keys(languageMap),
        usingSubscription: !!JUDGE0_API_KEY
      });
    } else {
      throw new Error(`Judge0 not responding: ${response.status}`);
    }
  } catch (error) {
    res.json({
      judge0Available: false,
      ready: false,
      executor: 'judge0',
      error: error.message,
      supportedLanguages: Object.keys(languageMap),
      usingSubscription: !!JUDGE0_API_KEY
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 simplyalgo Code Executor API (Judge0) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚖️  Judge0 info: http://localhost:${PORT}/judge0-info`);
  console.log(`⚡ Execute endpoint: POST http://localhost:${PORT}/execute`);
  console.log(`🔗 Judge0 API URL: ${JUDGE0_API_URL}`);
  console.log(`🌐 Supported languages: ${Object.keys(languageMap).join(', ')}`);
});
