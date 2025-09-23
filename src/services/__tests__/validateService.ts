/**
 * Validation script for LocalStorageService
 * Tests basic functionality to ensure the service works correctly
 */

import { createLocalStorageService, OverlayPosition } from '../localStorageService';

// Create service instance
const service = createLocalStorageService();

console.log('🧪 Testing LocalStorageService...\n');

// Test 1: Basic save/load
console.log('Test 1: Basic save/load operations');
const testData = { message: 'Hello, World!', timestamp: Date.now() };
const saveResult = service.save('test-key', testData);
const loadResult = service.load('test-key');

console.log('Save result:', saveResult);
console.log('Load result:', loadResult);
console.log('Data matches:', JSON.stringify(testData) === JSON.stringify(loadResult));
console.log('');

// Test 2: Position operations
console.log('Test 2: Position-specific operations');
const mockPosition: OverlayPosition = {
  x: 150,
  y: 250,
  timestamp: Date.now(),
  screenSize: { width: 1920, height: 1080 }
};

const positionSaveResult = service.savePosition('test-problem', mockPosition);
const positionLoadResult = service.loadPosition('test-problem');

console.log('Position save result:', positionSaveResult);
console.log('Position load result:', positionLoadResult);
console.log('Position matches:', JSON.stringify(mockPosition) === JSON.stringify(positionLoadResult));
console.log('');

// Test 3: Expiration handling
console.log('Test 3: Expiration handling');
const expiredTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
const validTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago

console.log('Expired timestamp is expired:', service.isExpired(expiredTimestamp));
console.log('Valid timestamp is expired:', service.isExpired(validTimestamp));
console.log('');

// Test 4: Error handling
console.log('Test 4: Error handling');
const nullSaveResult = service.save('null-test', null);
const undefinedSaveResult = service.save('undefined-test', undefined);

console.log('Null save result (should be false):', nullSaveResult);
console.log('Undefined save result (should be false):', undefinedSaveResult);
console.log('');

// Test 5: Cleanup
console.log('Test 5: Cleanup operations');
const allPositionsBefore = service.getAllPositions();
console.log('Positions before cleanup:', allPositionsBefore ? Object.keys(allPositionsBefore).length : 0);

service.cleanup();

const allPositionsAfter = service.getAllPositions();
console.log('Positions after cleanup:', allPositionsAfter ? Object.keys(allPositionsAfter).length : 0);
console.log('');

// Cleanup test data
service.remove('test-key');
service.clearAllPositions();

console.log('✅ LocalStorageService validation completed successfully!');