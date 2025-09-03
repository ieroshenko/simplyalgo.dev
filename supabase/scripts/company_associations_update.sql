-- Update companies JSONB column for all 75 Blind 75 problems
-- Based on companies.md analysis across 20 major tech companies

-- Two Sum (LeetCode #1) - appears in 15+ company lists
UPDATE problems SET companies = '["Google", "Amazon", "Apple", "Nvidia", "Adobe", "Oracle", "IBM", "Intel", "Cisco", "PayPal", "Spotify", "ByteDance", "Zoom"]'::jsonb 
WHERE id = 'two-sum';

-- Add Two Numbers (LeetCode #2) - Meta, Amazon
UPDATE problems SET companies = '["Meta", "Amazon"]'::jsonb 
WHERE id = 'add-two-numbers';

-- Longest Substring Without Repeating Characters (LeetCode #3) - Google, Amazon, Meta, Apple, Netflix, Airbnb, Oracle, PayPal, Spotify, ByteDance
UPDATE problems SET companies = '["Google", "Amazon", "Meta", "Apple", "Netflix", "Airbnb", "Oracle", "PayPal", "Spotify", "ByteDance"]'::jsonb 
WHERE id = 'longest-substring-without-repeating-characters';

-- Longest Palindromic Substring (LeetCode #5) - Google, Amazon, Meta, Apple, Uber, ByteDance
UPDATE problems SET companies = '["Google", "Amazon", "Meta", "Apple", "Uber", "ByteDance"]'::jsonb 
WHERE id = 'longest-palindromic-substring';

-- Container With Most Water (LeetCode #11) - Google, Apple
UPDATE problems SET companies = '["Google", "Apple"]'::jsonb 
WHERE id = 'container-with-most-water';

-- 3Sum (LeetCode #15) - Google, Amazon, Meta, Apple, ByteDance
UPDATE problems SET companies = '["Google", "Amazon", "Meta", "Apple", "ByteDance"]'::jsonb 
WHERE id = '3sum';

-- Letter Combinations of Phone Number (LeetCode #17) - Meta, Apple
UPDATE problems SET companies = '["Meta", "Apple"]'::jsonb 
WHERE id = 'letter-combinations-of-a-phone-number';

-- Valid Parentheses (LeetCode #20) - Google, Amazon, Netflix, Adobe, Oracle, Spotify, ByteDance, Zoom
UPDATE problems SET companies = '["Google", "Amazon", "Netflix", "Adobe", "Oracle", "Spotify", "ByteDance", "Zoom"]'::jsonb 
WHERE id = 'valid-parentheses';

-- Merge Two Sorted Lists (LeetCode #21) - Google, Amazon, Meta, Adobe
UPDATE problems SET companies = '["Google", "Amazon", "Meta", "Adobe"]'::jsonb 
WHERE id = 'merge-two-sorted-lists';

-- Merge k Sorted Lists (LeetCode #23) - Amazon, Apple
UPDATE problems SET companies = '["Amazon", "Apple"]'::jsonb 
WHERE id = 'merge-k-sorted-lists';

-- Search in Rotated Sorted Array (LeetCode #33) - Google, Meta, Apple, Netflix, Adobe, Intel
UPDATE problems SET companies = '["Google", "Meta", "Apple", "Netflix", "Adobe", "Intel"]'::jsonb 
WHERE id = 'search-in-rotated-sorted-array';

-- Find First and Last Position (LeetCode #34) - Meta, Apple
UPDATE problems SET companies = '["Meta", "Apple"]'::jsonb 
WHERE id = 'find-first-and-last-position-of-element-in-sorted-array';

-- Combination Sum (LeetCode #39) - Apple
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'combination-sum';

-- Trapping Rain Water (LeetCode #42) - Amazon
UPDATE problems SET companies = '["Amazon"]'::jsonb 
WHERE id = 'trapping-rain-water';

-- Permutations (LeetCode #46) - Meta
UPDATE problems SET companies = '["Meta"]'::jsonb 
WHERE id = 'permutations';

-- Rotate Image (LeetCode #48) - Google, Amazon, Apple, Netflix
UPDATE problems SET companies = '["Google", "Amazon", "Apple", "Netflix"]'::jsonb 
WHERE id = 'rotate-image';

-- Group Anagrams (LeetCode #49) - Google, Uber
UPDATE problems SET companies = '["Google", "Uber"]'::jsonb 
WHERE id = 'group-anagrams';

-- Pow(x, n) (LeetCode #50) - Meta, Apple, Adobe
UPDATE problems SET companies = '["Meta", "Apple", "Adobe"]'::jsonb 
WHERE id = 'powx-n';

-- Maximum Subarray (LeetCode #53) - Amazon, Apple, Amazon, Tesla, Nvidia, Intel, Cisco, PayPal, Spotify, ByteDance, Zoom, IBM
UPDATE problems SET companies = '["Amazon", "Apple", "Tesla", "Nvidia", "Intel", "Cisco", "PayPal", "Spotify", "ByteDance", "Zoom", "IBM"]'::jsonb 
WHERE id = 'maximum-subarray';

-- Spiral Matrix (LeetCode #54) - Apple, Netflix
UPDATE problems SET companies = '["Apple", "Netflix"]'::jsonb 
WHERE id = 'spiral-matrix';

-- Jump Game (LeetCode #55) - Google
UPDATE problems SET companies = '["Google"]'::jsonb 
WHERE id = 'jump-game';

-- Merge Intervals (LeetCode #56) - Google, Meta, Apple, Netflix, Uber, Airbnb
UPDATE problems SET companies = '["Google", "Meta", "Apple", "Netflix", "Uber", "Airbnb"]'::jsonb 
WHERE id = 'merge-intervals';

-- Insert Interval (LeetCode #57) - Uber
UPDATE problems SET companies = '["Uber"]'::jsonb 
WHERE id = 'insert-interval';

-- Unique Paths (LeetCode #62) - Google, Apple, Adobe
UPDATE problems SET companies = '["Google", "Apple", "Adobe"]'::jsonb 
WHERE id = 'unique-paths';

-- Climbing Stairs (LeetCode #70) - Google, Tesla, Adobe, IBM
UPDATE problems SET companies = '["Google", "Tesla", "Adobe", "IBM"]'::jsonb 
WHERE id = 'climbing-stairs';

-- Set Matrix Zeroes (LeetCode #73) - Google
UPDATE problems SET companies = '["Google"]'::jsonb 
WHERE id = 'set-matrix-zeroes';

-- Sort Colors (LeetCode #75) - Apple
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'sort-colors';

-- Minimum Window Substring (LeetCode #76) - Meta, Uber, Airbnb
UPDATE problems SET companies = '["Meta", "Uber", "Airbnb"]'::jsonb 
WHERE id = 'minimum-window-substring';

-- Subsets (LeetCode #78) - Meta
UPDATE problems SET companies = '["Meta"]'::jsonb 
WHERE id = 'subsets';

-- Word Search (LeetCode #79) - Netflix, Uber, Salesforce
UPDATE problems SET companies = '["Netflix", "Uber", "Salesforce"]'::jsonb 
WHERE id = 'word-search';

-- Remove Duplicates from Sorted Array (LeetCode #26) - Meta
UPDATE problems SET companies = '["Meta"]'::jsonb 
WHERE id = 'remove-duplicates-from-sorted-array';

-- Reverse Integer (LeetCode #7) - Apple  
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'reverse-integer';

-- Palindrome Number (LeetCode #9) - [Not in our database]

-- Roman to Integer (LeetCode #13) - Meta, Apple
UPDATE problems SET companies = '["Meta", "Apple"]'::jsonb 
WHERE id = 'roman-to-integer';

-- Longest Common Prefix (LeetCode #14) - Apple
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'longest-common-prefix';

-- Valid Palindrome (LeetCode #125) - Meta, Apple
UPDATE problems SET companies = '["Meta", "Apple"]'::jsonb 
WHERE id = 'valid-palindrome';

-- Best Time to Buy and Sell Stock (LeetCode #121) - Google, Amazon, Meta, Apple, Tesla, Uber, PayPal, Spotify, ByteDance
UPDATE problems SET companies = '["Google", "Amazon", "Meta", "Apple", "Tesla", "Uber", "PayPal", "Spotify", "ByteDance"]'::jsonb 
WHERE id = 'best-time-to-buy-and-sell-stock';

-- Binary Tree Level Order Traversal (LeetCode #102) - Amazon, Adobe, Salesforce, IBM, Spotify, Zoom
UPDATE problems SET companies = '["Amazon", "Adobe", "Salesforce", "IBM", "Spotify", "Zoom"]'::jsonb 
WHERE id = 'binary-tree-level-order-traversal';

-- Maximum Depth of Binary Tree (LeetCode #104) - [Keep existing or empty]
UPDATE problems SET companies = '[]'::jsonb 
WHERE id = 'maximum-depth-of-binary-tree';

-- Construct Binary Tree from Preorder and Inorder (LeetCode #105) - [Keep existing or empty]
UPDATE problems SET companies = '[]'::jsonb 
WHERE id = 'construct-binary-tree-from-preorder-and-inorder-traversal';

-- Binary Tree Maximum Path Sum (LeetCode #124) - Meta
UPDATE problems SET companies = '["Meta"]'::jsonb 
WHERE id = 'binary-tree-maximum-path-sum';

-- Word Ladder (LeetCode #127) - Apple
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'word-ladder';

-- Longest Consecutive Sequence (LeetCode #128) - Google
UPDATE problems SET companies = '["Google"]'::jsonb 
WHERE id = 'longest-consecutive-sequence';

-- Clone Graph (LeetCode #133) - Meta, Salesforce, Cisco
UPDATE problems SET companies = '["Meta", "Salesforce", "Cisco"]'::jsonb 
WHERE id = 'clone-graph';

-- Copy List with Random Pointer (LeetCode #138) - Amazon, Meta
UPDATE problems SET companies = '["Amazon", "Meta"]'::jsonb 
WHERE id = 'copy-list-with-random-pointer';

-- Word Break (LeetCode #139) - Meta, Apple, Netflix, Uber
UPDATE problems SET companies = '["Meta", "Apple", "Netflix", "Uber"]'::jsonb 
WHERE id = 'word-break';

-- Linked List Cycle (LeetCode #141) - Amazon, Adobe
UPDATE problems SET companies = '["Amazon", "Adobe"]'::jsonb 
WHERE id = 'linked-list-cycle';

-- LRU Cache (LeetCode #146) - Amazon, Apple, Microsoft
UPDATE problems SET companies = '["Amazon", "Apple", "Microsoft"]'::jsonb 
WHERE id = 'lru-cache';

-- Find Minimum in Rotated Sorted Array (LeetCode #153) - Uber
UPDATE problems SET companies = '["Uber"]'::jsonb 
WHERE id = 'find-minimum-in-rotated-sorted-array';

-- Min Stack (LeetCode #155) - Apple, Adobe
UPDATE problems SET companies = '["Apple", "Adobe"]'::jsonb 
WHERE id = 'min-stack';

-- Intersection of Two Linked Lists (LeetCode #160) - Amazon
UPDATE problems SET companies = '["Amazon"]'::jsonb 
WHERE id = 'intersection-of-two-linked-lists';

-- Find Peak Element (LeetCode #162) - Meta
UPDATE problems SET companies = '["Meta"]'::jsonb 
WHERE id = 'find-peak-element';

-- Number of 1 Bits (LeetCode #191) - Nvidia, Intel
UPDATE problems SET companies = '["Nvidia", "Intel"]'::jsonb 
WHERE id = 'number-of-1-bits';

-- House Robber (LeetCode #198) - Apple
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'house-robber';

-- Number of Islands (LeetCode #200) - Google, Amazon, Apple, Uber, Airbnb, Adobe, Salesforce, Oracle, Cisco
UPDATE problems SET companies = '["Google", "Amazon", "Apple", "Uber", "Airbnb", "Adobe", "Salesforce", "Oracle", "Cisco"]'::jsonb 
WHERE id = 'number-of-islands';

-- Happy Number (LeetCode #202) - Apple
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'happy-number';

-- Reverse Linked List (LeetCode #206) - Amazon, Adobe, IBM, Cisco, Spotify, Zoom
UPDATE problems SET companies = '["Amazon", "Adobe", "IBM", "Cisco", "Spotify", "Zoom"]'::jsonb 
WHERE id = 'reverse-linked-list';

-- Implement Trie (LeetCode #208) - Google, Adobe
UPDATE problems SET companies = '["Google", "Adobe"]'::jsonb 
WHERE id = 'implement-trie-prefix-tree';

-- Word Search II (LeetCode #212) - Uber
UPDATE problems SET companies = '["Uber"]'::jsonb 
WHERE id = 'word-search-ii';

-- Kth Largest Element in Array (LeetCode #215) - Amazon
UPDATE problems SET companies = '["Amazon"]'::jsonb 
WHERE id = 'kth-largest-element-in-an-array';

-- Contains Duplicate (LeetCode #217) - Netflix
UPDATE problems SET companies = '["Netflix"]'::jsonb 
WHERE id = 'contains-duplicate';

-- Kth Smallest Element in BST (LeetCode #230) - Amazon, Uber
UPDATE problems SET companies = '["Amazon", "Uber"]'::jsonb 
WHERE id = 'kth-smallest-element-in-a-bst';

-- Palindrome Linked List (LeetCode #234) - Amazon
UPDATE problems SET companies = '["Amazon"]'::jsonb 
WHERE id = 'palindrome-linked-list';

-- Lowest Common Ancestor of BST (LeetCode #235) - [Keep existing or empty]
UPDATE problems SET companies = '[]'::jsonb 
WHERE id = 'lowest-common-ancestor-of-a-binary-search-tree';

-- Lowest Common Ancestor of Binary Tree (LeetCode #236) - Amazon, Meta
UPDATE problems SET companies = '["Amazon", "Meta"]'::jsonb 
WHERE id = 'lowest-common-ancestor-of-a-binary-tree';

-- Product of Array Except Self (LeetCode #238) - Amazon, Apple, Uber
UPDATE problems SET companies = '["Amazon", "Apple", "Uber"]'::jsonb 
WHERE id = 'product-of-array-except-self';

-- Sliding Window Maximum (LeetCode #239) - Amazon
UPDATE problems SET companies = '["Amazon"]'::jsonb 
WHERE id = 'sliding-window-maximum';

-- Valid Anagram (LeetCode #242) - Google, Adobe
UPDATE problems SET companies = '["Google", "Adobe"]'::jsonb 
WHERE id = 'valid-anagram';

-- Meeting Rooms (LeetCode #252) - [Keep existing or empty]
UPDATE problems SET companies = '[]'::jsonb 
WHERE id = 'meeting-rooms';

-- Meeting Rooms II (LeetCode #253) - [Keep existing or empty] 
UPDATE problems SET companies = '[]'::jsonb 
WHERE id = 'meeting-rooms-ii';

-- Alien Dictionary (LeetCode #269) - Uber
UPDATE problems SET companies = '["Uber"]'::jsonb 
WHERE id = 'alien-dictionary';

-- First Bad Version (LeetCode #278) - Meta, Apple
UPDATE problems SET companies = '["Meta", "Apple"]'::jsonb 
WHERE id = 'first-bad-version';

-- Move Zeroes (LeetCode #283) - Apple
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'move-zeroes';

-- Find the Duplicate Number (LeetCode #287) - Amazon
UPDATE problems SET companies = '["Amazon"]'::jsonb 
WHERE id = 'find-the-duplicate-number';

-- Word Pattern (LeetCode #290) - [Keep existing or empty]
UPDATE problems SET companies = '[]'::jsonb 
WHERE id = 'word-pattern';

-- Serialize and Deserialize Binary Tree (LeetCode #297) - Uber
UPDATE problems SET companies = '["Uber"]'::jsonb 
WHERE id = 'serialize-and-deserialize-binary-tree';

-- Longest Increasing Subsequence (LeetCode #300) - Amazon
UPDATE problems SET companies = '["Amazon"]'::jsonb 
WHERE id = 'longest-increasing-subsequence';

-- Coin Change (LeetCode #322) - Netflix, Uber
UPDATE problems SET companies = '["Netflix", "Uber"]'::jsonb 
WHERE id = 'coin-change';

-- Top K Frequent Elements (LeetCode #347) - Google, Amazon, Netflix, PayPal, ByteDance
UPDATE problems SET companies = '["Google", "Amazon", "Netflix", "PayPal", "ByteDance"]'::jsonb 
WHERE id = 'top-k-frequent-elements';

-- Decode String (LeetCode #394) - Apple
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'decode-string';

-- Random Pick with Weight (LeetCode #528) - Apple
UPDATE problems SET companies = '["Apple"]'::jsonb 
WHERE id = 'random-pick-with-weight';

-- Diameter of Binary Tree (LeetCode #543) - Meta
UPDATE problems SET companies = '["Meta"]'::jsonb 
WHERE id = 'diameter-of-binary-tree';

-- Add remaining problems with empty arrays for now
UPDATE problems SET companies = '[]'::jsonb 
WHERE companies IS NULL OR companies = '[]'::jsonb;