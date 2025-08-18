import { Problem, User, Category, ChatMessage } from "@/types";

export const mockUser: User = {
  id: "1",
  name: "Alex Chen",
  email: "alex@example.com",
  stats: {
    totalSolved: 47,
    streak: 12,
    aiSessions: 23,
  },
};

export const mockCategories: Category[] = [
  { name: "Array", solved: 15, total: 20, color: "bg-primary" },
  { name: "Linked List", solved: 8, total: 12, color: "bg-accent" },
  { name: "Stack", solved: 6, total: 10, color: "bg-success" },
  { name: "Tree", solved: 10, total: 15, color: "bg-secondary" },
  { name: "Graph", solved: 5, total: 12, color: "bg-muted" },
  { name: "Dynamic Programming", solved: 3, total: 8, color: "bg-destructive" },
];

export const mockProblems: Problem[] = [
  {
    id: "1",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Array",
    status: "solved",
    isStarred: true,
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    functionSignature: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    pass`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
    ],
    testCases: [
      {
        input: "[2,7,11,15]\n9",
        expected: "[0,1]",
      },
      {
        input: "[3,2,4]\n6",
        expected: "[1,2]",
      },
      {
        input: "[3,3]\n6",
        expected: "[0,1]",
      },
    ],
  },
  {
    id: "2",
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stack",
    status: "solved",
    isStarred: false,
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    functionSignature: `def isValid(self, s: str) -> bool:
    pass`,
    examples: [
      {
        input: 's = "()"',
        output: "true",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
      },
      {
        input: 's = "(]"',
        output: "false",
      },
    ],
    testCases: [
      {
        input: "()",
        expected: "true",
      },
      {
        input: "()[]{}",
        expected: "true",
      },
      {
        input: "(]",
        expected: "false",
      },
    ],
  },
  {
    id: "3",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    category: "Array",
    status: "attempted",
    isStarred: true,
    description: `You are given an array prices where prices[i] is the price of a given stock on the ith day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.`,
    functionSignature: `def maxProfit(self, prices: List[int]) -> int:
    pass`,
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation:
          "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.",
      },
    ],
    testCases: [
      {
        input: "[7,1,5,3,6,4]",
        expected: "5",
      },
      {
        input: "[7,6,4,3,1]",
        expected: "0",
      },
      {
        input: "[1,2]",
        expected: "1",
      },
    ],
  },
  {
    id: "4",
    title: "Contains Duplicate",
    difficulty: "Easy",
    category: "Array",
    status: "not-started",
    isStarred: false,
    description: `Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.`,
    functionSignature: `def containsDuplicate(self, nums: List[int]) -> bool:
    pass`,
    examples: [
      {
        input: "nums = [1,2,3,1]",
        output: "true",
      },
      {
        input: "nums = [1,2,3,4]",
        output: "false",
      },
    ],
    testCases: [
      {
        input: "[1,2,3,1]",
        expected: "true",
      },
      {
        input: "[1,2,3,4]",
        expected: "false",
      },
      {
        input: "[1,1,1,3,3,4,3,2,4,2]",
        expected: "true",
      },
    ],
  },
  {
    id: "5",
    title: "Reverse Linked List",
    difficulty: "Easy",
    category: "Linked List",
    status: "solved",
    isStarred: false,
    description: `Given the head of a singly linked list, reverse the list, and return the reversed list.`,
    functionSignature: `def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
    pass`,
    examples: [
      {
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
      },
      {
        input: "head = [1,2]",
        output: "[2,1]",
      },
    ],
    testCases: [
      {
        input: "[1,2,3,4,5]",
        expected: "[5,4,3,2,1]",
      },
      {
        input: "[1,2]",
        expected: "[2,1]",
      },
      {
        input: "[]",
        expected: "[]",
      },
    ],
  },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Let's work through the Two Sum problem together! First, what's your initial approach when you see this problem?",
    timestamp: new Date("2024-01-20T10:00:00"),
  },
  {
    id: "2",
    role: "user",
    content:
      "I think I could check every pair of numbers to see if they add up to the target.",
    timestamp: new Date("2024-01-20T10:01:00"),
  },
  {
    id: "3",
    role: "assistant",
    content:
      "That's a good start! What would be the time complexity of checking every pair? And do you think we can do better?",
    timestamp: new Date("2024-01-20T10:01:30"),
  },
  {
    id: "4",
    role: "user",
    content:
      "The time complexity would be O(n²). Maybe I could use a hash map to store the numbers I've seen?",
    timestamp: new Date("2024-01-20T10:02:15"),
  },
  {
    id: "5",
    role: "assistant",
    content:
      "Excellent insight! Using a hash map is the key optimization here. What would you store in the hash map, and what would you look for as you iterate through the array?",
    timestamp: new Date("2024-01-20T10:02:45"),
  },
];
