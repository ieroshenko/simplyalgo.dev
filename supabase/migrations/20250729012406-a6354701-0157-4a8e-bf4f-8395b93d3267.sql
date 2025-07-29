-- Complete Blind 75 Problems Migration - Part 1
-- Adding remaining categories and first batch of problems

-- First, add missing categories
INSERT INTO categories (name, color, description, sort_order) VALUES
('Tries', '#FF6B6B', 'Trie data structure problems for efficient string operations', 7),
('Heap / Priority Queue', '#4ECDC4', 'Heap and priority queue problems for efficient data access', 8),
('Backtracking', '#45B7D1', 'Backtracking algorithms for exploring solution spaces', 9),
('Advanced Graphs', '#96CEB4', 'Advanced graph algorithms including topological sorting', 10),
('2-D Dynamic Programming', '#FFEAA7', 'Two-dimensional dynamic programming problems', 11),
('Greedy', '#DDA0DD', 'Greedy algorithm problems for optimal solutions', 12),
('Intervals', '#98D8C8', 'Interval manipulation and merging problems', 13),
('Math & Geometry', '#F7DC6F', 'Mathematical and geometric algorithm problems', 14),
('Bit Manipulation', '#BB8FCE', 'Bit manipulation and bitwise operations', 15)
ON CONFLICT (name) DO NOTHING;

-- Insert remaining Array & Hashing problems
INSERT INTO problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate) 
SELECT 
  'valid-anagram', 'Valid Anagram', 'Easy', c.id,
  'Given two strings s and t, return true if t is an anagram of s, and false otherwise.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
  'def isAnagram(self, s: str, t: str) -> bool:',
  '[{"input": "s = \"anagram\", t = \"nagaram\"", "output": "true"}, {"input": "s = \"rat\", t = \"car\"", "output": "false"}]'::jsonb,
  '["1 <= s.length, t.length <= 5 * 10^4", "s and t consist of lowercase English letters"]'::jsonb,
  '["Think about character frequency", "Sort both strings or use character count"]'::jsonb,
  1245, 67, 63.2
FROM categories c WHERE c.name = 'Array & Hashing'
ON CONFLICT (id) DO NOTHING;

INSERT INTO problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate)
SELECT 
  'group-anagrams', 'Group Anagrams', 'Medium', c.id,
  'Given an array of strings strs, group the anagrams together. You can return the answer in any order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
  'def groupAnagrams(self, strs: List[str]) -> List[List[str]]:',
  '[{"input": "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", "output": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]"}]'::jsonb,
  '["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100", "strs[i] consists of lowercase English letters"]'::jsonb,
  '["Use sorted string as key", "Character frequency can also work as key"]'::jsonb,
  2156, 89, 67.8
FROM categories c WHERE c.name = 'Array & Hashing'
ON CONFLICT (id) DO NOTHING;

INSERT INTO problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate)
SELECT 
  'top-k-frequent-elements', 'Top K Frequent Elements', 'Medium', c.id,
  'Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.',
  'def topKFrequent(self, nums: List[int], k: int) -> List[int]:',
  '[{"input": "nums = [1,1,1,2,2,3], k = 2", "output": "[1,2]"}, {"input": "nums = [1], k = 1", "output": "[1]"}]'::jsonb,
  '["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4", "k is in the range [1, the number of unique elements in the array]"]'::jsonb,
  '["Use hash map for frequency counting", "Heap or bucket sort for finding top k"]'::jsonb,
  3456, 134, 64.2
FROM categories c WHERE c.name = 'Array & Hashing'
ON CONFLICT (id) DO NOTHING;

INSERT INTO problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate)
SELECT 
  'product-of-array-except-self', 'Product of Array Except Self', 'Medium', c.id,
  'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in O(n) time and without using the division operation.',
  'def productExceptSelf(self, nums: List[int]) -> List[int]:',
  '[{"input": "nums = [1,2,3,4]", "output": "[24,12,8,6]"}, {"input": "nums = [-1,1,0,-3,3]", "output": "[0,0,9,0,0]"}]'::jsonb,
  '["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30", "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer"]'::jsonb,
  '["Think about prefix and suffix products", "Can you do it in one pass?"]'::jsonb,
  4789, 456, 64.9
FROM categories c WHERE c.name = 'Array & Hashing'
ON CONFLICT (id) DO NOTHING;

INSERT INTO problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate)
SELECT 
  'encode-and-decode-strings', 'Encode and Decode Strings', 'Medium', c.id,
  'Design an algorithm to encode a list of strings to a string. The encoded string is then sent over the network and is decoded back to the original list of strings.',
  'def encode(self, strs: List[str]) -> str:\ndef decode(self, s: str) -> List[str]:',
  '[{"input": "dummy_input = [\"lint\",\"code\",\"love\",\"you\"]", "output": "[\"lint\",\"code\",\"love\",\"you\"]"}]'::jsonb,
  '["0 <= strs.length <= 200", "0 <= strs[i].length <= 200", "strs[i] contains any possible characters out of 256 valid ASCII characters"]'::jsonb,
  '["Use delimiter with length encoding", "Consider edge cases with special characters"]'::jsonb,
  789, 234, 67.1
FROM categories c WHERE c.name = 'Array & Hashing'
ON CONFLICT (id) DO NOTHING;

INSERT INTO problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate)
SELECT 
  'longest-consecutive-sequence', 'Longest Consecutive Sequence', 'Hard', c.id,
  'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.

You must write an algorithm that runs in O(n) time.',
  'def longestConsecutive(self, nums: List[int]) -> int:',
  '[{"input": "nums = [100,4,200,1,3,2]", "output": "4", "explanation": "The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4."}, {"input": "nums = [0,3,7,2,5,8,4,6,0,1]", "output": "9"}]'::jsonb,
  '["0 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"]'::jsonb,
  '["Use set for O(1) lookup", "Only start counting from sequence beginnings"]'::jsonb,
  2345, 89, 48.7
FROM categories c WHERE c.name = 'Array & Hashing'
ON CONFLICT (id) DO NOTHING;

-- Add test cases for new problems
INSERT INTO test_cases (problem_id, input, expected_output, is_example, explanation) VALUES
-- Valid Anagram test cases
('valid-anagram', 's = "anagram", t = "nagaram"', 'true', true, 'Both strings contain the same characters with same frequency'),
('valid-anagram', 's = "rat", t = "car"', 'false', true, 'Different characters'),
('valid-anagram', 's = "listen", t = "silent"', 'true', false, 'Anagram test case'),
('valid-anagram', 's = "hello", t = "bello"', 'false', false, 'Different characters'),

-- Group Anagrams test cases  
('group-anagrams', 'strs = ["eat","tea","tan","ate","nat","bat"]', '[["bat"],["nat","tan"],["ate","eat","tea"]]', true, 'Group strings that are anagrams'),
('group-anagrams', 'strs = [""]', '[[""]]', false, 'Single empty string'),
('group-anagrams', 'strs = ["a"]', '[["a"]]', false, 'Single character'),

-- Top K Frequent Elements test cases
('top-k-frequent-elements', 'nums = [1,1,1,2,2,3], k = 2', '[1,2]', true, 'Return the 2 most frequent elements'),
('top-k-frequent-elements', 'nums = [1], k = 1', '[1]', true, 'Single element array'),
('top-k-frequent-elements', 'nums = [1,2], k = 2', '[1,2]', false, 'All elements have same frequency'),

-- Product of Array Except Self test cases
('product-of-array-except-self', 'nums = [1,2,3,4]', '[24,12,8,6]', true, 'Basic test case'),
('product-of-array-except-self', 'nums = [-1,1,0,-3,3]', '[0,0,9,0,0]', true, 'Array with zero'),
('product-of-array-except-self', 'nums = [2,3,4]', '[12,8,6]', false, 'No zeros'),

-- Encode and Decode Strings test cases
('encode-and-decode-strings', 'strs = ["lint","code","love","you"]', '["lint","code","love","you"]', true, 'Basic encoding and decoding'),
('encode-and-decode-strings', 'strs = [""]', '[""]', false, 'Empty string'),
('encode-and-decode-strings', 'strs = []', '[]', false, 'Empty array'),

-- Longest Consecutive Sequence test cases
('longest-consecutive-sequence', 'nums = [100,4,200,1,3,2]', '4', true, 'Sequence [1,2,3,4] has length 4'),
('longest-consecutive-sequence', 'nums = [0,3,7,2,5,8,4,6,0,1]', '9', true, 'Sequence [0,1,2,3,4,5,6,7,8] has length 9'),
('longest-consecutive-sequence', 'nums = []', '0', false, 'Empty array'),
('longest-consecutive-sequence', 'nums = [1,2,0,1]', '3', false, 'Sequence [0,1,2] with duplicates');