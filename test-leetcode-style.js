// Test the new LeetCode-style system
const testData = {
  language: 'python',
  // User submits ONLY the function - no boilerplate!
  code: `def twoSum(nums: List[int], target: int) -> List[int]:
    d = {}
    for i in range(len(nums)):
        if target - nums[i] in d:
            return [d[target-nums[i]], i]
        else:
            d[nums[i]] = i`,
  // Test cases are handled by the API
  testCases: [
    { input: 'test_case_0', expected: '[0, 1]' }, // nums=[2,7,11,15], target=9
    { input: 'test_case_1', expected: '[1, 2]' }, // nums=[3,2,4], target=6  
    { input: 'test_case_2', expected: '[0, 1]' }  // nums=[3,3], target=6
  ]
};

async function testLeetCodeStyle() {
  try {
    console.log('🚀 Testing LeetCode-style execution...');
    console.log('📝 User submitted code (clean function only):');
    console.log(testData.code);
    console.log('\n⚡ Sending to API...');
    
    const response = await fetch('http://localhost:3001/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ LeetCode-style execution successful!');
      console.log(`📊 Executed ${result.results.length} test cases\n`);
      
      result.results.forEach((test, i) => {
        const status = test.passed ? '✅' : '❌';
        console.log(`${status} Test ${i + 1}:`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Got:      ${test.actual}`);
        console.log(`   Status:   ${test.status}`);
        console.log(`   Time:     ${test.time}s`);
        console.log(`   Memory:   ${test.memory} KB\n`);
      });
      
      const passedCount = result.results.filter(r => r.passed).length;
      console.log(`🎯 Summary: ${passedCount}/${result.results.length} test cases passed`);
      
    } else {
      console.error('❌ API Test Failed:', result);
    }
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
  }
}

testLeetCodeStyle();