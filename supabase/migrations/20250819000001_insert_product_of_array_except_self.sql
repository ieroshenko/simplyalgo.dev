-- Insert Product of Array Except Self problem with full metadata
-- Safe-guards ensure idempotency

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.problems WHERE id = 'product-of-array-except-self') THEN
    INSERT INTO public.problems (
      id,
      title,
      difficulty,
      category_id,
      description,
      function_signature,
      examples,
      constraints,
      likes,
      dislikes,
      acceptance_rate,
      recommended_time_complexity,
      recommended_space_complexity
    ) VALUES (
      'product-of-array-except-self',
      'Product of Array Except Self',
      'Medium',
      (SELECT id FROM public.categories WHERE name = 'Array' LIMIT 1),
      'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].\n\nThe product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in O(n) time and without using the division operation.',
      'def productExceptSelf(self, nums: List[int]) -> List[int]:',
      -- examples: jsonb array of objects {input, output, explanation}
      '[
        {"input": "nums = [1,2,3,4]", "output": "[24,12,8,6]", "explanation": "The product of all elements except self: [2*3*4, 1*3*4, 1*2*4, 1*2*3]"},
        {"input": "nums = [-1,1,0,-3,3]", "output": "[0,0,9,0,0]", "explanation": "There is one zero; all positions except the zero index become 0. At the zero index, product of non-zero nums is 9."}
      ]'::jsonb,
      -- constraints: jsonb array of strings
      '[
        "2 <= nums.length <= 105",
        "-30 <= nums[i] <= 30",
        "The product of any prefix or suffix fits in a 32-bit integer",
        "O(n) time, O(1) extra space (output array excluded)",
        "No division"
      ]'::jsonb,
      NULL,
      NULL,
      NULL,
      'O(n)',
      'O(1) extra space (excluding output)'
    );
  END IF;
END $$;

-- Ensure test cases exist for this problem (text and JSON forms)
-- Example cases
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT p.id, 'nums = [1,2,3,4]', '[24,12,8,6]', '{"nums": [1,2,3,4]}'::jsonb, '[24,12,8,6]'::jsonb, true
FROM public.problems p
WHERE p.id = 'product-of-array-except-self'
  AND NOT EXISTS (
    SELECT 1 FROM public.test_cases tc WHERE tc.problem_id = p.id AND tc.input = 'nums = [1,2,3,4]'
  );

INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
SELECT p.id, 'nums = [-1,1,0,-3,3]', '[0,0,9,0,0]', '{"nums": [-1,1,0,-3,3]}'::jsonb, '[0,0,9,0,0]'::jsonb, false
FROM public.problems p
WHERE p.id = 'product-of-array-except-self'
  AND NOT EXISTS (
    SELECT 1 FROM public.test_cases tc WHERE tc.problem_id = p.id AND tc.input = 'nums = [-1,1,0,-3,3]'
  );
