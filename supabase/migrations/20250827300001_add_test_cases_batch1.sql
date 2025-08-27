-- Add Test Cases Migration - Batch 1
-- Fundamental problems: Array & Hashing, Two Pointers, Binary Search, Key Problems
-- Only adds test cases to problems that currently have NONE

-- Array & Hashing Problems

-- 3Sum
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT '3sum', 'nums = [-1,0,1,2,-1,-4]', '[[-1,-1,2],[-1,0,1]]', 
       '{"nums": [-1,0,1,2,-1,-4]}'::jsonb, '[[-1,-1,2],[-1,0,1]]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = '3sum')
UNION ALL
SELECT '3sum', 'nums = [0,1,1]', '[]', 
       '{"nums": [0,1,1]}'::jsonb, '[]'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = '3sum')
UNION ALL
SELECT '3sum', 'nums = [0,0,0]', '[[0,0,0]]', 
       '{"nums": [0,0,0]}'::jsonb, '[[0,0,0]]'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = '3sum');

-- Encode and Decode Strings
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'encode-and-decode-strings', 'strs = ["hello","world"]', '["hello","world"]', 
       '{"strs": ["hello","world"]}'::jsonb, '["hello","world"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'encode-and-decode-strings')
UNION ALL
SELECT 'encode-and-decode-strings', 'strs = [""]', '[""]', 
       '{"strs": [""]}'::jsonb, '[""]'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'encode-and-decode-strings')
UNION ALL
SELECT 'encode-and-decode-strings', 'strs = []', '[]', 
       '{"strs": []}'::jsonb, '[]'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'encode-and-decode-strings');

-- Longest Consecutive Sequence
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'longest-consecutive-sequence', 'nums = [100,4,200,1,3,2]', '4', 
       '{"nums": [100,4,200,1,3,2]}'::jsonb, '4'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'longest-consecutive-sequence')
UNION ALL
SELECT 'longest-consecutive-sequence', 'nums = [0,3,7,2,5,8,4,6,0,1]', '9', 
       '{"nums": [0,3,7,2,5,8,4,6,0,1]}'::jsonb, '9'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'longest-consecutive-sequence')
UNION ALL
SELECT 'longest-consecutive-sequence', 'nums = []', '0', 
       '{"nums": []}'::jsonb, '0'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'longest-consecutive-sequence');

-- Two Pointers Problems

-- Valid Palindrome
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'valid-palindrome', 's = "A man, a plan, a canal: Panama"', 'true', 
       '{"s": "A man, a plan, a canal: Panama"}'::jsonb, 'true'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'valid-palindrome')
UNION ALL
SELECT 'valid-palindrome', 's = "race a car"', 'false', 
       '{"s": "race a car"}'::jsonb, 'false'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'valid-palindrome')
UNION ALL
SELECT 'valid-palindrome', 's = " "', 'true', 
       '{"s": " "}'::jsonb, 'true'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'valid-palindrome');

-- Two Sum II - Input Array Is Sorted
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'two-sum-ii-input-array-is-sorted', 'numbers = [2,7,11,15], target = 9', '[1,2]', 
       '{"numbers": [2,7,11,15], "target": 9}'::jsonb, '[1,2]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'two-sum-ii-input-array-is-sorted')
UNION ALL
SELECT 'two-sum-ii-input-array-is-sorted', 'numbers = [2,3,4], target = 6', '[1,3]', 
       '{"numbers": [2,3,4], "target": 6}'::jsonb, '[1,3]'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'two-sum-ii-input-array-is-sorted')
UNION ALL
SELECT 'two-sum-ii-input-array-is-sorted', 'numbers = [-1,0], target = -1', '[1,2]', 
       '{"numbers": [-1,0], "target": -1}'::jsonb, '[1,2]'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'two-sum-ii-input-array-is-sorted');

-- Container With Most Water
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'container-with-most-water', 'height = [1,8,6,2,5,4,8,3,7]', '49', 
       '{"height": [1,8,6,2,5,4,8,3,7]}'::jsonb, '49'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'container-with-most-water')
UNION ALL
SELECT 'container-with-most-water', 'height = [1,1]', '1', 
       '{"height": [1,1]}'::jsonb, '1'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'container-with-most-water')
UNION ALL
SELECT 'container-with-most-water', 'height = [4,3,2,1,4]', '16', 
       '{"height": [4,3,2,1,4]}'::jsonb, '16'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'container-with-most-water');

-- Trapping Rain Water
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'trapping-rain-water', 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', '6', 
       '{"height": [0,1,0,2,1,0,1,3,2,1,2,1]}'::jsonb, '6'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'trapping-rain-water')
UNION ALL
SELECT 'trapping-rain-water', 'height = [4,2,0,3,2,5]', '9', 
       '{"height": [4,2,0,3,2,5]}'::jsonb, '9'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'trapping-rain-water')
UNION ALL
SELECT 'trapping-rain-water', 'height = [3,0,2,0,4]', '10', 
       '{"height": [3,0,2,0,4]}'::jsonb, '10'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'trapping-rain-water');

-- Binary Search Problems

-- Search in Rotated Sorted Array
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'search-in-rotated-sorted-array', 'nums = [4,5,6,7,0,1,2], target = 0', '4', 
       '{"nums": [4,5,6,7,0,1,2], "target": 0}'::jsonb, '4'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'search-in-rotated-sorted-array')
UNION ALL
SELECT 'search-in-rotated-sorted-array', 'nums = [4,5,6,7,0,1,2], target = 3', '-1', 
       '{"nums": [4,5,6,7,0,1,2], "target": 3}'::jsonb, '-1'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'search-in-rotated-sorted-array')
UNION ALL
SELECT 'search-in-rotated-sorted-array', 'nums = [1], target = 0', '-1', 
       '{"nums": [1], "target": 0}'::jsonb, '-1'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'search-in-rotated-sorted-array');

-- Find Minimum in Rotated Sorted Array
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'find-minimum-in-rotated-sorted-array', 'nums = [3,4,5,1,2]', '1', 
       '{"nums": [3,4,5,1,2]}'::jsonb, '1'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'find-minimum-in-rotated-sorted-array')
UNION ALL
SELECT 'find-minimum-in-rotated-sorted-array', 'nums = [4,5,6,7,0,1,2]', '0', 
       '{"nums": [4,5,6,7,0,1,2]}'::jsonb, '0'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'find-minimum-in-rotated-sorted-array')
UNION ALL
SELECT 'find-minimum-in-rotated-sorted-array', 'nums = [11,13,15,17]', '11', 
       '{"nums": [11,13,15,17]}'::jsonb, '11'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'find-minimum-in-rotated-sorted-array');

-- Time Based Key-Value Store
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'time-based-key-value-store', 'operations = ["TimeMap", "set", "get", "get", "set", "get", "get"], values = [[], ["foo", "bar", 1], ["foo", 1], ["foo", 3], ["foo", "bar2", 4], ["foo", 4], ["foo", 5]]', '[null, null, "bar", "bar", null, "bar2", "bar2"]', 
       '{"operations": ["TimeMap", "set", "get", "get", "set", "get", "get"], "values": [[], ["foo", "bar", 1], ["foo", 1], ["foo", 3], ["foo", "bar2", 4], ["foo", 4], ["foo", 5]]}'::jsonb, '[null, null, "bar", "bar", null, "bar2", "bar2"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'time-based-key-value-store');

-- Median of Two Sorted Arrays
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'median-of-two-sorted-arrays', 'nums1 = [1,3], nums2 = [2]', '2.0', 
       '{"nums1": [1,3], "nums2": [2]}'::jsonb, '2.0'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'median-of-two-sorted-arrays')
UNION ALL
SELECT 'median-of-two-sorted-arrays', 'nums1 = [1,2], nums2 = [3,4]', '2.5', 
       '{"nums1": [1,2], "nums2": [3,4]}'::jsonb, '2.5'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'median-of-two-sorted-arrays')
UNION ALL
SELECT 'median-of-two-sorted-arrays', 'nums1 = [0,0], nums2 = [0,0]', '0.0', 
       '{"nums1": [0,0], "nums2": [0,0]}'::jsonb, '0.0'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'median-of-two-sorted-arrays');

-- Key Bit Manipulation Problems

-- Missing Number
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'missing-number', 'nums = [3,0,1]', '2', 
       '{"nums": [3,0,1]}'::jsonb, '2'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'missing-number')
UNION ALL
SELECT 'missing-number', 'nums = [0,1]', '2', 
       '{"nums": [0,1]}'::jsonb, '2'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'missing-number')
UNION ALL
SELECT 'missing-number', 'nums = [9,6,4,2,3,5,7,0,1]', '8', 
       '{"nums": [9,6,4,2,3,5,7,0,1]}'::jsonb, '8'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'missing-number');

-- Sum of Two Integers
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'sum-of-two-integers', 'a = 1, b = 2', '3', 
       '{"a": 1, "b": 2}'::jsonb, '3'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'sum-of-two-integers')
UNION ALL
SELECT 'sum-of-two-integers', 'a = 2, b = 3', '5', 
       '{"a": 2, "b": 3}'::jsonb, '5'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'sum-of-two-integers')
UNION ALL
SELECT 'sum-of-two-integers', 'a = -1, b = 1', '0', 
       '{"a": -1, "b": 1}'::jsonb, '0'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'sum-of-two-integers');

-- Key Array Problems

-- Contains Duplicate II
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'contains-duplicate-ii', 'nums = [1,2,3,1], k = 3', 'true', 
       '{"nums": [1,2,3,1], "k": 3}'::jsonb, 'true'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'contains-duplicate-ii')
UNION ALL
SELECT 'contains-duplicate-ii', 'nums = [1,0,1,1], k = 1', 'true', 
       '{"nums": [1,0,1,1], "k": 1}'::jsonb, 'true'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'contains-duplicate-ii')
UNION ALL
SELECT 'contains-duplicate-ii', 'nums = [1,2,3,1,2,3], k = 2', 'false', 
       '{"nums": [1,2,3,1,2,3], "k": 2}'::jsonb, 'false'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'contains-duplicate-ii');

-- Key Greedy Problems

-- Maximum Subarray (likely needs test cases even though it shows ❌)
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 'maximum-subarray', 'nums = [-2,1,-3,4,-1,2,1,-5,4]', '6', 
       '{"nums": [-2,1,-3,4,-1,2,1,-5,4]}'::jsonb, '6'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'maximum-subarray')
UNION ALL
SELECT 'maximum-subarray', 'nums = [1]', '1', 
       '{"nums": [1]}'::jsonb, '1'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'maximum-subarray')
UNION ALL
SELECT 'maximum-subarray', 'nums = [5,4,-1,7,8]', '23', 
       '{"nums": [5,4,-1,7,8]}'::jsonb, '23'::jsonb, false
WHERE NOT EXISTS (SELECT 1 FROM public.test_cases WHERE problem_id = 'maximum-subarray');