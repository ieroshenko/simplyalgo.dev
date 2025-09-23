# LocalStorageService Tests

This directory contains comprehensive tests for the LocalStorageService utility class.

## Test Files

### `localStorageService.test.ts`
Comprehensive unit tests covering:
- Basic storage operations (save, load, remove)
- Data validation and error handling
- Expiration handling and cleanup
- Position-specific operations
- Device type detection
- Edge cases and error scenarios

### `validateService.ts`
Simple validation script that can be run in Node.js to verify basic functionality:
```bash
npx tsx src/services/__tests__/validateService.ts
```

### `browserTest.html`
Browser-based test that can be opened in a web browser to test localStorage functionality in a real browser environment. Open this file in your browser to run the tests.

### `runTests.ts`
Test runner for the main test suite (requires a testing framework like Jest or Vitest).

## Running Tests

### Node.js Environment
```bash
# Run validation script
npx tsx src/services/__tests__/validateService.ts
```

### Browser Environment
1. Open `browserTest.html` in your web browser
2. Check the console and page for test results

### With Testing Framework
When a testing framework is configured (Jest, Vitest, etc.):
```bash
# Example with Vitest
npm install -D vitest
npx vitest src/services/__tests__/localStorageService.test.ts
```

## Test Coverage

The tests cover:

### ✅ Basic Operations
- Save data to localStorage
- Load data from localStorage
- Remove data from localStorage
- Handle non-existent keys

### ✅ Data Validation
- Reject null/undefined data
- Handle circular references
- Validate JSON serializable data

### ✅ Expiration Handling
- Detect expired timestamps
- Remove expired data on load
- Preserve valid data

### ✅ Position Operations
- Save position for specific problems
- Load position with metadata updates
- Handle multiple problem positions
- Clear all positions

### ✅ Error Handling
- localStorage unavailable scenarios
- Corrupted data in storage
- Storage operation failures
- Graceful degradation

### ✅ Device Detection
- Mobile device detection (< 768px)
- Desktop device detection (>= 768px)
- Node.js environment handling

### ✅ Edge Cases
- Large data objects
- Special characters in keys
- Empty objects and arrays
- Cleanup operations

## Requirements Coverage

This implementation satisfies the following requirements:

**Requirement 2.2**: Position persistence across sessions
- ✅ Saves overlay positions to localStorage
- ✅ Loads saved positions on subsequent activations
- ✅ Handles position validation and bounds checking

**Requirement 2.4**: Graceful fallback when storage unavailable
- ✅ Detects localStorage availability
- ✅ Returns false/null when storage unavailable
- ✅ Provides fallback behavior for all operations

## Usage Example

```typescript
import { createLocalStorageService, OverlayPosition } from '../localStorageService';

// Create service with default config
const service = createLocalStorageService();

// Save a position
const position: OverlayPosition = {
  x: 100,
  y: 200,
  timestamp: Date.now(),
  screenSize: { width: 1920, height: 1080 }
};

service.savePosition('problem-1', position);

// Load the position
const savedPosition = service.loadPosition('problem-1');

// Clean up expired data
service.cleanup();
```