// Test real Supabase integration with dynamic problem fetching

async function testSupabaseIntegration() {
  console.log('🔍 Testing Real Supabase Integration');
  console.log('=====================================');
  
  // Test with a real problem from your Supabase database
  const testData = {
    language: 'python',
    problemId: 'two-sum',  // This should exist in your Supabase problems table
    code: `def twoSum(nums: List[int], target: int) -> List[int]:
    d = {}
    for i in range(len(nums)):
        if target - nums[i] in d:
            return [d[target-nums[i]], i]
        else:
            d[nums[i]] = i`
  };
  
  try {
    console.log(`\n🚀 Testing problem: ${testData.problemId}`);
    console.log('📋 API will fetch test cases from Supabase automatically');
    console.log('📝 User submitted clean function code only\n');
    
    const response = await fetch('http://localhost:3001/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Supabase integration successful!');
      console.log(`📊 Executed ${result.results.length} test cases from database\n`);
      
      result.results.forEach((test, i) => {
        const status = test.passed ? '✅' : '❌';
        console.log(`  ${status} Test ${i + 1}:`);
        console.log(`     Expected: ${JSON.stringify(test.expected)}`);
        console.log(`     Got:      ${test.actual}`);
        console.log(`     Status:   ${test.status}`);
        if (test.time) console.log(`     Time:     ${test.time}s`);
        if (test.memory) console.log(`     Memory:   ${test.memory} KB`);
        console.log('');
      });
      
      const passedCount = result.results.filter(r => r.passed).length;
      console.log(`🎯 Result: ${passedCount}/${result.results.length} test cases passed`);
      
      if (passedCount === result.results.length) {
        console.log('🎉 All tests passed! Your solution is correct!');
      } else {
        console.log('🤔 Some tests failed. Check your solution logic.');
      }
      
    } else {
      console.error('❌ Test failed:', result);
      
      if (result.error && result.error.includes('not found')) {
        console.log('\n💡 Make sure:');
        console.log('   • Your Supabase is running and accessible');
        console.log('   • The problem "two-sum" exists in your problems table');
        console.log('   • Test cases exist for this problem in test_cases table');
      }
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   • Your API server is running on port 3001');
    console.log('   • Your .env file has correct Supabase credentials');
  }
  
  console.log('\n✨ Integration test completed!');
  console.log('\n🔧 What this test demonstrates:');
  console.log('• Real Supabase database queries');
  console.log('• Dynamic problem and test case fetching');
  console.log('• Clean user code (function only)');
  console.log('• Automatic test case parsing and execution');
  console.log('• True LeetCode-style experience!');
}

// Also test checking available problems
async function testAvailableProblems() {
  console.log('\n📚 Testing Available Problems Query...');
  
  try {
    // This would be a new endpoint to list available problems
    const response = await fetch('http://localhost:3001/problems');
    
    if (response.ok) {
      const problems = await response.json();
      console.log(`✅ Found ${problems.length} problems in database`);
      
      if (problems.length > 0) {
        console.log('\n📋 Sample problems:');
        problems.slice(0, 3).forEach(p => {
          console.log(`   • ${p.id}: ${p.title} (${p.difficulty})`);
        });
      }
    } else {
      console.log('⚠️  Problems endpoint not implemented yet');
    }
  } catch (error) {
    console.log('⚠️  Problems endpoint not available yet');
  }
}

// Run the tests
testSupabaseIntegration().then(() => testAvailableProblems());