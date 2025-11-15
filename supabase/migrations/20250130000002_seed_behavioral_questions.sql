-- Seed initial technical behavioral questions
-- Migration: Populate behavioral_questions table with MVP question set

INSERT INTO public.behavioral_questions (question_text, category, difficulty, key_traits, company_associations) VALUES

-- Technical Leadership
('Tell me about a time you led a technical project from conception to deployment. What challenges did you face?', 
 ARRAY['technical_leadership'], 'intermediate',
 ARRAY['leadership', 'project_management', 'technical_decision_making'],
 ARRAY['Google', 'Microsoft', 'Amazon']),

('Describe a situation where you had to mentor a junior engineer on a complex technical concept. How did you approach it?',
 ARRAY['technical_leadership'], 'beginner',
 ARRAY['mentoring', 'communication', 'patience'],
 ARRAY['Meta', 'Google', 'Netflix']),

('How do you handle technical disagreements when leading a team? Give a specific example.',
 ARRAY['technical_leadership'], 'advanced',
 ARRAY['conflict_resolution', 'technical_judgment', 'team_dynamics'],
 ARRAY['Google', 'Amazon', 'Microsoft']),

-- Code Review & Collaboration
('Tell me about a time you disagreed with a code review comment. How did you handle it?',
 ARRAY['code_review_collaboration'], 'intermediate',
 ARRAY['communication', 'technical_judgment', 'collaboration'],
 ARRAY['Meta', 'Google', 'Amazon']),

('Describe a situation where you had to convince your team to adopt a different technical approach.',
 ARRAY['code_review_collaboration'], 'advanced',
 ARRAY['influence', 'technical_communication', 'persuasion'],
 ARRAY['Google', 'Microsoft', 'Apple']),

('Tell me about working with a difficult code reviewer or team member. How did you manage the relationship?',
 ARRAY['code_review_collaboration'], 'intermediate',
 ARRAY['conflict_resolution', 'professionalism', 'collaboration'],
 ARRAY['Meta', 'Amazon', 'Netflix']),

-- Debugging & Problem Solving
('What''s the most challenging bug you''ve ever debugged? Walk me through your process.',
 ARRAY['debugging_problem_solving'], 'intermediate',
 ARRAY['problem_solving', 'persistence', 'systematic_thinking'],
 ARRAY['Google', 'Meta', 'Amazon', 'Microsoft']),

('Tell me about a time you had to debug a production issue under pressure. How did you handle it?',
 ARRAY['debugging_problem_solving'], 'advanced',
 ARRAY['stress_management', 'problem_solving', 'communication'],
 ARRAY['Meta', 'Google', 'Netflix']),

('Describe a situation where you had to solve a problem with limited information or resources.',
 ARRAY['debugging_problem_solving'], 'intermediate',
 ARRAY['resourcefulness', 'problem_solving', 'creativity'],
 ARRAY['Amazon', 'Microsoft', 'Apple']),

-- System Design & Architecture
('Tell me about a time you had to refactor a large codebase or system. What was your approach?',
 ARRAY['system_design_architecture'], 'advanced',
 ARRAY['system_design', 'technical_debt', 'planning'],
 ARRAY['Google', 'Meta', 'Amazon']),

('Describe a situation where you improved a system''s architecture or design.',
 ARRAY['system_design_architecture'], 'intermediate',
 ARRAY['system_design', 'technical_judgment', 'improvement'],
 ARRAY['Google', 'Microsoft', 'Netflix']),

('Tell me about a time you had to make a trade-off between different architectural approaches.',
 ARRAY['system_design_architecture'], 'advanced',
 ARRAY['decision_making', 'system_design', 'trade_offs'],
 ARRAY['Amazon', 'Google', 'Meta']),

-- Technical Failure & Recovery
('Tell me about a time you introduced a bug to production. What did you learn?',
 ARRAY['technical_failure_recovery'], 'beginner',
 ARRAY['accountability', 'learning', 'process_improvement'],
 ARRAY['Meta', 'Google', 'Amazon', 'Microsoft']),

('Describe a technical mistake you made and how you recovered from it.',
 ARRAY['technical_failure_recovery'], 'intermediate',
 ARRAY['accountability', 'problem_solving', 'resilience'],
 ARRAY['Google', 'Amazon', 'Netflix']),

('Tell me about a time a system you built failed. How did you handle it?',
 ARRAY['technical_failure_recovery'], 'advanced',
 ARRAY['crisis_management', 'problem_solving', 'communication'],
 ARRAY['Meta', 'Google', 'Amazon']),

-- Technical Debt & Prioritization
('How do you balance shipping features quickly vs. writing maintainable, scalable code?',
 ARRAY['technical_debt_prioritization'], 'intermediate',
 ARRAY['prioritization', 'technical_judgment', 'business_acumen'],
 ARRAY['Meta', 'Google', 'Amazon', 'Microsoft']),

('Tell me about a time you had to prioritize technical debt vs. new features.',
 ARRAY['technical_debt_prioritization'], 'advanced',
 ARRAY['prioritization', 'strategic_thinking', 'communication'],
 ARRAY['Google', 'Microsoft', 'Amazon']),

('Describe a situation where you had to make a quick technical decision that you knew wasn''t ideal long-term.',
 ARRAY['technical_debt_prioritization'], 'intermediate',
 ARRAY['decision_making', 'trade_offs', 'pragmatism'],
 ARRAY['Meta', 'Amazon', 'Netflix']),

-- Technical Communication
('Tell me about explaining a complex technical concept to a non-technical stakeholder.',
 ARRAY['technical_communication'], 'intermediate',
 ARRAY['communication', 'simplification', 'empathy'],
 ARRAY['Google', 'Microsoft', 'Amazon', 'Meta']),

('Describe a time you had to document or present a technical design to your team.',
 ARRAY['technical_communication'], 'beginner',
 ARRAY['documentation', 'presentation', 'clarity'],
 ARRAY['Google', 'Meta', 'Microsoft']),

('Tell me about a time you had to communicate a technical problem to management.',
 ARRAY['technical_communication'], 'advanced',
 ARRAY['communication', 'business_acumen', 'translation'],
 ARRAY['Amazon', 'Google', 'Microsoft']),

-- Technical Initiative
('Tell me about a time you identified and fixed a performance bottleneck.',
 ARRAY['technical_initiative'], 'intermediate',
 ARRAY['proactivity', 'performance_optimization', 'problem_solving'],
 ARRAY['Google', 'Meta', 'Amazon']),

('Describe a situation where you proactively improved a system''s efficiency or reliability.',
 ARRAY['technical_initiative'], 'intermediate',
 ARRAY['proactivity', 'ownership', 'improvement'],
 ARRAY['Microsoft', 'Google', 'Netflix']),

('Tell me about a time you went beyond your assigned tasks to improve code quality.',
 ARRAY['technical_initiative'], 'beginner',
 ARRAY['ownership', 'initiative', 'quality'],
 ARRAY['Meta', 'Google', 'Amazon']),

-- Learning New Technologies
('Tell me about a time you had to quickly learn a new technology or framework for a project.',
 ARRAY['learning_new_technologies'], 'beginner',
 ARRAY['learning_ability', 'adaptability', 'self_direction'],
 ARRAY['Google', 'Meta', 'Amazon', 'Microsoft']),

('Describe how you stay current with new technologies and best practices.',
 ARRAY['learning_new_technologies'], 'intermediate',
 ARRAY['continuous_learning', 'curiosity', 'professional_development'],
 ARRAY['Google', 'Meta', 'Microsoft']),

('Tell me about a challenging technical concept you had to learn on the job.',
 ARRAY['learning_new_technologies'], 'intermediate',
 ARRAY['learning_ability', 'persistence', 'problem_solving'],
 ARRAY['Amazon', 'Google', 'Netflix']),

-- Code Quality & Best Practices
('Tell me about a time you had to convince your team to adopt a new tool, framework, or practice.',
 ARRAY['code_quality_best_practices'], 'advanced',
 ARRAY['influence', 'technical_judgment', 'change_management'],
 ARRAY['Google', 'Microsoft', 'Meta']),

('Describe a situation where you improved code quality or established new coding standards.',
 ARRAY['code_quality_best_practices'], 'intermediate',
 ARRAY['quality', 'leadership', 'process_improvement'],
 ARRAY['Google', 'Amazon', 'Microsoft']),

('Tell me about a time you had to enforce code quality standards on a project.',
 ARRAY['code_quality_best_practices'], 'intermediate',
 ARRAY['leadership', 'quality', 'assertiveness'],
 ARRAY['Meta', 'Google', 'Amazon']),

-- Scaling & Performance
('Tell me about a time you optimized a system that was too slow or couldn''t handle load.',
 ARRAY['scaling_performance'], 'advanced',
 ARRAY['performance_optimization', 'system_design', 'problem_solving'],
 ARRAY['Google', 'Meta', 'Amazon', 'Netflix']),

('Describe a situation where you had to scale a system to handle increased traffic.',
 ARRAY['scaling_performance'], 'advanced',
 ARRAY['scaling', 'system_design', 'planning'],
 ARRAY['Meta', 'Google', 'Amazon']),

('Tell me about a performance issue you identified and resolved.',
 ARRAY['scaling_performance'], 'intermediate',
 ARRAY['performance_optimization', 'problem_solving', 'proactivity'],
 ARRAY['Google', 'Microsoft', 'Netflix'])

ON CONFLICT DO NOTHING;

