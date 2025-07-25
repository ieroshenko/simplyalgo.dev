import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  status: 'solved' | 'attempted' | 'not-started';
  isStarred: boolean;
  description: string;
  functionSignature: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  testCases: Array<{
    input: string;
    expected: string;
  }>;
  likes?: number;
  dislikes?: number;
  acceptanceRate?: number;
}

export interface Category {
  name: string;
  solved: number;
  total: number;
  color: string;
}

export const useProblems = (userId?: string) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProblems();
    fetchCategories();
  }, [userId]);

  const fetchProblems = async () => {
    try {
      // Fetch problems with category names and user attempt data
      const { data: problemsData, error: problemsError } = await supabase
        .from('problems')
        .select(`
          *,
          categories!inner(name, color),
          test_cases(input, expected_output),
          user_problem_attempts(status),
          user_starred_problems(id)
        `);

      if (problemsError) throw problemsError;

      const formattedProblems: Problem[] = problemsData.map((problem: any) => ({
        id: problem.id,
        title: problem.title,
        difficulty: problem.difficulty,
        category: problem.categories.name,
        status: getStatus(problem.user_problem_attempts),
        isStarred: problem.user_starred_problems.length > 0,
        description: problem.description,
        functionSignature: problem.function_signature,
        examples: problem.examples || [],
        testCases: problem.test_cases.map((tc: any) => ({
          input: tc.input,
          expected: tc.expected_output
        })),
        likes: problem.likes,
        dislikes: problem.dislikes,
        acceptanceRate: problem.acceptance_rate
      }));

      setProblems(formattedProblems);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (categoriesError) throw categoriesError;

      // Calculate solved/total for each category
      const formattedCategories: Category[] = categoriesData.map((category: any) => ({
        name: category.name,
        solved: 0, // TODO: Calculate from user attempts
        total: 0,  // TODO: Calculate from problems count
        color: category.color
      }));

      setCategories(formattedCategories);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (attempts: any[]): 'solved' | 'attempted' | 'not-started' => {
    if (!attempts || attempts.length === 0) return 'not-started';
    
    const hasPassed = attempts.some(attempt => attempt.status === 'passed');
    if (hasPassed) return 'solved';
    
    return 'attempted';
  };

  return {
    problems,
    categories,
    loading,
    error,
    refetch: () => {
      fetchProblems();
      fetchCategories();
    }
  };
};