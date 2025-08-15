-- Clean slate: Remove existing test cases and recreate with proper JSON structure

-- Clear existing test cases
DELETE FROM public.test_cases;

-- Add JSONB columns to test_cases table
ALTER TABLE public.test_cases 
ADD COLUMN IF NOT EXISTS input_json jsonb,
ADD COLUMN IF NOT EXISTS expected_json jsonb;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_cases_input_json ON public.test_cases USING gin (input_json);
CREATE INDEX IF NOT EXISTS idx_test_cases_expected_json ON public.test_cases USING gin (expected_json);

-- Insert test cases with proper JSON structure

-- Merge Two Sorted Lists test cases (the one we're currently testing)
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'merge-two-sorted-lists'), 'list1 = [1,2,4], list2 = [1,3,4]', '[1,1,2,3,4,4]',
 '{"list1": [1,2,4], "list2": [1,3,4]}', '[1,1,2,3,4,4]', true),
((SELECT id FROM problems WHERE id = 'merge-two-sorted-lists'), 'list1 = [], list2 = []', '[]',
 '{"list1": [], "list2": []}', '[]', false),
((SELECT id FROM problems WHERE id = 'merge-two-sorted-lists'), 'list1 = [], list2 = [0]', '[0]',
 '{"list1": [], "list2": [0]}', '[0]', false);

-- Two Sum test cases  
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'two-sum'), 'nums = [2,7,11,15], target = 9', '[0,1]', 
 '{"nums": [2,7,11,15], "target": 9}', '[0,1]', true),
((SELECT id FROM problems WHERE id = 'two-sum'), 'nums = [3,2,4], target = 6', '[1,2]',
 '{"nums": [3,2,4], "target": 6}', '[1,2]', false),
((SELECT id FROM problems WHERE id = 'two-sum'), 'nums = [3,3], target = 6', '[0,1]',
 '{"nums": [3,3], "target": 6}', '[0,1]', false);

-- Group Anagrams test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'group-anagrams'), 'strs = ["eat","tea","tan","ate","nat","bat"]', '[["bat"],["nat","tan"],["ate","eat","tea"]]',
 '{"strs": ["eat","tea","tan","ate","nat","bat"]}', '[["bat"],["nat","tan"],["ate","eat","tea"]]', true),
((SELECT id FROM problems WHERE id = 'group-anagrams'), 'strs = [""]', '[[""]]',
 '{"strs": [""]}', '[[""]]', false),
((SELECT id FROM problems WHERE id = 'group-anagrams'), 'strs = ["a"]', '[["a"]]',
 '{"strs": ["a"]}', '[["a"]]', false);

-- Valid Anagram test cases  
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'valid-anagram'), 's = "anagram", t = "nagaram"', 'true',
 '{"s": "anagram", "t": "nagaram"}', 'true', true),
((SELECT id FROM problems WHERE id = 'valid-anagram'), 's = "rat", t = "car"', 'false',
 '{"s": "rat", "t": "car"}', 'false', false);

-- Valid Parentheses test cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example) VALUES
((SELECT id FROM problems WHERE id = 'valid-parentheses'), 's = "()"', 'true',
 '{"s": "()"}', 'true', true),
((SELECT id FROM problems WHERE id = 'valid-parentheses'), 's = "()[]{}"', 'true',
 '{"s": "()[]{}""}', 'true', false),
((SELECT id FROM problems WHERE id = 'valid-parentheses'), 's = "(]"', 'false',
 '{"s": "(]"}', 'false', false);