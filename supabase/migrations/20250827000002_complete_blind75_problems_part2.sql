-- Complete Blind 75 Problems Migration - Part 2
-- Remaining categories: Tries, Heap/Priority Queue, Backtracking, Graphs, Advanced Graphs, 1-D DP, 2-D DP, Greedy, Intervals, Math & Geometry, Bit Manipulation

-- Tries Problems (all 3 missing)
DO $$
BEGIN
  -- Implement Trie (Prefix Tree)
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'implement-trie-prefix-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'implement-trie-prefix-tree',
      'Implement Trie (Prefix Tree)',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Tries' LIMIT 1),
      'A trie (pronounced as "try") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. There are various applications of this data structure, such as autocomplete and spellchecker.\n\nImplement the Trie class:\n\nTrie() Initializes the trie object.\nvoid insert(String word) Inserts the string word into the trie.\nboolean search(String word) Returns true if the string word is in the trie (i.e., was inserted before), and false otherwise.\nboolean startsWith(String prefix) Returns true if there is a previously inserted string word that has the prefix prefix, and false otherwise.',
      'class Trie:\n\n    def __init__(self):\n        \n\n    def insert(self, word: str) -> None:\n        \n\n    def search(self, word: str) -> bool:\n        \n\n    def startsWith(self, prefix: str) -> bool:\n        \n\n\n# Your Trie object will be instantiated and called as such:\n# obj = Trie()\n# obj.insert(word)\n# param_2 = obj.search(word)\n# param_3 = obj.startsWith(prefix)',
      '[
        {"input": "[\"Trie\", \"insert\", \"search\", \"search\", \"startsWith\", \"insert\", \"search\"]\n[[], [\"apple\"], [\"apple\"], [\"app\"], [\"app\"], [\"app\"], [\"app\"]]", "output": "[null, null, true, false, true, null, true]", "explanation": "Trie trie = new Trie();\ntrie.insert(\"apple\");\ntrie.search(\"apple\");   // return True\ntrie.search(\"app\");     // return False\ntrie.startsWith(\"app\"); // return True\ntrie.insert(\"app\");\ntrie.search(\"app\");     // return True"}
      ]'::jsonb,
      '[
        "1 <= word.length, prefix.length <= 2000",
        "word and prefix consist only of lowercase English letters",
        "At most 3 * 10^4 calls in total will be made to insert, search, and startsWith"
      ]'::jsonb,
      'O(m) for insert, search, startsWith',
      'O(ALPHABET_SIZE * N * M)'
    );
  END IF;

  -- Design Add and Search Words Data Structure
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'design-add-and-search-words-data-structure') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'design-add-and-search-words-data-structure',
      'Design Add and Search Words Data Structure',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Tries' LIMIT 1),
      'Design a data structure that supports adding new words and finding if a string matches any previously added string.\n\nImplement the WordDictionary class:\n\nWordDictionary() Initializes the object.\nvoid addWord(word) Adds word to the data structure, it can be matched later.\nbool search(word) Returns true if there is any string in the data structure that matches word or false otherwise. word may contain dots ''.'' where dots can be matched with any letter.',
      'class WordDictionary:\n\n    def __init__(self):\n        \n\n    def addWord(self, word: str) -> None:\n        \n\n    def search(self, word: str) -> bool:\n        \n\n\n# Your WordDictionary object will be instantiated and called as such:\n# obj = WordDictionary()\n# obj.addWord(word)\n# param_2 = obj.search(word)',
      '[
        {"input": "[\"WordDictionary\",\"addWord\",\"addWord\",\"addWord\",\"search\",\"search\",\"search\",\"search\"]\n[[],[\"bad\"],[\"dad\"],[\"mad\"],[\"pad\"],[\"bad\"],[\".ad\"],[\"b..\"]]", "output": "[null,null,null,null,false,true,true,true]", "explanation": "WordDictionary wordDictionary = new WordDictionary();\nwordDictionary.addWord(\"bad\");\nwordDictionary.addWord(\"dad\");\nwordDictionary.addWord(\"mad\");\nwordDictionary.search(\"pad\"); // return False\nwordDictionary.search(\"bad\"); // return True\nwordDictionary.search(\".ad\"); // return True\nwordDictionary.search(\"b..\"); // return True"}
      ]'::jsonb,
      '[
        "1 <= word.length <= 25",
        "word in addWord consists of lowercase English letters",
        "word in search consist of ''.'' or lowercase English letters",
        "There will be at most 2 dots in word for search queries",
        "At most 10^4 calls will be made to addWord and search"
      ]'::jsonb,
      'O(m) for addWord, O(m * 26^p) for search',
      'O(ALPHABET_SIZE * N * M)'
    );
  END IF;

  -- Word Search II
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'word-search-ii') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'word-search-ii',
      'Word Search II',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Tries' LIMIT 1),
      'Given an m x n board of characters and a list of strings words, return all words on the board.\n\nEach word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.',
      'def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:',
      '[
        {"input": "board = [[\"o\",\"a\",\"a\",\"n\"],[\"e\",\"t\",\"a\",\"e\"],[\"i\",\"h\",\"k\",\"r\"],[\"i\",\"f\",\"l\",\"v\"]], words = [\"oath\",\"pea\",\"eat\",\"rain\"]", "output": "[\"eat\",\"oath\"]", "explanation": "The words \"eat\" and \"oath\" can be found on the board"},
        {"input": "board = [[\"a\",\"b\"],[\"c\",\"d\"]], words = [\"abcb\"]", "output": "[]", "explanation": "The word \"abcb\" cannot be formed on the board"}
      ]'::jsonb,
      '[
        "m == board.length",
        "n == board[i].length",
        "1 <= m, n <= 12",
        "board[i][j] is a lowercase English letter",
        "1 <= words.length <= 3 * 10^4",
        "1 <= words[i].length <= 10",
        "words[i] consists of lowercase English letters",
        "All the strings of words are unique"
      ]'::jsonb,
      'O(m * n * 4^l * w)',
      'O(ALPHABET_SIZE * N * M)'
    );
  END IF;

END $$;

-- Heap / Priority Queue Problems (all 3 missing)
DO $$
BEGIN
  -- Kth Largest Element in a Stream
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'kth-largest-element-in-a-stream') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'kth-largest-element-in-a-stream',
      'Kth Largest Element in a Stream',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Heap / Priority Queue' LIMIT 1),
      'Design a class to find the kth largest element in a stream. Note that it is the kth largest element in the sorted order, not the kth distinct element.\n\nImplement KthLargest class:\n\nKthLargest(int k, int[] nums) Initializes the object with the integer k and the stream of integers nums.\nint add(int val) Appends the integer val to the stream and returns the element representing the kth largest element in the stream.',
      'class KthLargest:\n\n    def __init__(self, k: int, nums: List[int]):\n        \n\n    def add(self, val: int) -> int:\n        \n\n\n# Your KthLargest object will be instantiated and called as such:\n# obj = KthLargest(k, nums)\n# param_1 = obj.add(val)',
      '[
        {"input": "[\"KthLargest\", \"add\", \"add\", \"add\", \"add\", \"add\"]\n[[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]", "output": "[null, 4, 5, 5, 8, 8]", "explanation": "KthLargest kthLargest = new KthLargest(3, [4, 5, 8, 2]);\nkthLargest.add(3);   // return 4\nkthLargest.add(5);   // return 5\nkthLargest.add(10);  // return 5\nkthLargest.add(9);   // return 8\nkthLargest.add(4);   // return 8"}
      ]'::jsonb,
      '[
        "1 <= k <= 10^4",
        "0 <= nums.length <= 10^4",
        "-10^4 <= nums[i] <= 10^4",
        "-10^4 <= val <= 10^4",
        "At most 10^4 calls will be made to add",
        "It is guaranteed that there will be at least k elements in the array when you search for the kth element"
      ]'::jsonb,
      'O(log k) for add',
      'O(k)'
    );
  END IF;

  -- Last Stone Weight
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'last-stone-weight') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'last-stone-weight',
      'Last Stone Weight',
      'Easy',
      (SELECT id FROM public.categories WHERE name = 'Heap / Priority Queue' LIMIT 1),
      'You are given an array of integers stones where stones[i] is the weight of the ith stone.\n\nWe are playing a game with the stones. On each turn, we choose the heaviest two stones and smash them together. Suppose the heaviest two stones have weights x and y with x <= y. The result of this smash is:\n\nIf x == y, both stones are destroyed, and\nIf x != y, the stone of weight x is destroyed, and the stone of weight y has new weight y - x.\nAt the end of the game, there is at most one stone left.\n\nReturn the weight of the last remaining stone. If there are no stones left, return 0.',
      'def lastStoneWeight(self, stones: List[int]) -> int:',
      '[
        {"input": "stones = [2,7,4,1,8,1]", "output": "1", "explanation": "We combine 7 and 8 to get 1 so the array converts to [2,4,1,1,1] then, we combine 2 and 4 to get 2 so the array converts to [2,1,1,1] then, we combine 2 and 1 to get 1 so the array converts to [1,1,1] then, we combine 1 and 1 to get 0 so the array converts to [1] then that''s the value of the last stone."},
        {"input": "stones = [1]", "output": "1", "explanation": "Only one stone remains"}
      ]'::jsonb,
      '[
        "1 <= stones.length <= 30",
        "1 <= stones[i] <= 1000"
      ]'::jsonb,
      'O(n log n)',
      'O(n)'
    );
  END IF;

  -- Find Median from Data Stream
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'find-median-from-data-stream') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'find-median-from-data-stream',
      'Find Median from Data Stream',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Heap / Priority Queue' LIMIT 1),
      'The median is the middle value in an ordered integer list. If the size of the list is even, there is no middle value and the median is the mean of the two middle values.\n\nFor example, for arr = [2,3,4], the median is 3.\nFor example, for arr = [2,3], the median is (2 + 3) / 2 = 2.5.\nImplement the MedianFinder class:\n\nMedianFinder() initializes the MedianFinder object.\nvoid addNum(int num) adds the integer num from the data stream to the data structure.\ndouble findMedian() returns the median of all elements so far. Answers within 10^-5 of the actual answer will be accepted.',
      'class MedianFinder:\n\n    def __init__(self):\n        \n\n    def addNum(self, num: int) -> None:\n        \n\n    def findMedian(self) -> float:\n        \n\n\n# Your MedianFinder object will be instantiated and called as such:\n# obj = MedianFinder()\n# obj.addNum(num)\n# param_2 = obj.findMedian()',
      '[
        {"input": "[\"MedianFinder\", \"addNum\", \"addNum\", \"findMedian\", \"addNum\", \"findMedian\"]\n[[], [1], [2], [], [3], []]", "output": "[null, null, null, 1.5, null, 2.0]", "explanation": "MedianFinder medianFinder = new MedianFinder();\nmedianFinder.addNum(1);    // arr = [1]\nmedianFinder.addNum(2);    // arr = [1, 2]\nmedianFinder.findMedian(); // return 1.5 (i.e., (1 + 2) / 2)\nmedianFinder.addNum(3);    // arr[1, 2, 3]\nmedianFinder.findMedian(); // return 2.0"}
      ]'::jsonb,
      '[
        "-10^5 <= num <= 10^5",
        "There will be at least one element in the data structure before calling findMedian",
        "At most 5 * 10^4 calls will be made to addNum and findMedian"
      ]'::jsonb,
      'O(log n) for addNum, O(1) for findMedian',
      'O(n)'
    );
  END IF;

END $$;

-- Backtracking Problems (all 4 missing)
DO $$
BEGIN
  -- Subsets
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'subsets') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'subsets',
      'Subsets',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Backtracking' LIMIT 1),
      'Given an integer array nums of unique elements, return all possible subsets (the power set).\n\nThe solution set must not contain duplicate subsets. Return the solution in any order.',
      'def subsets(self, nums: List[int]) -> List[List[int]]:',
      '[
        {"input": "nums = [1,2,3]", "output": "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]", "explanation": "All possible subsets of [1,2,3]"},
        {"input": "nums = [0]", "output": "[[],[0]]", "explanation": "All possible subsets of [0]"}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 10",
        "-10 <= nums[i] <= 10",
        "All the numbers of nums are unique"
      ]'::jsonb,
      'O(n * 2^n)',
      'O(n * 2^n)'
    );
  END IF;

  -- Combination Sum
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'combination-sum') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'combination-sum',
      'Combination Sum',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Backtracking' LIMIT 1),
      'Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. You may return the combinations in any order.\n\nThe same number may be chosen from candidates an unlimited number of times. Two combinations are unique if the frequency of at least one of the chosen numbers is different.\n\nThe test cases are generated such that the number of unique combinations that sum up to target is less than 150 combinations for the given input.',
      'def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:',
      '[
        {"input": "candidates = [2,3,6,7], target = 7", "output": "[[2,2,3],[7]]", "explanation": "2 and 3 are candidates, and 2 + 2 + 3 = 7. Note that 2 can be used multiple times.\n7 is a candidate, and 7 = 7.\nThese are the only two combinations."},
        {"input": "candidates = [2,3,5], target = 8", "output": "[[2,2,2,2],[2,3,3],[3,5]]", "explanation": "All unique combinations that sum to 8"},
        {"input": "candidates = [2], target = 1", "output": "[]", "explanation": "No combination sums to 1"}
      ]'::jsonb,
      '[
        "1 <= candidates.length <= 30",
        "2 <= candidates[i] <= 40",
        "All elements of candidates are distinct",
        "1 <= target <= 40"
      ]'::jsonb,
      'O(N^(T/M))',
      'O(T/M)'
    );
  END IF;

  -- Permutations
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'permutations') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'permutations',
      'Permutations',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Backtracking' LIMIT 1),
      'Given an array nums of distinct integers, return all the possible permutations. You can return the answer in any order.',
      'def permute(self, nums: List[int]) -> List[List[int]]:',
      '[
        {"input": "nums = [1,2,3]", "output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", "explanation": "All possible permutations of [1,2,3]"},
        {"input": "nums = [0,1]", "output": "[[0,1],[1,0]]", "explanation": "All possible permutations of [0,1]"},
        {"input": "nums = [1]", "output": "[[1]]", "explanation": "Single element has one permutation"}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 6",
        "-10 <= nums[i] <= 10",
        "All the integers of nums are unique"
      ]'::jsonb,
      'O(n! * n)',
      'O(n! * n)'
    );
  END IF;

  -- Subsets II
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'subsets-ii') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'subsets-ii',
      'Subsets II',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Backtracking' LIMIT 1),
      'Given an integer array nums that may contain duplicates, return all possible subsets (the power set).\n\nThe solution set must not contain duplicate subsets. Return the solution in any order.',
      'def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:',
      '[
        {"input": "nums = [1,2,2]", "output": "[[],[1],[1,2],[1,2,2],[2],[2,2]]", "explanation": "All unique subsets with duplicates handled"},
        {"input": "nums = [0]", "output": "[[],[0]]", "explanation": "Single element subsets"}
      ]'::jsonb,
      '[
        "1 <= nums.length <= 10",
        "-10 <= nums[i] <= 10"
      ]'::jsonb,
      'O(n * 2^n)',
      'O(n * 2^n)'
    );
  END IF;

  -- Combination Sum II
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'combination-sum-ii') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'combination-sum-ii',
      'Combination Sum II',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Backtracking' LIMIT 1),
      'Given a collection of candidate numbers (candidates) and a target number (target), find all unique combinations in candidates where the candidate numbers sum to target.\n\nEach number in candidates may only be used once in the combination.\n\nNote: The solution set must not contain duplicate combinations.',
      'def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:',
      '[
        {"input": "candidates = [10,1,2,7,6,1,5], target = 8", "output": "[[1,1,6],[1,2,5],[1,7],[2,6]]", "explanation": "All unique combinations that sum to 8"},
        {"input": "candidates = [2,5,2,1,2], target = 5", "output": "[[1,2,2],[5]]", "explanation": "All unique combinations that sum to 5"}
      ]'::jsonb,
      '[
        "1 <= candidates.length <= 100",
        "1 <= candidates[i] <= 50",
        "1 <= target <= 30"
      ]'::jsonb,
      'O(2^n)',
      'O(target)'
    );
  END IF;

  -- Word Search
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'word-search') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'word-search',
      'Word Search',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Backtracking' LIMIT 1),
      'Given an m x n grid of characters board and a string word, return true if word exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.',
      'def exist(self, board: List[List[str]], word: str) -> bool:',
      '[
        {"input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"ABCCED\"", "output": "true", "explanation": "The word ABCCED can be found in the board"},
        {"input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"SEE\"", "output": "true", "explanation": "The word SEE can be found in the board"},
        {"input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"ABCB\"", "output": "false", "explanation": "The word ABCB cannot be found without reusing cells"}
      ]'::jsonb,
      '[
        "m == board.length",
        "n = board[i].length",
        "1 <= m, n <= 6",
        "1 <= word.length <= 15",
        "board and word consists of only lowercase and uppercase English letters"
      ]'::jsonb,
      'O(m * n * 4^l)',
      'O(l)'
    );
  END IF;

  -- Palindrome Partitioning
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'palindrome-partitioning') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'palindrome-partitioning',
      'Palindrome Partitioning',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Backtracking' LIMIT 1),
      'Given a string s, partition s such that every substring of the partition is a palindrome. Return all possible palindrome partitioning of s.',
      'def partition(self, s: str) -> List[List[str]]:',
      '[
        {"input": "s = \"aab\"", "output": "[[\"a\",\"a\",\"b\"],[\"aa\",\"b\"]]", "explanation": "All possible palindrome partitions"},
        {"input": "s = \"raceacar\"", "output": "[[\"r\",\"a\",\"c\",\"e\",\"a\",\"c\",\"a\",\"r\"],[\"r\",\"a\",\"c\",\"e\",\"aca\",\"r\"],[\"r\",\"a\",\"ce\",\"e\",\"c\",\"a\",\"r\"],[\"r\",\"ace\",\"e\",\"ca\",\"r\"],[\"race\",\"a\",\"car\"],[\"ra\",\"c\",\"e\",\"a\",\"c\",\"ar\"],[\"ra\",\"c\",\"e\",\"aca\",\"r\"],[\"ra\",\"ce\",\"e\",\"c\",\"ar\"],[\"rac\",\"e\",\"a\",\"c\",\"ar\"],[\"rac\",\"e\",\"aca\",\"r\"],[\"race\",\"aca\",\"r\"],[\"r\",\"a\",\"c\",\"eacac\",\"a\",\"r\"],[\"r\",\"a\",\"ce\",\"aca\",\"c\",\"r\"],[\"r\",\"ace\",\"aca\",\"c\",\"r\"],[\"ra\",\"c\",\"eacac\",\"r\"],[\"rac\",\"eaca\",\"c\",\"r\"],[\"race\",\"aca\",\"r\"],[\"raceacar\"]]", "explanation": "Multiple palindrome partitioning possibilities"}
      ]'::jsonb,
      '[
        "1 <= s.length <= 16",
        "s contains only lowercase English letters"
      ]'::jsonb,
      'O(n * 2^n)',
      'O(n * 2^n)'
    );
  END IF;

  -- Letter Combinations of a Phone Number
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'letter-combinations-of-a-phone-number') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'letter-combinations-of-a-phone-number',
      'Letter Combinations of a Phone Number',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Backtracking' LIMIT 1),
      'Given a string containing digits from 2-9 inclusive, return all possible letter combinations that the number could represent. Return the answer in any order.\n\nA mapping of digits to letters (just like on the telephone buttons) is given below. Note that 1 does not map to any letters.',
      'def letterCombinations(self, digits: str) -> List[str]:',
      '[
        {"input": "digits = \"23\"", "output": "[\"ad\",\"ae\",\"af\",\"bd\",\"be\",\"bf\",\"cd\",\"ce\",\"cf\"]", "explanation": "All possible letter combinations for digits 2 and 3"},
        {"input": "digits = \"\"", "output": "[]", "explanation": "Empty input returns empty list"},
        {"input": "digits = \"2\"", "output": "[\"a\",\"b\",\"c\"]", "explanation": "Single digit combinations"}
      ]'::jsonb,
      '[
        "0 <= digits.length <= 4",
        "digits[i] is a digit in the range [\"2\", \"9\"]"
      ]'::jsonb,
      'O(3^m * 4^n)',
      'O(3^m * 4^n)'
    );
  END IF;

  -- N-Queens
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'n-queens') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'n-queens',
      'N-Queens',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Backtracking' LIMIT 1),
      'The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.\n\nGiven an integer n, return all distinct solutions to the n-queens puzzle. You may return the answer in any order.\n\nEach solution contains a distinct board configuration of the n-queens'' placement, where ''Q'' and ''.'' both indicate a queen and an empty space, respectively.',
      'def solveNQueens(self, n: int) -> List[List[str]]:',
      '[
        {"input": "n = 4", "output": "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"]]", "explanation": "There exist two distinct solutions to the 4-queens puzzle"},
        {"input": "n = 1", "output": "[[\"Q\"]]", "explanation": "Single queen solution"}
      ]'::jsonb,
      '[
        "1 <= n <= 9"
      ]'::jsonb,
      'O(n!)',
      'O(n^2)'
    );
  END IF;

END $$;

-- Graphs Problems (all 7 missing)
DO $$
BEGIN
  -- Number of Islands
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'number-of-islands') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'number-of-islands',
      'Number of Islands',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'Given an m x n 2D binary grid grid which represents a map of ''1''s (land) and ''0''s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.',
      'def numIslands(self, grid: List[List[str]]) -> int:',
      '[
        {"input": "grid = [[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]", "output": "1", "explanation": "There is one island"},
        {"input": "grid = [[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]", "output": "3", "explanation": "There are three islands"}
      ]'::jsonb,
      '[
        "m == grid.length",
        "n == grid[i].length",
        "1 <= m, n <= 300",
        "grid[i][j] is \"0\" or \"1\""
      ]'::jsonb,
      'O(m * n)',
      'O(m * n)'
    );
  END IF;

  -- Clone Graph
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'clone-graph') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'clone-graph',
      'Clone Graph',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'Given a reference of a node in a connected undirected graph.\n\nReturn a deep copy (clone) of the graph.\n\nEach node in the graph contains a value (int) and a list (List[Node]) of its neighbors.',
      'def cloneGraph(self, node: ''Node'') -> ''Node'':',
      '[
        {"input": "adjList = [[2,4],[1,3],[2,4],[1,3]]", "output": "[[2,4],[1,3],[2,4],[1,3]]", "explanation": "There are 4 nodes in the graph. 1st node (val = 1)''s neighbors are 2nd node (val = 2) and 4th node (val = 4). 2nd node (val = 2)''s neighbors are 1st node (val = 1) and 3rd node (val = 3). 3rd node (val = 3)''s neighbors are 2nd node (val = 2) and 4th node (val = 4). 4th node (val = 4)''s neighbors are 1st node (val = 1) and 3rd node (val = 3)."},
        {"input": "adjList = [[]]", "output": "[[]]", "explanation": "Note that the input contains one empty list. The graph consists of only one node with val = 1 and it does not have any neighbors."},
        {"input": "adjList = []", "output": "[]", "explanation": "This an empty graph, so return an empty node."}
      ]'::jsonb,
      '[
        "The number of nodes in the graph is in the range [0, 100]",
        "1 <= Node.val <= 100",
        "Node.val is unique for each node",
        "There are no repeated edges and no self-loops in the graph",
        "The Graph is connected and all nodes can be visited starting from the given node"
      ]'::jsonb,
      'O(V + E)',
      'O(V)'
    );
  END IF;

  -- Max Area of Island
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'max-area-of-island') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'max-area-of-island',
      'Max Area of Island',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'You are given an m x n binary matrix grid. An island is a group of 1''s (representing land) connected 4-directionally (horizontal or vertical.) You may assume all four edges of the grid are surrounded by water.\n\nThe area of an island is the number of cells with a value 1 in the island.\n\nReturn the maximum area of an island in grid. If there is no island, return 0.',
      'def maxAreaOfIsland(self, grid: List[List[int]]) -> int:',
      '[
        {"input": "grid = [[1,1,0,0,0],[1,1,0,0,0],[0,0,0,1,1],[0,0,0,1,1]]", "output": "4", "explanation": "The maximum area island has area 4"},
        {"input": "grid = [[0,0,0,0,0,0,0,0]]", "output": "0", "explanation": "No islands exist"}
      ]'::jsonb,
      '[
        "m == grid.length",
        "n == grid[i].length",
        "1 <= m, n <= 50",
        "grid[i][j] is either 0 or 1"
      ]'::jsonb,
      'O(m * n)',
      'O(m * n)'
    );
  END IF;

  -- Pacific Atlantic Water Flow
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'pacific-atlantic-water-flow') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'pacific-atlantic-water-flow',
      'Pacific Atlantic Water Flow',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'There is an m x n rectangular island that borders both the Pacific Ocean and Atlantic Ocean. The Pacific Ocean touches the island''s left and top edges, and the Atlantic Ocean touches the island''s right and bottom edges.\n\nThe island is partitioned into a grid of square cells. You are given an m x n integer matrix heights where heights[r][c] represents the height above sea level of the cell at coordinate (r, c).\n\nThe island receives a lot of rain, and the rain water can flow to neighboring cells directly north, south, east, and west if the neighboring cell''s height is less than or equal to the current cell''s height. Water can flow from any cell adjacent to an ocean into that ocean.\n\nReturn a 2D list of grid coordinates result where result[i] = [ri, ci] denotes that rain water can flow from cell (ri, ci) to both the Pacific and Atlantic oceans.',
      'def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:',
      '[
        {"input": "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]", "output": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]", "explanation": "The following cells can flow to the Pacific and Atlantic oceans"},
        {"input": "heights = [[1]]", "output": "[[0,0]]", "explanation": "Single cell can flow to both oceans"}
      ]'::jsonb,
      '[
        "m == heights.length",
        "n == heights[r].length",
        "1 <= m, n <= 200",
        "0 <= heights[r][c] <= 2 * 10^5"
      ]'::jsonb,
      'O(m * n)',
      'O(m * n)'
    );
  END IF;

  -- Surrounded Regions
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'surrounded-regions') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'surrounded-regions',
      'Surrounded Regions',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'Given an m x n matrix board containing ''X'' and ''O'', capture all regions that are 4-directionally surrounded by ''X''.\n\nA region is captured by flipping all ''O''s into ''X''s in that surrounded region.',
      'def solve(self, board: List[List[str]]) -> None:',
      '[
        {"input": "board = [[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"O\",\"O\",\"X\"],[\"X\",\"X\",\"O\",\"X\"],[\"X\",\"O\",\"X\",\"X\"]]", "output": "[[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"O\",\"X\",\"X\"]]", "explanation": "Notice that an ''O'' in the corner is not flipped to ''X'' because it is not surrounded"},
        {"input": "board = [[\"X\"]]", "output": "[[\"X\"]]", "explanation": "Single X cell remains unchanged"}
      ]'::jsonb,
      '[
        "m == board.length",
        "n == board[i].length",
        "1 <= m, n <= 200",
        "board[i][j] is \"X\" or \"O\""
      ]'::jsonb,
      'O(m * n)',
      'O(m * n)'
    );
  END IF;

  -- Rotting Oranges
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'rotting-oranges') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'rotting-oranges',
      'Rotting Oranges',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'You are given an m x n grid where each cell can have one of three values:\n\n0 representing an empty cell,\n1 representing a fresh orange, or\n2 representing a rotten orange.\nEvery minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten.\n\nReturn the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return -1.',
      'def orangesRotting(self, grid: List[List[int]]) -> int:',
      '[
        {"input": "grid = [[2,1,1],[1,1,0],[0,1,1]]", "output": "4", "explanation": "The orange at position (0, 0) is rotten. At minute 1, the adjacent oranges at (0, 1) and (1, 0) become rotten. At minute 2, the adjacent oranges at (0, 2) and (1, 1) become rotten. At minute 3, the orange at (1, 2) becomes rotten. At minute 4, the orange at (2, 2) becomes rotten."},
        {"input": "grid = [[2,1,1],[0,1,1],[1,0,1]]", "output": "-1", "explanation": "The orange in the bottom left corner (row 2, column 0) is never rotten, because rotting only happens 4-directionally."},
        {"input": "grid = [[0,2]]", "output": "0", "explanation": "Since there are already no fresh oranges at minute 0, the answer is just 0."}
      ]'::jsonb,
      '[
        "m == grid.length",
        "n == grid[i].length",
        "1 <= m, n <= 10",
        "grid[i][j] is 0, 1, or 2"
      ]'::jsonb,
      'O(m * n)',
      'O(m * n)'
    );
  END IF;

  -- Walls and Gates
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'walls-and-gates') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'walls-and-gates',
      'Walls and Gates',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'You are given an m x n grid rooms initialized with these three possible values.\n\n-1 A wall or an obstacle.\n0 A gate.\nINF Infinity means an empty room. We use the value 2^31 - 1 = 2147483647 to represent INF as you may assume that the distance to a gate is less than 2147483647.\nFill each empty room with the distance to its nearest gate. If it is impossible to reach a gate, it should be filled with INF.',
      'def wallsAndGates(self, rooms: List[List[int]]) -> None:',
      '[
        {"input": "rooms = [[2147483647,-1,0,2147483647],[2147483647,2147483647,2147483647,-1],[2147483647,-1,2147483647,-1],[0,-1,2147483647,2147483647]]", "output": "[[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]", "explanation": "Each empty room is filled with distance to nearest gate"}
      ]'::jsonb,
      '[
        "m == rooms.length",
        "n == rooms[i].length",
        "1 <= m, n <= 250",
        "rooms[i][j] is -1, 0, or 2^31 - 1"
      ]'::jsonb,
      'O(m * n)',
      'O(m * n)'
    );
  END IF;

  -- Course Schedule
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'course-schedule') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'course-schedule',
      'Course Schedule',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.\n\nFor example, the pair [0, 1], indicates that to take course 0 you have to first take course 1.\nReturn true if you can finish all courses. Otherwise, return false.',
      'def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:',
      '[
        {"input": "numCourses = 2, prerequisites = [[1,0]]", "output": "true", "explanation": "There are a total of 2 courses to take. To take course 1 you should have finished course 0. So it is possible."},
        {"input": "numCourses = 2, prerequisites = [[1,0],[0,1]]", "output": "false", "explanation": "There are a total of 2 courses to take. To take course 1 you should have finished course 0, and to take course 0 you should also have finished course 1. So it is impossible."}
      ]'::jsonb,
      '[
        "1 <= numCourses <= 2000",
        "0 <= prerequisites.length <= 5000",
        "prerequisites[i].length == 2",
        "0 <= ai, bi < numCourses",
        "All the pairs prerequisites[i] are unique"
      ]'::jsonb,
      'O(V + E)',
      'O(V + E)'
    );
  END IF;

  -- Course Schedule II
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'course-schedule-ii') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'course-schedule-ii',
      'Course Schedule II',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.\n\nFor example, the pair [0, 1], indicates that to take course 0 you have to first take course 1.\nReturn the ordering of courses you should take to finish all courses. If there are many valid answers, return any of them. If it is impossible to finish all courses, return an empty array.',
      'def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:',
      '[
        {"input": "numCourses = 2, prerequisites = [[1,0]]", "output": "[0,1]", "explanation": "There are a total of 2 courses to take. To take course 1 you should have finished course 0. So the correct course order is [0,1]."},
        {"input": "numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]", "output": "[0,2,1,3]", "explanation": "There are a total of 4 courses to take. To take course 3 you should have finished both courses 1 and 2. Both courses 1 and 2 should be taken after you finished course 0. So one correct course order is [0,1,2,3]. Another correct ordering is [0,2,1,3]."},
        {"input": "numCourses = 1, prerequisites = []", "output": "[0]", "explanation": "Single course with no prerequisites"}
      ]'::jsonb,
      '[
        "1 <= numCourses <= 2000",
        "0 <= prerequisites.length <= numCourses * (numCourses - 1)",
        "prerequisites[i].length == 2",
        "0 <= ai, bi < numCourses",
        "ai != bi",
        "All the pairs [ai, bi] are distinct"
      ]'::jsonb,
      'O(V + E)',
      'O(V + E)'
    );
  END IF;

  -- Redundant Connection
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'redundant-connection') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'redundant-connection',
      'Redundant Connection',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'In this problem, a tree is an undirected graph that is connected and has no cycles.\n\nYou are given a graph that started as a tree with n nodes labeled from 1 to n, with one additional edge added. The added edge has two different vertices chosen from 1 to n, and was not an edge that already existed. The graph is represented as an array edges of length n where edges[i] = [ai, bi] indicates that there is an edge between nodes ai and bi in the graph.\n\nReturn an edge that can be removed so that the resulting graph is a tree of n nodes. If there are multiple answers, return the answer that occurs last in the input.',
      'def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:',
      '[
        {"input": "edges = [[1,2],[1,3],[2,3]]", "output": "[2,3]", "explanation": "The given undirected graph will be like this:\n  1\n / \\\n2 - 3"},
        {"input": "edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]", "output": "[1,4]", "explanation": "The given undirected graph will be like this:\n5 - 1 - 2\n    |   |\n    4 - 3"}
      ]'::jsonb,
      '[
        "n == edges.length",
        "3 <= n <= 1000",
        "edges[i].length == 2",
        "1 <= ai < bi <= edges.length",
        "ai != bi",
        "There are no repeated edges",
        "The given graph is connected"
      ]'::jsonb,
      'O(n * α(n))',
      'O(n)'
    );
  END IF;

  -- Number of Connected Components in an Undirected Graph
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'number-of-connected-components-in-an-undirected-graph') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'number-of-connected-components-in-an-undirected-graph',
      'Number of Connected Components in an Undirected Graph',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'You have a graph of n nodes. You are given an integer n and an array edges where edges[i] = [ai, bi] indicates that there is an edge between ai and bi in the graph.\n\nReturn the number of connected components in the graph.',
      'def countComponents(self, n: int, edges: List[List[int]]) -> int:',
      '[
        {"input": "n = 5, edges = [[0,1],[1,2],[3,4]]", "output": "2", "explanation": "There are two connected components: {0, 1, 2} and {3, 4}"},
        {"input": "n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]", "output": "1", "explanation": "All nodes are connected in one component"}
      ]'::jsonb,
      '[
        "1 <= n <= 2000",
        "1 <= edges.length <= 5000",
        "edges[i].length == 2",
        "0 <= ai <= bi < n",
        "ai != bi",
        "There are no repeated edges"
      ]'::jsonb,
      'O(E * α(V))',
      'O(V)'
    );
  END IF;

  -- Graph Valid Tree
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'graph-valid-tree') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'graph-valid-tree',
      'Graph Valid Tree',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Graphs' LIMIT 1),
      'You have a graph of n nodes labeled from 0 to n - 1. You are given an integer n and a list of edges where edges[i] = [ai, bi] indicates that there is an undirected edge between nodes ai and bi in the graph.\n\nReturn true if the edges of the given graph make up a valid tree, and false otherwise.',
      'def validTree(self, n: int, edges: List[List[int]]) -> bool:',
      '[
        {"input": "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]", "output": "true", "explanation": "The graph forms a valid tree"},
        {"input": "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]", "output": "false", "explanation": "The graph contains a cycle and is not a valid tree"}
      ]'::jsonb,
      '[
        "1 <= n <= 2000",
        "0 <= edges.length <= 5000",
        "edges[i].length == 2",
        "0 <= ai, bi < n",
        "ai != bi",
        "There are no self-loops or repeated edges"
      ]'::jsonb,
      'O(E * α(V))',
      'O(V)'
    );
  END IF;

END $$;

-- Advanced Graphs Problems (all 1 missing)
DO $$
BEGIN
  -- Alien Dictionary
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'alien-dictionary') THEN
    INSERT INTO public.problems (
      id, title, difficulty, category_id, description, function_signature,
      examples, constraints, recommended_time_complexity, recommended_space_complexity
    ) VALUES (
      'alien-dictionary',
      'Alien Dictionary',
      'Hard',
      (SELECT id FROM public.categories WHERE name = 'Advanced Graphs' LIMIT 1),
      'There is a new alien language that uses the English alphabet. However, the order among the letters is unknown to you.\n\nYou are given a list of strings words from the alien language''s dictionary, where the strings in words are sorted lexicographically by the rules of this new language.\n\nReturn a string of the unique letters in the new alien language sorted in lexicographically increasing order by the new language''s rules. If there is no solution, return "". If there are multiple solutions, return any of them.\n\nA string s is lexicographically smaller than a string t if at the first position where s and t differ, the character in s comes before the character in t in the alien language. If the first min(s.length, t.length) characters are the same, then s is lexicographically smaller if and only if s.length < t.length.',
      'def alienOrder(self, words: List[str]) -> str:',
      '[
        {"input": "words = [\"wrt\",\"wrf\",\"er\",\"ett\",\"rftt\"]", "output": "\"wertf\"", "explanation": "The order is \"wertf\""},
        {"input": "words = [\"z\",\"x\"]", "output": "\"zx\"", "explanation": "The order is \"zx\""},
        {"input": "words = [\"z\",\"x\",\"z\"]", "output": "\"\"", "explanation": "The order is invalid, so return \"\""}
      ]'::jsonb,
      '[
        "1 <= words.length <= 100",
        "1 <= words[i].length <= 20",
        "words[i] consists of only lowercase English letters"
      ]'::jsonb,
      'O(C)',
      'O(1)'
    );
  END IF;

END $$;