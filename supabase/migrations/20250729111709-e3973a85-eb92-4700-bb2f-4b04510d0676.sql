-- Consolidate duplicate categories
-- First, let's create a mapping of duplicate categories to their consolidated versions

-- Update problems to use consolidated categories
UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Array & Hashing' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Array');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Graphs' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Graph' OR name = 'Advanced Graphs');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Trees' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Tree');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Intervals' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Interval');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Math & Geometry' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Math');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Dynamic Programming' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = '1-D Dynamic Programming' OR name = '2-D Dynamic Programming');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Heap / Priority Queue' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Heap');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Hash Table' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'String');

-- Delete duplicate categories
DELETE FROM categories WHERE name IN ('Array', 'Graph', 'Advanced Graphs', 'Tree', 'Interval', 'Math', '1-D Dynamic Programming', '2-D Dynamic Programming', 'Heap', 'String');

-- Add missing problems to reach 75
INSERT INTO problems (id, title, difficulty, description, function_signature, examples, constraints, hints, likes, dislikes, acceptance_rate, category_id) VALUES
('minimum-window-substring', 'Minimum Window Substring', 'Hard', 'Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string "".', 
'def minWindow(s: str, t: str) -> str:', 
'[{"input": "s = \"ADOBECODEBANC\", t = \"ABC\"", "output": "\"BANC\"", "explanation": "The minimum window substring \"BANC\" includes ''A'', ''B'', and ''C'' from string t."}, {"input": "s = \"a\", t = \"a\"", "output": "\"a\""}, {"input": "s = \"a\", t = \"aa\"", "output": "\"\"", "explanation": "Both ''a''s from t must be included in the window."}]',
'["1 <= s.length, t.length <= 105", "s and t consist of uppercase and lowercase English letters."]',
'["Use two pointers technique", "Use a sliding window approach", "Keep track of character frequencies"]',
150, 25, 37.8, (SELECT id FROM categories WHERE name = 'Sliding Window' LIMIT 1)),

('serialize-and-deserialize-binary-tree', 'Serialize and Deserialize Binary Tree', 'Hard', 'Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment. Design an algorithm to serialize and deserialize a binary tree.',
'# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, x):\n#         self.val = x\n#         self.left = None\n#         self.right = None\n\nclass Codec:\n    def serialize(self, root):\n        """Encodes a tree to a single string."""\n        pass\n        \n    def deserialize(self, data):\n        """Decodes your encoded data to tree."""\n        pass',
'[{"input": "root = [1,2,3,null,null,4,5]", "output": "[1,2,3,null,null,4,5]"}, {"input": "root = []", "output": "[]"}]',
'["The number of nodes in the tree is in the range [0, 104]", "-1000 <= Node.val <= 1000"]',
'["Use preorder traversal for serialization", "Use recursion for both serialization and deserialization"]',
200, 30, 55.2, (SELECT id FROM categories WHERE name = 'Trees' LIMIT 1)),

('trapping-rain-water', 'Trapping Rain Water', 'Hard', 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
'def trap(height: List[int]) -> int:',
'[{"input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]", "output": "6", "explanation": "The elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped."}, {"input": "height = [4,2,0,3,2,5]", "output": "9"}]',
'["n == height.length", "1 <= n <= 2 * 104", "0 <= height[i] <= 105"]',
'["Use two pointers approach", "Track left and right max heights"]',
180, 20, 56.7, (SELECT id FROM categories WHERE name = 'Two Pointers' LIMIT 1)),

('word-ladder', 'Word Ladder', 'Hard', 'A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that every adjacent pair of words differs by exactly one letter. Given two words, beginWord and endWord, and a dictionary wordList, return the length of the shortest transformation sequence from beginWord to endWord, or 0 if no such sequence exists.',
'def ladderLength(beginWord: str, endWord: str, wordList: List[str]) -> int:',
'[{"input": "beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]", "output": "5", "explanation": "One shortest transformation sequence is \"hit\" -> \"hot\" -> \"dot\" -> \"dog\" -> \"cog\", which is 5 words long."}, {"input": "beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\"]", "output": "0", "explanation": "The endWord \"cog\" is not in wordList, therefore there is no valid transformation sequence."}]',
'["1 <= beginWord.length <= 10", "endWord.length == beginWord.length", "1 <= wordList.length <= 5000", "wordList[i].length == beginWord.length"]',
'["Use BFS to find shortest path", "Build adjacency list of words that differ by one character"]',
120, 40, 35.8, (SELECT id FROM categories WHERE name = 'Graphs' LIMIT 1)),

('alien-dictionary', 'Alien Dictionary', 'Hard', 'There is a new alien language that uses the English alphabet. However, the order among the letters is unknown to you. You are given a list of strings words from the alien language dictionary, where the strings in words are sorted lexicographically by the rules of this new language. Return a string of the unique letters in the new alien language sorted in lexicographically increasing order by the new language rules. If there is no solution, return "". If there are multiple solutions, return any of them.',
'def alienOrder(words: List[str]) -> str:',
'[{"input": "words = [\"wrt\",\"wrf\",\"er\",\"ett\",\"rftt\"]", "output": "\"wertf\""}, {"input": "words = [\"z\",\"x\"]", "output": "\"zx\""}, {"input": "words = [\"z\",\"x\",\"z\"]", "output": "\"\"", "explanation": "The order is invalid, so return \"\"."}]',
'["1 <= words.length <= 100", "1 <= words[i].length <= 100", "words[i] consists of only lowercase English letters."]',
'["Use topological sorting", "Build a directed graph from character ordering constraints"]',
90, 60, 25.4, (SELECT id FROM categories WHERE name = 'Graphs' LIMIT 1)),

('median-of-two-sorted-arrays', 'Median of Two Sorted Arrays', 'Hard', 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two arrays. The overall run time complexity should be O(log (m+n)).',
'def findMedianSortedArrays(nums1: List[int], nums2: List[int]) -> float:',
'[{"input": "nums1 = [1,3], nums2 = [2]", "output": "2.00000", "explanation": "merged array = [1,2,3] and median is 2."}, {"input": "nums1 = [1,2], nums2 = [3,4]", "output": "2.50000", "explanation": "merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5."}]',
'["nums1.length == m", "nums2.length == n", "0 <= m <= 1000", "0 <= n <= 1000", "1 <= m + n <= 2000"]',
'["Use binary search", "The algorithm should run in O(log(min(m, n))) time"]',
250, 80, 35.1, (SELECT id FROM categories WHERE name = 'Binary Search' LIMIT 1));

-- Add test cases for the new problems
INSERT INTO test_cases (problem_id, input, expected_output, is_example) VALUES
('minimum-window-substring', 's = "ADOBECODEBANC"\nt = "ABC"', 'BANC', true),
('minimum-window-substring', 's = "a"\nt = "a"', 'a', true),
('minimum-window-substring', 's = "a"\nt = "aa"', '', true),
('minimum-window-substring', 's = "ab"\nt = "b"', 'b', false),
('minimum-window-substring', 's = "abc"\nt = "cba"', 'abc', false),

('serialize-and-deserialize-binary-tree', 'root = [1,2,3,null,null,4,5]', '[1,2,3,null,null,4,5]', true),
('serialize-and-deserialize-binary-tree', 'root = []', '[]', true),
('serialize-and-deserialize-binary-tree', 'root = [1]', '[1]', false),
('serialize-and-deserialize-binary-tree', 'root = [1,2]', '[1,2]', false),

('trapping-rain-water', 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', '6', true),
('trapping-rain-water', 'height = [4,2,0,3,2,5]', '9', true),
('trapping-rain-water', 'height = [3,0,2,0,4]', '7', false),
('trapping-rain-water', 'height = [1,2,1]', '0', false),

('word-ladder', 'beginWord = "hit"\nendWord = "cog"\nwordList = ["hot","dot","dog","lot","log","cog"]', '5', true),
('word-ladder', 'beginWord = "hit"\nendWord = "cog"\nwordList = ["hot","dot","dog","lot","log"]', '0', true),
('word-ladder', 'beginWord = "a"\nendWord = "c"\nwordList = ["a","b","c"]', '2', false),

('alien-dictionary', 'words = ["wrt","wrf","er","ett","rftt"]', 'wertf', true),
('alien-dictionary', 'words = ["z","x"]', 'zx', true),
('alien-dictionary', 'words = ["z","x","z"]', '', true),

('median-of-two-sorted-arrays', 'nums1 = [1,3]\nnums2 = [2]', '2.0', true),
('median-of-two-sorted-arrays', 'nums1 = [1,2]\nnums2 = [3,4]', '2.5', true),
('median-of-two-sorted-arrays', 'nums1 = [0,0]\nnums2 = [0,0]', '0.0', false);