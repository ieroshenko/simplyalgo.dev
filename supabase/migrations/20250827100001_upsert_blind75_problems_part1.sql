-- Complete Blind 75 Problems Migration (UPSERT Version) - Part 1
-- Updates existing problems or inserts new ones with full metadata
-- Based on neetcode.io Blind 75 structure

-- Ensure all categories exist first
INSERT INTO public.categories (name, color) VALUES 
  ('Array', '#3B82F6'),
  ('Two Pointers', '#8B5CF6'), 
  ('Stack', '#EF4444'),
  ('Binary Search', '#F59E0B'),
  ('Sliding Window', '#10B981'),
  ('Linked List', '#EC4899'),
  ('Trees', '#84CC16'),
  ('Tries', '#06B6D4'),
  ('Heap / Priority Queue', '#F97316'),
  ('Backtracking', '#6366F1'),
  ('Graphs', '#14B8A6'),
  ('Advanced Graphs', '#059669'),
  ('1-D Dynamic Programming', '#DC2626'),
  ('2-D Dynamic Programming', '#B91C1C'),
  ('Greedy', '#65A30D'),
  ('Intervals', '#7C3AED'),
  ('Math & Geometry', '#0EA5E9'),
  ('Bit Manipulation', '#9333EA')
ON CONFLICT (name) DO NOTHING;

-- Array Problems - UPSERT for existing/new problems

-- Contains Duplicate II
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature,
  examples, constraints, recommended_time_complexity, recommended_space_complexity
) VALUES (
  'contains-duplicate-ii',
  'Contains Duplicate II',
  'Easy',
  (SELECT id FROM public.categories WHERE name = 'Array' LIMIT 1),
  'Given an integer array nums and an integer k, return true if there are two distinct indices i and j in the array such that nums[i] == nums[j] and abs(i - j) <= k.',
  'def containsNearbyDuplicate(self, nums: List[int], k: int) -> bool:',
  '[
    {"input": "nums = [1,2,3,1], k = 3", "output": "true", "explanation": "nums[0] and nums[3] are equal and abs(0 - 3) = 3 <= k = 3"},
    {"input": "nums = [1,0,1,1], k = 1", "output": "true", "explanation": "nums[2] and nums[3] are equal and abs(2 - 3) = 1 <= k = 1"},
    {"input": "nums = [1,2,3,1,2,3], k = 2", "output": "false", "explanation": "No two equal elements are within distance k"}
  ]'::jsonb,
  '[
    "1 <= nums.length <= 10^5",
    "-10^9 <= nums[i] <= 10^9", 
    "0 <= k <= 10^5"
  ]'::jsonb,
  'O(n)',
  'O(min(n, k))'
) 
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  function_signature = EXCLUDED.function_signature,
  examples = EXCLUDED.examples,
  constraints = EXCLUDED.constraints,
  recommended_time_complexity = EXCLUDED.recommended_time_complexity,
  recommended_space_complexity = EXCLUDED.recommended_space_complexity;

-- 3Sum
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature,
  examples, constraints, recommended_time_complexity, recommended_space_complexity
) VALUES (
  '3sum',
  '3Sum',
  'Medium',
  (SELECT id FROM public.categories WHERE name = 'Array' LIMIT 1),
  'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\n\nNotice that the solution set must not contain duplicate triplets.',
  'def threeSum(self, nums: List[int]) -> List[List[int]]:',
  '[
    {"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]", "explanation": "The distinct triplets are [-1,0,1] and [-1,-1,2]. Notice that the order of the output and the order of the triplets does not matter."},
    {"input": "nums = [0,1,1]", "output": "[]", "explanation": "The only possible triplet does not sum up to 0."},
    {"input": "nums = [0,0,0]", "output": "[[0,0,0]]", "explanation": "The only possible triplet sums up to 0."}
  ]'::jsonb,
  '[
    "3 <= nums.length <= 3000",
    "-10^5 <= nums[i] <= 10^5"
  ]'::jsonb,
  'O(n^2)',
  'O(1)'
) 
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  function_signature = EXCLUDED.function_signature,
  examples = EXCLUDED.examples,
  constraints = EXCLUDED.constraints,
  recommended_time_complexity = EXCLUDED.recommended_time_complexity,
  recommended_space_complexity = EXCLUDED.recommended_space_complexity;

-- Container With Most Water
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature,
  examples, constraints, recommended_time_complexity, recommended_space_complexity
) VALUES (
  'container-with-most-water',
  'Container With Most Water',
  'Medium',
  (SELECT id FROM public.categories WHERE name = 'Array' LIMIT 1),
  'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.\n\nNotice that you may not slant the container.',
  'def maxArea(self, height: List[int]) -> int:',
  '[
    {"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49", "explanation": "The vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water (blue section) the container can contain is 49."},
    {"input": "height = [1,1]", "output": "1", "explanation": "The max area is 1."}
  ]'::jsonb,
  '[
    "n == height.length",
    "2 <= n <= 10^5",
    "0 <= height[i] <= 10^4"
  ]'::jsonb,
  'O(n)',
  'O(1)'
) 
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  function_signature = EXCLUDED.function_signature,
  examples = EXCLUDED.examples,
  constraints = EXCLUDED.constraints,
  recommended_time_complexity = EXCLUDED.recommended_time_complexity,
  recommended_space_complexity = EXCLUDED.recommended_space_complexity;

-- Search in Rotated Sorted Array
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature,
  examples, constraints, recommended_time_complexity, recommended_space_complexity
) VALUES (
  'search-in-rotated-sorted-array',
  'Search in Rotated Sorted Array',
  'Medium',
  (SELECT id FROM public.categories WHERE name = 'Binary Search' LIMIT 1),
  'There is an integer array nums sorted in ascending order (with distinct values).\n\nPrior to being passed to your function, nums is possibly rotated at an unknown pivot index k (1 <= k < nums.length) such that the resulting array is [nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]] (0-indexed). For example, [0,1,2,4,5,6,7] might be rotated at pivot index 3 and become [4,5,6,7,0,1,2].\n\nGiven the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.\n\nYou must write an algorithm with O(log n) runtime complexity.',
  'def search(self, nums: List[int], target: int) -> int:',
  '[
    {"input": "nums = [4,5,6,7,0,1,2], target = 0", "output": "4", "explanation": "The target 0 is at index 4"},
    {"input": "nums = [4,5,6,7,0,1,2], target = 3", "output": "-1", "explanation": "3 is not in the array"},
    {"input": "nums = [1], target = 0", "output": "-1", "explanation": "0 is not in the array"}
  ]'::jsonb,
  '[
    "1 <= nums.length <= 5000",
    "-10^4 <= nums[i] <= 10^4",
    "All values of nums are unique",
    "nums is an ascending array that is possibly rotated",
    "-10^4 <= target <= 10^4"
  ]'::jsonb,
  'O(log n)',
  'O(1)'
) 
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  function_signature = EXCLUDED.function_signature,
  examples = EXCLUDED.examples,
  constraints = EXCLUDED.constraints,
  recommended_time_complexity = EXCLUDED.recommended_time_complexity,
  recommended_space_complexity = EXCLUDED.recommended_space_complexity;

-- Find Minimum in Rotated Sorted Array
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature,
  examples, constraints, recommended_time_complexity, recommended_space_complexity
) VALUES (
  'find-minimum-in-rotated-sorted-array',
  'Find Minimum in Rotated Sorted Array',
  'Medium',
  (SELECT id FROM public.categories WHERE name = 'Binary Search' LIMIT 1),
  'Suppose an array of length n sorted in ascending order is rotated between 1 and n times. For example, the array nums = [0,1,2,4,5,6,7] might become:\n\n[4,5,6,7,0,1,2] if it was rotated 4 times.\n[0,1,2,4,5,6,7] if it was rotated 7 times.\nNotice that rotating an array [a[0], a[1], a[2], ..., a[n-1]] 1 time results in the array [a[n-1], a[0], a[1], a[2], ..., a[n-2]].\n\nGiven the sorted rotated array nums of unique elements, return the minimum element of this array.\n\nYou must write an algorithm that runs in O(log n) time.',
  'def findMin(self, nums: List[int]) -> int:',
  '[
    {"input": "nums = [3,4,5,1,2]", "output": "1", "explanation": "The original array was [1,2,3,4,5] rotated 3 times."},
    {"input": "nums = [4,5,6,7,0,1,2]", "output": "0", "explanation": "The original array was [0,1,2,4,5,6,7] and it was rotated 4 times."},
    {"input": "nums = [11,13,15,17]", "output": "11", "explanation": "The original array was [11,13,15,17] and it was rotated 4 times."}
  ]'::jsonb,
  '[
    "n == nums.length",
    "1 <= n <= 5000",
    "-5000 <= nums[i] <= 5000",
    "All the integers of nums are unique",
    "nums is sorted and rotated between 1 and n times"
  ]'::jsonb,
  'O(log n)',
  'O(1)'
) 
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  function_signature = EXCLUDED.function_signature,
  examples = EXCLUDED.examples,
  constraints = EXCLUDED.constraints,
  recommended_time_complexity = EXCLUDED.recommended_time_complexity,
  recommended_space_complexity = EXCLUDED.recommended_space_complexity;

-- Two Pointers Problems

-- Valid Palindrome
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature,
  examples, constraints, recommended_time_complexity, recommended_space_complexity
) VALUES (
  'valid-palindrome',
  'Valid Palindrome',
  'Easy',
  (SELECT id FROM public.categories WHERE name = 'Two Pointers' LIMIT 1),
  'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string s, return true if it is a palindrome, or false otherwise.',
  'def isPalindrome(self, s: str) -> bool:',
  '[
    {"input": "s = \"A man, a plan, a canal: Panama\"", "output": "true", "explanation": "\"amanaplanacanalpanama\" is a palindrome."},
    {"input": "s = \"race a car\"", "output": "false", "explanation": "\"raceacar\" is not a palindrome."},
    {"input": "s = \" \"", "output": "true", "explanation": "s is an empty string \"\" after removing non-alphanumeric characters. Since an empty string reads the same forward and backward, it is a palindrome."}
  ]'::jsonb,
  '[
    "1 <= s.length <= 2 * 10^5",
    "s consists only of printable ASCII characters"
  ]'::jsonb,
  'O(n)',
  'O(1)'
) 
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  function_signature = EXCLUDED.function_signature,
  examples = EXCLUDED.examples,
  constraints = EXCLUDED.constraints,
  recommended_time_complexity = EXCLUDED.recommended_time_complexity,
  recommended_space_complexity = EXCLUDED.recommended_space_complexity;

-- Two Sum II - Input Array Is Sorted
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature,
  examples, constraints, recommended_time_complexity, recommended_space_complexity
) VALUES (
  'two-sum-ii-input-array-is-sorted',
  'Two Sum II - Input Array Is Sorted',
  'Medium',
  (SELECT id FROM public.categories WHERE name = 'Two Pointers' LIMIT 1),
  'Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Let these two numbers be numbers[index1] and numbers[index2] where 1 <= index1 < index2 <= numbers.length.\n\nReturn the indices of the two numbers, index1 and index2, added by one as an integer array [index1, index2] of length 2.\n\nThe tests are generated such that there is exactly one solution. You may not use the same element twice.\n\nYour solution must use only constant extra space.',
  'def twoSum(self, numbers: List[int], target: int) -> List[int]:',
  '[
    {"input": "numbers = [2,7,11,15], target = 9", "output": "[1,2]", "explanation": "The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2. We return [1, 2]."},
    {"input": "numbers = [2,3,4], target = 6", "output": "[1,3]", "explanation": "The sum of 2 and 4 is 6. Therefore index1 = 1, index2 = 3. We return [1, 3]."},
    {"input": "numbers = [-1,0], target = -1", "output": "[1,2]", "explanation": "The sum of -1 and 0 is -1. Therefore index1 = 1, index2 = 2. We return [1, 2]."}
  ]'::jsonb,
  '[
    "2 <= numbers.length <= 3 * 10^4",
    "-1000 <= numbers[i] <= 1000",
    "numbers is sorted in non-decreasing order",
    "-1000 <= target <= 1000",
    "The tests are generated such that there is exactly one solution"
  ]'::jsonb,
  'O(n)',
  'O(1)'
) 
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  function_signature = EXCLUDED.function_signature,
  examples = EXCLUDED.examples,
  constraints = EXCLUDED.constraints,
  recommended_time_complexity = EXCLUDED.recommended_time_complexity,
  recommended_space_complexity = EXCLUDED.recommended_space_complexity;

-- Trapping Rain Water
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature,
  examples, constraints, recommended_time_complexity, recommended_space_complexity
) VALUES (
  'trapping-rain-water',
  'Trapping Rain Water',
  'Hard',
  (SELECT id FROM public.categories WHERE name = 'Two Pointers' LIMIT 1),
  'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
  'def trap(self, height: List[int]) -> int:',
  '[
    {"input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]", "output": "6", "explanation": "The elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water (blue section) are being trapped."},
    {"input": "height = [4,2,0,3,2,5]", "output": "9", "explanation": "The elevation map traps 9 units of water."}
  ]'::jsonb,
  '[
    "n == height.length",
    "1 <= n <= 2 * 10^4",
    "0 <= height[i] <= 3 * 10^4"
  ]'::jsonb,
  'O(n)',
  'O(1)'
) 
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  function_signature = EXCLUDED.function_signature,
  examples = EXCLUDED.examples,
  constraints = EXCLUDED.constraints,
  recommended_time_complexity = EXCLUDED.recommended_time_complexity,
  recommended_space_complexity = EXCLUDED.recommended_space_complexity;