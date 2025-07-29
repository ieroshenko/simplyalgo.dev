-- Blind 75 Migration - Part 2: Remaining Problems
-- Continue adding all remaining problems systematically

INSERT INTO problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate) VALUES

-- Two Pointers (3 problems)
('3sum', '3Sum', 'Medium',
 (SELECT id FROM categories WHERE name = 'Two Pointers'),
 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.',
 'def threeSum(self, nums: List[int]) -> List[List[int]]:',
 '[{"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]"}]'::jsonb,
 '["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"]'::jsonb,
 '["Sort the array first", "Use two pointers", "Skip duplicates"]'::jsonb,
 7890, 567, 32.1),

('container-with-most-water', 'Container With Most Water', 'Medium',
 (SELECT id FROM categories WHERE name = 'Two Pointers'),
 'Find two lines that together with the x-axis form a container that contains the most water.',
 'def maxArea(self, height: List[int]) -> int:',
 '[{"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49"}]'::jsonb,
 '["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"]'::jsonb,
 '["Use two pointers from both ends", "Move pointer with smaller height"]'::jsonb,
 8901, 234, 54.6),

-- Sliding Window (4 problems)  
('longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'Medium',
 (SELECT id FROM categories WHERE name = 'Sliding Window'),
 'Given a string s, find the length of the longest substring without repeating characters.',
 'def lengthOfLongestSubstring(self, s: str) -> int:',
 '[{"input": "s = \"abcabcbb\"", "output": "3"}]'::jsonb,
 '["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"]'::jsonb,
 '["Use sliding window", "Track characters with set"]'::jsonb,
 9876, 345, 33.8),

('longest-repeating-character-replacement', 'Longest Repeating Character Replacement', 'Medium',
 (SELECT id FROM categories WHERE name = 'Sliding Window'),
 'You can change any character to any other uppercase English character. You can perform this operation at most k times.',
 'def characterReplacement(self, s: str, k: int) -> int:',
 '[{"input": "s = \"ABAB\", k = 2", "output": "4"}]'::jsonb,
 '["1 <= s.length <= 10^5", "s consists of only uppercase English letters", "0 <= k <= s.length"]'::jsonb,
 '["Use sliding window", "Track most frequent character"]'::jsonb,
 1234, 123, 51.2),

('minimum-window-substring', 'Minimum Window Substring', 'Hard',
 (SELECT id FROM categories WHERE name = 'Sliding Window'),
 'Return the minimum window substring of s such that every character in t is included in the window.',
 'def minWindow(self, s: str, t: str) -> str:',
 '[{"input": "s = \"ADOBECODEBANC\", t = \"ABC\"", "output": "\"BANC\""}]'::jsonb,
 '["m == s.length", "n == t.length", "1 <= m, n <= 10^5"]'::jsonb,
 '["Use sliding window", "Track character frequencies"]'::jsonb,
 2567, 189, 38.9),

-- Stack (6 problems)
('min-stack', 'Min Stack', 'Easy',
 (SELECT id FROM categories WHERE name = 'Stack'),
 'Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.',
 'class MinStack:\n    def __init__(self):\n    def push(self, val: int) -> None:\n    def pop(self) -> None:\n    def top(self) -> int:\n    def getMin(self) -> int:',
 '[{"input": "[\"MinStack\",\"push\",\"push\",\"push\",\"getMin\",\"pop\",\"top\",\"getMin\"]", "output": "[null,null,null,null,-3,null,0,-2]"}]'::jsonb,
 '["-2^31 <= val <= 2^31 - 1", "pop, top and getMin will always be called on non-empty stacks"]'::jsonb,
 '["Use auxiliary stack for minimums", "Store min with each element"]'::jsonb,
 3456, 234, 51.8),

('evaluate-reverse-polish-notation', 'Evaluate Reverse Polish Notation', 'Medium',
 (SELECT id FROM categories WHERE name = 'Stack'),
 'Evaluate the value of an arithmetic expression in Reverse Polish Notation.',
 'def evalRPN(self, tokens: List[str]) -> int:',
 '[{"input": "tokens = [\"2\",\"1\",\"+\",\"3\",\"*\"]", "output": "9"}]'::jsonb,
 '["1 <= tokens.length <= 10^4", "tokens[i] is either an operator or integer"]'::jsonb,
 '["Use stack to store operands", "Pop two operands for each operator"]'::jsonb,
 1890, 67, 42.3),

('generate-parentheses', 'Generate Parentheses', 'Medium',
 (SELECT id FROM categories WHERE name = 'Stack'),
 'Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.',
 'def generateParenthesis(self, n: int) -> List[str]:',
 '[{"input": "n = 3", "output": "[\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]"}]'::jsonb,
 '["1 <= n <= 8"]'::jsonb,
 '["Use backtracking", "Track open and close count"]'::jsonb,
 4567, 123, 68.9),

('daily-temperatures', 'Daily Temperatures', 'Medium',
 (SELECT id FROM categories WHERE name = 'Stack'),
 'Return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature.',
 'def dailyTemperatures(self, temperatures: List[int]) -> List[int]:',
 '[{"input": "temperatures = [73,74,75,71,69,72,76,73]", "output": "[1,1,4,2,1,1,0,0]"}]'::jsonb,
 '["1 <= temperatures.length <= 10^5", "30 <= temperatures[i] <= 100"]'::jsonb,
 '["Use monotonic decreasing stack", "Store indices"]'::jsonb,
 3210, 98, 65.7),

('car-fleet', 'Car Fleet', 'Medium',
 (SELECT id FROM categories WHERE name = 'Stack'),
 'There are n cars going to the same destination along a one-lane road.',
 'def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:',
 '[{"input": "target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]", "output": "3"}]'::jsonb,
 '["n == position.length == speed.length", "1 <= n <= 10^5"]'::jsonb,
 '["Calculate time to reach target", "Use stack to track fleets"]'::jsonb,
 1567, 234, 38.4),

-- Binary Search (4 problems)
('time-based-key-value-store', 'Time Based Key-Value Store', 'Medium',
 (SELECT id FROM categories WHERE name = 'Binary Search'),
 'Design a time-based key-value data structure that can store multiple values for the same key at different time stamps.',
 'class TimeMap:\n    def __init__(self):\n    def set(self, key: str, value: str, timestamp: int) -> None:\n    def get(self, key: str, timestamp: int) -> str:',
 '[{"input": "[\"TimeMap\",\"set\",\"get\",\"get\",\"set\",\"get\",\"get\"]", "output": "[null,null,\"bar\",\"bar\",null,\"bar2\",\"bar2\"]"}]'::jsonb,
 '["1 <= key.length, value.length <= 100", "1 <= timestamp <= 10^7"]'::jsonb,
 '["Use hash map with sorted list", "Binary search for timestamps"]'::jsonb,
 2345, 167, 54.2),

-- Linked List (6 problems)  
('find-the-duplicate-number', 'Find the Duplicate Number', 'Medium',
 (SELECT id FROM categories WHERE name = 'Linked List'),
 'Given an array of integers nums containing n + 1 integers where each integer is in the range [1, n] inclusive.',
 'def findDuplicate(self, nums: List[int]) -> int:',
 '[{"input": "nums = [1,3,4,2,2]", "output": "2"}]'::jsonb,
 '["1 <= n <= 10^5", "nums.length == n + 1", "1 <= nums[i] <= n"]'::jsonb,
 '["Floyd cycle detection", "Think of it as linked list"]'::jsonb,
 4567, 234, 59.1)

ON CONFLICT (id) DO NOTHING;