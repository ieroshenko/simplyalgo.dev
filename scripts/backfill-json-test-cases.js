#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the API server
dotenv.config({ path: path.resolve(__dirname, '../code-executor-api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Parse legacy input string to JSON object
 */
function parseLegacyInput(inputString, functionSignature) {
  console.log('Parsing:', inputString);
  
  // Extract parameter names from function signature
  const paramMatch = functionSignature.match(/def\s+\w+\s*\(([^)]+)\)/);
  if (!paramMatch) {
    console.warn('Could not parse function signature:', functionSignature);
    return {};
  }
  
  const params = paramMatch[1]
    .split(',')
    .map(p => p.split(':')[0].trim())
    .filter(p => p !== 'self');
  
  console.log('Parameters:', params);
  
  const inputParams = {};
  
  // Handle format: "list1 = [1,2,4], list2 = [1,3,4]"
  if (inputString.includes(' = ')) {
    // Split by comma but handle arrays properly
    const parts = [];
    let current = '';
    let bracketDepth = 0;
    let insideQuotes = false;
    
    for (let i = 0; i < inputString.length; i++) {
      const char = inputString[i];
      
      if (char === '"' && inputString[i-1] !== '\\') {
        insideQuotes = !insideQuotes;
      } else if (!insideQuotes) {
        if (char === '[' || char === '{') bracketDepth++;
        else if (char === ']' || char === '}') bracketDepth--;
      }
      
      if (char === ',' && !insideQuotes && bracketDepth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());
    
    console.log('Split into parts:', parts);
    
    for (const part of parts) {
      if (part.includes(' = ')) {
        const [paramName, paramValue] = part.split(' = ', 2);
        const cleanParamName = paramName.trim();
        const cleanParamValue = paramValue.trim();
        
        try {
          inputParams[cleanParamName] = JSON.parse(cleanParamValue);
        } catch {
          // Remove quotes if it's a quoted string
          inputParams[cleanParamName] = cleanParamValue.replace(/^"(.*)"$/, '$1');
        }
      }
    }
  } else {
    // Format: positional values on separate lines
    const lines = inputString.split('\n').map(line => line.trim()).filter(line => line);
    for (let i = 0; i < Math.min(params.length, lines.length); i++) {
      try {
        inputParams[params[i]] = JSON.parse(lines[i]);
      } catch {
        inputParams[params[i]] = lines[i].replace(/^"(.*)"$/, '$1');
      }
    }
  }
  
  console.log('Parsed to:', inputParams);
  return inputParams;
}

/**
 * Parse legacy expected output to JSON
 */
function parseLegacyExpected(expectedString) {
  try {
    return JSON.parse(expectedString);
  } catch {
    return expectedString;
  }
}

/**
 * Backfill JSON columns for all test cases
 */
async function backfillTestCases() {
  console.log('🚀 Starting test case JSON backfill...');
  
  // Get all test cases that don't have JSON data yet
  const { data: testCases, error: fetchError } = await supabase
    .from('test_cases')
    .select(`
      id, 
      input, 
      expected_output, 
      input_json, 
      expected_json,
      problems!inner (
        id,
        title,
        function_signature
      )
    `)
    .is('input_json', null)
    .is('expected_json', null);
  
  if (fetchError) {
    console.error('❌ Error fetching test cases:', fetchError);
    return;
  }
  
  console.log(`📋 Found ${testCases.length} test cases to migrate`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const tc of testCases) {
    try {
      console.log(`\n🔄 Processing test case ${tc.id} for problem: ${tc.problems.title}`);
      
      // Parse legacy input and expected
      const inputJson = parseLegacyInput(tc.input, tc.problems.function_signature);
      const expectedJson = parseLegacyExpected(tc.expected_output);
      
      // Update the database
      const { error: updateError } = await supabase
        .from('test_cases')
        .update({
          input_json: inputJson,
          expected_json: expectedJson
        })
        .eq('id', tc.id);
      
      if (updateError) {
        console.error(`❌ Error updating test case ${tc.id}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Migrated test case ${tc.id}`);
        console.log(`   Input: ${JSON.stringify(inputJson)}`);
        console.log(`   Expected: ${JSON.stringify(expectedJson)}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing test case ${tc.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Migration complete:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📋 Total: ${testCases.length}`);
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillTestCases().catch(console.error);
}