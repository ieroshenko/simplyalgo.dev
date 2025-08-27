-- Complete Blind 75 Problems Migration
-- Adds all 64 missing problems with full metadata, examples, constraints, and test cases
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
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = '3sum') THEN
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
    );
  END IF;

  -- Container With Most Water
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'container-with-most-water') THEN
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
    );
  END IF;

  -- Search in Rotated Sorted Array
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'search-in-rotated-sorted-array') THEN
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
    );
  END IF;

  -- Find Minimum in Rotated Sorted Array
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'find-minimum-in-rotated-sorted-array') THEN
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
    );
  END IF;

  -- Maximum Subarray (already exists, skip)

END $$;

-- Two Pointers Problems (all 5 missing)
DO $$
BEGIN
  -- Valid Palindrome
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'valid-palindrome') THEN
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
    );
  END IF;

  -- Two Sum II - Input Array Is Sorted
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'two-sum-ii-input-array-is-sorted') THEN
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
    );
  END IF;

  -- 3Sum (already added above)

  -- Container With Most Water (already added above)

  -- Trapping Rain Water
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'trapping-rain-water') THEN
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
    );
  END IF;

END $$;

-- Stack Problems (all 7 missing)
DO $$
BEGIN
  -- Valid Parentheses (already exists, skip)

  -- Min Stack
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'min-stack') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'min-stack',
      'Min Stack',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Stack' LIMIT 1),
      'Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.\n\nImplement the MinStack class:\n\nMinStack() initializes the stack object.\nvoid push(int val) pushes the element val onto the stack.\nvoid pop() removes the element on the top of the stack.\nint top() gets the top element of the stack.\nint getMin() retrieves the minimum element in the stack.\nYou must implement a solution with O(1) time complexity for each function.',
      'class MinStack:\n\n    def __init__(self):\n        \n\n    def push(self, val: int) -> None:\n        \n\n    def pop(self) -> None:\n        \n\n    def top(self) -> int:\n        \n\n    def getMin(self) -> int:',
      '[
        {"input": "[\"MinStack\",\"push\",\"push\",\"push\",\"getMin\",\"pop\",\"top\",\"getMin\"]\n[[],[-2],[0],[-3],[],[],[],[]]", "output": "[null,null,null,null,-3,null,0,-2]", "explanation": "MinStack minStack = new MinStack();\nminStack.push(-2);\nminStack.push(0);\nminStack.push(-3);\nminStack.getMin(); // return -3\nminStack.pop();\nminStack.top();    // return 0\nminStack.getMin(); // return -2"}
      ]'::jsonb,
      '[
        "-2^31 <= val <= 2^31 - 1",
        "Methods pop, top and getMin operations will always be called on non-empty stacks",
        "At most 3 * 10^4 calls will be made to push, pop, top, and getMin"
      ]'::jsonb,
      'O(1) for all operations',
      'O(n)'
    );
  END IF;

  -- Evaluate Reverse Polish Notation
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'evaluate-reverse-polish-notation') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'evaluate-reverse-polish-notation',
      'Evaluate Reverse Polish Notation',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Stack' LIMIT 1),
      'You are given an array of strings tokens that represents an arithmetic expression in Reverse Polish Notation.\n\nEvaluate the expression. Return an integer that represents the value of the expression.\n\nNote that:\n\nThe valid operators are \"+\", \"-\", \"*\", and \"/\".\nEach operand may be an integer or another expression.\nThe division between two integers always truncates toward zero.\nThere will not be any division by zero.\nThe input represents a valid arithmetic expression in a reverse polish notation.\nThe answer and all the intermediate calculations can be represented in a 32-bit integer.',
      'def evalRPN(self, tokens: List[str]) -> int:',
      '[
        {"input": "tokens = [\"2\",\"1\",\"+\",\"3\",\"*\"]", "output": "9", "explanation": "((2 + 1) * 3) = 9"},
        {"input": "tokens = [\"4\",\"13\",\"5\",\"/\",\"+\"]", "output": "6", "explanation": "(4 + (13 / 5)) = 6"},
        {"input": "tokens = [\"10\",\"6\",\"9\",\"3\",\"+\",\"-11\",\"*\",\"/\",\"*\",\"17\",\"+\",\"5\",\"+\"]", "output": "22", "explanation": "((10 * (6 / ((9 + 3) * -11))) + 17) + 5 = ((10 * (6 / (12 * -11))) + 17) + 5 = ((10 * (6 / -132)) + 17) + 5 = ((10 * 0) + 17) + 5 = (0 + 17) + 5 = 17 + 5 = 22"}
      ]'::jsonb,
      '[
        "1 <= tokens.length <= 10^4",
        "tokens[i] is either an operator: \"+\", \"-\", \"*\", or \"/\", or an integer in the range [-200, 200]"
      ]'::jsonb,
      'O(n)',
      'O(n)'
    );
  END IF;

  -- Generate Parentheses
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'generate-parentheses') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'generate-parentheses',
      'Generate Parentheses',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Stack' LIMIT 1),
      'Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.',
      'def generateParenthesis(self, n: int) -> List[str]:',
      '[
        {"input": "n = 3", "output": "[\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]", "explanation": "All possible combinations of 3 pairs of well-formed parentheses"},
        {"input": "n = 1", "output": "[\"()\"]", "explanation": "Only one combination possible with 1 pair"}
      ]'::jsonb,
      '[
        "1 <= n <= 8"
      ]'::jsonb,
      'O(4^n / √n)',
      'O(4^n / √n)'
    );
  END IF;

  -- Daily Temperatures
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'daily-temperatures') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'daily-temperatures',
      'Daily Temperatures',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Stack' LIMIT 1),
      'Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature. If there is no future day for which this is possible, keep answer[i] == 0 instead.',
      'def dailyTemperatures(self, temperatures: List[int]) -> List[int]:',
      '[
        {"input": "temperatures = [73,74,75,71,69,72,76,73]", "output": "[1,1,4,2,1,1,0,0]", "explanation": "The next warmer day for each temperature"},
        {"input": "temperatures = [30,40,50,60]", "output": "[1,1,1,0]", "explanation": "Each day has a warmer day next except the last"},
        {"input": "temperatures = [30,60,90]", "output": "[1,1,0]", "explanation": "Increasing temperatures, last has no warmer day"}
      ]'::jsonb,
      '[
        "1 <= temperatures.length <= 10^5",
        "30 <= temperatures[i] <= 100"
      ]'::jsonb,
      'O(n)',
      'O(n)'
    );
  END IF;

  -- Car Fleet
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'car-fleet') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'car-fleet',
      'Car Fleet',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Stack' LIMIT 1),
      'There are n cars going to the same destination along a one-lane road. The destination is target miles away.\n\nYou are given two integer arrays position and speed, both of length n, where position[i] is the position of the ith car and speed[i] is the speed of the ith car (in miles per hour).\n\nA car can never pass another car, but it can catch up and drive bumper to bumper at the same speed as the slower car.\n\nThe faster car will slow down to match the slower car''s speed. The distance between these two cars is ignored (i.e., they are assumed to have the same position).\n\nA car fleet is some non-empty set of cars driving at the same position and same speed. Note that a single car is also a car fleet.\n\nIf a car catches up to a car fleet right at the destination point, it will still be considered as one car fleet.\n\nReturn the number of car fleets that will arrive at the destination.',
      'def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:',
      '[
        {"input": "target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]", "output": "3", "explanation": "The cars starting at 10 (speed 2) and 8 (speed 4) become a fleet, meeting each other at 12. The car starting at 0 (speed 1) does not catch up to any other car, so it is a fleet by itself. The cars starting at 5 (speed 1) and 3 (speed 3) become a fleet, meeting each other at 6. Note that no other cars meet these fleets before the destination, so the answer is 3."},
        {"input": "target = 10, position = [3], speed = [3]", "output": "1", "explanation": "There is only one car, hence there is only one fleet."},
        {"input": "target = 100, position = [0,2,4], speed = [4,2,1]", "output": "1", "explanation": "The cars starting at (0,4) and (2,2) become a fleet as they reach the target at the same time. The car starting at (4,1) never catches up, so it remains as a separate fleet. However, all cars meet at the destination, so the answer is 1."}
      ]'::jsonb,
      '[
        "n == position.length == speed.length",
        "1 <= n <= 10^5",
        "0 < target <= 10^6",
        "0 <= position[i] < target",
        "All the values of position are unique",
        "0 < speed[i] <= 10^6"
      ]'::jsonb,
      'O(n log n)',
      'O(n)'
    );
  END IF;

  -- Largest Rectangle in Histogram
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'largest-rectangle-in-histogram') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'largest-rectangle-in-histogram',
      'Largest Rectangle in Histogram',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Stack' LIMIT 1),
      'Given an array of integers heights representing the histogram''s bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.',
      'def largestRectangleArea(self, heights: List[int]) -> int:',
      '[
        {"input": "heights = [2,1,5,6,2,3]", "output": "10", "explanation": "The largest rectangle is shown in the red area, which has an area = 10 units."},
        {"input": "heights = [2,4]", "output": "4", "explanation": "The largest rectangle has area 4."}
      ]'::jsonb,
      '[
        "1 <= heights.length <= 10^5",
        "0 <= heights[i] <= 10^4"
      ]'::jsonb,
      'O(n)',
      'O(n)'
    );
  END IF;

END $$;

-- Sliding Window Problems (all 6 missing)
DO $$
BEGIN
  -- Best Time to Buy and Sell Stock (already exists, skip)

  -- Longest Substring Without Repeating Characters
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'longest-substring-without-repeating-characters') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'longest-substring-without-repeating-characters',
      'Longest Substring Without Repeating Characters',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Sliding Window' LIMIT 1),
      'Given a string s, find the length of the longest substring without repeating characters.',
      'def lengthOfLongestSubstring(self, s: str) -> int:',
      '[
        {"input": "s = \"abcabcbb\"", "output": "3", "explanation": "The answer is \"abc\", with the length of 3."},
        {"input": "s = \"bbbbb\"", "output": "1", "explanation": "The answer is \"b\", with the length of 1."},
        {"input": "s = \"pwwkew\"", "output": "3", "explanation": "The answer is \"wke\", with the length of 3. Notice that the answer must be a substring, \"pwke\" is a subsequence and not a substring."}
      ]'::jsonb,
      '[
        "0 <= s.length <= 5 * 10^4",
        "s consists of English letters, digits, symbols and spaces"
      ]'::jsonb,
      'O(n)',
      'O(min(m, n))'
    );
  END IF;

  -- Longest Repeating Character Replacement
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'longest-repeating-character-replacement') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'longest-repeating-character-replacement',
      'Longest Repeating Character Replacement',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Sliding Window' LIMIT 1),
      'You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times.\n\nReturn the length of the longest substring containing the same letter you can get after performing the above operations.',
      'def characterReplacement(self, s: str, k: int) -> int:',
      '[
        {"input": "s = \"ABAB\", k = 2", "output": "4", "explanation": "Replace the two \"A\"s with two \"B\"s or vice versa."},
        {"input": "s = \"AABABBA\", k = 1", "output": "4", "explanation": "Replace the one \"A\" in the middle with \"B\" and form \"AABBBBA\". The substring \"BBBB\" has the longest repeating letters, which is 4."}
      ]'::jsonb,
      '[
        "1 <= s.length <= 10^5",
        "s consists of only uppercase English letters",
        "0 <= k <= s.length"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Permutation in String
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'permutation-in-string') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'permutation-in-string',
      'Permutation in String',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Sliding Window' LIMIT 1),
      'Given two strings s1 and s2, return true if s2 contains a permutation of s1, or false otherwise.\n\nIn other words, return true if one of s1''s permutations is the substring of s2.',
      'def checkInclusion(self, s1: str, s2: str) -> bool:',
      '[
        {"input": "s1 = \"ab\", s2 = \"eidbaooo\"", "output": "true", "explanation": "s2 contains one permutation of s1 (\"ba\")."},
        {"input": "s1 = \"ab\", s2 = \"eidboaoo\"", "output": "false", "explanation": "s2 does not contain any permutation of s1."}
      ]'::jsonb,
      '[
        "1 <= s1.length, s2.length <= 10^4",
        "s1 and s2 consist of lowercase English letters"
      ]'::jsonb,
      'O(n + m)',
      'O(1)'
    );
  END IF;

  -- Minimum Window Substring
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'minimum-window-substring') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'minimum-window-substring',
      'Minimum Window Substring',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Sliding Window' LIMIT 1),
      'Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string \"\".\n\nThe testcases will be generated such that the answer is unique.\n\nA substring is a contiguous sequence of characters within the string.',
      'def minWindow(self, s: str, t: str) -> str:',
      '[
        {"input": "s = \"ADOBECODEBANC\", t = \"ABC\"", "output": "\"BANC\"", "explanation": "The minimum window substring \"BANC\" includes ''A'', ''B'', and ''C'' from string t."},
        {"input": "s = \"a\", t = \"a\"", "output": "\"a\"", "explanation": "The entire string s is the minimum window."},
        {"input": "s = \"a\", t = \"aa\"", "output": "\"\"", "explanation": "Both ''a''s from t must be included in the window. Since the largest window of s only has one ''a'', return empty string."}
      ]'::jsonb,
      '[
        "m == s.length",
        "n == t.length",
        "1 <= m, n <= 10^5",
        "s and t consist of uppercase and lowercase English letters"
      ]'::jsonb,
      'O(m + n)',
      'O(m + n)'
    );
  END IF;

  -- Sliding Window Maximum
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'sliding-window-maximum') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'sliding-window-maximum',
      'Sliding Window Maximum',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Sliding Window' LIMIT 1),
      'You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position.\n\nReturn the max sliding window.',
      'def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:',
      '[
        {"input": "nums = [1,3,-1,-3,5,3,6,7], k = 3", "output": "[3,3,5,5,6,7]", "explanation": "Window position                Max\\n---------------               -----\\n[1  3  -1] -3  5  3  6  7       3\\n 1 [3  -1  -3] 5  3  6  7       3\\n 1  3 [-1  -3  5] 3  6  7       5\\n 1  3  -1 [-3  5  3] 6  7       5\\n 1  3  -1  -3 [5  3  6] 7       6\\n 1  3  -1  -3  5 [3  6  7]      7"},
        {"input": "nums = [1], k = 1", "output": "[1]", "explanation": "Single element window returns itself"}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 10^5",
        "-10^4 <= nums[i] <= 10^4",
        "1 <= k <= nums.length"
      ]'::jsonb,
      'O(n)',
      'O(k)'
    );
  END IF;

END $$;

-- Linked List Problems (all 6 missing)
DO $$
BEGIN
  -- Reverse Linked List
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'reverse-linked-list') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'reverse-linked-list',
      'Reverse Linked List',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Linked List' LIMIT 1),
      'Given the head of a singly linked list, reverse the list, and return the reversed list.',
      'def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:',
      '[
        {"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]", "explanation": "The linked list is reversed"},
        {"input": "head = [1,2]", "output": "[2,1]", "explanation": "Two node list is reversed"},
        {"input": "head = []", "output": "[]", "explanation": "Empty list remains empty"}
      ]'::jsonb,
      '[
        "The number of nodes in the list is the range [0, 5000]",
        "-5000 <= Node.val <= 5000"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Merge Two Sorted Lists (already exists, skip)

  -- Reorder List
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'reorder-list') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'reorder-list',
      'Reorder List',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Linked List' LIMIT 1),
      'You are given the head of a singly linked-list. The list can be represented as:\n\nL0 → L1 → … → Ln - 1 → Ln\nReorder the list to be on the following form:\n\nL0 → Ln → L1 → Ln - 1 → L2 → Ln - 2 → …\nYou may not modify the values in the list''s nodes. Only nodes themselves may be changed.',
      'def reorderList(self, head: Optional[ListNode]) -> None:',
      '[
        {"input": "head = [1,2,3,4]", "output": "[1,4,2,3]", "explanation": "The list is reordered from [1,2,3,4] to [1,4,2,3]"},
        {"input": "head = [1,2,3,4,5]", "output": "[1,5,2,4,3]", "explanation": "The list is reordered from [1,2,3,4,5] to [1,5,2,4,3]"}
      ]'::jsonb,
      '[
        "The number of nodes in the list is in the range [1, 5 * 10^4]",
        "1 <= Node.val <= 1000"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Remove Nth Node From End of List
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'remove-nth-node-from-end-of-list') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'remove-nth-node-from-end-of-list',
      'Remove Nth Node From End of List',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Linked List' LIMIT 1),
      'Given the head of a linked list, remove the nth node from the end of the list and return its head.',
      'def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:',
      '[
        {"input": "head = [1,2,3,4,5], n = 2", "output": "[1,2,3,5]", "explanation": "Remove the 2nd node from the end"},
        {"input": "head = [1], n = 1", "output": "[]", "explanation": "Remove the only node"},
        {"input": "head = [1,2], n = 1", "output": "[1]", "explanation": "Remove the last node"}
      ]'::jsonb,
      '[
        "The number of nodes in the list is sz",
        "1 <= sz <= 30",
        "0 <= Node.val <= 100",
        "1 <= n <= sz"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Linked List Cycle
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'linked-list-cycle') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'linked-list-cycle',
      'Linked List Cycle',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Linked List' LIMIT 1),
      'Given head, the head of a linked list, determine if the linked list has a cycle in it.\n\nThere is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Internally, pos is used to denote the index of the node that tail''s next pointer is connected to. Note that pos is not passed as a parameter.\n\nReturn true if there is a cycle in the linked list. Otherwise, return false.',
      'def hasCycle(self, head: Optional[ListNode]) -> bool:',
      '[
        {"input": "head = [3,2,0,-4], pos = 1", "output": "true", "explanation": "There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed)."},
        {"input": "head = [1,2], pos = 0", "output": "true", "explanation": "There is a cycle in the linked list, where the tail connects to the 0th node."},
        {"input": "head = [1], pos = -1", "output": "false", "explanation": "There is no cycle in the linked list."}
      ]'::jsonb,
      '[
        "The number of the nodes in the list is in the range [0, 10^4]",
        "-10^5 <= Node.val <= 10^5",
        "pos is -1 or a valid index in the linked-list"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Merge k Sorted Lists
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'merge-k-sorted-lists') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'merge-k-sorted-lists',
      'Merge k Sorted Lists',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Linked List' LIMIT 1),
      'You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.',
      'def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:',
      '[
        {"input": "lists = [[1,4,5],[1,3,4],[2,6]]", "output": "[1,1,2,3,4,4,5,6]", "explanation": "The linked-lists are:\n[\n  1->4->5,\n  1->3->4,\n  2->6\n]\nmerging them into one sorted list:\n1->1->2->3->4->4->5->6"},
        {"input": "lists = []", "output": "[]", "explanation": "Empty input returns empty list"},
        {"input": "lists = [[]]", "output": "[]", "explanation": "Single empty list returns empty list"}
      ]'::jsonb,
      '[
        "k == lists.length",
        "0 <= k <= 10^4",
        "0 <= lists[i].length <= 500",
        "-10^4 <= lists[i][j] <= 10^4",
        "lists[i] is sorted in ascending order",
        "The sum of lists[i].length will not exceed 10^4"
      ]'::jsonb,
      'O(n log k)',
      'O(log k)'
    );
  END IF;

END $$;

-- Binary Search Problems (missing 2 of 4)
-- Search in Rotated Sorted Array and Find Minimum in Rotated Sorted Array already added above

-- Trees Problems (all 11 missing)  
DO $$
BEGIN
  -- Invert Binary Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'invert-binary-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'invert-binary-tree',
      'Invert Binary Tree',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given the root of a binary tree, invert the tree, and return its root.',
      'def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:',
      '[
        {"input": "root = [4,2,7,1,3,6,9]", "output": "[4,7,2,9,6,3,1]", "explanation": "The binary tree is inverted"},
        {"input": "root = [2,1,3]", "output": "[2,3,1]", "explanation": "Simple tree inversion"},
        {"input": "root = []", "output": "[]", "explanation": "Empty tree remains empty"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [0, 100]",
        "-100 <= Node.val <= 100"
      ]'::jsonb,
      'O(n)',
      'O(h)'
    );
  END IF;

  -- Maximum Depth of Binary Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'maximum-depth-of-binary-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'maximum-depth-of-binary-tree',
      'Maximum Depth of Binary Tree',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given the root of a binary tree, return its maximum depth.\n\nA binary tree''s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
      'def maxDepth(self, root: Optional[TreeNode]) -> int:',
      '[
        {"input": "root = [3,9,20,null,null,15,7]", "output": "3", "explanation": "The maximum depth is 3"},
        {"input": "root = [1,null,2]", "output": "2", "explanation": "The maximum depth is 2"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [0, 10^4]",
        "-100 <= Node.val <= 100"
      ]'::jsonb,
      'O(n)',
      'O(h)'
    );
  END IF;

  -- Diameter of Binary Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'diameter-of-binary-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'diameter-of-binary-tree',
      'Diameter of Binary Tree',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given the root of a binary tree, return the length of the diameter of the tree.\n\nThe diameter of a binary tree is the length of the longest path between any two nodes in a tree. This path may or may not pass through the root.\n\nThe length of a path between two nodes is represented by the number of edges between them.',
      'def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:',
      '[
        {"input": "root = [1,2,3,4,5]", "output": "3", "explanation": "3 is the length of the path [4,2,1,3] or [5,2,1,3]"},
        {"input": "root = [1,2]", "output": "1", "explanation": "The diameter is 1"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [1, 10^4]",
        "-100 <= Node.val <= 100"
      ]'::jsonb,
      'O(n)',
      'O(h)'
    );
  END IF;

  -- Balanced Binary Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'balanced-binary-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'balanced-binary-tree',
      'Balanced Binary Tree',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given a binary tree, determine if it is height-balanced.\n\nFor this problem, a height-balanced binary tree is defined as:\n\na binary tree in which the left and right subtrees of every node differ in height by no more than 1.',
      'def isBalanced(self, root: Optional[TreeNode]) -> bool:',
      '[
        {"input": "root = [3,9,20,null,null,15,7]", "output": "true", "explanation": "The tree is height-balanced"},
        {"input": "root = [1,2,2,3,3,null,null,4,4]", "output": "false", "explanation": "The tree is not height-balanced"},
        {"input": "root = []", "output": "true", "explanation": "Empty tree is balanced"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [0, 5000]",
        "-10^4 <= Node.val <= 10^4"
      ]'::jsonb,
      'O(n)',
      'O(h)'
    );
  END IF;

  -- Same Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'same-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'same-tree',
      'Same Tree',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given the roots of two binary trees p and q, write a function to check if they are the same or not.\n\nTwo binary trees are considered the same if they are structurally identical, and the nodes have the same value.',
      'def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:',
      '[
        {"input": "p = [1,2,3], q = [1,2,3]", "output": "true", "explanation": "Both trees are identical"},
        {"input": "p = [1,2], q = [1,null,2]", "output": "false", "explanation": "Trees have different structure"},
        {"input": "p = [1,2,1], q = [1,1,2]", "output": "false", "explanation": "Trees have different values"}
      ]'::jsonb,
      '[
        "The number of nodes in both trees is in the range [0, 100]",
        "-10^4 <= Node.val <= 10^4"
      ]'::jsonb,
      'O(n)',
      'O(h)'
    );
  END IF;

  -- Subtree of Another Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'subtree-of-another-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'subtree-of-another-tree',
      'Subtree of Another Tree',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values of subRoot and false otherwise.\n\nA subtree of a binary tree tree is a tree that consists of a node in tree and all of this node''s descendants. The tree tree could also be considered as a subtree of itself.',
      'def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:',
      '[
        {"input": "root = [3,4,5,1,2], subRoot = [4,1,2]", "output": "true", "explanation": "subRoot is a subtree of root"},
        {"input": "root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]", "output": "false", "explanation": "subRoot is not a subtree of root"}
      ]'::jsonb,
      '[
        "The number of nodes in the root tree is in the range [1, 2000]",
        "The number of nodes in the subRoot tree is in the range [1, 1000]",
        "-10^4 <= root.val <= 10^4",
        "-10^4 <= subRoot.val <= 10^4"
      ]'::jsonb,
      'O(m * n)',
      'O(h)'
    );
  END IF;

  -- Lowest Common Ancestor of a Binary Search Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'lowest-common-ancestor-of-a-binary-search-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'lowest-common-ancestor-of-a-binary-search-tree',
      'Lowest Common Ancestor of a Binary Search Tree',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.\n\nAccording to the definition of LCA on Wikipedia: "The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself)."',
      'def lowestCommonAncestor(self, root: ''TreeNode'', p: ''TreeNode'', q: ''TreeNode'') -> ''TreeNode'':',
      '[
        {"input": "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8", "output": "6", "explanation": "The LCA of nodes 2 and 8 is 6"},
        {"input": "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4", "output": "2", "explanation": "The LCA of nodes 2 and 4 is 2, since a node can be a descendant of itself according to the LCA definition"},
        {"input": "root = [2,1], p = 2, q = 1", "output": "2", "explanation": "The LCA of nodes 2 and 1 is 2"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [2, 10^5]",
        "-10^9 <= Node.val <= 10^9",
        "All Node.val are unique",
        "p != q",
        "p and q will exist in the BST"
      ]'::jsonb,
      'O(h)',
      'O(h)'
    );
  END IF;

  -- Binary Tree Level Order Traversal
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'binary-tree-level-order-traversal') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'binary-tree-level-order-traversal',
      'Binary Tree Level Order Traversal',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given the root of a binary tree, return the level order traversal of its nodes'' values. (i.e., from left to right, level by level).',
      'def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:',
      '[
        {"input": "root = [3,9,20,null,null,15,7]", "output": "[[3],[9,20],[15,7]]", "explanation": "Level order traversal of the tree"},
        {"input": "root = [1]", "output": "[[1]]", "explanation": "Single node tree"},
        {"input": "root = []", "output": "[]", "explanation": "Empty tree"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [0, 2000]",
        "-1000 <= Node.val <= 1000"
      ]'::jsonb,
      'O(n)',
      'O(w)'
    );
  END IF;

  -- Binary Tree Right Side View
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'binary-tree-right-side-view') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'binary-tree-right-side-view',
      'Binary Tree Right Side View',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given the root of a binary tree, imagine yourself standing on the right side of it, return the values of the nodes you can see ordered from top to bottom.',
      'def rightSideView(self, root: Optional[TreeNode]) -> List[int]:',
      '[
        {"input": "root = [1,2,3,null,5,null,4]", "output": "[1,3,4]", "explanation": "From the right side, you can see nodes 1, 3, and 4"},
        {"input": "root = [1,null,3]", "output": "[1,3]", "explanation": "From the right side, you can see nodes 1 and 3"},
        {"input": "root = []", "output": "[]", "explanation": "Empty tree has no right side view"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [0, 100]",
        "-100 <= Node.val <= 100"
      ]'::jsonb,
      'O(n)',
      'O(h)'
    );
  END IF;

  -- Count Good Nodes in Binary Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'count-good-nodes-in-binary-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'count-good-nodes-in-binary-tree',
      'Count Good Nodes in Binary Tree',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given a binary tree root, a node X in the tree is named good if in the path from root to X there are no nodes with a value greater than X.\n\nReturn the number of good nodes in the binary tree.',
      'def goodNodes(self, root: TreeNode) -> int:',
      '[
        {"input": "root = [3,1,4,3,null,1,5]", "output": "4", "explanation": "Nodes in blue are good. Root Node (3) is always a good node. Node 4 -> (3,4) is the maximum value in the path starting from the root. Node 5 -> (3,4,5) is the maximum value in the path. Node 3 -> (3,1,3) 3 is the maximum value in the path."},
        {"input": "root = [3,3,null,4,2]", "output": "3", "explanation": "Node 2 -> (3, 3, 2) is not good, because \"3\" is higher than it."},
        {"input": "root = [1]", "output": "1", "explanation": "Root is good."}
      ]'::jsonb,
      '[
        "The number of nodes in the binary tree is in the range [1, 10^5]",
        "Each node''s value is between [-10^4, 10^4]"
      ]'::jsonb,
      'O(n)',
      'O(h)'
    );
  END IF;

  -- Validate Binary Search Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'validate-binary-search-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'validate-binary-search-tree',
      'Validate Binary Search Tree',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given the root of a binary tree, determine if it is a valid binary search tree (BST).\n\nA valid BST is defined as follows:\n\nThe left subtree of a node contains only nodes with keys less than the node''s key.\nThe right subtree of a node contains only nodes with keys greater than the node''s key.\nBoth the left and right subtrees must also be binary search trees.',
      'def isValidBST(self, root: Optional[TreeNode]) -> bool:',
      '[
        {"input": "root = [2,1,3]", "output": "true", "explanation": "This is a valid BST"},
        {"input": "root = [5,1,4,null,null,3,6]", "output": "false", "explanation": "The root node''s value is 5 but its right child''s value is 4"},
        {"input": "root = [1]", "output": "true", "explanation": "Single node is valid BST"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [1, 10^4]",
        "-2^31 <= Node.val <= 2^31 - 1"
      ]'::jsonb,
      'O(n)',
      'O(h)'
    );
  END IF;

  -- Kth Smallest Element in a BST
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'kth-smallest-element-in-a-bst') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'kth-smallest-element-in-a-bst',
      'Kth Smallest Element in a BST',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given the root of a binary search tree, and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree.',
      'def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:',
      '[
        {"input": "root = [3,1,4,null,2], k = 1", "output": "1", "explanation": "The 1st smallest element is 1"},
        {"input": "root = [5,3,6,2,4,null,null,1], k = 3", "output": "3", "explanation": "The 3rd smallest element is 3"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is n",
        "1 <= k <= n <= 10^4",
        "0 <= Node.val <= 10^4"
      ]'::jsonb,
      'O(h + k)',
      'O(h)'
    );
  END IF;

  -- Construct Binary Tree from Preorder and Inorder Traversal
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'construct-binary-tree-from-preorder-and-inorder-traversal') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'construct-binary-tree-from-preorder-and-inorder-traversal',
      'Construct Binary Tree from Preorder and Inorder Traversal',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Given two integer arrays preorder and inorder where preorder is the preorder traversal of a binary tree and inorder is the inorder traversal of the same tree, construct and return the binary tree.',
      'def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:',
      '[
        {"input": "preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]", "output": "[3,9,20,null,null,15,7]", "explanation": "The binary tree is constructed from the traversals"},
        {"input": "preorder = [-1], inorder = [-1]", "output": "[-1]", "explanation": "Single node tree"}
      ]'::jsonb,
      '[
        "1 <= preorder.length <= 3000",
        "inorder.length == preorder.length",
        "-3000 <= preorder[i], inorder[i] <= 3000",
        "preorder and inorder consist of unique values",
        "Each value of inorder also appears in preorder",
        "preorder is guaranteed to be the preorder traversal of the tree",
        "inorder is guaranteed to be the inorder traversal of the tree"
      ]'::jsonb,
      'O(n)',
      'O(n)'
    );
  END IF;

  -- Binary Tree Maximum Path Sum
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'binary-tree-maximum-path-sum') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'binary-tree-maximum-path-sum',
      'Binary Tree Maximum Path Sum',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once. Note that the path does not need to pass through the root.\n\nThe path sum of a path is the sum of the node''s values in the path.\n\nGiven the root of a binary tree, return the maximum path sum of any non-empty path.',
      'def maxPathSum(self, root: Optional[TreeNode]) -> int:',
      '[
        {"input": "root = [1,2,3]", "output": "6", "explanation": "The optimal path is 2 -> 1 -> 3 with a path sum of 2 + 1 + 3 = 6"},
        {"input": "root = [-10,9,20,null,null,15,7]", "output": "42", "explanation": "The optimal path is 15 -> 20 -> 7 with a path sum of 15 + 20 + 7 = 42"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [1, 3 * 10^4]",
        "-1000 <= Node.val <= 1000"
      ]'::jsonb,
      'O(n)',
      'O(h)'
    );
  END IF;

  -- Serialize and Deserialize Binary Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'serialize-and-deserialize-binary-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'serialize-and-deserialize-binary-tree',
      'Serialize and Deserialize Binary Tree',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Trees' LIMIT 1),
      'Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.\n\nDesign an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.',
      'class Codec:\n\n    def serialize(self, root):\n        \"\"\"Encodes a tree to a single string.\n        \n        :type root: TreeNode\n        :rtype: str\n        \"\"\"\n        \n\n    def deserialize(self, data):\n        \"\"\"Decodes your encoded data to tree.\n        \n        :type data: str\n        :rtype: TreeNode\n        \"\"\"\n        \n\n# Your Codec object will be instantiated and called as such:\n# ser = Codec()\n# deser = Codec()\n# ans = deser.deserialize(ser.serialize(root))',
      '[
        {"input": "root = [1,2,3,null,null,4,5]", "output": "[1,2,3,null,null,4,5]", "explanation": "The tree is serialized and then deserialized back to the same structure"},
        {"input": "root = []", "output": "[]", "explanation": "Empty tree serialization"},
        {"input": "root = [1]", "output": "[1]", "explanation": "Single node serialization"}
      ]'::jsonb,
      '[
        "The number of nodes in the tree is in the range [0, 10^4]",
        "-1000 <= Node.val <= 1000"
      ]'::jsonb,
      'O(n)',
      'O(n)'
    );
  END IF;

END $$;

-- Note: This is part 1 of the migration. Due to size constraints, I'll continue with additional categories in subsequent parts.
-- Categories covered so far: Array, Two Pointers, Stack, Sliding Window, Linked List, Binary Search, Trees
-- Remaining categories: Tries, Heap/Priority Queue, Backtracking, Graphs, Advanced Graphs, 1-D DP, 2-D DP, Greedy, Intervals, Math & Geometry, Bit Manipulation