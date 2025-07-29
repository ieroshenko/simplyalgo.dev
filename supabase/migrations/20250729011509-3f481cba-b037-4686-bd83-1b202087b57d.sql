-- Complete Blind 75 Problems Migration
-- Adding all missing categories and problems to reach full 75

-- First, add missing categories
INSERT INTO categories (name, color, description, sort_order) VALUES
-- Existing categories have sort_order 1-6, continue from 7
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

-- Get category IDs for reference
-- We'll use the category names directly in the problems

-- Insert all remaining Blind 75 problems
INSERT INTO problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate) VALUES

-- Array & Hashing (need 7 more)
('valid-anagram', 'Valid Anagram', 'Easy', (SELECT id FROM categories WHERE name = 'Array & Hashing'), 
'Given two strings s and t, return true if t is an anagram of s, and false otherwise.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
'def isAnagram(self, s: str, t: str) -> bool:',
'[{"input": "s = \"anagram\", t = \"nagaram\"", "output": "true"}, {"input": "s = \"rat\", t = \"car\"", "output": "false"}]',
'["1 <= s.length, t.length <= 5 * 10^4", "s and t consist of lowercase English letters"]',
'["Think about character frequency", "Sort both strings or use character count"]',
1245, 67, 63.2),

('group-anagrams', 'Group Anagrams', 'Medium', (SELECT id FROM categories WHERE name = 'Array & Hashing'),
'Given an array of strings strs, group the anagrams together. You can return the answer in any order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
'def groupAnagrams(self, strs: List[str]) -> List[List[str]]:',
'[{"input": "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", "output": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]"}]',
'["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100", "strs[i] consists of lowercase English letters"]',
'["Use sorted string as key", "Character frequency can also work as key"]',
2156, 89, 67.8),

('top-k-frequent-elements', 'Top K Frequent Elements', 'Medium', (SELECT id FROM categories WHERE name = 'Array & Hashing'),
'Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.',
'def topKFrequent(self, nums: List[int], k: int) -> List[int]:',
'[{"input": "nums = [1,1,1,2,2,3], k = 2", "output": "[1,2]"}, {"input": "nums = [1], k = 1", "output": "[1]"}]',
'["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4", "k is in the range [1, the number of unique elements in the array]"]',
'["Use hash map for frequency counting", "Heap or bucket sort for finding top k"]',
3456, 134, 64.2),

('product-of-array-except-self', 'Product of Array Except Self', 'Medium', (SELECT id FROM categories WHERE name = 'Array & Hashing'),
'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in O(n) time and without using the division operation.',
'def productExceptSelf(self, nums: List[int]) -> List[int]:',
'[{"input": "nums = [1,2,3,4]", "output": "[24,12,8,6]"}, {"input": "nums = [-1,1,0,-3,3]", "output": "[0,0,9,0,0]"}]',
'["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30", "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer"]',
'["Think about prefix and suffix products", "Can you do it in one pass?"]',
4789, 456, 64.9),

('encode-and-decode-strings', 'Encode and Decode Strings', 'Medium', (SELECT id FROM categories WHERE name = 'Array & Hashing'),
'Design an algorithm to encode a list of strings to a string. The encoded string is then sent over the network and is decoded back to the original list of strings.',
'def encode(self, strs: List[str]) -> str:\ndef decode(self, s: str) -> List[str]:',
'[{"input": "dummy_input = [\"lint\",\"code\",\"love\",\"you\"]", "output": "[\"lint\",\"code\",\"love\",\"you\"]"}]',
'["0 <= strs.length <= 200", "0 <= strs[i].length <= 200", "strs[i] contains any possible characters out of 256 valid ASCII characters"]',
'["Use delimiter with length encoding", "Consider edge cases with special characters"]',
789, 234, 67.1),

('longest-consecutive-sequence', 'Longest Consecutive Sequence', 'Hard', (SELECT id FROM categories WHERE name = 'Array & Hashing'),
'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.

You must write an algorithm that runs in O(n) time.',
'def longestConsecutive(self, nums: List[int]) -> int:',
'[{"input": "nums = [100,4,200,1,3,2]", "output": "4", "explanation": "The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4."}, {"input": "nums = [0,3,7,2,5,8,4,6,0,1]", "output": "9"}]',
'["0 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"]',
'["Use set for O(1) lookup", "Only start counting from sequence beginnings"]',
2345, 89, 48.7),

-- Two Pointers (need 2 more)
('3sum', '3Sum', 'Medium', (SELECT id FROM categories WHERE name = 'Two Pointers'),
'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.',
'def threeSum(self, nums: List[int]) -> List[List[int]]:',
'[{"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]"}, {"input": "nums = []", "output": "[]"}]',
'["0 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"]',
'["Sort the array first", "Use two pointers after fixing first element", "Skip duplicates"]',
7890, 567, 32.1),

('container-with-most-water', 'Container With Most Water', 'Medium', (SELECT id FROM categories WHERE name = 'Two Pointers'),
'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store.',
'def maxArea(self, height: List[int]) -> int:',
'[{"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49", "explanation": "The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water (blue section) the container can contain is 49."}, {"input": "height = [1,1]", "output": "1"}]',
'["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"]',
'["Use two pointers from both ends", "Move the pointer with smaller height"]',
8901, 234, 54.6),

-- Sliding Window (need 3 more)
('longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'Medium', (SELECT id FROM categories WHERE name = 'Sliding Window'),
'Given a string s, find the length of the longest substring without repeating characters.',
'def lengthOfLongestSubstring(self, s: str) -> int:',
'[{"input": "s = \"abcabcbb\"", "output": "3", "explanation": "The answer is \"abc\", with the length of 3."}, {"input": "s = \"bbbbb\"", "output": "1", "explanation": "The answer is \"b\", with the length of 1."}]',
'["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"]',
'["Use sliding window technique", "Track characters with set or map"]',
9876, 345, 33.8),

('longest-repeating-character-replacement', 'Longest Repeating Character Replacement', 'Medium', (SELECT id FROM categories WHERE name = 'Sliding Window'),
'You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times.

Return the length of the longest substring containing the same letter you can get after performing the above operations.',
'def characterReplacement(self, s: str, k: int) -> int:',
'[{"input": "s = \"ABAB\", k = 2", "output": "4", "explanation": "Replace the two A''s with two B''s or vice versa."}, {"input": "s = \"AABABBA\", k = 1", "output": "4", "explanation": "Replace the one A in the middle with B and form \"AABBBBA\". The substring \"BBBB\" has the longest repeating letters, which is 4."}]',
'["1 <= s.length <= 10^5", "s consists of only uppercase English letters", "0 <= k <= s.length"]',
'["Use sliding window with character frequency", "Track most frequent character in window"]',
1234, 123, 51.2),

('minimum-window-substring', 'Minimum Window Substring', 'Hard', (SELECT id FROM categories WHERE name = 'Sliding Window'),
'Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string "".

The testcases will be generated such that the answer is unique.',
'def minWindow(self, s: str, t: str) -> str:',
'[{"input": "s = \"ADOBECODEBANC\", t = \"ABC\"", "output": "\"BANC\"", "explanation": "The minimum window substring \"BANC\" includes A, B, and C from string t."}, {"input": "s = \"a\", t = \"a\"", "output": "\"a\""}]',
'["m == s.length", "n == t.length", "1 <= m, n <= 10^5", "s and t consist of uppercase and lowercase English letters"]',
'["Use sliding window with two pointers", "Track character frequencies", "Expand window until valid, then contract"]',
2567, 189, 38.9),

-- Stack (need 5 more)
('min-stack', 'Min Stack', 'Easy', (SELECT id FROM categories WHERE name = 'Stack'),
'Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.',
'class MinStack:\n    def __init__(self):\n    def push(self, val: int) -> None:\n    def pop(self) -> None:\n    def top(self) -> int:\n    def getMin(self) -> int:',
'[{"input": "[\"MinStack\",\"push\",\"push\",\"push\",\"getMin\",\"pop\",\"top\",\"getMin\"]\\n[[],[-2],[0],[-3],[],[],[],[]]", "output": "[null,null,null,null,-3,null,0,-2]"}]',
'["-2^31 <= val <= 2^31 - 1", "Methods pop, top and getMin operations will always be called on non-empty stacks"]',
'["Use auxiliary stack for minimums", "Store min value with each element"]',
3456, 234, 51.8),

('evaluate-reverse-polish-notation', 'Evaluate Reverse Polish Notation', 'Medium', (SELECT id FROM categories WHERE name = 'Stack'),
'Evaluate the value of an arithmetic expression in Reverse Polish Notation.',
'def evalRPN(self, tokens: List[str]) -> int:',
'[{"input": "tokens = [\"2\",\"1\",\"+\",\"3\",\"*\"]", "output": "9", "explanation": "((2 + 1) * 3) = 9"}, {"input": "tokens = [\"4\",\"13\",\"5\",\"/\",\"+\"]", "output": "6"}]',
'["1 <= tokens.length <= 10^4", "tokens[i] is either an operator or integer"]',
'["Use stack to store operands", "Pop two operands for each operator"]',
1890, 67, 42.3),

('generate-parentheses', 'Generate Parentheses', 'Medium', (SELECT id FROM categories WHERE name = 'Stack'),
'Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.',
'def generateParenthesis(self, n: int) -> List[str]:',
'[{"input": "n = 3", "output": "[\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]"}, {"input": "n = 1", "output": "[\"()\"]"}]',
'["1 <= n <= 8"]',
'["Use backtracking", "Track open and close parentheses count"]',
4567, 123, 68.9),

('daily-temperatures', 'Daily Temperatures', 'Medium', (SELECT id FROM categories WHERE name = 'Stack'),
'Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature.',
'def dailyTemperatures(self, temperatures: List[int]) -> List[int]:',
'[{"input": "temperatures = [73,74,75,71,69,72,76,73]", "output": "[1,1,4,2,1,1,0,0]"}, {"input": "temperatures = [30,40,50,60]", "output": "[1,1,1,0]"}]',
'["1 <= temperatures.length <= 10^5", "30 <= temperatures[i] <= 100"]',
'["Use monotonic decreasing stack", "Store indices instead of values"]',
3210, 98, 65.7),

('car-fleet', 'Car Fleet', 'Medium', (SELECT id FROM categories WHERE name = 'Stack'),
'There are n cars going to the same destination along a one-lane road. The destination is target miles away.',
'def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:',
'[{"input": "target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]", "output": "3"}]',
'["n == position.length == speed.length", "1 <= n <= 10^5", "0 < target <= 10^6"]',
'["Calculate time to reach target for each car", "Use stack to track fleets"]',
1567, 234, 38.4),

-- Binary Search (need 1 more)
('time-based-key-value-store', 'Time Based Key-Value Store', 'Medium', (SELECT id FROM categories WHERE name = 'Binary Search'),
'Design a time-based key-value data structure that can store multiple values for the same key at different time stamps and retrieve the key''s value at a certain timestamp.',
'class TimeMap:\n    def __init__(self):\n    def set(self, key: str, value: str, timestamp: int) -> None:\n    def get(self, key: str, timestamp: int) -> str:',
'[{"input": "[\"TimeMap\",\"set\",\"get\",\"get\",\"set\",\"get\",\"get\"]\\n[[],[\"foo\",\"bar\",1],[\"foo\",1],[\"foo\",3],[\"foo\",\"bar2\",4],[\"foo\",4],[\"foo\",5]]", "output": "[null,null,\"bar\",\"bar\",null,\"bar2\",\"bar2\"]"}]',
'["1 <= key.length, value.length <= 100", "1 <= timestamp <= 10^7"]',
'["Use hash map with sorted list", "Binary search for timestamp lookup"]',
2345, 167, 54.2),

-- Linked List (need 1 more)
('find-the-duplicate-number', 'Find the Duplicate Number', 'Medium', (SELECT id FROM categories WHERE name = 'Linked List'),
'Given an array of integers nums containing n + 1 integers where each integer is in the range [1, n] inclusive.',
'def findDuplicate(self, nums: List[int]) -> int:',
'[{"input": "nums = [1,3,4,2,2]", "output": "2"}, {"input": "nums = [3,1,3,4,2]", "output": "3"}]',
'["1 <= n <= 10^5", "nums.length == n + 1", "1 <= nums[i] <= n"]',
'["Think of it as linked list cycle detection", "Floyd''s cycle detection algorithm"]',
4567, 234, 59.1);

-- Continue with remaining categories and problems...
-- This is the first batch, will continue with remaining problems in subsequent migrations
