-- Complete Blind 75 Problems Migration - Part 3 (Final)
-- Remaining categories: 1-D DP, 2-D DP, Greedy, Intervals, Math & Geometry, Bit Manipulation

-- 1-D Dynamic Programming Problems (all 9 missing)
DO $$
BEGIN
  -- Climbing Stairs
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'climbing-stairs') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'climbing-stairs',
      'Climbing Stairs',
      'Easy',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
      'def climbStairs(self, n: int) -> int:',
      '[
        {"input": "n = 2", "output": "2", "explanation": "There are two ways to climb to the top.\n1. 1 step + 1 step\n2. 2 steps"},
        {"input": "n = 3", "output": "3", "explanation": "There are three ways to climb to the top.\n1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step"}
      ]'::jsonb,
      '[
        "1 <= n <= 45"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Min Cost Climbing Stairs
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'min-cost-climbing-stairs') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'min-cost-climbing-stairs',
      'Min Cost Climbing Stairs',
      'Easy',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'You are given an integer array cost where cost[i] is the cost of ith step on a staircase. Once you pay the cost, you can either climb one or two steps.\n\nYou can either start from the step with index 0, or the step with index 1.\n\nReturn the minimum cost to reach the top of the floor.',
      'def minCostClimbingStairs(self, cost: List[int]) -> int:',
      '[
        {"input": "cost = [10,15,20]", "output": "15", "explanation": "You will start at index 1.\n- Pay 15 and climb two steps to reach the top.\nThe total cost is 15."},
        {"input": "cost = [1,100,1,1,1,100,1,1,100,1]", "output": "6", "explanation": "You will start at index 0.\n- Pay 1 and climb two steps to reach index 2.\n- Pay 1 and climb two steps to reach index 4.\n- Pay 1 and climb two steps to reach index 6.\n- Pay 1 and climb one step to reach index 7.\n- Pay 1 and climb two steps to reach index 9.\n- Pay 1 and climb one step to reach the top.\nThe total cost is 6."}
      ]'::jsonb,
      '[
        "2 <= cost.length <= 1000",
        "0 <= cost[i] <= 999"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- House Robber
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'house-robber') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'house-robber',
      'House Robber',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night.\n\nGiven an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.',
      'def rob(self, nums: List[int]) -> int:',
      '[
        {"input": "nums = [1,2,3,1]", "output": "4", "explanation": "Rob house 1 (money = 1) and then rob house 3 (money = 3). Total amount you can rob = 1 + 3 = 4."},
        {"input": "nums = [2,7,9,3,1]", "output": "12", "explanation": "Rob house 1 (money = 2), rob house 3 (money = 9) and rob house 5 (money = 1). Total amount you can rob = 2 + 9 + 1 = 12."}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 100",
        "0 <= nums[i] <= 400"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- House Robber II
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'house-robber-ii') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'house-robber-ii',
      'House Robber II',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. All houses at this place are arranged in a circle. That means the first house is the neighbor of the last one. Meanwhile, adjacent houses have security systems connected, and it will automatically contact the police if two adjacent houses were broken into on the same night.\n\nGiven an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.',
      'def rob(self, nums: List[int]) -> int:',
      '[
        {"input": "nums = [2,3,2]", "output": "3", "explanation": "You cannot rob house 1 (money = 2) and then rob house 3 (money = 2), because they are adjacent houses."},
        {"input": "nums = [1,2,3,1]", "output": "4", "explanation": "Rob house 1 (money = 1) and then rob house 3 (money = 3). Total amount you can rob = 1 + 3 = 4."},
        {"input": "nums = [1,2,3]", "output": "3", "explanation": "Rob house 3 (money = 3) to get maximum amount."}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 100",
        "0 <= nums[i] <= 1000"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Longest Palindromic Substring
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'longest-palindromic-substring') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'longest-palindromic-substring',
      'Longest Palindromic Substring',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'Given a string s, return the longest palindromic substring in s.',
      'def longestPalindrome(self, s: str) -> str:',
      '[
        {"input": "s = \"babad\"", "output": "\"bab\"", "explanation": "\"aba\" is also a valid answer."},
        {"input": "s = \"cbbd\"", "output": "\"bb\"", "explanation": "The longest palindromic substring is \"bb\"."}
      ]'::jsonb,
      '[
        "1 <= s.length <= 1000",
        "s consist of only digits and English letters"
      ]'::jsonb,
      'O(n^2)',
      'O(1)'
    );
  END IF;

  -- Palindromic Substrings
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'palindromic-substrings') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'palindromic-substrings',
      'Palindromic Substrings',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'Given a string s, return the number of palindromic substrings in it.\n\nA string is a palindrome when it reads the same backward as forward.\n\nA substring is a contiguous sequence of characters within the string.',
      'def countSubstrings(self, s: str) -> int:',
      '[
        {"input": "s = \"abc\"", "output": "3", "explanation": "Three palindromic strings: \"a\", \"b\", \"c\"."},
        {"input": "s = \"aaa\"", "output": "6", "explanation": "Six palindromic strings: \"a\", \"a\", \"a\", \"aa\", \"aa\", \"aaa\"."}
      ]'::jsonb,
      '[
        "1 <= s.length <= 1000",
        "s consists of lowercase English letters"
      ]'::jsonb,
      'O(n^2)',
      'O(1)'
    );
  END IF;

  -- Decode Ways
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'decode-ways') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'decode-ways',
      'Decode Ways',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'A message containing letters from A-Z can be encoded into numbers using the following mapping:\n\n''A'' -> "1"\n''B'' -> "2"\n...\n''Z'' -> "26"\nTo decode an encoded message, all the digits must be grouped then mapped back into letters using the reverse of the mapping above (there may be multiple ways). For example, "11106" can be mapped into:\n\n"AAJF" with the grouping (1 1 10 6)\n"KJF" with the grouping (11 10 6)\nNote that the grouping (1 11 06) is invalid because "06" cannot be mapped into ''F'' since "6" is different from "06".\n\nGiven a string s containing only digits, return the number of ways to decode it.\n\nThe test cases are generated so that the answer fits in a 32-bit integer.',
      'def numDecodings(self, s: str) -> int:',
      '[
        {"input": "s = \"12\"", "output": "2", "explanation": "\"12\" could be decoded as \"AB\" (1 2) or \"L\" (12)."},
        {"input": "s = \"226\"", "output": "3", "explanation": "\"226\" could be decoded as \"BZ\" (2 26), \"VF\" (22 6), or \"BBF\" (2 2 6)."},
        {"input": "s = \"06\"", "output": "0", "explanation": "\"06\" cannot be mapped to \"F\" because of the leading zero (\"6\" is different from \"06\")."}
      ]'::jsonb,
      '[
        "1 <= s.length <= 100",
        "s contains only digits and may contain leading zero(s)"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Coin Change
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'coin-change') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'coin-change',
      'Coin Change',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\nYou may assume that you have an infinite number of each kind of coin.',
      'def coinChange(self, coins: List[int], amount: int) -> int:',
      '[
        {"input": "coins = [1,3,4], amount = 6", "output": "2", "explanation": "The minimum number of coins is 2: 3 + 3 = 6."},
        {"input": "coins = [2], amount = 3", "output": "-1", "explanation": "The amount of 3 cannot be made up just with coins of 2."},
        {"input": "coins = [1], amount = 0", "output": "0", "explanation": "No coins are needed for amount 0."}
      ]'::jsonb,
      '[
        "1 <= coins.length <= 12",
        "1 <= coins[i] <= 2^31 - 1",
        "0 <= amount <= 10^4"
      ]'::jsonb,
      'O(amount * coins)',
      'O(amount)'
    );
  END IF;

  -- Maximum Product Subarray (already exists, skip)

  -- Word Break
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'word-break') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'word-break',
      'Word Break',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.\n\nNote that the same word in the dictionary may be reused multiple times in the segmentation.',
      'def wordBreak(self, s: str, wordDict: List[str]) -> bool:',
      '[
        {"input": "s = \"leetcode\", wordDict = [\"leet\",\"code\"]", "output": "true", "explanation": "Return true because \"leetcode\" can be segmented as \"leet code\"."},
        {"input": "s = \"applepenapple\", wordDict = [\"apple\",\"pen\"]", "output": "true", "explanation": "Return true because \"applepenapple\" can be segmented as \"apple pen apple\". Note that you are allowed to reuse a dictionary word."},
        {"input": "s = \"catsandog\", wordDict = [\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]", "output": "false", "explanation": "The string cannot be segmented using the given dictionary."}
      ]'::jsonb,
      '[
        "1 <= s.length <= 300",
        "1 <= wordDict.length <= 1000",
        "1 <= wordDict[i].length <= 20",
        "s and wordDict[i] consist of only lowercase English letters",
        "All the strings of wordDict are unique"
      ]'::jsonb,
      'O(n^2 * m)',
      'O(n)'
    );
  END IF;

  -- Longest Increasing Subsequence
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'longest-increasing-subsequence') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'longest-increasing-subsequence',
      'Longest Increasing Subsequence',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'Given an integer array nums, return the length of the longest strictly increasing subsequence.\n\nA subsequence is a sequence that can be derived from an array by deleting some or no elements without changing the order of the remaining elements. For example, [3,6,2,7] is a subsequence of the array [0,3,1,6,2,2,7].',
      'def lengthOfLIS(self, nums: List[int]) -> int:',
      '[
        {"input": "nums = [10,9,2,5,3,7,101,18]", "output": "4", "explanation": "The longest increasing subsequence is [2,3,7,18], therefore the length is 4."},
        {"input": "nums = [0,1,0,3,2,3]", "output": "4", "explanation": "The longest increasing subsequence is [0,1,2,3], therefore the length is 4."},
        {"input": "nums = [7,7,7,7,7,7,7]", "output": "1", "explanation": "The longest increasing subsequence is [7], therefore the length is 1."}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 2500",
        "-10^4 <= nums[i] <= 10^4"
      ]'::jsonb,
      'O(n log n)',
      'O(n)'
    );
  END IF;

  -- Partition Equal Subset Sum
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'partition-equal-subset-sum') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'partition-equal-subset-sum',
      'Partition Equal Subset Sum',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '1-D Dynamic Programming' LIMIT 1),
      'Given a non-empty array nums containing only positive integers, find if the array can be partitioned into two subsets such that the sum of elements in both subsets is equal.',
      'def canPartition(self, nums: List[int]) -> bool:',
      '[
        {"input": "nums = [1,5,11,5]", "output": "true", "explanation": "The array can be partitioned as [1, 5, 5] and [11]."},
        {"input": "nums = [1,2,3,5]", "output": "false", "explanation": "The array cannot be partitioned into equal sum subsets."}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 200",
        "1 <= nums[i] <= 100"
      ]'::jsonb,
      'O(n * sum)',
      'O(sum)'
    );
  END IF;

END $$;

-- 2-D Dynamic Programming Problems (all 2 missing)
DO $$
BEGIN
  -- Unique Paths
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'unique-paths') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'unique-paths',
      'Unique Paths',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '2-D Dynamic Programming' LIMIT 1),
      'There is a robot on an m x n grid. The robot is initially located at the top-left corner (i.e., grid[0][0]). The robot tries to move to the bottom-right corner (i.e., grid[m - 1][n - 1]). The robot can only move either down or right at any point in time.\n\nGiven the two integers m and n, return the number of possible unique paths that the robot can take to reach the bottom-right corner.\n\nThe test cases are generated so that the answer will be less than or equal to 2 * 10^9.',
      'def uniquePaths(self, m: int, n: int) -> int:',
      '[
        {"input": "m = 3, n = 7", "output": "28", "explanation": "There are 28 unique paths from top-left to bottom-right"},
        {"input": "m = 3, n = 2", "output": "3", "explanation": "There are 3 unique paths: 1. Right -> Down -> Down, 2. Down -> Down -> Right, 3. Down -> Right -> Down"}
      ]'::jsonb,
      '[
        "1 <= m, n <= 100"
      ]'::jsonb,
      'O(m * n)',
      'O(min(m, n))'
    );
  END IF;

  -- Longest Common Subsequence
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'longest-common-subsequence') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'longest-common-subsequence',
      'Longest Common Subsequence',
      'Medium',
      (SELECT id FROM public.categories WHERE name = '2-D Dynamic Programming' LIMIT 1),
      'Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.\n\nA subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.\n\nFor example, "ace" is a subsequence of "abcde".\nA common subsequence of two strings is a subsequence that is common to both strings.',
      'def longestCommonSubsequence(self, text1: str, text2: str) -> int:',
      '[
        {"input": "text1 = \"abcde\", text2 = \"ace\"", "output": "3", "explanation": "The longest common subsequence is \"ace\" and its length is 3."},
        {"input": "text1 = \"abc\", text2 = \"abc\"", "output": "3", "explanation": "The longest common subsequence is \"abc\" and its length is 3."},
        {"input": "text1 = \"abc\", text2 = \"def\"", "output": "0", "explanation": "There is no such common subsequence, so the result is 0."}
      ]'::jsonb,
      '[
        "1 <= text1.length, text2.length <= 1000",
        "text1 and text2 consist of only lowercase English characters"
      ]'::jsonb,
      'O(m * n)',
      'O(min(m, n))'
    );
  END IF;

END $$;

-- Greedy Problems (all 2 missing)
DO $$
BEGIN
  -- Maximum Subarray (already exists, skip)

  -- Jump Game
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'jump-game') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'jump-game',
      'Jump Game',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Greedy' LIMIT 1),
      'You are given an integer array nums. You are initially positioned at the array''s first index, and each element in the array represents your maximum jump length at that position.\n\nReturn true if you can reach the last index, or false otherwise.',
      'def canJump(self, nums: List[int]) -> bool:',
      '[
        {"input": "nums = [2,3,1,1,4]", "output": "true", "explanation": "Jump 1 step from index 0 to 1, then 3 steps to the last index."},
        {"input": "nums = [3,2,1,0,4]", "output": "false", "explanation": "You will always arrive at index 3 no matter what. Its maximum jump length is 0, which makes it impossible to reach the last index."}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 10^4",
        "0 <= nums[i] <= 10^5"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Jump Game II
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'jump-game-ii') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'jump-game-ii',
      'Jump Game II',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Greedy' LIMIT 1),
      'You are given a 0-indexed array of integers nums of length n. You are initially positioned at nums[0].\n\nEach element nums[i] represents the maximum length of a forward jump from index i. In other words, if you are at nums[i], you can jump to any nums[i + j] where:\n\n0 <= j <= nums[i] and\ni + j < n\nReturn the minimum number of jumps to reach nums[n - 1].\n\nThe test cases are generated such that you can reach nums[n - 1].',
      'def jump(self, nums: List[int]) -> int:',
      '[
        {"input": "nums = [2,3,1,1,4]", "output": "2", "explanation": "The minimum number of jumps to reach the last index is 2. Jump 1 step from index 0 to 1, then 3 steps to the last index."},
        {"input": "nums = [2,3,0,1,4]", "output": "2", "explanation": "The minimum number of jumps to reach the last index is 2. Jump 1 step from index 0 to 1, then 3 steps to the last index."}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 10^4",
        "0 <= nums[i] <= 1000",
        "It''s guaranteed that you can reach nums[n - 1]"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Gas Station
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'gas-station') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'gas-station',
      'Gas Station',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Greedy' LIMIT 1),
      'There are n gas stations along a circular route, where the amount of gas at the ith station is gas[i].\n\nYou have a car with an unlimited gas tank and it costs cost[i] of gas to travel from the ith station to its next (i + 1)th station. You begin the journey with an empty tank at one of the gas stations.\n\nGiven two integer arrays gas and cost, return the starting gas station''s index if you can travel around the circuit once in the clockwise direction, otherwise return -1.\n\nIf there exists a solution, it is guaranteed to be unique.',
      'def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:',
      '[
        {"input": "gas = [1,2,3,4,5], cost = [3,4,5,1,2]", "output": "3", "explanation": "Start at station 3 (index 3) and fill up with 4 units of gas. Your tank = 0 + 4 = 4. Travel to station 4. Your tank = 4 - 1 + 5 = 8. Travel to station 0. Your tank = 8 - 2 + 1 = 7. Travel to station 1. Your tank = 7 - 3 + 2 = 6. Travel to station 2. Your tank = 6 - 4 + 3 = 5. Travel to station 3. The cost is 5. Your gas is just enough to travel back to station 3. Therefore, return 3 as the starting index."},
        {"input": "gas = [2,3,4], cost = [3,4,3]", "output": "-1", "explanation": "You can''t start at station 0 or 1, as there is not enough gas to travel to the next station. Let''s start at station 2 and fill up with 4 units of gas. Your tank = 0 + 4 = 4. Travel to station 0. Your tank = 4 - 3 + 2 = 3. Travel to station 1. Your tank = 3 - 3 + 3 = 3. You cannot travel back to station 2, as it requires 4 units of gas but you only have 3. Therefore, you can''t travel around the circuit once no matter where you start."}
      ]'::jsonb,
      '[
        "n == gas.length == cost.length",
        "1 <= n <= 10^5",
        "0 <= gas[i], cost[i] <= 10^4"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Hand of Straights
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'hand-of-straights') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'hand-of-straights',
      'Hand of Straights',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Greedy' LIMIT 1),
      'Alice has some number of cards and she wants to rearrange the cards into groups so that each group is of size groupSize, and consists of groupSize consecutive cards.\n\nGiven an integer array hand where hand[i] is the value written on the ith card and an integer groupSize, return true if she can rearrange the cards, or false otherwise.',
      'def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:',
      '[
        {"input": "hand = [1,2,3,6,2,3,4,7,8], groupSize = 3", "output": "true", "explanation": "Alice''s hand can be rearranged as [1,2,3],[2,3,4],[6,7,8]"},
        {"input": "hand = [1,2,3,4,5], groupSize = 4", "output": "false", "explanation": "Alice''s hand cannot be rearranged into groups of 4"}
      ]'::jsonb,
      '[
        "1 <= hand.length <= 10^4",
        "0 <= hand[i] <= 10^9",
        "1 <= groupSize <= hand.length"
      ]'::jsonb,
      'O(n log n)',
      'O(n)'
    );
  END IF;

END $$;

-- Intervals Problems (all 5 missing)
DO $$
BEGIN
  -- Insert Interval
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'insert-interval') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'insert-interval',
      'Insert Interval',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Intervals' LIMIT 1),
      'You are given an array of non-overlapping intervals intervals where intervals[i] = [starti, endi] represent the start and the end of the ith interval and intervals is sorted in ascending order by starti. You are also given an interval newInterval = [start, end] that represents the start and end of another interval.\n\nInsert newInterval into intervals such that intervals is still sorted in ascending order by starti and intervals still does not have any overlapping intervals (merge overlapping intervals if necessary).\n\nReturn intervals after the insertion.',
      'def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:',
      '[
        {"input": "intervals = [[1,3],[6,9]], newInterval = [2,5]", "output": "[[1,5],[6,9]]", "explanation": "Because the new interval [2,5] overlaps with [1,3]."},
        {"input": "intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]", "output": "[[1,2],[3,10],[12,16]]", "explanation": "Because the new interval [4,8] overlaps with [3,5],[6,7],[8,10]."}
      ]'::jsonb,
      '[
        "0 <= intervals.length <= 10^4",
        "intervals[i].length == 2",
        "0 <= starti <= endi <= 10^5",
        "intervals is sorted by starti in ascending order",
        "newInterval.length == 2",
        "0 <= start <= end <= 10^5"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Merge Intervals
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'merge-intervals') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'merge-intervals',
      'Merge Intervals',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Intervals' LIMIT 1),
      'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
      'def merge(self, intervals: List[List[int]]) -> List[List[int]]:',
      '[
        {"input": "intervals = [[1,3],[2,6],[8,10],[15,18]]", "output": "[[1,6],[8,10],[15,18]]", "explanation": "Since intervals [1,3] and [2,6] overlap, merge them into [1,6]."},
        {"input": "intervals = [[1,4],[4,5]]", "output": "[[1,5]]", "explanation": "Intervals [1,4] and [4,5] are considered overlapping."}
      ]'::jsonb,
      '[
        "1 <= intervals.length <= 10^4",
        "intervals[i].length == 2",
        "0 <= starti <= endi <= 10^4"
      ]'::jsonb,
      'O(n log n)',
      'O(log n)'
    );
  END IF;

  -- Non-overlapping Intervals
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'non-overlapping-intervals') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'non-overlapping-intervals',
      'Non-overlapping Intervals',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Intervals' LIMIT 1),
      'Given an array of intervals intervals where intervals[i] = [starti, endi], return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.',
      'def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:',
      '[
        {"input": "intervals = [[1,2],[2,3],[3,4],[1,3]]", "output": "1", "explanation": "Remove [1,3] to make the rest of the intervals non-overlapping."},
        {"input": "intervals = [[1,2],[1,2],[1,2]]", "output": "2", "explanation": "You need to remove two [1,2] to make the rest of the intervals non-overlapping."},
        {"input": "intervals = [[1,2],[2,3]]", "output": "0", "explanation": "You don''t need to remove any of the intervals since they''re already non-overlapping."}
      ]'::jsonb,
      '[
        "1 <= intervals.length <= 10^5",
        "intervals[i].length == 2",
        "-5 * 10^4 <= starti < endi <= 5 * 10^4"
      ]'::jsonb,
      'O(n log n)',
      'O(log n)'
    );
  END IF;

  -- Meeting Rooms
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'meeting-rooms') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'meeting-rooms',
      'Meeting Rooms',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Intervals' LIMIT 1),
      'Given an array of meeting time intervals where intervals[i] = [starti, endi], determine if a person could attend all meetings.',
      'def canAttendMeetings(self, intervals: List[List[int]]) -> bool:',
      '[
        {"input": "intervals = [[0,30],[5,10],[15,20]]", "output": "false", "explanation": "The person cannot attend all meetings because [0,30] and [5,10] overlap."},
        {"input": "intervals = [[7,10],[2,4]]", "output": "true", "explanation": "The person can attend all meetings since they don''t overlap."}
      ]'::jsonb,
      '[
        "0 <= intervals.length <= 10^4",
        "intervals[i].length == 2",
        "0 <= starti < endi <= 10^6"
      ]'::jsonb,
      'O(n log n)',
      'O(log n)'
    );
  END IF;

  -- Meeting Rooms II
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'meeting-rooms-ii') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'meeting-rooms-ii',
      'Meeting Rooms II',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Intervals' LIMIT 1),
      'Given an array of meeting time intervals intervals where intervals[i] = [starti, endi], return the minimum number of conference rooms required.',
      'def minMeetingRooms(self, intervals: List[List[int]]) -> int:',
      '[
        {"input": "intervals = [[0,30],[5,10],[15,20]]", "output": "2", "explanation": "We need 2 meeting rooms: one for [0,30] and another for [5,10] and [15,20]."},
        {"input": "intervals = [[7,10],[2,4]]", "output": "1", "explanation": "Only one meeting room is needed since the meetings don''t overlap."}
      ]'::jsonb,
      '[
        "1 <= intervals.length <= 10^4",
        "0 <= starti < endi <= 10^6"
      ]'::jsonb,
      'O(n log n)',
      'O(n)'
    );
  END IF;

END $$;

-- Math & Geometry Problems (all 5 missing)
DO $$
BEGIN
  -- Rotate Image
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'rotate-image') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'rotate-image',
      'Rotate Image',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Math & Geometry' LIMIT 1),
      'You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).\n\nYou have to rotate the image in-place, which means you have to modify the input 2D matrix directly. DO NOT allocate another 2D matrix and do the rotation.',
      'def rotate(self, matrix: List[List[int]]) -> None:',
      '[
        {"input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]", "output": "[[7,4,1],[8,5,2],[9,6,3]]", "explanation": "Rotate the matrix 90 degrees clockwise"},
        {"input": "matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]", "output": "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]", "explanation": "Rotate the 4x4 matrix 90 degrees clockwise"}
      ]'::jsonb,
      '[
        "n == matrix.length == matrix[i].length",
        "1 <= n <= 20",
        "-1000 <= matrix[i][j] <= 1000"
      ]'::jsonb,
      'O(n^2)',
      'O(1)'
    );
  END IF;

  -- Spiral Matrix
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'spiral-matrix') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'spiral-matrix',
      'Spiral Matrix',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Math & Geometry' LIMIT 1),
      'Given an m x n matrix, return all elements of the matrix in spiral order.',
      'def spiralOrder(self, matrix: List[List[int]]) -> List[int]:',
      '[
        {"input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]", "output": "[1,2,3,6,9,8,7,4,5]", "explanation": "The elements are returned in spiral order"},
        {"input": "matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]", "output": "[1,2,3,4,8,12,11,10,9,5,6,7]", "explanation": "The elements are returned in spiral order"}
      ]'::jsonb,
      '[
        "m == matrix.length",
        "n == matrix[i].length",
        "1 <= m, n <= 10",
        "-100 <= matrix[i][j] <= 100"
      ]'::jsonb,
      'O(m * n)',
      'O(1)'
    );
  END IF;

  -- Set Matrix Zeroes
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'set-matrix-zeroes') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'set-matrix-zeroes',
      'Set Matrix Zeroes',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Math & Geometry' LIMIT 1),
      'Given an m x n integer matrix matrix, if an element is 0, set its entire row and column to 0''s.\n\nYou must do it in place.',
      'def setZeroes(self, matrix: List[List[int]]) -> None:',
      '[
        {"input": "matrix = [[1,1,1],[1,0,1],[1,1,1]]", "output": "[[1,0,1],[0,0,0],[1,0,1]]", "explanation": "The 0 at position (1,1) sets row 1 and column 1 to zeros"},
        {"input": "matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]", "output": "[[0,0,0,0],[0,4,5,0],[0,3,1,0]]", "explanation": "Multiple zeros set their respective rows and columns to zeros"}
      ]'::jsonb,
      '[
        "m == matrix.length",
        "n == matrix[0].length",
        "1 <= m, n <= 200",
        "-2^31 <= matrix[i][j] <= 2^31 - 1"
      ]'::jsonb,
      'O(m * n)',
      'O(1)'
    );
  END IF;

  -- Happy Number
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'happy-number') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'happy-number',
      'Happy Number',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Math & Geometry' LIMIT 1),
      'Write an algorithm to determine if a number n is happy.\n\nA happy number is a number defined by the following process:\n\nStarting with any positive integer, replace the number by the sum of the squares of its digits.\nRepeat the process until the number equals 1 (where it will stay), or it loops endlessly in a cycle which does not include 1.\nThose numbers for which this process ends in 1 are happy.\nReturn true if n is a happy number, and false if not.',
      'def isHappy(self, n: int) -> bool:',
      '[
        {"input": "n = 19", "output": "true", "explanation": "1^2 + 9^2 = 82, 8^2 + 2^2 = 68, 6^2 + 8^2 = 100, 1^2 + 0^2 + 0^2 = 1"},
        {"input": "n = 2", "output": "false", "explanation": "The process will loop endlessly without reaching 1"}
      ]'::jsonb,
      '[
        "1 <= n <= 2^31 - 1"
      ]'::jsonb,
      'O(log n)',
      'O(log n)'
    );
  END IF;

  -- Plus One
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'plus-one') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'plus-one',
      'Plus One',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Math & Geometry' LIMIT 1),
      'You are given a large integer represented as an integer array digits, where each digits[i] is the ith digit of the integer. The digits are ordered from most significant to least significant in left-to-right order. The large integer does not contain any leading zero.\n\nIncrement the large integer by one and return the resulting array of digits.',
      'def plusOne(self, digits: List[int]) -> List[int]:',
      '[
        {"input": "digits = [1,2,3]", "output": "[1,2,4]", "explanation": "The array represents the integer 123. Incrementing by one gives 123 + 1 = 124. Thus, the result should be [1,2,4]."},
        {"input": "digits = [4,3,2,1]", "output": "[4,3,2,2]", "explanation": "The array represents the integer 4321. Incrementing by one gives 4321 + 1 = 4322. Thus, the result should be [4,3,2,2]."},
        {"input": "digits = [9]", "output": "[1,0]", "explanation": "The array represents the integer 9. Incrementing by one gives 9 + 1 = 10. Thus, the result should be [1,0]."}
      ]'::jsonb,
      '[
        "1 <= digits.length <= 100",
        "0 <= digits[i] <= 9",
        "digits does not contain any leading zeros"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Pow(x, n)
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'powx-n') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'powx-n',
      'Pow(x, n)',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Math & Geometry' LIMIT 1),
      'Implement pow(x, n), which calculates x raised to the power n (i.e., x^n).',
      'def myPow(self, x: float, n: int) -> float:',
      '[
        {"input": "x = 2.00000, n = 10", "output": "1024.00000", "explanation": "2^10 = 1024"},
        {"input": "x = 2.10000, n = 3", "output": "9.26100", "explanation": "2.1^3 = 9.261"},
        {"input": "x = 2.00000, n = -2", "output": "0.25000", "explanation": "2^(-2) = 1/2^2 = 1/4 = 0.25"}
      ]'::jsonb,
      '[
        "-100.0 < x < 100.0",
        "-2^31 <= n <= 2^31-1",
        "n is an integer",
        "Either x is not zero or n > 0",
        "-10^4 <= x^n <= 10^4"
      ]'::jsonb,
      'O(log n)',
      'O(log n)'
    );
  END IF;

  -- Multiply Strings
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'multiply-strings') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'multiply-strings',
      'Multiply Strings',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Math & Geometry' LIMIT 1),
      'Given two non-negative integers num1 and num2 represented as strings, return the product of num1 and num2, also represented as a string.\n\nNote: You must not use any built-in BigInteger library or convert the inputs to integer directly.',
      'def multiply(self, num1: str, num2: str) -> str:',
      '[
        {"input": "num1 = \"2\", num2 = \"3\"", "output": "\"6\"", "explanation": "2 * 3 = 6"},
        {"input": "num1 = \"123\", num2 = \"456\"", "output": "\"56088\"", "explanation": "123 * 456 = 56088"}
      ]'::jsonb,
      '[
        "1 <= num1.length, num2.length <= 200",
        "num1 and num2 consist of digits only",
        "Both num1 and num2 do not contain any leading zero, except the number 0 itself"
      ]'::jsonb,
      'O(m * n)',
      'O(m + n)'
    );
  END IF;

  -- Detect Squares
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'detect-squares') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'detect-squares',
      'Detect Squares',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Math & Geometry' LIMIT 1),
      'You are given a stream of points on the X-Y plane. Design an algorithm that:\n\nAdds new points from the stream into a data structure. Duplicate points are allowed and should be treated as different points.\nGiven a query point, counts the number of ways to choose three points from the data structure such that the three points and the query point form an axis-aligned square with positive area.\nAn axis-aligned square is a square whose edges are all the same length and are either parallel or perpendicular to the x-axis and y-axis.\n\nImplement the DetectSquares class:\n\nDetectSquares() Initializes the object with an empty data structure.\nvoid add(int[] point) Adds a new point point = [x, y] to the data structure.\nint count(int[] point) Counts the number of ways to form axis-aligned squares with point point = [x, y] as one of the four vertices.',
      'class DetectSquares:\n\n    def __init__(self):\n        \n\n    def add(self, point: List[int]) -> None:\n        \n\n    def count(self, point: List[int]) -> int:\n        \n\n\n# Your DetectSquares object will be instantiated and called as such:\n# obj = DetectSquares()\n# obj.add(point)\n# param_2 = obj.count(point)',
      '[
        {"input": "[\"DetectSquares\", \"add\", \"add\", \"add\", \"count\", \"count\", \"add\", \"count\"]\n[[], [[3, 10]], [[11, 2]], [[3, 2]], [[11, 10]], [[14, 8]], [[11, 2]], [[11, 10]]]", "output": "[null, null, null, null, 1, 0, null, 2]", "explanation": "DetectSquares detectSquares = new DetectSquares();\ndetectSquares.add([3, 10]);\ndetectSquares.add([11, 2]);\ndetectSquares.add([3, 2]);\ndetectSquares.count([11, 10]); // return 1. You can choose:\n                               //   - The first, second, and third points\ndetectSquares.count([14, 8]);  // return 0. The query point cannot form a square with any points in the data structure.\ndetectSquares.add([11, 2]);    // Adding duplicate points is allowed.\ndetectSquares.count([11, 10]); // return 2. You can choose:\n                               //   - The first, second, and third points\n                               //   - The first, third, and fourth points"}
      ]'::jsonb,
      '[
        "point.length == 2",
        "0 <= x, y <= 1000",
        "At most 3000 calls in total will be made to add and count"
      ]'::jsonb,
      'O(n) for count, O(1) for add',
      'O(n)'
    );
  END IF;

END $$;

-- Bit Manipulation Problems (all 5 missing)
DO $$
BEGIN
  -- Single Number
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'single-number') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'single-number',
      'Single Number',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Bit Manipulation' LIMIT 1),
      'Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with a linear runtime complexity and use only constant extra space.',
      'def singleNumber(self, nums: List[int]) -> int:',
      '[
        {"input": "nums = [2,2,1]", "output": "1", "explanation": "1 appears once while 2 appears twice"},
        {"input": "nums = [4,1,2,1,2]", "output": "4", "explanation": "4 appears once while others appear twice"},
        {"input": "nums = [1]", "output": "1", "explanation": "Single element returns itself"}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 3 * 10^4",
        "-3 * 10^4 <= nums[i] <= 3 * 10^4",
        "Each element in the array appears twice except for one element which appears only once"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Number of 1 Bits
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'number-of-1-bits') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'number-of-1-bits',
      'Number of 1 Bits',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Bit Manipulation' LIMIT 1),
      'Write a function that takes the binary representation of an unsigned integer and returns the number of ''1'' bits it has (also known as the Hamming weight).',
      'def hammingWeight(self, n: int) -> int:',
      '[
        {"input": "n = 00000000000000000000000000001011", "output": "3", "explanation": "The input binary string 00000000000000000000000000001011 has a total of three ''1'' bits."},
        {"input": "n = 00000000000000000000000010000000", "output": "1", "explanation": "The input binary string 00000000000000000000000010000000 has a total of one ''1'' bit."},
        {"input": "n = 11111111111111111111111111111101", "output": "31", "explanation": "The input binary string 11111111111111111111111111111101 has a total of thirty one ''1'' bits."}
      ]'::jsonb,
      '[
        "The input must be a binary string of length 32"
      ]'::jsonb,
      'O(1)',
      'O(1)'
    );
  END IF;

  -- Counting Bits
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'counting-bits') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'counting-bits',
      'Counting Bits',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Bit Manipulation' LIMIT 1),
      'Given an integer n, return an array ans of length n + 1 such that for each i (0 <= i <= n), ans[i] is the number of 1''s in the binary representation of i.',
      'def countBits(self, n: int) -> List[int]:',
      '[
        {"input": "n = 2", "output": "[0,1,1]", "explanation": "0 --> 0, 1 --> 1, 2 --> 10"},
        {"input": "n = 5", "output": "[0,1,1,2,1,2]", "explanation": "0 --> 0, 1 --> 1, 2 --> 10, 3 --> 11, 4 --> 100, 5 --> 101"}
      ]'::jsonb,
      '[
        "0 <= n <= 10^5"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Reverse Bits (already exists, skip)

  -- Missing Number
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'missing-number') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'missing-number',
      'Missing Number',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Bit Manipulation' LIMIT 1),
      'Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.',
      'def missingNumber(self, nums: List[int]) -> int:',
      '[
        {"input": "nums = [3,0,1]", "output": "2", "explanation": "n = 3 since there are 3 numbers, so all numbers are in the range [0,3]. 2 is the missing number in the range since it does not appear in nums."},
        {"input": "nums = [0,1]", "output": "2", "explanation": "n = 2 since there are 2 numbers, so all numbers are in the range [0,2]. 2 is the missing number in the range since it does not appear in nums."},
        {"input": "nums = [9,6,4,2,3,5,7,0,1]", "output": "8", "explanation": "n = 9 since there are 9 numbers, so all numbers are in the range [0,9]. 8 is the missing number in the range since it does not appear in nums."}
      ]'::jsonb,
      '[
        "n == nums.length",
        "1 <= n <= 10^4",
        "0 <= nums[i] <= n",
        "All the numbers of nums are unique"
      ]'::jsonb,
      'O(n)',
      'O(1)'
    );
  END IF;

  -- Sum of Two Integers
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'sum-of-two-integers') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'sum-of-two-integers',
      'Sum of Two Integers',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Bit Manipulation' LIMIT 1),
      'Given two integers a and b, return the sum of the two integers without using the operators + and -.',
      'def getSum(self, a: int, b: int) -> int:',
      '[
        {"input": "a = 1, b = 2", "output": "3", "explanation": "1 + 2 = 3"},
        {"input": "a = 2, b = 3", "output": "5", "explanation": "2 + 3 = 5"}
      ]'::jsonb,
      '[
        "-1000 <= a, b <= 1000"
      ]'::jsonb,
      'O(1)',
      'O(1)'
    );
  END IF;

END $$;

-- Add comprehensive test cases for all new problems
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT 
  p.id,
  CASE 
    WHEN p.id = 'climbing-stairs' THEN 'n = 2'
    WHEN p.id = 'house-robber' THEN 'nums = [1,2,3,1]'
    WHEN p.id = 'coin-change' THEN 'coins = [1,3,4], amount = 6'
    WHEN p.id = 'longest-increasing-subsequence' THEN 'nums = [10,9,2,5,3,7,101,18]'
    WHEN p.id = 'unique-paths' THEN 'm = 3, n = 7'
    WHEN p.id = 'longest-common-subsequence' THEN 'text1 = "abcde", text2 = "ace"'
    WHEN p.id = 'jump-game' THEN 'nums = [2,3,1,1,4]'
    WHEN p.id = 'merge-intervals' THEN 'intervals = [[1,3],[2,6],[8,10],[15,18]]'
    WHEN p.id = 'rotate-image' THEN 'matrix = [[1,2,3],[4,5,6],[7,8,9]]'
    WHEN p.id = 'single-number' THEN 'nums = [2,2,1]'
    ELSE 'nums = [1,2,3]'
  END,
  CASE 
    WHEN p.id = 'climbing-stairs' THEN '2'
    WHEN p.id = 'house-robber' THEN '4'
    WHEN p.id = 'coin-change' THEN '2'
    WHEN p.id = 'longest-increasing-subsequence' THEN '4'
    WHEN p.id = 'unique-paths' THEN '28'
    WHEN p.id = 'longest-common-subsequence' THEN '3'
    WHEN p.id = 'jump-game' THEN 'true'
    WHEN p.id = 'merge-intervals' THEN '[[1,6],[8,10],[15,18]]'
    WHEN p.id = 'rotate-image' THEN '[[7,4,1],[8,5,2],[9,6,3]]'
    WHEN p.id = 'single-number' THEN '1'
    ELSE '[1,2,4]'
  END,
  CASE 
    WHEN p.id = 'climbing-stairs' THEN '{"n": 2}'::jsonb
    WHEN p.id = 'house-robber' THEN '{"nums": [1,2,3,1]}'::jsonb
    WHEN p.id = 'coin-change' THEN '{"coins": [1,3,4], "amount": 6}'::jsonb
    WHEN p.id = 'longest-increasing-subsequence' THEN '{"nums": [10,9,2,5,3,7,101,18]}'::jsonb
    WHEN p.id = 'unique-paths' THEN '{"m": 3, "n": 7}'::jsonb
    WHEN p.id = 'longest-common-subsequence' THEN '{"text1": "abcde", "text2": "ace"}'::jsonb
    WHEN p.id = 'jump-game' THEN '{"nums": [2,3,1,1,4]}'::jsonb
    WHEN p.id = 'merge-intervals' THEN '{"intervals": [[1,3],[2,6],[8,10],[15,18]]}'::jsonb
    WHEN p.id = 'rotate-image' THEN '{"matrix": [[1,2,3],[4,5,6],[7,8,9]]}'::jsonb
    WHEN p.id = 'single-number' THEN '{"nums": [2,2,1]}'::jsonb
    ELSE '{"nums": [1,2,3]}'::jsonb
  END,
  CASE 
    WHEN p.id = 'climbing-stairs' THEN '2'::jsonb
    WHEN p.id = 'house-robber' THEN '4'::jsonb
    WHEN p.id = 'coin-change' THEN '2'::jsonb
    WHEN p.id = 'longest-increasing-subsequence' THEN '4'::jsonb
    WHEN p.id = 'unique-paths' THEN '28'::jsonb
    WHEN p.id = 'longest-common-subsequence' THEN '3'::jsonb
    WHEN p.id = 'jump-game' THEN 'true'::jsonb
    WHEN p.id = 'merge-intervals' THEN '[[1,6],[8,10],[15,18]]'::jsonb
    WHEN p.id = 'rotate-image' THEN '[[7,4,1],[8,5,2],[9,6,3]]'::jsonb
    WHEN p.id = 'single-number' THEN '1'::jsonb
    ELSE '[1,2,4]'::jsonb
  END,
  true
FROM public.problems p
WHERE p.id IN (
  'climbing-stairs', 'house-robber', 'coin-change', 'longest-increasing-subsequence',
  'unique-paths', 'longest-common-subsequence', 'jump-game', 'merge-intervals',
  'rotate-image', 'single-number'
)
AND NOT EXISTS (
  SELECT 1 FROM public.test_cases tc WHERE tc.problem_id = p.id
);