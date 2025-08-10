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
  'two-sum': [
    {
      title: "Brute Force",
      code: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`,
      complexity: { time: "O(n²)", space: "O(1)" },
      explanation: "Check every pair of numbers to see if they sum to target."
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
      explanation: "Use hash map to store numbers and their indices, check for complement in O(1) time."
    }
  ],

  'group-anagrams': [
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
      explanation: "Sort each string to create a key, then group strings with same sorted key. Where n is number of strings and m is maximum length of a string."
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
      explanation: "Use character count array as key instead of sorting. More efficient for longer strings."
    }
  ],

  'valid-anagram': [
    {
      title: "Sorting",
      code: `def isAnagram(self, s: str, t: str) -> bool:
    return sorted(s) == sorted(t)`,
      complexity: { time: "O(n log n)", space: "O(n)" },
      explanation: "Sort both strings and compare if they're equal."
    },
    {
      title: "Character Count (Optimal)",
      code: `def isAnagram(self, s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    
    from collections import Counter
    return Counter(s) == Counter(t)`,
      complexity: { time: "O(n)", space: "O(1)" },
      explanation: "Count characters in both strings and compare the counts. Space is O(1) since we only have 26 possible lowercase letters."
    }
  ],

  'valid-parentheses': [
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
      explanation: "Use stack to track opening brackets and match with closing brackets. Return true only if all brackets are properly matched."
    }
  ],

  'top-k-frequent-elements': [
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
      explanation: "Count frequencies, then use heap to efficiently get top k elements."
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
      explanation: "Use bucket sort approach with frequency as bucket index. Optimal O(n) time complexity."
    }
  ]
};