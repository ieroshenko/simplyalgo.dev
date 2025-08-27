-- Add Test Cases Migration - Batch 1 (Corrected)
-- Based on actual problems that need test cases from the database query
-- Only adds test cases to problems that currently have NONE

-- Backtracking Problems

-- Combination Sum
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('combination-sum', 'candidates = [2,3,6,7], target = 7', '[[2,2,3],[7]]', 
 '{"candidates": [2,3,6,7], "target": 7}'::jsonb, '[[2,2,3],[7]]'::jsonb, true),
('combination-sum', 'candidates = [2,3,5], target = 8', '[[2,2,2,2],[2,3,3],[3,5]]', 
 '{"candidates": [2,3,5], "target": 8}'::jsonb, '[[2,2,2,2],[2,3,3],[3,5]]'::jsonb, false),
('combination-sum', 'candidates = [2], target = 1', '[]', 
 '{"candidates": [2], "target": 1}'::jsonb, '[]'::jsonb, false);

-- Combination Sum II
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('combination-sum-ii', 'candidates = [10,1,2,7,6,1,5], target = 8', '[[1,1,6],[1,2,5],[1,7],[2,6]]', 
 '{"candidates": [10,1,2,7,6,1,5], "target": 8}'::jsonb, '[[1,1,6],[1,2,5],[1,7],[2,6]]'::jsonb, true),
('combination-sum-ii', 'candidates = [2,5,2,1,2], target = 5', '[[1,2,2],[5]]', 
 '{"candidates": [2,5,2,1,2], "target": 5}'::jsonb, '[[1,2,2],[5]]'::jsonb, false),
('combination-sum-ii', 'candidates = [1], target = 1', '[[1]]', 
 '{"candidates": [1], "target": 1}'::jsonb, '[[1]]'::jsonb, false);

-- Graph Problems

-- Clone Graph
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('clone-graph', 'adjList = [[2,4],[1,3],[2,4],[1,3]]', '[[2,4],[1,3],[2,4],[1,3]]', 
 '{"adjList": [[2,4],[1,3],[2,4],[1,3]]}'::jsonb, '[[2,4],[1,3],[2,4],[1,3]]'::jsonb, true),
('clone-graph', 'adjList = [[]]', '[[]]', 
 '{"adjList": [[]]}'::jsonb, '[[]]'::jsonb, false),
('clone-graph', 'adjList = []', '[]', 
 '{"adjList": []}'::jsonb, '[]'::jsonb, false);

-- Course Schedule
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('course-schedule', 'numCourses = 2, prerequisites = [[1,0]]', 'true', 
 '{"numCourses": 2, "prerequisites": [[1,0]]}'::jsonb, 'true'::jsonb, true),
('course-schedule', 'numCourses = 2, prerequisites = [[1,0],[0,1]]', 'false', 
 '{"numCourses": 2, "prerequisites": [[1,0],[0,1]]}'::jsonb, 'false'::jsonb, false),
('course-schedule', 'numCourses = 1, prerequisites = []', 'true', 
 '{"numCourses": 1, "prerequisites": []}'::jsonb, 'true'::jsonb, false);

-- Course Schedule II
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('course-schedule-ii', 'numCourses = 2, prerequisites = [[1,0]]', '[0,1]', 
 '{"numCourses": 2, "prerequisites": [[1,0]]}'::jsonb, '[0,1]'::jsonb, true),
('course-schedule-ii', 'numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]', '[0,2,1,3]', 
 '{"numCourses": 4, "prerequisites": [[1,0],[2,0],[3,1],[3,2]]}'::jsonb, '[0,2,1,3]'::jsonb, false),
('course-schedule-ii', 'numCourses = 1, prerequisites = []', '[0]', 
 '{"numCourses": 1, "prerequisites": []}'::jsonb, '[0]'::jsonb, false);

-- Stack Problems

-- Car Fleet
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('car-fleet', 'target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]', '3', 
 '{"target": 12, "position": [10,8,0,5,3], "speed": [2,4,1,1,3]}'::jsonb, '3'::jsonb, true),
('car-fleet', 'target = 10, position = [3], speed = [3]', '1', 
 '{"target": 10, "position": [3], "speed": [3]}'::jsonb, '1'::jsonb, false),
('car-fleet', 'target = 100, position = [0,2,4], speed = [4,2,1]', '1', 
 '{"target": 100, "position": [0,2,4], "speed": [4,2,1]}'::jsonb, '1'::jsonb, false);

-- Daily Temperatures
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('daily-temperatures', 'temperatures = [73,74,75,71,69,72,76,73]', '[1,1,4,2,1,1,0,0]', 
 '{"temperatures": [73,74,75,71,69,72,76,73]}'::jsonb, '[1,1,4,2,1,1,0,0]'::jsonb, true),
('daily-temperatures', 'temperatures = [30,40,50,60]', '[1,1,1,0]', 
 '{"temperatures": [30,40,50,60]}'::jsonb, '[1,1,1,0]'::jsonb, false),
('daily-temperatures', 'temperatures = [30,60,90]', '[1,1,0]', 
 '{"temperatures": [30,60,90]}'::jsonb, '[1,1,0]'::jsonb, false);

-- Evaluate Reverse Polish Notation
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('evaluate-reverse-polish-notation', 'tokens = ["2","1","+","3","*"]', '9', 
 '{"tokens": ["2","1","+","3","*"]}'::jsonb, '9'::jsonb, true),
('evaluate-reverse-polish-notation', 'tokens = ["4","13","5","/","+"]', '6', 
 '{"tokens": ["4","13","5","/","+"]}'::jsonb, '6'::jsonb, false),
('evaluate-reverse-polish-notation', 'tokens = ["10","6","9","3","+","-11","*","/","*","17","+","5","+"]', '22', 
 '{"tokens": ["10","6","9","3","+","-11","*","/","*","17","+","5","+"]}'::jsonb, '22'::jsonb, false);

-- Dynamic Programming Problems

-- Decode Ways
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('decode-ways', 's = "12"', '2', 
 '{"s": "12"}'::jsonb, '2'::jsonb, true),
('decode-ways', 's = "226"', '3', 
 '{"s": "226"}'::jsonb, '3'::jsonb, false),
('decode-ways', 's = "06"', '0', 
 '{"s": "06"}'::jsonb, '0'::jsonb, false);

-- Tree Problems

-- Balanced Binary Tree
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('balanced-binary-tree', 'root = [3,9,20,null,null,15,7]', 'true', 
 '{"root": [3,9,20,null,null,15,7]}'::jsonb, 'true'::jsonb, true),
('balanced-binary-tree', 'root = [1,2,2,3,3,null,null,4,4]', 'false', 
 '{"root": [1,2,2,3,3,null,null,4,4]}'::jsonb, 'false'::jsonb, false),
('balanced-binary-tree', 'root = []', 'true', 
 '{"root": []}'::jsonb, 'true'::jsonb, false);

-- Binary Tree Level Order Traversal
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('binary-tree-level-order-traversal', 'root = [3,9,20,null,null,15,7]', '[[3],[9,20],[15,7]]', 
 '{"root": [3,9,20,null,null,15,7]}'::jsonb, '[[3],[9,20],[15,7]]'::jsonb, true),
('binary-tree-level-order-traversal', 'root = [1]', '[[1]]', 
 '{"root": [1]}'::jsonb, '[[1]]'::jsonb, false),
('binary-tree-level-order-traversal', 'root = []', '[]', 
 '{"root": []}'::jsonb, '[]'::jsonb, false);

-- Binary Tree Right Side View
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('binary-tree-right-side-view', 'root = [1,2,3,null,5,null,4]', '[1,3,4]', 
 '{"root": [1,2,3,null,5,null,4]}'::jsonb, '[1,3,4]'::jsonb, true),
('binary-tree-right-side-view', 'root = [1,null,3]', '[1,3]', 
 '{"root": [1,null,3]}'::jsonb, '[1,3]'::jsonb, false),
('binary-tree-right-side-view', 'root = []', '[]', 
 '{"root": []}'::jsonb, '[]'::jsonb, false);

-- Diameter of Binary Tree
INSERT INTO public.test_cases (problem_id, input, expected_output, input_json, expected_json, is_example)
VALUES 
('diameter-of-binary-tree', 'root = [1,2,3,4,5]', '3', 
 '{"root": [1,2,3,4,5]}'::jsonb, '3'::jsonb, true),
('diameter-of-binary-tree', 'root = [1,2]', '1', 
 '{"root": [1,2]}'::jsonb, '1'::jsonb, false),
('diameter-of-binary-tree', 'root = [1]', '0', 
 '{"root": [1]}'::jsonb, '0'::jsonb, false);