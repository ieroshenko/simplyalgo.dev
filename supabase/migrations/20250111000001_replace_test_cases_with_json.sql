-- Clean slate: Remove existing test cases and recreate with proper JSON structure
-- This is simpler than backfilling and ensures clean, consistent data

-- Clear existing test cases
DELETE FROM public.test_cases;

-- Add JSONB columns to test_cases table
ALTER TABLE public.test_cases 
ADD COLUMN IF NOT EXISTS input_json jsonb,
ADD COLUMN IF NOT EXISTS expected_json jsonb;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_cases_input_json ON public.test_cases USING gin (input_json);
CREATE INDEX IF NOT EXISTS idx_test_cases_expected_json ON public.test_cases USING gin (expected_json);

-- Add comments
COMMENT ON COLUMN public.test_cases.input_json IS 'Structured JSON input parameters, e.g., {"list1": [1,2,4], "list2": [1,3,4]}';
COMMENT ON COLUMN public.test_cases.expected_json IS 'Structured JSON expected output, e.g., [1,1,2,3,4,4] or primitive values';

-- Insert test cases with proper JSON structure

-- Two Sum test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'two-sum'), 'nums = [2,7,11,15], target = 9', '[0,1]', 
 '{"nums": [2,7,11,15], "target": 9}', '[0,1]', true),
((SELECT id FROM problems WHERE id = 'two-sum'), 'nums = [3,2,4], target = 6', '[1,2]',
 '{"nums": [3,2,4], "target": 6}', '[1,2]', false),
((SELECT id FROM problems WHERE id = 'two-sum'), 'nums = [3,3], target = 6', '[0,1]',
 '{"nums": [3,3], "target": 6}', '[0,1]', false);

-- Valid Anagram test cases  
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'valid-anagram'), 's = "anagram", t = "nagaram"', 'true',
 '{"s": "anagram", "t": "nagaram"}', 'true', true),
((SELECT id FROM problems WHERE id = 'valid-anagram'), 's = "rat", t = "car"', 'false',
 '{"s": "rat", "t": "car"}', 'false', false),
((SELECT id FROM problems WHERE id = 'valid-anagram'), 's = "a", t = "ab"', 'false',
 '{"s": "a", "t": "ab"}', 'false', false);

-- Group Anagrams test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'group-anagrams'), 'strs = ["eat","tea","tan","ate","nat","bat"]', '[["bat"],["nat","tan"],["ate","eat","tea"]]',
 '{"strs": ["eat","tea","tan","ate","nat","bat"]}', '[["bat"],["nat","tan"],["ate","eat","tea"]]', true),
((SELECT id FROM problems WHERE id = 'group-anagrams'), 'strs = [""]', '[[""]]',
 '{"strs": [""]}', '[[""]]', false),
((SELECT id FROM problems WHERE id = 'group-anagrams'), 'strs = ["a"]', '[["a"]]',
 '{"strs": ["a"]}', '[["a"]]', false);

-- Valid Parentheses test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'valid-parentheses'), 's = "()"', 'true',
 '{"s": "()"}', 'true', true),
((SELECT id FROM problems WHERE id = 'valid-parentheses'), 's = "()[]{}"', 'true',
 '{"s": "()[]{}""}', 'true', false),
((SELECT id FROM problems WHERE id = 'valid-parentheses'), 's = "(]"', 'false',
 '{"s": "(]"}', 'false', false),
((SELECT id FROM problems WHERE id = 'valid-parentheses'), 's = "([)]"', 'false',
 '{"s": "([)]"}', 'false', false),
((SELECT id FROM problems WHERE id = 'valid-parentheses'), 's = "{[]}"', 'true',
 '{"s": "{[]}"}', 'true', false);

-- Best Time to Buy and Sell Stock test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'best-time-to-buy-and-sell-stock'), 'prices = [7,1,5,3,6,4]', '5',
 '{"prices": [7,1,5,3,6,4]}', '5', true),
((SELECT id FROM problems WHERE id = 'best-time-to-buy-and-sell-stock'), 'prices = [7,6,4,3,1]', '0',
 '{"prices": [7,6,4,3,1]}', '0', false),
((SELECT id FROM problems WHERE id = 'best-time-to-buy-and-sell-stock'), 'prices = [1,2]', '1',
 '{"prices": [1,2]}', '1', false);

-- Merge Two Sorted Lists test cases (ListNode problems)
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'merge-two-sorted-lists'), 'list1 = [1,2,4], list2 = [1,3,4]', '[1,1,2,3,4,4]',
 '{"list1": [1,2,4], "list2": [1,3,4]}', '[1,1,2,3,4,4]', true),
((SELECT id FROM problems WHERE id = 'merge-two-sorted-lists'), 'list1 = [], list2 = []', '[]',
 '{"list1": [], "list2": []}', '[]', false),
((SELECT id FROM problems WHERE id = 'merge-two-sorted-lists'), 'list1 = [], list2 = [0]', '[0]',
 '{"list1": [], "list2": [0]}', '[0]', false);

-- Maximum Subarray test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'maximum-subarray'), 'nums = [-2,1,-3,4,-1,2,1,-5,4]', '6',
 '{"nums": [-2,1,-3,4,-1,2,1,-5,4]}', '6', true),
((SELECT id FROM problems WHERE id = 'maximum-subarray'), 'nums = [1]', '1',
 '{"nums": [1]}', '1', false),
((SELECT id FROM problems WHERE id = 'maximum-subarray'), 'nums = [5,4,-1,7,8]', '23',
 '{"nums": [5,4,-1,7,8]}', '23', false);

-- Contains Duplicate test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'contains-duplicate'), 'nums = [1,2,3,1]', 'true',
 '{"nums": [1,2,3,1]}', 'true', true),
((SELECT id FROM problems WHERE id = 'contains-duplicate'), 'nums = [1,2,3,4]', 'false',
 '{"nums": [1,2,3,4]}', 'false', false),
((SELECT id FROM problems WHERE id = 'contains-duplicate'), 'nums = [1,1,1,3,3,4,3,2,4,2]', 'true',
 '{"nums": [1,1,1,3,3,4,3,2,4,2]}', 'true', false);

-- Product of Array Except Self test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'product-of-array-except-self'), 'nums = [1,2,3,4]', '[24,12,8,6]',
 '{"nums": [1,2,3,4]}', '[24,12,8,6]', true),
((SELECT id FROM problems WHERE id = 'product-of-array-except-self'), 'nums = [-1,1,0,-3,3]', '[0,0,9,0,0]',
 '{"nums": [-1,1,0,-3,3]}', '[0,0,9,0,0]', false);

-- Maximum Product Subarray test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'maximum-product-subarray'), 'nums = [2,3,-2,4]', '6',
 '{"nums": [2,3,-2,4]}', '6', true),
((SELECT id FROM problems WHERE id = 'maximum-product-subarray'), 'nums = [-2,0,-1]', '0',
 '{"nums": [-2,0,-1]}', '0', false),
((SELECT id FROM problems WHERE id = 'maximum-product-subarray'), 'nums = [-2,3,-4]', '24',
 '{"nums": [-2,3,-4]}', '24', false);