# Test Runner & Code Execution System Architecture

## Overview
The Test Runner system provides secure code execution and validation for coding problems through a multi-layered architecture featuring a custom Express.js API server that interfaces with Judge0, a professional code execution engine. It handles Python code processing, test case parsing, and intelligent result comparison.

## Core Components

### File Locations
- **Frontend Service**: `src/services/testRunner.ts`
- **Backend API**: `code-executor-api/server.js`
- **Types**: `src/types/index.ts` (TestCase, TestResult interfaces)
- **Judge0**: External code execution engine via RapidAPI

## Architecture Pattern: Secure Remote Code Execution

### Data Flow
```
Frontend → Test Runner Service → Code Executor API → Judge0 → Results Processing
    ↓              ↓                    ↓              ↓              ↓
User Code     API Request         Code Processing   Execution    Smart Comparison
```

## Core Mechanisms

### 1. Test Runner Service (Frontend)
- **Abstraction**: Provides clean interface to backend execution API
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Request Format**:
  ```typescript
  interface RunCodePayload {
    language: string;
    code: string;
    testCases: TestCase[];
    problemId?: string;  // Dynamic test case fetching
  }
  ```

### 2. Code Executor API (Backend)
- **Security**: Isolated execution environment via Judge0
- **Multi-language**: Support for Python, C++, Java, C#
- **Batch Processing**: Efficient parallel test case execution
- **Smart Parsing**: Dynamic test case fetching from Supabase

### 3. Judge0 Integration
- **Professional Engine**: Industry-standard code execution platform
- **Sandboxing**: Secure isolated environments for code execution
- **Resource Limits**: CPU time, memory, and execution time constraints
- **Base64 Encoding**: Secure data transmission

## Code Processing Pipeline

### Python Code Enhancement
```javascript
function processPythonCode(userCode, testCases) {
  // 1. Add required imports (typing, etc.)
  // 2. Inject ListNode class definition if needed
  // 3. Add helper functions for data structure conversion
  // 4. Wrap in Solution class if methods use 'self'
  // 5. Generate dynamic test execution code
}
```

### Test Case Parsing
- **Dynamic Format Detection**: Handles multiple input formats
- **Parameter Mapping**: Maps test inputs to function parameters
- **Type Conversion**: Intelligent parsing of JSON, arrays, strings
- **Format Support**:
  ```
  Format 1: "nums = [2,7,11,15]\ntarget = 9"
  Format 2: "[2,7,11,15]\n9"
  Format 3: "s = \"anagram\", t = \"nagaram\""
  ```

## Advanced Features

### Smart Comparison System
- **Order-Independent**: Arrays compared regardless of element order
- **Nested Arrays**: Handles complex data structures like `[[1,2],[3,4]]`
- **Problem-Specific**: Configured per problem type (e.g., group-anagrams)
- **Fallback**: Exact comparison when smart comparison fails

### ListNode Support
- **Auto-Detection**: Identifies when ListNode data structures are needed
- **Helper Injection**: Automatically adds conversion functions
- **Array Conversion**: Seamless conversion between arrays and linked lists
- **Output Processing**: Converts ListNode results back to arrays for display

### Error Enhancement
- **Friendly Messages**: Converts technical errors to user-friendly hints
- **Common Issues**: Detects infinite loops, null returns, timeout issues
- **Debug Information**: Provides specific guidance for pointer problems

## Execution Architecture

### Batch Processing
```javascript
// Efficient: 1 API call for N test cases
const submissions = testCases.map((testCase, index) => ({
  language_id: languageId,
  source_code: base64Code,
  stdin: base64Input,
  expected_output: base64Expected
}));

// Submit all at once
const batchResult = await judge0.submitBatch(submissions);
```

### Result Processing
```javascript
const results = batchResults.map((result, index) => ({
  input: formatInput(testCases[index].input),
  expected: testCases[index].expected,
  actual: parseOutput(result.stdout),
  passed: smartCompare(actual, expected),
  time: result.time,
  memory: result.memory,
  stderr: enhanceError(result.stderr)
}));
```

## Security & Performance

### Security Measures
- **Sandboxed Execution**: Judge0 provides isolated containers
- **Resource Limits**: CPU time (5s), memory (128MB), output size limits
- **Input Validation**: Strict validation of code and test inputs
- **CORS Protection**: Controlled access from frontend domains

### Performance Optimizations
- **Batch Execution**: Process multiple test cases in parallel
- **Smart Caching**: Reuse Supabase connections and cached test cases
- **Timeout Management**: Intelligent waiting based on batch size
- **Base64 Encoding**: Efficient data transmission

## Database Integration

### Test Case Storage
```sql
-- Supports both legacy and modern JSON formats
CREATE TABLE test_cases (
  id UUID PRIMARY KEY,
  problem_id STRING REFERENCES problems(id),
  input_json JSONB,        -- Modern structured format
  expected_json JSONB,     -- Modern structured format
  is_example BOOLEAN
);
```

### Dynamic Test Case Fetching
- **Problem-Based**: Fetch test cases by problemId automatically
- **Fallback Support**: Use provided test cases if dynamic fetch fails
- **Format Preference**: Prioritizes JSON columns over text parsing
- **Validation**: Ensures test cases exist before execution

## Error Handling & Recovery

### Network Resilience
- **Judge0 Failures**: Graceful fallback with informative error messages
- **API Timeouts**: Intelligent retry logic with exponential backoff
- **Malformed Responses**: Safe parsing with error boundaries

### Code Execution Errors
- **Syntax Errors**: Clear feedback on compilation issues
- **Runtime Errors**: Enhanced error messages with debugging hints
- **Timeout Issues**: Specific guidance for infinite loop problems
- **Memory Limits**: Warnings about space complexity

## Language Support

### Current Support
- **Python 3.12**: Primary language with full feature support
- **C/C++**: Basic support via Judge0
- **Java**: OpenJDK with standard libraries
- **C#**: .NET Core runtime support

### Python-Specific Features
- **Type Imports**: Automatic `typing` module imports
- **Class Wrapping**: Automatic Solution class creation for methods
- **Data Structure Support**: Built-in ListNode, TreeNode handling
- **LeetCode Compatibility**: Seamless function signature handling

## Monitoring & Debugging

### Logging System
- **Request Tracking**: Full audit trail of execution requests
- **Performance Metrics**: Execution times and resource usage
- **Error Reporting**: Detailed error logs with context
- **Debug Mode**: Verbose logging for development

### Health Monitoring
```javascript
// Health check endpoints
GET /health          // API server status
GET /judge0-info     // Judge0 connectivity and system info
```

## Future Enhancements

### Planned Features
- **Real-time Execution**: WebSocket-based live code execution
- **Custom Test Cases**: User-defined test case creation
- **Performance Profiling**: Detailed execution analysis
- **Multi-file Support**: Project-based code execution

### Scalability Improvements
- **Load Balancing**: Multiple Judge0 instances
- **Caching Layer**: Redis for test case and result caching
- **Queue System**: Background job processing for large batches
- **Auto-scaling**: Dynamic resource allocation based on load

### Security Enhancements
- **Rate Limiting**: Per-user execution quotas
- **Code Analysis**: Static analysis for malicious code detection
- **Audit Logging**: Comprehensive execution audit trails
- **Resource Monitoring**: Advanced resource usage tracking