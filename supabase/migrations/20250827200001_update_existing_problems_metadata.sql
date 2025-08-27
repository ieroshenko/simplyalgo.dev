-- Update existing problems with missing metadata (time/space complexity, examples, constraints)
-- This ensures all problems have complete information

-- Update Two Sum
UPDATE public.problems 
SET 
  examples = '[
    {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."},
    {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."},
    {"input": "nums = [3,3], target = 6", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 6, we return [0, 1]."}
  ]'::jsonb,
  constraints = '[
    "2 <= nums.length <= 10^4",
    "-10^9 <= nums[i] <= 10^9",
    "-10^9 <= target <= 10^9",
    "Only one valid answer exists"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(n)',
  function_signature = 'def twoSum(self, nums: List[int], target: int) -> List[int]:'
WHERE id = 'two-sum' 
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Valid Anagram
UPDATE public.problems 
SET 
  examples = '[
    {"input": "s = \"anagram\", t = \"nagaram\"", "output": "true", "explanation": "Both strings contain the same characters with the same frequencies."},
    {"input": "s = \"rat\", t = \"car\"", "output": "false", "explanation": "The strings contain different characters."}
  ]'::jsonb,
  constraints = '[
    "1 <= s.length, t.length <= 5 * 10^4",
    "s and t consist of lowercase English letters"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def isAnagram(self, s: str, t: str) -> bool:'
WHERE id = 'valid-anagram'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Group Anagrams
UPDATE public.problems 
SET 
  examples = '[
    {"input": "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", "output": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]", "explanation": "Group strings that are anagrams of each other."},
    {"input": "strs = [\"\"]", "output": "[[\"\"]]", "explanation": "Single empty string forms one group."},
    {"input": "strs = [\"a\"]", "output": "[[\"a\"]]", "explanation": "Single character forms one group."}
  ]'::jsonb,
  constraints = '[
    "1 <= strs.length <= 10^4",
    "0 <= strs[i].length <= 100",
    "strs[i] consists of lowercase English letters"
  ]'::jsonb,
  recommended_time_complexity = 'O(n * k * log k)',
  recommended_space_complexity = 'O(n * k)',
  function_signature = 'def groupAnagrams(self, strs: List[str]) -> List[List[str]]:'
WHERE id = 'group-anagrams'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Valid Parentheses
UPDATE public.problems 
SET 
  examples = '[
    {"input": "s = \"()\"", "output": "true", "explanation": "The parentheses are properly matched."},
    {"input": "s = \"()[]{}\"", "output": "true", "explanation": "All brackets are properly matched."},
    {"input": "s = \"(]\"", "output": "false", "explanation": "Mismatched bracket types."},
    {"input": "s = \"([)]\"", "output": "false", "explanation": "Brackets are not properly nested."},
    {"input": "s = \"{[]}\"", "output": "true", "explanation": "Properly nested brackets."}
  ]'::jsonb,
  constraints = '[
    "1 <= s.length <= 10^4",
    "s consists of parentheses only \"()[]{}\""
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(n)',
  function_signature = 'def isValid(self, s: str) -> bool:'
WHERE id = 'valid-parentheses'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Best Time to Buy and Sell Stock
UPDATE public.problems 
SET 
  examples = '[
    {"input": "prices = [7,1,5,3,6,4]", "output": "5", "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."},
    {"input": "prices = [7,6,4,3,1]", "output": "0", "explanation": "In this case, no transactions are done and the max profit = 0."}
  ]'::jsonb,
  constraints = '[
    "1 <= prices.length <= 10^5",
    "0 <= prices[i] <= 10^4"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def maxProfit(self, prices: List[int]) -> int:'
WHERE id = 'best-time-to-buy-and-sell-stock'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Merge Two Sorted Lists
UPDATE public.problems 
SET 
  examples = '[
    {"input": "list1 = [1,2,4], list2 = [1,3,4]", "output": "[1,1,2,3,4,4]", "explanation": "Merge the two sorted lists into one sorted list."},
    {"input": "list1 = [], list2 = []", "output": "[]", "explanation": "Both lists are empty."},
    {"input": "list1 = [], list2 = [0]", "output": "[0]", "explanation": "One list is empty."}
  ]'::jsonb,
  constraints = '[
    "The number of nodes in both lists is in the range [0, 50]",
    "-100 <= Node.val <= 100",
    "Both list1 and list2 are sorted in non-decreasing order"
  ]'::jsonb,
  recommended_time_complexity = 'O(m + n)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:'
WHERE id = 'merge-two-sorted-lists'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Maximum Subarray
UPDATE public.problems 
SET 
  examples = '[
    {"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6", "explanation": "The subarray [4,-1,2,1] has the largest sum 6."},
    {"input": "nums = [1]", "output": "1", "explanation": "Single element subarray."},
    {"input": "nums = [5,4,-1,7,8]", "output": "23", "explanation": "The entire array has the largest sum."}
  ]'::jsonb,
  constraints = '[
    "1 <= nums.length <= 10^5",
    "-10^4 <= nums[i] <= 10^4"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def maxSubArray(self, nums: List[int]) -> int:'
WHERE id = 'maximum-subarray'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Contains Duplicate
UPDATE public.problems 
SET 
  examples = '[
    {"input": "nums = [1,2,3,1]", "output": "true", "explanation": "The value 1 appears at indices 0 and 3."},
    {"input": "nums = [1,2,3,4]", "output": "false", "explanation": "All elements are distinct."},
    {"input": "nums = [1,1,1,3,3,4,3,2,4,2]", "output": "true", "explanation": "Multiple duplicates exist."}
  ]'::jsonb,
  constraints = '[
    "1 <= nums.length <= 10^5",
    "-10^9 <= nums[i] <= 10^9"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(n)',
  function_signature = 'def containsDuplicate(self, nums: List[int]) -> bool:'
WHERE id = 'contains-duplicate'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Product of Array Except Self (already has some metadata, but ensure completeness)
UPDATE public.problems 
SET 
  examples = '[
    {"input": "nums = [1,2,3,4]", "output": "[24,12,8,6]", "explanation": "For each index i, calculate the product of all elements except nums[i]."},
    {"input": "nums = [-1,1,0,-3,3]", "output": "[0,0,9,0,0]", "explanation": "The zero at index 2 makes most products zero, except at index 2 itself."}
  ]'::jsonb,
  constraints = '[
    "2 <= nums.length <= 10^5",
    "-30 <= nums[i] <= 30",
    "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def productExceptSelf(self, nums: List[int]) -> List[int]:'
WHERE id = 'product-of-array-except-self'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Maximum Product Subarray
UPDATE public.problems 
SET 
  examples = '[
    {"input": "nums = [2,3,-2,4]", "output": "6", "explanation": "The subarray [2,3] has the largest product 6."},
    {"input": "nums = [-2,0,-1]", "output": "0", "explanation": "The result cannot be 2, because [-2,-1] is not a subarray."},
    {"input": "nums = [-2,3,-4]", "output": "24", "explanation": "The subarray [-2,3,-4] has the largest product 24."}
  ]'::jsonb,
  constraints = '[
    "1 <= nums.length <= 2 * 10^4",
    "-10 <= nums[i] <= 10",
    "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def maxProduct(self, nums: List[int]) -> int:'
WHERE id = 'maximum-product-subarray'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Reverse Bits
UPDATE public.problems 
SET 
  examples = '[
    {"input": "n = 00000010100101000001111010011100", "output": "00111001011110000010100101000000", "explanation": "The input binary string 00000010100101000001111010011100 represents the unsigned integer 43261596, so return 964176192 which its binary representation is 00111001011110000010100101000000."},
    {"input": "n = 11111111111111111111111111111101", "output": "10111111111111111111111111111111", "explanation": "The input binary string 11111111111111111111111111111101 represents the unsigned integer 4294967293, so return 3221225471 which its binary representation is 10111111111111111111111111111111."}
  ]'::jsonb,
  constraints = '[
    "The input must be a binary string of length 32"
  ]'::jsonb,
  recommended_time_complexity = 'O(1)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def reverseBits(self, n: int) -> int:'
WHERE id = 'reverse-bits'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Missing Number
UPDATE public.problems 
SET 
  examples = '[
    {"input": "nums = [3,0,1]", "output": "2", "explanation": "n = 3 since there are 3 numbers, so all numbers are in the range [0,3]. 2 is the missing number."},
    {"input": "nums = [0,1]", "output": "2", "explanation": "n = 2 since there are 2 numbers, so all numbers are in the range [0,2]. 2 is the missing number."},
    {"input": "nums = [9,6,4,2,3,5,7,0,1]", "output": "8", "explanation": "n = 9 since there are 9 numbers, so all numbers are in the range [0,9]. 8 is the missing number."}
  ]'::jsonb,
  constraints = '[
    "n == nums.length",
    "1 <= n <= 10^4", 
    "0 <= nums[i] <= n",
    "All the numbers of nums are unique"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def missingNumber(self, nums: List[int]) -> int:'
WHERE id = 'missing-number'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Number of 1 Bits
UPDATE public.problems 
SET 
  examples = '[
    {"input": "n = 00000000000000000000000000001011", "output": "3", "explanation": "The input binary string has three 1 bits."},
    {"input": "n = 00000000000000000000000010000000", "output": "1", "explanation": "The input binary string has one 1 bit."},
    {"input": "n = 11111111111111111111111111111101", "output": "31", "explanation": "The input binary string has thirty one 1 bits."}
  ]'::jsonb,
  constraints = '[
    "The input must be a binary string of length 32"
  ]'::jsonb,
  recommended_time_complexity = 'O(1)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def hammingWeight(self, n: int) -> int:'
WHERE id = 'number-of-1-bits'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);

-- Update Counting Bits
UPDATE public.problems 
SET 
  examples = '[
    {"input": "n = 2", "output": "[0,1,1]", "explanation": "0 -> 0, 1 -> 1, 2 -> 10"},
    {"input": "n = 5", "output": "[0,1,1,2,1,2]", "explanation": "0 -> 0, 1 -> 1, 2 -> 10, 3 -> 11, 4 -> 100, 5 -> 101"}
  ]'::jsonb,
  constraints = '[
    "0 <= n <= 10^5"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(1)',
  function_signature = 'def countBits(self, n: int) -> List[int]:'
WHERE id = 'counting-bits'
  AND (recommended_time_complexity IS NULL OR recommended_time_complexity = '' OR examples IS NULL);