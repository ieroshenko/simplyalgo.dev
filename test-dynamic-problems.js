// Test the new dynamic problem system

// Test 1: Two Sum problem
const twoSumTest = {
  language: 'python',
  problemId: 'two-sum',  // API will fetch test cases from DB
  code: `def twoSum(nums: List[int], target: int) -> List[int]:
    d = {}
    for i in range(len(nums)):
        if target - nums[i] in d:
            return [d[target-nums[i]], i]
        else:
            d[nums[i]] = i`
};

// Test 2: Valid Parentheses problem  
const validParenthesesTest = {
  language: 'python',
  problemId: 'valid-parentheses',  // Different problem, different test cases
  code: `def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    
    for char in s:
        if char in mapping:
            top_element = stack.pop() if stack else '#'
            if mapping[char] != top_element:
                return False
        else:
            stack.append(char)
    
    return not stack`
};

// Test 3: Reverse Integer problem
const reverseIntegerTest = {
  language: 'python', 
  problemId: 'reverse-integer',
  code: `def reverse(x: int) -> int:
    sign = -1 if x < 0 else 1
    x = abs(x)
    result = 0
    
    while x:
        result = result * 10 + x % 10
        x //= 10
    
    result *= sign
    return result if -2**31 <= result <= 2**31 - 1 else 0`
};

async function testProblem(testData, problemName) {
  try {
    console.log(`\n🚀 Testing ${problemName}...`);
    console.log(`📋 Problem ID: ${testData.problemId}`);
    console.log(`📝 User Code: Function only (no boilerplate)`);
    
    const response = await fetch('http://localhost:3001/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${problemName} execution successful!`);
      console.log(`📊 Executed ${result.results.length} test cases\n`);
      
      result.results.forEach((test, i) => {
        const status = test.passed ? '✅' : '❌';
        console.log(`  ${status} Test ${i + 1}: Expected ${JSON.stringify(test.expected)}, Got ${test.actual}`);
      });
      
      const passedCount = result.results.filter(r => r.passed).length;
      console.log(`\n🎯 ${problemName}: ${passedCount}/${result.results.length} passed`);
      
    } else {
      console.error(`❌ ${problemName} failed:`, result);
    }
  } catch (error) {
    console.error(`❌ ${problemName} error:`, error.message);
  }
}

async function runAllTests() {
  console.log('🎯 Testing Dynamic Problem System');
  console.log('=====================================');
  
  // Test different problems with their own test cases
  await testProblem(twoSumTest, 'Two Sum');
  await testProblem(validParenthesesTest, 'Valid Parentheses'); 
  await testProblem(reverseIntegerTest, 'Reverse Integer');
  
  console.log('\n✨ All dynamic tests completed!');
  console.log('\n💡 Key Features Demonstrated:');
  console.log('• Each problem has its own test cases from "database"');
  console.log('• User submits clean function code only');  
  console.log('• API automatically wraps with correct test cases');
  console.log('• Multiple problems work with same system');
  console.log('• Truly dynamic and extensible!');
}

runAllTests();