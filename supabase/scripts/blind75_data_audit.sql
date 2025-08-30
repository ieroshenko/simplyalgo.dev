-- Comprehensive audit of Blind 75 problems to identify missing data
-- This will show which problems need test cases, solutions, complexity info, etc.

SELECT 
  p.id,
  p.title,
  c.name as category,
  p.difficulty::text as difficulty,
  
  -- Description status
  CASE 
    WHEN p.description IS NOT NULL AND length(p.description) > 50 THEN '✓ Has Description'
    ELSE '✗ Missing Description' 
  END as description_status,
  
  -- Function signature status  
  CASE 
    WHEN p.function_signature IS NOT NULL AND length(p.function_signature) > 10 THEN '✓ Has Function'
    ELSE '✗ Missing Function'
  END as function_status,
  
  -- Examples status
  CASE 
    WHEN p.examples IS NOT NULL AND jsonb_array_length(p.examples) > 0 THEN '✓ Has Examples (' || jsonb_array_length(p.examples) || ')'
    ELSE '✗ Missing Examples'
  END as examples_status,
  
  -- Constraints status
  CASE 
    WHEN p.constraints IS NOT NULL AND jsonb_array_length(p.constraints) > 0 THEN '✓ Has Constraints (' || jsonb_array_length(p.constraints) || ')'
    ELSE '✗ Missing Constraints'
  END as constraints_status,
  
  -- Hints status
  CASE 
    WHEN p.hints IS NOT NULL AND jsonb_array_length(p.hints) > 0 THEN '✓ Has Hints (' || jsonb_array_length(p.hints) || ')'
    ELSE '✗ Missing Hints'
  END as hints_status,
  
  -- Companies status
  CASE 
    WHEN p.companies IS NOT NULL AND jsonb_array_length(p.companies) > 0 THEN '✓ Has Companies (' || jsonb_array_length(p.companies) || ')'
    ELSE '✗ Missing Companies'
  END as companies_status,
  
  -- Time complexity status
  CASE 
    WHEN p.recommended_time_complexity IS NOT NULL AND length(p.recommended_time_complexity) > 0 THEN '✓ Has Time Complexity'
    ELSE '✗ Missing Time Complexity'
  END as time_complexity_status,
  
  -- Space complexity status  
  CASE 
    WHEN p.recommended_space_complexity IS NOT NULL AND length(p.recommended_space_complexity) > 0 THEN '✓ Has Space Complexity'
    ELSE '✗ Missing Space Complexity'
  END as space_complexity_status,
  
  -- Test cases count
  COALESCE(tc.test_case_count, 0) as test_cases_count,
  CASE 
    WHEN tc.test_case_count > 0 THEN '✓ Has Test Cases (' || tc.test_case_count || ')'
    ELSE '✗ Missing Test Cases'
  END as test_cases_status,
  
  -- Solutions count
  COALESCE(ps.solution_count, 0) as solutions_count,
  CASE 
    WHEN ps.solution_count > 0 THEN '✓ Has Solutions (' || ps.solution_count || ')'
    ELSE '✗ Missing Solutions'
  END as solutions_status,
  
  -- Overall completion score (out of 10 criteria)
  (
    CASE WHEN p.description IS NOT NULL AND length(p.description) > 50 THEN 1 ELSE 0 END +
    CASE WHEN p.function_signature IS NOT NULL AND length(p.function_signature) > 10 THEN 1 ELSE 0 END +
    CASE WHEN p.examples IS NOT NULL AND jsonb_array_length(p.examples) > 0 THEN 1 ELSE 0 END +
    CASE WHEN p.constraints IS NOT NULL AND jsonb_array_length(p.constraints) > 0 THEN 1 ELSE 0 END +
    CASE WHEN p.hints IS NOT NULL AND jsonb_array_length(p.hints) > 0 THEN 1 ELSE 0 END +
    CASE WHEN p.companies IS NOT NULL AND jsonb_array_length(p.companies) > 0 THEN 1 ELSE 0 END +
    CASE WHEN p.recommended_time_complexity IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN p.recommended_space_complexity IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN tc.test_case_count > 0 THEN 1 ELSE 0 END +
    CASE WHEN ps.solution_count > 0 THEN 1 ELSE 0 END
  ) || '/10' as completion_score

FROM problems p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN (
  SELECT problem_id, COUNT(*) as test_case_count 
  FROM test_cases 
  GROUP BY problem_id
) tc ON p.id = tc.problem_id
LEFT JOIN (
  SELECT problem_id, COUNT(*) as solution_count 
  FROM problem_solutions 
  GROUP BY problem_id  
) ps ON p.id = ps.problem_id

ORDER BY 
  (
    CASE WHEN p.description IS NOT NULL AND length(p.description) > 50 THEN 1 ELSE 0 END +
    CASE WHEN p.function_signature IS NOT NULL AND length(p.function_signature) > 10 THEN 1 ELSE 0 END +
    CASE WHEN p.examples IS NOT NULL AND jsonb_array_length(p.examples) > 0 THEN 1 ELSE 0 END +
    CASE WHEN p.constraints IS NOT NULL AND jsonb_array_length(p.constraints) > 0 THEN 1 ELSE 0 END +
    CASE WHEN p.hints IS NOT NULL AND jsonb_array_length(p.hints) > 0 THEN 1 ELSE 0 END +
    CASE WHEN p.companies IS NOT NULL AND jsonb_array_length(p.companies) > 0 THEN 1 ELSE 0 END +
    CASE WHEN p.recommended_time_complexity IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN p.recommended_space_complexity IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN tc.test_case_count > 0 THEN 1 ELSE 0 END +
    CASE WHEN ps.solution_count > 0 THEN 1 ELSE 0 END
  ) ASC, -- Show least complete problems first
  c.name,
  p.title;