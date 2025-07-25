import { TestCase, TestResult } from '@/types';

export interface RunCodePayload {
  language: string;
  code: string;
  testCases: TestCase[];
}

export interface RunCodeResponse {
  results: TestResult[];
}

// Mock test runner service that simulates backend API
export class TestRunnerService {
  static async runCode(payload: RunCodePayload): Promise<RunCodeResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const results: TestResult[] = [];
    
    for (const testCase of payload.testCases) {
      // Simulate code execution with mock results
      const result = this.simulateExecution(payload.code, testCase);
      results.push(result);
    }
    
    return { results };
  }
  
  private static simulateExecution(code: string, testCase: TestCase): TestResult {
    // Mock execution logic - in real implementation this would call Judge0 or Docker
    const isCodeComplete = !code.includes('pass') && code.trim().length > 50;
    
    // Simple mock logic for Two Sum problem
    if (testCase.input.includes('[2,7,11,15]')) {
      const actualOutput = isCodeComplete ? '[0,1]' : '[]';
      return {
        passed: actualOutput === testCase.expected,
        input: testCase.input,
        expected: testCase.expected,
        actual: actualOutput,
        stdout: actualOutput,
        stderr: null,
        time: '0.01s'
      };
    }
    
    if (testCase.input.includes('[3,2,4]')) {
      const actualOutput = isCodeComplete ? '[1,2]' : '[]';
      return {
        passed: actualOutput === testCase.expected,
        input: testCase.input,
        expected: testCase.expected,
        actual: actualOutput,
        stdout: actualOutput,
        stderr: null,
        time: '0.02s'
      };
    }
    
    if (testCase.input.includes('[3,3]')) {
      const actualOutput = isCodeComplete ? '[0,1]' : '[]';
      return {
        passed: actualOutput === testCase.expected,
        input: testCase.input,
        expected: testCase.expected,
        actual: actualOutput,
        stdout: actualOutput,
        stderr: null,
        time: '0.01s'
      };
    }
    
    // Mock logic for Valid Parentheses
    if (testCase.input === '()') {
      const actualOutput = isCodeComplete ? 'true' : 'false';
      return {
        passed: actualOutput === testCase.expected,
        input: testCase.input,
        expected: testCase.expected,
        actual: actualOutput,
        stdout: actualOutput,
        stderr: null,
        time: '0.01s'
      };
    }
    
    // Default case
    return {
      passed: false,
      input: testCase.input,
      expected: testCase.expected,
      actual: '',
      stdout: '',
      stderr: isCodeComplete ? null : 'Code incomplete',
      time: '0.00s'
    };
  }
}