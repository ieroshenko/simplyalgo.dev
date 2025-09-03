-- Analysis query to identify which problems to keep vs delete for Blind 75 cleanup
-- This will help us understand what we have vs what we need

-- First, let's see what we currently have
WITH current_problems AS (
  SELECT 
    p.id,
    p.title,
    c.name as category,
    p.difficulty::text as difficulty
  FROM problems p
  LEFT JOIN categories c ON p.category_id = c.id
  ORDER BY c.name, p.title
),

-- Define the exact Blind 75 list we want to keep
blind75_targets AS (
  SELECT * FROM (VALUES
    -- Array (9 problems)
    ('two-sum', 'Two Sum', 'Array', 'Easy'),
    ('best-time-to-buy-and-sell-stock', 'Best Time to Buy and Sell Stock', 'Array', 'Easy'),
    ('contains-duplicate', 'Contains Duplicate', 'Array', 'Easy'),
    ('product-of-array-except-self', 'Product of Array Except Self', 'Array', 'Medium'),
    ('maximum-subarray', 'Maximum Subarray', 'Array', 'Medium'),
    ('maximum-product-subarray', 'Maximum Product Subarray', 'Array', 'Medium'),
    ('find-minimum-in-rotated-sorted-array', 'Find Minimum in Rotated Sorted Array', 'Array', 'Medium'),
    ('search-in-rotated-sorted-array', 'Search in Rotated Sorted Array', 'Array', 'Medium'),
    ('3sum', '3Sum', 'Array', 'Medium'),
    ('container-with-most-water', 'Container With Most Water', 'Array', 'Medium'),
    
    -- Binary (5 problems)  
    ('sum-of-two-integers', 'Sum of Two Integers', 'Binary', 'Medium'),
    ('number-of-1-bits', 'Number of 1 Bits', 'Binary', 'Easy'),
    ('counting-bits', 'Counting Bits', 'Binary', 'Easy'),
    ('missing-number', 'Missing Number', 'Binary', 'Easy'),
    ('reverse-bits', 'Reverse Bits', 'Binary', 'Easy'),
    
    -- Dynamic Programming (11 problems)
    ('climbing-stairs', 'Climbing Stairs', 'Dynamic Programming', 'Easy'),
    ('coin-change', 'Coin Change', 'Dynamic Programming', 'Medium'),
    ('longest-increasing-subsequence', 'Longest Increasing Subsequence', 'Dynamic Programming', 'Medium'),
    ('longest-common-subsequence', 'Longest Common Subsequence', 'Dynamic Programming', 'Medium'),
    ('word-break-problem', 'Word Break', 'Dynamic Programming', 'Medium'),
    ('combination-sum', 'Combination Sum', 'Dynamic Programming', 'Medium'),
    ('house-robber', 'House Robber', 'Dynamic Programming', 'Medium'),
    ('house-robber-ii', 'House Robber II', 'Dynamic Programming', 'Medium'),
    ('decode-ways', 'Decode Ways', 'Dynamic Programming', 'Medium'),
    ('unique-paths', 'Unique Paths', 'Dynamic Programming', 'Medium'),
    ('jump-game', 'Jump Game', 'Dynamic Programming', 'Medium'),
    
    -- Graph (7 problems)
    ('clone-graph', 'Clone Graph', 'Graph', 'Medium'),
    ('course-schedule', 'Course Schedule', 'Graph', 'Medium'),
    ('pacific-atlantic-water-flow', 'Pacific Atlantic Water Flow', 'Graph', 'Medium'),
    ('number-of-islands', 'Number of Islands', 'Graph', 'Medium'),
    ('longest-consecutive-sequence', 'Longest Consecutive Sequence', 'Graph', 'Medium'),
    ('alien-dictionary', 'Alien Dictionary', 'Graph', 'Hard'),
    ('graph-valid-tree', 'Graph Valid Tree', 'Graph', 'Medium'),
    ('number-of-connected-components', 'Number of Connected Components in an Undirected Graph', 'Graph', 'Medium'),
    
    -- Interval (5 problems)
    ('insert-interval', 'Insert Interval', 'Interval', 'Medium'),
    ('merge-intervals', 'Merge Intervals', 'Interval', 'Medium'),
    ('non-overlapping-intervals', 'Non-overlapping Intervals', 'Interval', 'Medium'),
    ('meeting-rooms', 'Meeting Rooms', 'Interval', 'Easy'),
    ('meeting-rooms-ii', 'Meeting Rooms II', 'Interval', 'Medium'),
    
    -- Linked List (8 problems)
    ('reverse-linked-list', 'Reverse Linked List', 'Linked List', 'Easy'),
    ('linked-list-cycle', 'Linked List Cycle', 'Linked List', 'Easy'),
    ('merge-two-sorted-lists', 'Merge Two Sorted Lists', 'Linked List', 'Easy'),
    ('merge-k-sorted-lists', 'Merge k Sorted Lists', 'Linked List', 'Hard'),
    ('remove-nth-node-from-end-of-list', 'Remove Nth Node From End of List', 'Linked List', 'Medium'),
    ('reorder-list', 'Reorder List', 'Linked List', 'Medium'),
    
    -- Matrix (4 problems)
    ('set-matrix-zeroes', 'Set Matrix Zeroes', 'Matrix', 'Medium'),
    ('spiral-matrix', 'Spiral Matrix', 'Matrix', 'Medium'),
    ('rotate-image', 'Rotate Image', 'Matrix', 'Medium'),
    ('word-search', 'Word Search', 'Matrix', 'Medium'),
    
    -- String (9 problems)
    ('longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'String', 'Medium'),
    ('longest-repeating-character-replacement', 'Longest Repeating Character Replacement', 'String', 'Medium'),
    ('minimum-window-substring', 'Minimum Window Substring', 'String', 'Hard'),
    ('valid-anagram', 'Valid Anagram', 'String', 'Easy'),
    ('group-anagrams', 'Group Anagrams', 'String', 'Medium'),
    ('valid-parentheses', 'Valid Parentheses', 'String', 'Easy'),
    ('valid-palindrome', 'Valid Palindrome', 'String', 'Easy'),
    ('longest-palindromic-substring', 'Longest Palindromic Substring', 'String', 'Medium'),
    ('palindromic-substrings', 'Palindromic Substrings', 'String', 'Medium'),
    ('encode-and-decode-strings', 'Encode and Decode Strings', 'String', 'Medium'),
    
    -- Tree (11 problems)
    ('maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'Tree', 'Easy'),
    ('same-tree', 'Same Tree', 'Tree', 'Easy'),
    ('invert-binary-tree', 'Invert Binary Tree', 'Tree', 'Easy'),
    ('binary-tree-maximum-path-sum', 'Binary Tree Maximum Path Sum', 'Tree', 'Hard'),
    ('binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', 'Tree', 'Medium'),
    ('serialize-and-deserialize-binary-tree', 'Serialize and Deserialize Binary Tree', 'Tree', 'Hard'),
    ('subtree-of-another-tree', 'Subtree of Another Tree', 'Tree', 'Easy'),
    ('construct-binary-tree-from-preorder-and-inorder-traversal', 'Construct Binary Tree from Preorder and Inorder Traversal', 'Tree', 'Medium'),
    ('validate-binary-search-tree', 'Validate Binary Search Tree', 'Tree', 'Medium'),
    ('kth-smallest-element-in-a-bst', 'Kth Smallest Element in a BST', 'Tree', 'Medium'),
    ('lowest-common-ancestor-of-a-binary-search-tree', 'Lowest Common Ancestor of a Binary Search Tree', 'Tree', 'Medium'),
    ('implement-trie-prefix-tree', 'Implement Trie (Prefix Tree)', 'Tree', 'Medium'),
    ('add-and-search-word', 'Add and Search Word', 'Tree', 'Medium'),
    ('word-search-ii', 'Word Search II', 'Tree', 'Hard'),
    
    -- Heap (3 problems)
    ('merge-k-sorted-lists', 'Merge k Sorted Lists', 'Heap', 'Hard'),
    ('top-k-frequent-elements', 'Top K Frequent Elements', 'Heap', 'Medium'),
    ('find-median-from-data-stream', 'Find Median from Data Stream', 'Heap', 'Hard')
  ) AS t(target_id, target_title, target_category, target_difficulty)
)

-- Show current problems that match Blind 75 (KEEP these)
SELECT 
  'KEEP' as action,
  cp.id,
  cp.title,
  cp.category,
  cp.difficulty,
  bt.target_id,
  CASE 
    WHEN bt.target_id IS NOT NULL THEN '✓ Matches Blind 75'
    ELSE '✗ Not in Blind 75'
  END as status
FROM current_problems cp
LEFT JOIN blind75_targets bt ON (
  cp.id = bt.target_id OR 
  LOWER(cp.title) = LOWER(bt.target_title)
)
WHERE bt.target_id IS NOT NULL

UNION ALL

-- Show current problems that DON'T match Blind 75 (DELETE these)
SELECT 
  'DELETE' as action,
  cp.id,
  cp.title,
  cp.category,
  cp.difficulty,
  NULL as target_id,
  '✗ Not in Blind 75' as status
FROM current_problems cp
LEFT JOIN blind75_targets bt ON (
  cp.id = bt.target_id OR 
  LOWER(cp.title) = LOWER(bt.target_title)
)
WHERE bt.target_id IS NULL

UNION ALL

-- Show Blind 75 problems that are MISSING from current database (ADD these)
SELECT 
  'ADD' as action,
  bt.target_id as id,
  bt.target_title as title,
  bt.target_category as category,
  bt.target_difficulty as difficulty,
  bt.target_id,
  '+ Missing from database' as status
FROM blind75_targets bt
LEFT JOIN current_problems cp ON (
  cp.id = bt.target_id OR 
  LOWER(cp.title) = LOWER(bt.target_title)
)
WHERE cp.id IS NULL

ORDER BY action, category, title;