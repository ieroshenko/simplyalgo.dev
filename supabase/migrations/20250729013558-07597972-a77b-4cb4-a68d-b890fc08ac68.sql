-- Blind 75 Migration - Final Part: Last Problems
-- Complete the final Math & Geometry and Bit Manipulation problems

INSERT INTO problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate) VALUES

-- Math & Geometry (5 problems)
('rotate-image', 'Rotate Image', 'Medium',
 (SELECT id FROM categories WHERE name = 'Math & Geometry'),
 'You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).',
 'def rotate(self, matrix: List[List[int]]) -> None:',
 '[{"input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]", "output": "[[7,4,1],[8,5,2],[9,6,3]]"}]'::jsonb,
 '["n == matrix.length == matrix[i].length", "1 <= n <= 20", "You have to rotate the image in-place"]'::jsonb,
 '["Transpose then reverse each row", "Or rotate layer by layer"]'::jsonb,
 5678, 234, 70.1),

('spiral-matrix', 'Spiral Matrix', 'Medium',
 (SELECT id FROM categories WHERE name = 'Math & Geometry'),
 'Given an m x n matrix, return all elements of the matrix in spiral order.',
 'def spiralOrder(self, matrix: List[List[int]]) -> List[int]:',
 '[{"input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]", "output": "[1,2,3,6,9,8,7,4,5]"}]'::jsonb,
 '["m == matrix.length", "n == matrix[i].length", "1 <= m, n <= 10"]'::jsonb,
 '["Track boundaries: top, bottom, left, right", "Move in spiral direction"]'::jsonb,
 4567, 167, 48.9),

('set-matrix-zeroes', 'Set Matrix Zeroes', 'Medium',
 (SELECT id FROM categories WHERE name = 'Math & Geometry'),
 'Given an m x n integer matrix, if an element is 0, set its entire row and column to 0s.',
 'def setZeroes(self, matrix: List[List[int]]) -> None:',
 '[{"input": "matrix = [[1,1,1],[1,0,1],[1,1,1]]", "output": "[[1,0,1],[0,0,0],[1,0,1]]"}]'::jsonb,
 '["m == matrix.length", "n == matrix[0].length", "1 <= m, n <= 200", "Do it in-place"]'::jsonb,
 '["Use first row and column as markers", "Handle first row/column separately"]'::jsonb,
 6789, 234, 52.4),

('happy-number', 'Happy Number', 'Easy',
 (SELECT id FROM categories WHERE name = 'Math & Geometry'),
 'Write an algorithm to determine if a number n is happy.',
 'def isHappy(self, n: int) -> bool:',
 '[{"input": "n = 19", "output": "true"}, {"input": "n = 2", "output": "false"}]'::jsonb,
 '["1 <= n <= 2^31 - 1"]'::jsonb,
 '["Use set to detect cycles", "Or use Floyd cycle detection"]'::jsonb,
 3456, 123, 55.7),

('plus-one', 'Plus One', 'Easy',
 (SELECT id FROM categories WHERE name = 'Math & Geometry'),
 'You are given a large integer represented as an integer array digits.',
 'def plusOne(self, digits: List[int]) -> List[int]:',
 '[{"input": "digits = [1,2,3]", "output": "[1,2,4]"}, {"input": "digits = [9]", "output": "[1,0]"}]'::jsonb,
 '["1 <= digits.length <= 100", "0 <= digits[i] <= 9", "digits does not contain any leading 0s"]'::jsonb,
 '["Handle carry from right to left", "Special case: all 9s"]'::jsonb,
 2890, 89, 43.8),

-- Bit Manipulation (5 problems)
('number-of-1-bits', 'Number of 1 Bits', 'Easy',
 (SELECT id FROM categories WHERE name = 'Bit Manipulation'),
 'Write a function that takes an unsigned integer and returns the number of 1 bits it has.',
 'def hammingWeight(self, n: int) -> int:',
 '[{"input": "n = 00000000000000000000000000001011", "output": "3"}, {"input": "n = 00000000000000000000000010000000", "output": "1"}]'::jsonb,
 '["The input must be a binary string of length 32"]'::jsonb,
 '["Use n & (n-1) to remove rightmost 1", "Or use built-in bin(n).count(1)"]'::jsonb,
 4567, 167, 65.4),

('counting-bits', 'Counting Bits', 'Easy',
 (SELECT id FROM categories WHERE name = 'Bit Manipulation'),
 'Given an integer n, return an array ans of length n + 1 such that ans[i] is the number of 1s in the binary representation of i.',
 'def countBits(self, n: int) -> List[int]:',
 '[{"input": "n = 2", "output": "[0,1,1]"}, {"input": "n = 5", "output": "[0,1,1,2,1,2]"}]'::jsonb,
 '["0 <= n <= 10^5"]'::jsonb,
 '["DP: ans[i] = ans[i >> 1] + (i & 1)", "Or use ans[i] = ans[i & (i-1)] + 1"]'::jsonb,
 5678, 123, 76.8),

('reverse-bits', 'Reverse Bits', 'Easy',
 (SELECT id FROM categories WHERE name = 'Bit Manipulation'),
 'Reverse bits of a given 32 bits unsigned integer.',
 'def reverseBits(self, n: int) -> int:',
 '[{"input": "n = 00000010100101000001111010011100", "output": "964176192"}, {"input": "n = 11111111111111111111111111111101", "output": "3221225471"}]'::jsonb,
 '["The input must be a binary string of length 32"]'::jsonb,
 '["Process bit by bit", "Shift result left and add current bit"]'::jsonb,
 3456, 234, 51.2),

('missing-number', 'Missing Number', 'Easy',
 (SELECT id FROM categories WHERE name = 'Bit Manipulation'),
 'Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.',
 'def missingNumber(self, nums: List[int]) -> int:',
 '[{"input": "nums = [3,0,1]", "output": "2"}, {"input": "nums = [0,1]", "output": "2"}]'::jsonb,
 '["n == nums.length", "1 <= n <= 10^4", "0 <= nums[i] <= n"]'::jsonb,
 '["XOR all numbers and indices", "Or use sum formula: n*(n+1)/2 - sum(nums)"]'::jsonb,
 6789, 167, 61.9),

('sum-of-two-integers', 'Sum of Two Integers', 'Medium',
 (SELECT id FROM categories WHERE name = 'Bit Manipulation'),
 'Given two integers a and b, return the sum of the two integers without using the operators + and -.',
 'def getSum(self, a: int, b: int) -> int:',
 '[{"input": "a = 1, b = 2", "output": "3"}, {"input": "a = 2, b = 3", "output": "5"}]'::jsonb,
 '["-1000 <= a, b <= 1000"]'::jsonb,
 '["Use XOR for sum without carry", "Use AND and shift for carry", "Repeat until no carry"]'::jsonb,
 4321, 345, 50.8)

ON CONFLICT (id) DO NOTHING;

-- Add some comprehensive test cases for the new problems
INSERT INTO test_cases (problem_id, input, expected_output, is_example, explanation) VALUES
-- Valid Anagram test cases
('valid-anagram', 's = "anagram", t = "nagaram"', 'true', true, 'Both strings contain the same characters with same frequency'),
('valid-anagram', 's = "rat", t = "car"', 'false', true, 'Different characters'),

-- Group Anagrams test cases
('group-anagrams', 'strs = ["eat","tea","tan","ate","nat","bat"]', '[["bat"],["nat","tan"],["ate","eat","tea"]]', true, 'Group strings that are anagrams'),

-- 3Sum test cases
('3sum', 'nums = [-1,0,1,2,-1,-4]', '[[-1,-1,2],[-1,0,1]]', true, 'Find triplets that sum to zero'),

-- Container With Most Water test cases
('container-with-most-water', 'height = [1,8,6,2,5,4,8,3,7]', '49', true, 'Maximum area between two lines'),

-- Longest Substring Without Repeating Characters
('longest-substring-without-repeating-characters', 's = "abcabcbb"', '3', true, 'Length of longest substring without repeating characters'),

-- Min Stack test cases
('min-stack', 'operations = ["MinStack","push","push","push","getMin","pop","top","getMin"]', '[null,null,null,null,-3,null,0,-2]', true, 'Stack with constant time min retrieval'),

-- Climbing Stairs test cases
('climbing-stairs', 'n = 2', '2', true, 'Number of ways to climb stairs'),
('climbing-stairs', 'n = 3', '3', true, 'Number of ways to climb stairs'),

-- Number of 1 Bits test cases
('number-of-1-bits', 'n = 11', '3', true, 'Count 1 bits in binary representation'),

-- Missing Number test cases  
('missing-number', 'nums = [3,0,1]', '2', true, 'Find missing number in range'),
('missing-number', 'nums = [0,1]', '2', true, 'Find missing number in range');