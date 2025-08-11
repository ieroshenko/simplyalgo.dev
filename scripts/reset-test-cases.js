#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the API server
dotenv.config({ path: path.resolve(__dirname, '../code-executor-api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetTestCases() {
  console.log('🚀 Resetting test cases with clean JSON data...');
  
  try {
    // First, clear existing test cases
    console.log('🧹 Clearing existing test cases...');
    const { error: deleteError } = await supabase
      .from('test_cases')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('❌ Error clearing test cases:', deleteError);
      return;
    }
    
    console.log('✅ Existing test cases cleared');
    
    // Add JSONB columns (ignore if already exist)
    console.log('🔧 Adding JSONB columns...');
    // Note: We'll handle this through raw SQL if needed, but columns might already exist
    
    // Insert new test cases with JSON data
    console.log('📝 Inserting new test cases...');
    
    const testCasesToInsert = [
      // Merge Two Sorted Lists
      {
        problem_id: 'merge-two-sorted-lists',
        input: 'list1 = [1,2,4], list2 = [1,3,4]',
        expected_output: '[1,1,2,3,4,4]',
        input_json: { list1: [1,2,4], list2: [1,3,4] },
        expected_json: [1,1,2,3,4,4],
        is_example: true
      },
      {
        problem_id: 'merge-two-sorted-lists',
        input: 'list1 = [], list2 = []',
        expected_output: '[]',
        input_json: { list1: [], list2: [] },
        expected_json: [],
        is_example: false
      },
      {
        problem_id: 'merge-two-sorted-lists',
        input: 'list1 = [], list2 = [0]',
        expected_output: '[0]',
        input_json: { list1: [], list2: [0] },
        expected_json: [0],
        is_example: false
      },
      // Two Sum
      {
        problem_id: 'two-sum',
        input: 'nums = [2,7,11,15], target = 9',
        expected_output: '[0,1]',
        input_json: { nums: [2,7,11,15], target: 9 },
        expected_json: [0,1],
        is_example: true
      },
      {
        problem_id: 'two-sum',
        input: 'nums = [3,2,4], target = 6',
        expected_output: '[1,2]',
        input_json: { nums: [3,2,4], target: 6 },
        expected_json: [1,2],
        is_example: false
      },
      // Group Anagrams
      {
        problem_id: 'group-anagrams',
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        expected_output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
        input_json: { strs: ["eat","tea","tan","ate","nat","bat"] },
        expected_json: [["bat"],["nat","tan"],["ate","eat","tea"]],
        is_example: true
      },
      // Valid Anagram
      {
        problem_id: 'valid-anagram',
        input: 's = "anagram", t = "nagaram"',
        expected_output: 'true',
        input_json: { s: "anagram", t: "nagaram" },
        expected_json: true,
        is_example: true
      },
      // Valid Parentheses
      {
        problem_id: 'valid-parentheses',
        input: 's = "()"',
        expected_output: 'true',
        input_json: { s: "()" },
        expected_json: true,
        is_example: true
      }
    ];
    
    // Insert all test cases
    const { error: insertError } = await supabase
      .from('test_cases')
      .insert(testCasesToInsert);
    
    if (insertError) {
      console.error('❌ Error inserting test cases:', insertError);
      return;
    }
    
    console.log(`✅ Successfully inserted ${testCasesToInsert.length} test cases with JSON data`);
    
    // Verify the data
    console.log('🔍 Verifying inserted data...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('test_cases')
      .select(`
        problem_id,
        input_json,
        expected_json,
        is_example,
        problems!inner (title)
      `)
      .limit(5);
    
    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
      return;
    }
    
    console.log('📋 Sample of inserted data:');
    verifyData.forEach(tc => {
      console.log(`  ${tc.problems.title}:`);
      console.log(`    Input: ${JSON.stringify(tc.input_json)}`);
      console.log(`    Expected: ${JSON.stringify(tc.expected_json)}`);
      console.log(`    Example: ${tc.is_example}`);
    });
    
    console.log('\n🎉 Test cases successfully reset with clean JSON data!');
    console.log('   Server will now use structured JSON instead of text parsing');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the reset
if (import.meta.url === `file://${process.argv[1]}`) {
  resetTestCases().catch(console.error);
}