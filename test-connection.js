// Test the connection between frontend and backend API

async function testConnection() {
  console.log('🔗 Testing Frontend ↔ Backend Connection');
  console.log('=========================================');
  
  const API_URL = 'http://localhost:3001';
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${API_URL}/health`);
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health check passed:', health.status);
    } else {
      console.log('❌ Health check failed');
      return;
    }
    
    // Test 2: Judge0 info
    console.log('\n2️⃣ Testing Judge0 connection...');
    const judge0Response = await fetch(`${API_URL}/judge0-info`);
    
    if (judge0Response.ok) {
      const judge0Info = await judge0Response.json();
      console.log('✅ Judge0 connection:', judge0Info.judge0Available ? 'Connected' : 'Failed');
      console.log('   Supported languages:', judge0Info.supportedLanguages?.join(', '));
    } else {
      console.log('❌ Judge0 connection failed');
    }
    
    // Test 3: Code execution with problemId (the new dynamic way)
    console.log('\n3️⃣ Testing dynamic code execution...');
    const testPayload = {
      language: 'python',
      problemId: 'two-sum',  // Should fetch test cases from Supabase
      code: `def twoSum(nums: List[int], target: int) -> List[int]:
    d = {}
    for i in range(len(nums)):
        if target - nums[i] in d:
            return [d[target-nums[i]], i]
        else:
            d[nums[i]] = i`
    };
    
    const executeResponse = await fetch(`${API_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    if (executeResponse.ok) {
      const result = await executeResponse.json();
      console.log(`✅ Code execution successful!`);
      console.log(`   Test cases: ${result.results.length}`);
      console.log(`   Passed: ${result.results.filter(r => r.passed).length}`);
    } else {
      const error = await executeResponse.json();
      console.log('❌ Code execution failed:', error.error);
    }
    
    console.log('\n🎉 Connection test completed!');
    console.log('\n📝 How to use in your frontend:');
    console.log('1. Make sure API server is running: npm start (in code-executor-api/)');
    console.log('2. Frontend calls TestRunnerService.runCode() with problemId');
    console.log('3. API fetches test cases from Supabase automatically');
    console.log('4. User only writes the function - no boilerplate needed!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('• API server is running on port 3001');
    console.log('• Supabase credentials are in code-executor-api/.env');
    console.log('• Judge0 API key is configured');
  }
}

testConnection();