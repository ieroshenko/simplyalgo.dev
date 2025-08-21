-- Update metadata for existing 'product-of-array-except-self' problem
-- Idempotent: only updates this specific id

UPDATE public.problems
SET 
  description = $$Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in O(n) time and without using the division operation.$$,
  function_signature = 'def productExceptSelf(self, nums: List[int]) -> List[int]:',
  examples = '[
    {"input": "nums = [1,2,3,4]", "output": "[24,12,8,6]", "explanation": "The product of all elements except self: [2*3*4, 1*3*4, 1*2*4, 1*2*3]"},
    {"input": "nums = [-1,1,0,-3,3]", "output": "[0,0,9,0,0]", "explanation": "There is one zero; all positions except the zero index become 0. At the zero index, product of non-zero nums is 9."}
  ]'::jsonb,
  constraints = '[
    "2 <= nums.length <= 10^5",
    "-30 <= nums[i] <= 30",
    "The product of any prefix or suffix fits in a 32-bit integer",
    "O(n) time, O(1) extra space (output array excluded)",
    "No division"
  ]'::jsonb,
  recommended_time_complexity = 'O(n)',
  recommended_space_complexity = 'O(1) extra space (excluding output)'
WHERE id = 'product-of-array-except-self';
