import { TestCase, TestResult } from '@/types';

export interface RunCodePayload {
  language: string;
  code: string;
  testCases: TestCase[];
  problemId?: string;
}

export interface RunCodeResponse {
  results: TestResult[];
}

export class TestRunnerService {
  // Code Executor API endpoint - using localhost for development
  private static CODE_EXECUTOR_API_URL = import.meta.env.VITE_CODE_EXECUTOR_URL || 'http://localhost:3001';

  static async runCode(payload: RunCodePayload): Promise<RunCodeResponse> {
    console.log(`🚀 Calling Code Executor API: ${this.CODE_EXECUTOR_API_URL}/execute`);
    
    try {
      // New system: Send problemId for dynamic test case fetching
      // If problemId is provided, API will fetch test cases from Supabase
      // Otherwise, use the provided testCases (backward compatibility)
      const requestBody = {
        language: payload.language,
        code: payload.code,
        ...(payload.problemId 
          ? { problemId: payload.problemId }  // Dynamic: fetch from Supabase
          : { testCases: payload.testCases }   // Manual: use provided test cases
        )
      };

      console.log('📤 Request payload:', requestBody);

      const response = await fetch(`${this.CODE_EXECUTOR_API_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Code Executor API error: ${response.status} - ${errorData.error || errorData.message}`);
      }

      const data = await response.json();

      if (!data || !data.results) {
        throw new Error('Invalid response from Code Executor API');
      }

      console.log(`✅ Code Executor API: Executed ${payload.language} code successfully`);
      console.log(`📊 Results: ${data.results.length} test cases processed`);
      
      return { results: data.results };

    } catch (error) {
      console.error('❌ Code Executor API execution failed:', error);
      
      // Return error results instead of fallback
      const errorResults: TestResult[] = payload.testCases.map(testCase => ({
        passed: false,
        input: testCase.input,
        expected: testCase.expected,
        actual: '',
        stdout: '',
        stderr: `API Error: ${error.message}`,
        time: '0ms'
      }));

      return { results: errorResults };
    }
  }
}