-- Insert categories if they don't exist
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

-- Insert additional Blind 75 problems (avoiding conflicts with existing ones)
WITH category_lookup AS (
  SELECT id, name FROM public.categories
)
INSERT INTO public.problems (id, title, difficulty, category_id, description, function_signature, examples, constraints, hints, acceptance_rate, likes, dislikes) VALUES

-- More Array Problems
('3sum', '3Sum', 'Medium', 
 (SELECT id FROM category_lookup WHERE name = 'Array'),
 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.',
 'def threeSum(self, nums: List[int]) -> List[List[int]]:',
 '[{"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]", "explanation": "The distinct triplets are [-1,0,1] and [-1,-1,2]."}]'::jsonb,
 '["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"]'::jsonb,
 '["Sort the array first.", "Use two pointers technique after fixing the first element."]'::jsonb,
 32.4, 18923, 1745),

('container-with-most-water', 'Container With Most Water', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Two Pointers'),
 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container that contains the most water.',
 'def maxArea(self, height: List[int]) -> int:',
 '[{"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49", "explanation": "The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water the container can contain is 49."}]'::jsonb,
 '["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"]'::jsonb,
 '["Use two pointers from both ends.", "Move the pointer with smaller height."]'::jsonb,
 54.1, 19234, 1876),

-- More String Problems
('longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Sliding Window'),
 'Given a string s, find the length of the longest substring without repeating characters.',
 'def lengthOfLongestSubstring(self, s: str) -> int:',
 '[{"input": "s = \"abcabcbb\"", "output": "3", "explanation": "The answer is \"abc\", with the length of 3."}]'::jsonb,
 '["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."]'::jsonb,
 '["Use sliding window technique.", "Keep track of characters in current window with a hash set."]'::jsonb,
 33.8, 23456, 2134),

('palindromic-substrings', 'Palindromic Substrings', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'String'),
 'Given a string s, return the number of palindromic substrings in it.',
 'def countSubstrings(self, s: str) -> int:',
 '[{"input": "s = \"abc\"", "output": "3", "explanation": "Three palindromic strings: \"a\", \"b\", \"c\"."}, {"input": "s = \"aaa\"", "output": "6", "explanation": "Six palindromic strings: \"a\", \"a\", \"a\", \"aa\", \"aa\", \"aaa\"."}]'::jsonb,
 '["1 <= s.length <= 1000", "s consists of lowercase English letters."]'::jsonb,
 '["Expand around each possible center.", "Count palindromes of both odd and even lengths."]'::jsonb,
 66.1, 8765, 234),

-- More Tree Problems
('binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Tree'),
 'Given the root of a binary tree, return the level order traversal of its nodes'' values. (i.e., from left to right, level by level).',
 'def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:',
 '[{"input": "root = [3,9,20,null,null,15,7]", "output": "[[3],[9,20],[15,7]]"}]'::jsonb,
 '["The number of nodes in the tree is in the range [0, 2000].", "-1000 <= Node.val <= 1000"]'::jsonb,
 '["Use BFS with a queue.", "Process nodes level by level."]'::jsonb,
 64.8, 9876, 345),

('validate-binary-search-tree', 'Validate Binary Search Tree', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Tree'),
 'Given the root of a binary tree, determine if it is a valid binary search tree (BST).',
 'def isValidBST(self, root: Optional[TreeNode]) -> bool:',
 '[{"input": "root = [2,1,3]", "output": "true"}, {"input": "root = [5,1,4,null,null,3,6]", "output": "false", "explanation": "The root node''s value is 5 but its right child''s value is 4."}]'::jsonb,
 '["The number of nodes in the tree is in the range [1, 10^4].", "-2^31 <= Node.val <= 2^31 - 1"]'::jsonb,
 '["Use inorder traversal to check if values are in ascending order.", "Or pass min/max bounds during recursion."]'::jsonb,
 31.4, 12456, 876),

-- Dynamic Programming Problems
('coin-change', 'Coin Change', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Dynamic Programming'),
 'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount.',
 'def coinChange(self, coins: List[int], amount: int) -> int:',
 '[{"input": "coins = [1,3,4], amount = 6", "output": "2", "explanation": "The answer is 2, coins [3,3]."}, {"input": "coins = [2], amount = 3", "output": "-1", "explanation": "The amount of 3 cannot be made up just with coins of 2."}]'::jsonb,
 '["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"]'::jsonb,
 '["Use dynamic programming.", "dp[i] = min coins needed to make amount i."]'::jsonb,
 40.7, 15234, 1234),

('longest-increasing-subsequence', 'Longest Increasing Subsequence', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Dynamic Programming'),
 'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
 'def lengthOfLIS(self, nums: List[int]) -> int:',
 '[{"input": "nums = [10,9,2,5,3,7,101,18]", "output": "4", "explanation": "The longest increasing subsequence is [2,3,7,18], therefore the length is 4."}]'::jsonb,
 '["1 <= nums.length <= 2500", "-10^4 <= nums[i] <= 10^4"]'::jsonb,
 '["Use DP where dp[i] = length of LIS ending at index i.", "Consider binary search optimization."]'::jsonb,
 54.3, 11234, 567),

-- Graph Problems
('clone-graph', 'Clone Graph', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Graph'),
 'Given a reference of a node in a connected undirected graph. Return a deep copy (clone) of the graph.',
 'def cloneGraph(self, node: ''Node'') -> ''Node'':',
 '[{"input": "adjList = [[2,4],[1,3],[2,4],[1,3]]", "output": "[[2,4],[1,3],[2,4],[1,3]]", "explanation": "There are 4 nodes in the graph."}]'::jsonb,
 '["The number of nodes in the graph is in the range [0, 100].", "1 <= Node.val <= 100"]'::jsonb,
 '["Use DFS or BFS with a hash map to track cloned nodes.", "Clone nodes and edges recursively."]'::jsonb,
 50.2, 8765, 432),

('course-schedule', 'Course Schedule', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Graph'),
 'There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses.',
 'def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:',
 '[{"input": "numCourses = 2, prerequisites = [[1,0]]", "output": "true", "explanation": "There are a total of 2 courses to take. To take course 1 you should have finished course 0. So it is possible."}, {"input": "numCourses = 2, prerequisites = [[1,0],[0,1]]", "output": "false", "explanation": "There are a total of 2 courses to take. To take course 1 you should have finished course 0, and to take course 0 you should also have finished course 1. So it is impossible."}]'::jsonb,
 '["1 <= numCourses <= 2000", "0 <= prerequisites.length <= 5000", "prerequisites[i].length == 2"]'::jsonb,
 '["This is a cycle detection problem in directed graph.", "Use DFS with color coding or topological sort."]'::jsonb,
 45.1, 9876, 654),

-- Linked List Problems
('merge-two-sorted-lists', 'Merge Two Sorted Lists', 'Easy',
 (SELECT id FROM category_lookup WHERE name = 'Linked List'),
 'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list.',
 'def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:',
 '[{"input": "list1 = [1,2,4], list2 = [1,3,4]", "output": "[1,1,2,3,4,4]"}]'::jsonb,
 '["The number of nodes in both lists is in the range [0, 50].", "-100 <= Node.val <= 100"]'::jsonb,
 '["Use two pointers to traverse both lists.", "Create a dummy head for easier implementation."]'::jsonb,
 62.7, 13456, 234),

('remove-nth-node-from-end-of-list', 'Remove Nth Node From End of List', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Linked List'),
 'Given the head of a linked list, remove the nth node from the end of the list and return its head.',
 'def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:',
 '[{"input": "head = [1,2,3,4,5], n = 2", "output": "[1,2,3,5]"}]'::jsonb,
 '["The number of nodes in the list is sz.", "1 <= sz <= 30", "0 <= Node.val <= 100", "1 <= n <= sz"]'::jsonb,
 '["Use two pointers with n gap between them.", "Move both pointers until the fast one reaches the end."]'::jsonb,
 39.1, 12345, 876),

-- Heap Problems
('find-median-from-data-stream', 'Find Median from Data Stream', 'Hard',
 (SELECT id FROM category_lookup WHERE name = 'Heap'),
 'The median is the middle value in an ordered integer list. Design a data structure that supports adding integers and finding the median.',
 'class MedianFinder:\n    def __init__(self):\n    def addNum(self, num: int) -> None:\n    def findMedian(self) -> float:',
 '[{"input": "operations = [\"MedianFinder\",\"addNum\",\"addNum\",\"findMedian\",\"addNum\",\"findMedian\"], values = [[],[1],[2],[],[3],[]]", "output": "[null,null,null,1.5,null,2.0]"}]'::jsonb,
 '["At most 5 * 10^4 calls will be made to addNum and findMedian.", "-10^5 <= num <= 10^5"]'::jsonb,
 '["Use two heaps: max heap for smaller half, min heap for larger half.", "Balance the heaps to maintain size difference <= 1."]'::jsonb,
 49.7, 8765, 1234),

-- Binary Search Problems
('search-in-rotated-sorted-array', 'Search in Rotated Sorted Array', 'Medium',
 (SELECT id FROM category_lookup WHERE name = 'Binary Search'),
 'There is an integer array nums sorted in ascending order (with distinct values). Given the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.',
 'def search(self, nums: List[int], target: int) -> int:',
 '[{"input": "nums = [4,5,6,7,0,1,2], target = 0", "output": "4"}, {"input": "nums = [4,5,6,7,0,1,2], target = 3", "output": "-1"}]'::jsonb,
 '["1 <= nums.length <= 5000", "-10^4 <= nums[i] <= 10^4", "All values of nums are unique."]'::jsonb,
 '["Modified binary search.", "Identify which half is sorted and check if target is in that range."]'::jsonb,
 38.1, 17654, 987)

ON CONFLICT (id) DO NOTHING;

-- Insert test cases for new problems
INSERT INTO public.test_cases (problem_id, input, expected_output, is_example, explanation) VALUES

-- 3Sum test cases
('3sum', 'nums = [-1,0,1,2,-1,-4]', '[[-1,-1,2],[-1,0,1]]', true, 'The distinct triplets sum to zero'),
('3sum', 'nums = [0,1,1]', '[]', false, 'No triplets sum to zero'),
('3sum', 'nums = [0,0,0]', '[[0,0,0]]', false, 'All zeros sum to zero'),

-- Container With Most Water
('container-with-most-water', 'height = [1,8,6,2,5,4,8,3,7]', '49', true, 'Lines at index 1 and 8 form the largest container'),
('container-with-most-water', 'height = [1,1]', '1', false, 'Simple case with two equal heights'),

-- More test cases for other problems...
('longest-substring-without-repeating-characters', 's = "abcabcbb"', '3', true, 'The longest substring is "abc"'),
('longest-substring-without-repeating-characters', 's = "bbbbb"', '1', false, 'All characters are the same'),
('longest-substring-without-repeating-characters', 's = "pwwkew"', '3', false, 'The longest substring is "wke"'),

('binary-tree-level-order-traversal', 'root = [3,9,20,null,null,15,7]', '[[3],[9,20],[15,7]]', true, 'Level by level traversal'),
('binary-tree-level-order-traversal', 'root = [1]', '[[1]]', false, 'Single node'),
('binary-tree-level-order-traversal', 'root = []', '[]', false, 'Empty tree'),

('coin-change', 'coins = [1,3,4], amount = 6', '2', true, 'Use coins [3,3]'),
('coin-change', 'coins = [2], amount = 3', '-1', true, 'Cannot make amount 3 with coin 2'),
('coin-change', 'coins = [1], amount = 0', '0', false, 'No coins needed for amount 0'),

('merge-two-sorted-lists', 'list1 = [1,2,4], list2 = [1,3,4]', '[1,1,2,3,4,4]', true, 'Merge both sorted lists'),
('merge-two-sorted-lists', 'list1 = [], list2 = []', '[]', false, 'Both lists are empty'),
('merge-two-sorted-lists', 'list1 = [], list2 = [0]', '[0]', false, 'One list is empty'),

('search-in-rotated-sorted-array', 'nums = [4,5,6,7,0,1,2], target = 0', '4', true, 'Target found at index 4'),
('search-in-rotated-sorted-array', 'nums = [4,5,6,7,0,1,2], target = 3', '-1', true, 'Target not found'),
('search-in-rotated-sorted-array', 'nums = [1], target = 0', '-1', false, 'Single element, target not found');