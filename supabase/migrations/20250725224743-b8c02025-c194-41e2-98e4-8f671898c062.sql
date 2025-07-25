-- Insert categories first
INSERT INTO public.categories (name, description, color, sort_order) VALUES
('Array', 'Array manipulation and traversal problems', 'hsl(var(--primary))', 1),
('Linked List', 'Linked list operations and algorithms', 'hsl(var(--accent))', 2),
('Stack', 'Stack-based problem solving', 'hsl(var(--success))', 3),
('Two Pointers', 'Two pointer technique problems', 'hsl(var(--secondary))', 4),
('Hash Table', 'Hash table and dictionary problems', 'hsl(var(--muted))', 5);

-- Insert Two Sum problem
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature, 
  examples, constraints, hints, likes, dislikes, acceptance_rate
) 
SELECT 
  'two-sum',
  'Two Sum',
  'Easy'::difficulty_enum,
  c.id,
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.',
  'def twoSum(self, nums: List[int], target: int) -> List[int]:
    pass',
  '[
    {
      "input": "nums = [2,7,11,15], target = 9",
      "output": "[0,1]",
      "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
    },
    {
      "input": "nums = [3,2,4], target = 6", 
      "output": "[1,2]"
    },
    {
      "input": "nums = [3,3], target = 6",
      "output": "[0,1]"
    }
  ]'::jsonb,
  '[
    "1 <= nums.length <= 10^4",
    "-10^9 <= nums[i] <= 10^9",
    "-10^9 <= target <= 10^9",
    "Only one valid answer exists."
  ]'::jsonb,
  '[
    "Try using a hash map to store numbers you have seen and their indices.",
    "For each number, check if target - current number exists in the hash map."
  ]'::jsonb,
  12543,
  423,
  89.2
FROM public.categories c WHERE c.name = 'Array';

-- Insert Valid Parentheses problem  
INSERT INTO public.problems (
  id, title, difficulty, category_id, description, function_signature,
  examples, constraints, hints, likes, dislikes, acceptance_rate
)
SELECT
  'valid-parentheses',
  'Valid Parentheses', 
  'Easy'::difficulty_enum,
  c.id,
  'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.',
  'def isValid(self, s: str) -> bool:
    pass',
  '[
    {
      "input": "s = \"()\"",
      "output": "true"
    },
    {
      "input": "s = \"()[]{}\""，
      "output": "true"
    },
    {
      "input": "s = \"(]\"",
      "output": "false"
    }
  ]'::jsonb,
  '[
    "1 <= s.length <= 10^4",
    "s consists of parentheses only ''()[]{}''"
  ]'::jsonb,
  '[
    "Use a stack to keep track of opening brackets.",
    "When you encounter a closing bracket, check if it matches the most recent opening bracket."
  ]'::jsonb,
  8934,
  234,
  91.5
FROM public.categories c WHERE c.name = 'Stack';

-- Insert test cases for Two Sum
INSERT INTO public.test_cases (problem_id, input, expected_output, is_example, explanation) VALUES
('two-sum', '[2,7,11,15]
9', '[0,1]', true, 'Basic test case from example'),
('two-sum', '[3,2,4]
6', '[1,2]', true, 'Different indices'),
('two-sum', '[3,3]
6', '[0,1]', true, 'Duplicate numbers'),
('two-sum', '[2,5,5,11]
10', '[1,2]', false, 'Multiple valid pairs'),
('two-sum', '[1,2,3,4,5]
8', '[2,4]', false, 'Numbers at different positions');

-- Insert test cases for Valid Parentheses
INSERT INTO public.test_cases (problem_id, input, expected_output, is_example, explanation) VALUES
('valid-parentheses', '()', 'true', true, 'Simple valid case'),
('valid-parentheses', '()[]{}", 'true', true, 'Multiple types valid'),
('valid-parentheses', '(]', 'false', true, 'Mismatched brackets'),
('valid-parentheses', '((', 'false', false, 'Unclosed brackets'),
('valid-parentheses', '))((', 'false', false, 'Wrong order'),
('valid-parentheses', '{[]}', 'true', false, 'Nested brackets'),
('valid-parentheses', '', 'true', false, 'Empty string');