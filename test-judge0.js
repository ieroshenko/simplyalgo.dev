// Test Judge0 API with batched submissions
const testData = {
  language: 'python',
  code: `# Simple test function
def add_numbers(a, b):
    return a + b

# Read input and execute
import sys
lines = sys.stdin.read().strip().split('\\n')
a, b = map(int, lines[0].split())
result = add_numbers(a, b)
print(result)`,
  testCases: [
    { input: ['2 3'], expected: '5' },
    { input: ['10 15'], expected: '25' },
    { input: ['0 0'], expected: '0' },
    { input: ['-1 1'], expected: '0' },
    { input: ['100 200'], expected: '300' }
  ]
};

async function testAPI() {
  try {
    console.log('Testing Judge0 API with batch submission...');
    
    const response = await fetch('http://localhost:3001/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ API Test Successful!');
      console.log(`Executed ${result.results.length} test cases`);
      
      result.results.forEach((test, i) => {
        const status = test.passed ? '✅' : '❌';
        console.log(`${status} Test ${i + 1}: Expected "${test.expected}", Got "${test.actual}" (${test.status})`);
      });
    } else {
      console.error('❌ API Test Failed:', result);
    }
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testAPI();