-- First, let's ensure we have the necessary categories
INSERT INTO public.categories (id, name, color, description, sort_order) VALUES
  (gen_random_uuid(), 'Array', '#FF6B6B', 'Problems involving arrays and lists', 1),
  (gen_random_uuid(), 'String', '#4ECDC4', 'String manipulation and processing', 2),
  (gen_random_uuid(), 'Linked List', '#45B7D1', 'Linked list operations and algorithms', 3),
  (gen_random_uuid(), 'Tree', '#96CEB4', 'Binary trees, BSTs, and tree traversal', 4),
  (gen_random_uuid(), 'Graph', '#FFEAA7', 'Graph algorithms and traversal', 5),
  (gen_random_uuid(), 'Dynamic Programming', '#DDA0DD', 'DP optimization problems', 6),
  (gen_random_uuid(), 'Binary Search', '#98D8C8', 'Binary search applications', 7),
  (gen_random_uuid(), 'Heap', '#F7DC6F', 'Priority queue and heap problems', 8),
  (gen_random_uuid(), 'Two Pointers', '#BB8FCE', 'Two pointer technique', 9),
  (gen_random_uuid(), 'Sliding Window', '#85C1E9', 'Sliding window patterns', 10),
  (gen_random_uuid(), 'Backtracking', '#F8C471', 'Backtracking algorithms', 11),
  (gen_random_uuid(), 'Bit Manipulation', '#82E0AA', 'Bitwise operations', 12),
  (gen_random_uuid(), 'Math', '#F1948A', 'Mathematical algorithms', 13),
  (gen_random_uuid(), 'Matrix', '#C39BD3', 'Matrix operations and algorithms', 14),
  (gen_random_uuid(), 'Interval', '#7FB3D3', 'Interval-based problems', 15)
ON CONFLICT (name) DO NOTHING;

-- Now insert Blind 75 problems
WITH category_lookup AS (
  SELECT id, name FROM public.categories
)
INSERT INTO public.problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, acceptance_rate, likes, dislikes) VALUES

-- Array Problems
('two-sum', 'Two Sum', 'Easy', 
 (SELECT id FROM category_lookup WHERE name = 'Array'),
 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
 'def twoSum(self, nums: List[int], target: int) -> List[int]:',
 '[{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."}]'::jsonb,
 '["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."]'::jsonb,
 '["Try using a hash map to store the complement values.", "For each number, check if target - num exists in your map."]'::jsonb,
 54.7, 15234, 623),

('best-time-to-buy-and-sell-stock', 'Best Time to Buy and Sell Stock', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'Array'),
 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.',
 'def maxProfit(self, prices: List[int]) -> int:',
 '[{"input": "prices = [7,1,5,3,6,4]", "output": "5", "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."}]'::jsonb,
 '["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"]'::jsonb,
 '["Keep track of the minimum price seen so far.", "Calculate profit at each step."]'::jsonb,
 53.1, 12456, 421),

('contains-duplicate', 'Contains Duplicate', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'Array'),
 'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
 'def containsDuplicate(self, nums: List[int]) -> bool:',
 '[{"input": "nums = [1,2,3,1]", "output": "true"}, {"input": "nums = [1,2,3,4]", "output": "false"}]'::jsonb,
 '["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"]'::jsonb,
 '["Use a set to track seen elements.", "Compare the length of the set with the original array."]'::jsonb,
 59.8, 8234, 1234),

('product-of-array-except-self', 'Product of Array Except Self', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Array'),
 'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. You must write an algorithm that runs in O(n) time and without using the division operation.',
 'def productExceptSelf(self, nums: List[int]) -> List[int]:',
 '[{"input": "nums = [1,2,3,4]", "output": "[24,12,8,6]"}]'::jsonb,
 '["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30", "The product of any prefix or suffix is guaranteed to fit in a 32-bit integer."]'::jsonb,
 '["Think about left and right products separately.", "Use the output array to store intermediate results."]'::jsonb,
 64.3, 9876, 345),

('maximum-subarray', 'Maximum Subarray', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Array'),
 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
 'def maxSubArray(self, nums: List[int]) -> int:',
 '[{"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6", "explanation": "The subarray [4,-1,2,1] has the largest sum 6."}]'::jsonb,
 '["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"]'::jsonb,
 '["Use Kadane''s algorithm.", "Keep track of current sum and maximum sum."]'::jsonb,
 50.1, 18765, 987),

-- String Problems
('valid-anagram', 'Valid Anagram', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'String'),
 'Given two strings s and t, return true if t is an anagram of s, and false otherwise.',
 'def isAnagram(self, s: str, t: str) -> bool:',
 '[{"input": "s = \"anagram\", t = \"nagaram\"", "output": "true"}, {"input": "s = \"rat\", t = \"car\"", "output": "false"}]'::jsonb,
 '["1 <= s.length, t.length <= 5 * 10^4", "s and t consist of lowercase English letters."]'::jsonb,
 '["Count frequency of characters.", "Compare character counts between both strings."]'::jsonb,
 61.8, 7234, 234),

('valid-parentheses', 'Valid Parentheses', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'String'),
 'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.',
 'def isValid(self, s: str) -> bool:',
 '[{"input": "s = \"()\"", "output": "true"}, {"input": "s = \"([)]\"", "output": "false"}]'::jsonb,
 '["1 <= s.length <= 10^4", "s consists of parentheses only ''()[]{}''."]'::jsonb,
 '["Use a stack to track opening brackets.", "Match each closing bracket with the most recent opening bracket."]'::jsonb,
 40.1, 15678, 567),

('longest-palindromic-substring', 'Longest Palindromic Substring', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'String'),
 'Given a string s, return the longest palindromic substring in s.',
 'def longestPalindrome(self, s: str) -> str:',
 '[{"input": "s = \"babad\"", "output": "\"bab\"", "explanation": "\"aba\" is also a valid answer."}]'::jsonb,
 '["1 <= s.length <= 1000", "s consist of only digits and English letters."]'::jsonb,
 '["Expand around centers.", "Consider both odd and even length palindromes."]'::jsonb,
 32.1, 12345, 890),

-- Linked List Problems
('reverse-linked-list', 'Reverse Linked List', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'Linked List'),
 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
 'def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:',
 '[{"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]"}]'::jsonb,
 '["The number of nodes in the list is the range [0, 5000].", "-5000 <= Node.val <= 5000"]'::jsonb,
 '["Use three pointers: previous, current, and next.", "Iteratively reverse the links."]'::jsonb,
 71.2, 13456, 234),

('linked-list-cycle', 'Linked List Cycle', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'Linked List'),
 'Given head, the head of a linked list, determine if the linked list has a cycle in it.',
 'def hasCycle(self, head: Optional[ListNode]) -> bool:',
 '[{"input": "head = [3,2,0,-4], pos = 1", "output": "true", "explanation": "There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed)."}]'::jsonb,
 '["The number of the nodes in the list is in the range [0, 10^4].", "-10^5 <= Node.val <= 10^5"]'::jsonb,
 '["Use Floyd''s cycle detection algorithm.", "Use two pointers with different speeds."]'::jsonb,
 46.1, 9876, 123),

-- Tree Problems  
('maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'Tree'),
 'Given the root of a binary tree, return its maximum depth.',
 'def maxDepth(self, root: Optional[TreeNode]) -> int:',
 '[{"input": "root = [3,9,20,null,null,15,7]", "output": "3"}]'::jsonb,
 '["The number of nodes in the tree is in the range [0, 10^4].", "-100 <= Node.val <= 100"]'::jsonb,
 '["Use recursion to find depth of left and right subtrees.", "Return 1 + max(left_depth, right_depth)."]'::jsonb,
 75.4, 8765, 123),

('same-tree', 'Same Tree', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'Tree'),
 'Given the roots of two binary trees p and q, write a function to check if they are the same or not.',
 'def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:',
 '[{"input": "p = [1,2,3], q = [1,2,3]", "output": "true"}]'::jsonb,
 '["The number of nodes in both trees is in the range [0, 100].", "-10^4 <= Node.val <= 10^4"]'::jsonb,
 '["Use recursion to compare nodes.", "Check if both nodes are null, or if values match and subtrees are same."]'::jsonb,
 57.8, 6543, 87),

('invert-binary-tree', 'Invert Binary Tree', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'Tree'),
 'Given the root of a binary tree, invert the tree, and return its root.',
 'def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:',
 '[{"input": "root = [4,2,7,1,3,6,9]", "output": "[4,7,2,9,6,3,1]"}]'::jsonb,
 '["The number of nodes in the tree is in the range [0, 100].", "-100 <= Node.val <= 100"]'::jsonb,
 '["Swap left and right children recursively.", "Can be solved iteratively using a queue."]'::jsonb,
 74.9, 11234, 234),

-- Dynamic Programming
('climbing-stairs', 'Climbing Stairs', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'Dynamic Programming'),
 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
 'def climbStairs(self, n: int) -> int:',
 '[{"input": "n = 2", "output": "2", "explanation": "There are two ways to climb to the top: 1+1 or 2."}, {"input": "n = 3", "output": "3", "explanation": "1+1+1, 1+2, or 2+1."}]'::jsonb,
 '["1 <= n <= 45"]'::jsonb,
 '["This is essentially Fibonacci sequence.", "dp[i] = dp[i-1] + dp[i-2]"]'::jsonb,
 51.2, 9876, 234),

('house-robber', 'House Robber', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Dynamic Programming'),
 'You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. Adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night.',
 'def rob(self, nums: List[int]) -> int:',
 '[{"input": "nums = [1,2,3,1]", "output": "4", "explanation": "Rob house 1 (money = 1) then rob house 3 (money = 3). Total = 4."}, {"input": "nums = [2,7,9,3,1]", "output": "12", "explanation": "Rob house 1, 3, and 5. Total = 2 + 9 + 1 = 12."}]'::jsonb,
 '["1 <= nums.length <= 100", "0 <= nums[i] <= 400"]'::jsonb,
 '["At each house, decide whether to rob it or not.", "dp[i] = max(dp[i-1], dp[i-2] + nums[i])"]'::jsonb,
 47.3, 15432, 567),

-- Graph Problems
('number-of-islands', 'Number of Islands', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Graph'),
 'Given an m x n 2D binary grid which represents a map of ''1''s (land) and ''0''s (water), return the number of islands.',
 'def numIslands(self, grid: List[List[str]]) -> int:',
 '[{"input": "grid = [[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]", "output": "1"}]'::jsonb,
 '["m == grid.length", "n == grid[i].length", "1 <= m, n <= 300", "grid[i][j] is ''0'' or ''1''."]'::jsonb,
 '["Use DFS or BFS to explore connected components.", "Mark visited cells to avoid counting twice."]'::jsonb,
 56.8, 12789, 432);

-- Insert test cases for the problems
INSERT INTO public.test_cases (problem_id, input, expected_output, is_example, explanation) VALUES

-- Two Sum test cases
('two-sum', 'nums = [2,7,11,15]\ntarget = 9', '[0,1]', true, 'nums[0] + nums[1] = 2 + 7 = 9'),
('two-sum', 'nums = [3,2,4]\ntarget = 6', '[1,2]', false, 'nums[1] + nums[2] = 2 + 4 = 6'),
('two-sum', 'nums = [3,3]\ntarget = 6', '[0,1]', false, 'nums[0] + nums[1] = 3 + 3 = 6'),

-- Best Time to Buy and Sell Stock
('best-time-to-buy-and-sell-stock', 'prices = [7,1,5,3,6,4]', '5', true, 'Buy on day 2 (price = 1) and sell on day 5 (price = 6)'),
('best-time-to-buy-and-sell-stock', 'prices = [7,6,4,3,1]', '0', false, 'No transaction is done, max profit = 0'),

-- Contains Duplicate
('contains-duplicate', 'nums = [1,2,3,1]', 'true', true, 'The value 1 appears twice'),
('contains-duplicate', 'nums = [1,2,3,4]', 'false', true, 'All elements are distinct'),
('contains-duplicate', 'nums = [1,1,1,3,3,4,3,2,4,2]', 'true', false, 'Multiple duplicates exist'),

-- Product of Array Except Self
('product-of-array-except-self', 'nums = [1,2,3,4]', '[24,12,8,6]', true, 'Products: [2*3*4, 1*3*4, 1*2*4, 1*2*3]'),
('product-of-array-except-self', 'nums = [-1,1,0,-3,3]', '[0,0,9,0,0]', false, 'Zero makes most products zero'),

-- Maximum Subarray
('maximum-subarray', 'nums = [-2,1,-3,4,-1,2,1,-5,4]', '6', true, 'Subarray [4,-1,2,1] has the largest sum'),
('maximum-subarray', 'nums = [1]', '1', false, 'Single element'),
('maximum-subarray', 'nums = [5,4,-1,7,8]', '23', false, 'Entire array is the maximum subarray'),

-- Valid Anagram
('valid-anagram', 's = "anagram"\nt = "nagaram"', 'true', true, 'Both strings have same character frequencies'),
('valid-anagram', 's = "rat"\nt = "car"', 'false', true, 'Different character frequencies'),

-- Valid Parentheses
('valid-parentheses', 's = "()"', 'true', true, 'Simple valid case'),
('valid-parentheses', 's = "()[]{}"', 'true', false, 'Multiple bracket types'),
('valid-parentheses', 's = "(]"', 'false', false, 'Mismatched brackets'),
('valid-parentheses', 's = "([)]"', 'false', true, 'Incorrectly nested'),

-- Longest Palindromic Substring
('longest-palindromic-substring', 's = "babad"', '"bab"', true, 'Both "bab" and "aba" are valid'),
('longest-palindromic-substring', 's = "cbbd"', '"bb"', false, 'Even length palindrome'),

-- Reverse Linked List
('reverse-linked-list', 'head = [1,2,3,4,5]', '[5,4,3,2,1]', true, 'Reverse the entire list'),
('reverse-linked-list', 'head = [1,2]', '[2,1]', false, 'Simple two-node case'),
('reverse-linked-list', 'head = []', '[]', false, 'Empty list'),

-- Linked List Cycle
('linked-list-cycle', 'head = [3,2,0,-4], pos = 1', 'true', true, 'Cycle exists at position 1'),
('linked-list-cycle', 'head = [1,2], pos = 0', 'true', false, 'Cycle at head'),
('linked-list-cycle', 'head = [1], pos = -1', 'false', false, 'No cycle'),

-- Maximum Depth of Binary Tree
('maximum-depth-of-binary-tree', 'root = [3,9,20,null,null,15,7]', '3', true, 'Tree has depth 3'),
('maximum-depth-of-binary-tree', 'root = [1,null,2]', '2', false, 'Right-skewed tree'),

-- Same Tree
('same-tree', 'p = [1,2,3]\nq = [1,2,3]', 'true', true, 'Identical trees'),
('same-tree', 'p = [1,2]\nq = [1,null,2]', 'false', false, 'Different structures'),

-- Invert Binary Tree
('invert-binary-tree', 'root = [4,2,7,1,3,6,9]', '[4,7,2,9,6,3,1]', true, 'Complete inversion'),
('invert-binary-tree', 'root = [2,1,3]', '[2,3,1]', false, 'Simple case'),

-- Climbing Stairs
('climbing-stairs', 'n = 2', '2', true, 'Two ways: 1+1 or 2'),
('climbing-stairs', 'n = 3', '3', true, 'Three ways: 1+1+1, 1+2, or 2+1'),
('climbing-stairs', 'n = 4', '5', false, 'Five distinct ways'),

-- House Robber
('house-robber', 'nums = [1,2,3,1]', '4', true, 'Rob houses 0 and 2'),
('house-robber', 'nums = [2,7,9,3,1]', '12', true, 'Rob houses 0, 2, and 4'),
('house-robber', 'nums = [2,1,1,2]', '4', false, 'Rob houses 0 and 3'),

-- Number of Islands
('number-of-islands', 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', '1', true, 'One connected island'),
('number-of-islands', 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', '3', false, 'Three separate islands');