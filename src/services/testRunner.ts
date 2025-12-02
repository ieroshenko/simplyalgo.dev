import { TestCase, TestResult } from "@/types";
import { supabase } from "@/integrations/supabase/client";

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
  static async runCode(payload: RunCodePayload): Promise<RunCodeResponse> {
    console.log(
      `🚀 Calling Code Executor Edge Function`,
    );

    try {
      // New system: Send problemId for dynamic test case fetching
      // If problemId is provided, API will fetch test cases from Supabase
      // Otherwise, use the provided testCases (backward compatibility)
      const requestBody = {
        language: payload.language,
        code: payload.code,
        ...(payload.problemId
          ? { problemId: payload.problemId } // Dynamic: fetch from Supabase
          : { testCases: payload.testCases }), // Manual: use provided test cases
      };

      console.log("📤 Request payload:", requestBody);

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();

      // Call Supabase edge function
      const { data, error } = await supabase.functions.invoke('code-executor-api', {
        body: requestBody,
        headers: {
          Authorization: session ? `Bearer ${session.access_token}` : '',
        },
      });

      if (error) {
        throw new Error(
          `Code Executor API error: ${error.message || 'Unknown error'}`,
        );
      }

      if (!data || !data.results) {
        throw new Error("Invalid response from Code Executor API");
      }

      console.log(
        `✅ Code Executor API: Executed ${payload.language} code successfully`,
      );
      console.log(`📊 Results: ${data.results.length} test cases processed`);

      return { results: data.results };
    } catch (error: any) {
      console.error("❌ Code Executor API execution failed:", error);

      // Return error results instead of fallback
      const errorResults: TestResult[] = payload.testCases.map((testCase) => ({
        passed: false,
        input: testCase.input,
        expected: testCase.expected,
        actual: "",
        stdout: "",
        stderr: `API Error: ${error.message || 'Unknown error'}`,
        time: "0ms",
      }));

      return { results: errorResults };
    }
  }
}
