// Python solutions for LeetCode problems
export interface Solution {
  title: string;
  code: string;
  complexity: {
    time: string;
    space: string;
  };
  explanation: string;
}

export const pythonSolutions: Record<string, Solution[]> = {
  "two-sum": [
    {
      title: "Brute Force",
      code: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`,
      complexity: { time: "O(n²)", space: "O(1)" },
      explanation: "Check every pair of numbers to see if they sum to target.",
    },
    {
      title: "Hash Map (Optimal)",
      code: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    hashmap = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in hashmap:
            return [hashmap[complement], i]
        hashmap[num] = i
    return []`,
      complexity: { time: "O(n)", space: "O(n)" },
      explanation:
        "Use hash map to store numbers and their indices, check for complement in O(1) time.",
    },
  ],

  "group-anagrams": [
    {
      title: "Sort and Group",
      code: `def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
    from collections import defaultdict
    groups = defaultdict(list)
    
    for s in strs:
        # Sort the string to get the key
        key = ''.join(sorted(s))
        groups[key].append(s)
    
    return list(groups.values())`,
      complexity: { time: "O(n × m log m)", space: "O(n × m)" },
      explanation:
        "Sort each string to create a key, then group strings with same sorted key. Where n is number of strings and m is maximum length of a string.",
    },
    {
      title: "Character Count (Alternative)",
      code: `def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
    from collections import defaultdict
    groups = defaultdict(list)
    
    for s in strs:
        # Count characters as key
        count = [0] * 26
        for char in s:
            count[ord(char) - ord('a')] += 1
        # Convert to tuple to use as dictionary key
        key = tuple(count)
        groups[key].append(s)
    
    return list(groups.values())`,
      complexity: { time: "O(n × m)", space: "O(n × m)" },
      explanation:
        "Use character count array as key instead of sorting. More efficient for longer strings.",
    },
  ],

  "valid-anagram": [
    {
      title: "Sorting",
      code: `def isAnagram(self, s: str, t: str) -> bool:
    return sorted(s) == sorted(t)`,
      complexity: { time: "O(n log n)", space: "O(n)" },
      explanation: "Sort both strings and compare if they're equal.",
    },
    {
      title: "Character Count (Optimal)",
      code: `def isAnagram(self, s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    
    from collections import Counter
    return Counter(s) == Counter(t)`,
      complexity: { time: "O(n)", space: "O(1)" },
      explanation:
        "Count characters in both strings and compare the counts. Space is O(1) since we only have 26 possible lowercase letters.",
    },
  ],

  "valid-parentheses": [
    {
      title: "Stack",
      code: `def isValid(self, s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    
    for char in s:
        if char in mapping:
            # Closing bracket
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            # Opening bracket
            stack.append(char)
    
    return not stack`,
      complexity: { time: "O(n)", space: "O(n)" },
      explanation:
        "Use stack to track opening brackets and match with closing brackets. Return true only if all brackets are properly matched.",
    },
  ],

  "top-k-frequent-elements": [
    {
      title: "Counter + Heap",
      code: `def topKFrequent(self, nums: List[int], k: int) -> List[int]:
    from collections import Counter
    import heapq
    
    # Count frequencies
    counter = Counter(nums)
    
    # Use heap to get top k frequent
    return heapq.nlargest(k, counter.keys(), key=counter.get)`,
      complexity: { time: "O(n log k)", space: "O(n)" },
      explanation:
        "Count frequencies, then use heap to efficiently get top k elements.",
    },
    {
      title: "Bucket Sort (Optimal)",
      code: `def topKFrequent(self, nums: List[int], k: int) -> List[int]:
    from collections import Counter
    
    counter = Counter(nums)
    # Create buckets for each possible frequency
    buckets = [[] for _ in range(len(nums) + 1)]
    
    # Place numbers in buckets by frequency
    for num, freq in counter.items():
        buckets[freq].append(num)
    
    # Collect top k from highest frequency buckets
    result = []
    for i in range(len(buckets) - 1, -1, -1):
        for num in buckets[i]:
            result.append(num)
            if len(result) == k:
                return result
    
    return result`,
      complexity: { time: "O(n)", space: "O(n)" },
      explanation:
        "Use bucket sort approach with frequency as bucket index. Optimal O(n) time complexity.",
    },
  ],

  "product-of-array-except-self": [
    {
      title: "Brute Force",
      code: `def productExceptSelf(self, nums: List[int]) -> List[int]:
    n = len(nums)
    res = [0] * n

    for i in range(n):
        prod = 1
        for j in range(n):
            if i == j:
                continue
            prod *= nums[j]
        res[i] = prod
    return res`,
      complexity: { time: "O(n²)", space: "O(1) extra; O(n) output" },
      explanation: "Multiply all elements except the current index by iterating over the array for every i."
    },
    {
      title: "Division",
      code: `def productExceptSelf(self, nums: List[int]) -> List[int]:
    prod, zero_cnt = 1, 0
    for num in nums:
        if num:
            prod *= num
        else:
            zero_cnt += 1

    if zero_cnt > 1:
        return [0] * len(nums)

    res = [0] * len(nums)
    for i, c in enumerate(nums):
        if zero_cnt:
            res[i] = 0 if c else prod
        else:
            res[i] = prod // c
    return res`,
      complexity: { time: "O(n)", space: "O(1) extra; O(n) output" },
      explanation: "Compute product of non-zero elements and handle zero cases; otherwise divide total product by current element."
    },
    {
      title: "Prefix & Suffix",
      code: `def productExceptSelf(self, nums: List[int]) -> List[int]:
    n = len(nums)
    res = [0] * n
    pref = [0] * n
    suff = [0] * n

    pref[0] = 1
    for i in range(1, n):
        pref[i] = nums[i - 1] * pref[i - 1]

    suff[n - 1] = 1
    for i in range(n - 2, -1, -1):
        suff[i] = nums[i + 1] * suff[i + 1]

    for i in range(n):
        res[i] = pref[i] * suff[i]
    return res`,
      complexity: { time: "O(n)", space: "O(n)" },
      explanation: "Precompute prefix products and suffix products, then multiply per index."
    },
    {
      title: "Prefix & Suffix (Optimal)",
      code: `def productExceptSelf(self, nums: List[int]) -> List[int]:
    res = [1] * len(nums)

    prefix = 1
    for i in range(len(nums)):
        res[i] = prefix
        prefix *= nums[i]

    postfix = 1
    for i in range(len(nums) - 1, -1, -1):
        res[i] *= postfix
        postfix *= nums[i]

    return res`,
      complexity: { time: "O(n)", space: "O(1) extra; O(n) output" },
      explanation: "Carry prefix products in the output array, then multiply by running postfix in reverse to achieve O(1) extra space."
    }
  ],

  "counting-bits": [
    {
      title: "Bit Manipulation - I",
      code: `def countBits(self, n: int) -> List[int]:
    res = []
    for num in range(n + 1):
        one = 0
        for i in range(32):
            if num & (1 << i):
                one += 1
        res.append(one)
    return res`,
      complexity: { time: "O(n log n)", space: "O(1) extra; O(n) output" },
      explanation: "For each number, check all 32 bits to count the number of 1s by using bit shifting and AND operations."
    },
    {
      title: "Bit Manipulation - II",
      code: `def countBits(self, n: int) -> List[int]:
    res = [0] * (n + 1)
    for i in range(1, n + 1):
        num = i
        while num != 0:
            res[i] += 1
            num &= (num - 1)
    return res`,
      complexity: { time: "O(n log n)", space: "O(1) extra; O(n) output" },
      explanation: "Use the bit trick num & (num - 1) to remove the rightmost 1 bit. Count how many times we can do this operation."
    },
    {
      title: "In-Built Function",
      code: `def countBits(self, n: int) -> List[int]:
    return [bin(i).count('1') for i in range(n + 1)]`,
      complexity: { time: "O(n log n)", space: "O(1) extra; O(n) output" },
      explanation: "Convert each number to binary string and count the '1' characters. Simple but not the most efficient approach."
    },
    {
      title: "Bit Manipulation (DP)",
      code: `def countBits(self, n: int) -> List[int]:
    dp = [0] * (n + 1)
    offset = 1

    for i in range(1, n + 1):
        if offset * 2 == i:
            offset = i
        dp[i] = 1 + dp[i - offset]
    return dp`,
      complexity: { time: "O(n)", space: "O(1) extra; O(n) output" },
      explanation: "Use dynamic programming with offset pattern. Each power of 2 starts a new pattern where dp[i] = 1 + dp[i - offset]."
    },
    {
      title: "Bit Manipulation (Optimal)",
      code: `def countBits(self, n: int) -> List[int]:
    dp = [0] * (n + 1)
    for i in range(n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp`,
      complexity: { time: "O(n)", space: "O(1) extra; O(n) output" },
      explanation: "Optimal DP solution: dp[i] = dp[i//2] + (i%2). The number of 1s in i equals the number of 1s in i//2 plus 1 if i is odd."
    }
  ],
};
