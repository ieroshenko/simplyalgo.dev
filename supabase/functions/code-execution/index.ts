import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCase {
  input: string;
  expected: string;
}

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  stdout: string;
  stderr: string | null;
  time?: string;
  memory?: number;
  status?: string;
}

interface ExecutionRequest {
  language: string;
  code: string;
  testCases: TestCase[];
  problemId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { language, code, testCases, problemId }: ExecutionRequest = await req.json();

    console.log(`Executing ${language} code with ${testCases.length} test cases`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Map language to Judge0 language ID
    const languageMap: Record<string, number> = {
      'python': 71,      // Python 3.8.1
      'javascript': 63,  // Node.js 12.14.0
      'java': 62,        // Java OpenJDK 13.0.1
      'cpp': 54,         // C++ 17 GCC 9.2.0
      'c': 50,           // C GCC 9.2.0
    };

    const languageId = languageMap[language.toLowerCase()] || 71; // Default to Python

    // Execute code against each test case
    const results: TestResult[] = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Running test case ${i + 1}: ${testCase.input}`);

      try {
        // Prepare code with input handling based on language
        let executableCode = code;
        if (language.toLowerCase() === 'python') {
          // Use JSON encoding to safely pass the input string
          const inputStr = JSON.stringify(testCase.input);
          
          executableCode = `
import sys
import json
import re
from typing import List, Optional, Dict, Set, Tuple

# Parse input dynamically
def parse_input(input_str):
    lines = input_str.strip().split('\\n')
    parsed = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check if line contains space-separated values (e.g., "[2,7,11,15] 9")
        # Use regex to find JSON arrays/objects and separate values
        tokens = []
        i = 0
        current_token = ""
        bracket_count = 0
        brace_count = 0
        in_quotes = False
        
        while i < len(line):
            char = line[i]
            
            if char == '"' and (i == 0 or line[i-1] != '\\\\'):
                in_quotes = not in_quotes
                current_token += char
            elif not in_quotes:
                if char == '[':
                    bracket_count += 1
                    current_token += char
                elif char == ']':
                    bracket_count -= 1
                    current_token += char
                elif char == '{':
                    brace_count += 1
                    current_token += char
                elif char == '}':
                    brace_count -= 1
                    current_token += char
                elif char == ' ' and bracket_count == 0 and brace_count == 0:
                    if current_token.strip():
                        tokens.append(current_token.strip())
                        current_token = ""
                else:
                    current_token += char
            else:
                current_token += char
            i += 1
        
        if current_token.strip():
            tokens.append(current_token.strip())
        
        # If we found multiple tokens, parse each separately
        if len(tokens) > 1:
            for token in tokens:
                parsed.append(parse_single_value(token))
        else:
            # Single value on the line
            parsed.append(parse_single_value(line))
    
    return parsed

def parse_single_value(value_str):
    value_str = value_str.strip()
    # Try to parse as JSON first (for arrays, objects)
    try:
        return json.loads(value_str)
    except:
        # Try to parse as integer
        try:
            return int(value_str)
        except:
            # Try to parse as float
            try:
                return float(value_str)
            except:
                # Keep as string, removing quotes if present
                if value_str.startswith('"') and value_str.endswith('"'):
                    return value_str[1:-1]
                else:
                    return value_str

# Extract function name from code
def extract_function_name(code):
    # Look for function definition
    match = re.search(r'def\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(', code)
    if match:
        return match.group(1)
    return None

# Parse inputs
inputs = parse_input(${inputStr})
print(f"DEBUG: Raw input: {${inputStr}}")
print(f"DEBUG: Parsed inputs: {inputs}")
print(f"DEBUG: Number of inputs: {len(inputs)}")

${code}

# Dynamic function calling
function_name = extract_function_name("""${code}""")
if function_name and function_name in locals():
    func = locals()[function_name]
    try:
        # Call function with appropriate number of arguments
        if len(inputs) == 0:
            result = func()
        elif len(inputs) == 1:
            result = func(inputs[0])
        elif len(inputs) == 2:
            result = func(inputs[0], inputs[1])
        elif len(inputs) == 3:
            result = func(inputs[0], inputs[1], inputs[2])
        else:
            result = func(*inputs)
        
        # Format output based on type
        if isinstance(result, (list, dict)):
            print(json.dumps(result))
        elif isinstance(result, bool):
            print(str(result).lower())
        else:
            print(str(result))
    except Exception as e:
        print(f"Error: {str(e)}")
        print(f"Inputs were: {inputs}")
        print(f"Function signature: {func.__code__.co_varnames[:func.__code__.co_argcount]}")
else:
    print("Function not found or could not be extracted")
`;
        }
        
        console.log('Generated Python code:');
        console.log(executableCode);

        // Submit to Judge0 (using RapidAPI endpoint for now)
        const submissionResponse = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': Deno.env.get('RAPIDAPI_KEY') || 'demo-key',
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
          },
          body: JSON.stringify({
            language_id: languageId,
            source_code: executableCode,
            stdin: testCase.input,
            expected_output: testCase.expected,
            cpu_time_limit: 10,
            memory_limit: 256000, // 256MB
            wall_time_limit: 10
          })
        });

        if (!submissionResponse.ok) {
          throw new Error(`Judge0 submission failed: ${submissionResponse.statusText}`);
        }

        const submissionData = await submissionResponse.json();
        const submissionId = submissionData.token;

        // Poll for result with timeout
        let attempts = 0;
        let resultData;
        
        while (attempts < 30) { // 30 attempts = 15 seconds max
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          
          const resultResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${submissionId}`, {
            headers: {
              'X-RapidAPI-Key': Deno.env.get('RAPIDAPI_KEY') || 'demo-key',
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            }
          });

          if (resultResponse.ok) {
            resultData = await resultResponse.json();
            if (resultData.status.id >= 3) { // Status 3+ means completed
              break;
            }
          }
          
          attempts++;
        }

        if (!resultData || resultData.status.id < 3) {
          throw new Error('Execution timeout or failed to get result');
        }

        // Process result
        const stdout = resultData.stdout || '';
        const stderr = resultData.stderr || null;
        const actualOutput = stdout.trim();
        const expectedOutput = testCase.expected.trim();
        const passed = actualOutput === expectedOutput;

        const testResult: TestResult = {
          passed,
          input: testCase.input,
          expected: testCase.expected,
          actual: actualOutput,
          stdout,
          stderr,
          time: resultData.time ? `${parseFloat(resultData.time) * 1000}ms` : undefined,
          memory: resultData.memory ? parseInt(resultData.memory) : undefined,
          status: resultData.status.description
        };

        results.push(testResult);
        console.log(`Test case ${i + 1} result: ${passed ? 'PASSED' : 'FAILED'}`);

      } catch (error) {
        console.error(`Error executing test case ${i + 1}:`, error);
        
        // Add failed result for this test case
        results.push({
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          actual: '',
          stdout: '',
          stderr: error.message,
          status: 'Error'
        });
      }
    }

    // Store execution attempt in database if user is authenticated and problemId is provided
    if (userId && problemId) {
      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;
      const status = passedCount === totalCount ? 'accepted' : 'wrong_answer';

      const { error: insertError } = await supabase
        .from('user_problem_attempts')
        .insert({
          user_id: userId,
          problem_id: problemId,
          code,
          language,
          status,
          test_results: results,
          execution_time: results.reduce((sum, r) => sum + (r.time ? parseFloat(r.time) : 0), 0),
          memory_usage: Math.max(...results.map(r => r.memory || 0))
        });

      if (insertError) {
        console.error('Error storing execution attempt:', insertError);
      } else {
        console.log('Execution attempt stored successfully');
      }
    }

    // Return results
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in code-execution function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        results: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});