import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

export class PythonExecutor {
  constructor() {
    this.timeout = 10; // seconds
    this.tempDir = '/tmp/simplyalgo-execution';
  }

  async executeCode(code, testCases) {
    try {
      const inputData = {
        code,
        testCases,
        timeout: this.timeout
      };

      // Create temp directory if it doesn't exist
      await mkdir(this.tempDir, { recursive: true });

      const result = await this.runPython(inputData);
      return result;
    } catch (error) {
      console.error('Python execution error:', error);
      return {
        success: false,
        error: `Python execution failed: ${error.message}`,
        results: this.createErrorResults(testCases, error.message)
      };
    }
  }

  async runPython(inputData) {
    const executionId = randomBytes(8).toString('hex');
    const inputFile = join(this.tempDir, `input-${executionId}.json`);
    const scriptFile = join(this.tempDir, `runner-${executionId}.py`);

    try {
      // Write input data to temp file
      await writeFile(inputFile, JSON.stringify(inputData));

      // Create Python runner script
      const runnerScript = `
#!/usr/bin/env python3
import json
import sys
import traceback
import re
import time
import signal
import os
from typing import List, Dict, Any, Optional
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

class TestResult:
    def __init__(self, passed: bool, input_data: str, expected: str, actual: str, 
                 stdout: str = "", stderr: Optional[str] = None, 
                 execution_time: float = 0.0, status: str = ""):
        self.passed = passed
        self.input_data = input_data
        self.expected = expected
        self.actual = actual
        self.stdout = stdout
        self.stderr = stderr
        self.execution_time = execution_time
        self.status = status

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "input": self.input_data,
            "expected": self.expected,
            "actual": self.actual,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "time": f"{self.execution_time:.0f}ms",
            "status": self.status
        }

class CodeExecutor:
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.setup_timeout_handler()

    def setup_timeout_handler(self):
        def timeout_handler(signum, frame):
            raise TimeoutError("Code execution timed out")
        signal.signal(signal.SIGALRM, timeout_handler)

    def parse_input(self, input_str: str) -> List[Any]:
        lines = [line.strip() for line in input_str.strip().split('\\n') if line.strip()]
        parsed = []

        for line in lines:
            tokens = self._tokenize_line(line)
            
            if len(tokens) > 1:
                for token in tokens:
                    parsed.append(self._parse_single_value(token))
            else:
                parsed.append(self._parse_single_value(line))

        return parsed

    def _tokenize_line(self, line: str) -> List[str]:
        tokens = []
        current_token = ""
        bracket_count = 0
        brace_count = 0
        in_quotes = False
        i = 0

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

        return tokens

    def _parse_single_value(self, value_str: str) -> Any:
        value_str = value_str.strip()
        
        try:
            return json.loads(value_str)
        except (json.JSONDecodeError, ValueError):
            pass
        
        try:
            if '.' in value_str:
                return float(value_str)
            else:
                return int(value_str)
        except ValueError:
            pass
        
        if value_str.startswith('"') and value_str.endswith('"'):
            return value_str[1:-1]
        
        return value_str

    def extract_function_name(self, code: str) -> Optional[str]:
        match = re.search(r'def\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(', code)
        return match.group(1) if match else None

    def format_output(self, result: Any) -> str:
        if isinstance(result, (list, dict, tuple)):
            return json.dumps(result, separators=(',', ':'))
        elif isinstance(result, bool):
            return str(result).lower()
        elif result is None:
            return "null"
        elif isinstance(result, float):
            if result == int(result):
                return f"{int(result)}.0"
            else:
                return str(result)
        else:
            return str(result)

    def execute_code(self, user_code: str, test_cases: List[Dict[str, str]]) -> List[TestResult]:
        results = []
        
        function_name = self.extract_function_name(user_code)
        if not function_name:
            for test_case in test_cases:
                results.append(TestResult(
                    passed=False,
                    input_data=test_case['input'],
                    expected=test_case['expected'],
                    actual="",
                    stderr="No function definition found",
                    status="Runtime Error"
                ))
            return results

        exec_globals = {
            '__builtins__': __builtins__,
            'List': List,
            'Dict': Dict,
            'Optional': Optional,
        }

        try:
            exec(user_code, exec_globals)
            
            if function_name not in exec_globals:
                raise NameError(f"Function '{function_name}' not found after execution")
            
            user_function = exec_globals[function_name]

        except Exception as e:
            error_msg = f"Code execution error: {str(e)}"
            for test_case in test_cases:
                results.append(TestResult(
                    passed=False,
                    input_data=test_case['input'],
                    expected=test_case['expected'],
                    actual="",
                    stderr=error_msg,
                    status="Runtime Error"
                ))
            return results

        for test_case in test_cases:
            result = self._run_single_test(user_function, test_case)
            results.append(result)

        return results

    def _run_single_test(self, user_function: callable, test_case: Dict[str, str]) -> TestResult:
        try:
            inputs = self.parse_input(test_case['input'])
            
            stdout_capture = StringIO()
            stderr_capture = StringIO()
            
            start_time = time.time()
            
            signal.alarm(self.timeout)
            
            try:
                with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                    if len(inputs) == 0:
                        result = user_function()
                    elif len(inputs) == 1:
                        result = user_function(inputs[0])
                    elif len(inputs) == 2:
                        result = user_function(inputs[0], inputs[1])
                    elif len(inputs) == 3:
                        result = user_function(inputs[0], inputs[1], inputs[2])
                    else:
                        result = user_function(*inputs)
                
                signal.alarm(0)
                
                execution_time = (time.time() - start_time) * 1000
                
                actual_output = self.format_output(result)
                expected_output = test_case['expected'].strip()
                
                passed = actual_output == expected_output
                status = "Accepted" if passed else "Wrong Answer"
                
                return TestResult(
                    passed=passed,
                    input_data=test_case['input'],
                    expected=expected_output,
                    actual=actual_output,
                    stdout=stdout_capture.getvalue(),
                    stderr=stderr_capture.getvalue() or None,
                    execution_time=execution_time,
                    status=status
                )

            except TimeoutError:
                signal.alarm(0)
                return TestResult(
                    passed=False,
                    input_data=test_case['input'],
                    expected=test_case['expected'],
                    actual="",
                    stderr="Time Limit Exceeded",
                    status="Time Limit Exceeded"
                )

        except Exception as e:
            signal.alarm(0)
            return TestResult(
                passed=False,
                input_data=test_case['input'],
                expected=test_case['expected'],
                actual="",
                stderr=f"Runtime Error: {str(e)}",
                status="Runtime Error"
            )

# Read input from file
try:
    with open('${inputFile}', 'r') as f:
        data = json.load(f)
    
    user_code = data['code']
    test_cases = data['testCases']
    timeout = data.get('timeout', 10)
    
    executor = CodeExecutor(timeout=timeout)
    results = executor.execute_code(user_code, test_cases)
    
    results_dict = [result.to_dict() for result in results]
    
    print(json.dumps({
        "success": True,
        "results": results_dict
    }))

except Exception as e:
    print(json.dumps({
        "success": False,
        "error": f"Execution failed: {str(e)}",
        "traceback": traceback.format_exc()
    }))
`;

      await writeFile(scriptFile, runnerScript);

      // Execute Python script
      return new Promise((resolve, reject) => {
        const python = spawn('python3', [scriptFile], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: (this.timeout + 2) * 1000
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        python.on('close', async (code) => {
          // Cleanup temp files
          try {
            await unlink(inputFile);
            await unlink(scriptFile);
          } catch (cleanupError) {
            console.log('Cleanup error:', cleanupError);
          }

          if (code !== 0) {
            reject(new Error(`Python exited with code ${code}: ${stderr}`));
            return;
          }

          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${parseError.message}. Output: ${stdout}`));
          }
        });

        python.on('error', (error) => {
          reject(error);
        });
      });

    } catch (error) {
      // Cleanup on error
      try {
        await unlink(inputFile);
        await unlink(scriptFile);
      } catch (cleanupError) {
        console.log('Cleanup error:', cleanupError);
      }
      throw error;
    }
  }

  createErrorResults(testCases, errorMessage) {
    return testCases.map(testCase => ({
      passed: false,
      input: testCase.input,
      expected: testCase.expected,
      actual: '',
      stdout: '',
      stderr: errorMessage,
      time: '0ms',
      status: 'Runtime Error'
    }));
  }

  async checkPythonAvailability() {
    return new Promise((resolve) => {
      const python = spawn('python3', ['--version']);
      python.on('close', (code) => resolve(code === 0));
      python.on('error', () => resolve(false));
    });
  }
}