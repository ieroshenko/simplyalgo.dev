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

    let results: TestResult[] = [];
    
    try {
      if (language.toLowerCase() === 'python') {
        
        
      } else {
        // For non-Python languages, return not implemented error
        console.log(`Language ${language} not yet supported`);
        for (const testCase of testCases) {
          results.push({
            passed: false,
            input: testCase.input,
            expected: testCase.expected,
            actual: '',
            stdout: '',
            stderr: `${language} execution not yet implemented`,
            time: '0ms',
            status: 'Not Implemented'
          });
        }
      }

    } catch (error) {
      console.error('Code execution error:', error);
      
      // Create error results for all test cases
      for (const testCase of testCases) {
        results.push({
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          actual: '',
          stdout: '',
          stderr: error.message,
          time: '0ms',
          status: 'Runtime Error'
        });
      }
    }

    // Store execution attempt in database if user is authenticated and problemId is provided
    if (userId && problemId && results.length > 0) {
      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;
      const status = passedCount === totalCount ? 'passed' : 'failed';

      console.log(`Storing execution attempt: ${passedCount}/${totalCount} passed, status: ${status}`);

      const { error: insertError } = await supabase
        .from('user_problem_attempts')
        .insert({
          user_id: userId,
          problem_id: problemId,
          code,
          language,
          status,
          test_results: results,
          execution_time: results.reduce((sum, r) => {
            const time = parseFloat(r.time?.replace('ms', '') || '0');
            return sum + time;
          }, 0),
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