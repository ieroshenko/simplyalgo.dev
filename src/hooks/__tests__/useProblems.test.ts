import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock data
const mockCategories = [
    { id: 'cat-1', name: 'Arrays', color: '#3B82F6', sort_order: 1 },
    { id: 'cat-2', name: 'Strings', color: '#10B981', sort_order: 2 },
    { id: 'cat-3', name: 'Trees', color: '#F59E0B', sort_order: 3 },
];

const mockProblems = [
    {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        description: 'Find two numbers that add up to target',
        function_signature: 'function twoSum(nums: number[], target: number): number[]',
        categories: { name: 'Arrays', color: '#3B82F6' },
        test_cases: [{ input: '[2,7,11,15], 9', expected_output: '[0,1]' }],
        examples: [{ input: '[2,7,11,15], 9', output: '[0,1]' }],
        constraints: ['2 <= nums.length <= 10^4'],
        likes: 100,
        dislikes: 5,
        acceptance_rate: 75.5,
        recommended_time_complexity: 'O(n)',
        recommended_space_complexity: 'O(n)',
        companies: ['Google', 'Amazon'],
    },
    {
        id: 'valid-parentheses',
        title: 'Valid Parentheses',
        difficulty: 'Easy',
        description: 'Check if parentheses are valid',
        function_signature: 'function isValid(s: string): boolean',
        categories: { name: 'Strings', color: '#10B981' },
        test_cases: [{ input: '"()"', expected_output: 'true' }],
        examples: [{ input: '"()"', output: 'true' }],
        constraints: ['1 <= s.length <= 10^4'],
        likes: 80,
        dislikes: 3,
        acceptance_rate: 68.2,
        recommended_time_complexity: 'O(n)',
        recommended_space_complexity: 'O(n)',
        companies: ['Facebook', 'Microsoft'],
    },
    {
        id: 'binary-tree-inorder',
        title: 'Binary Tree Inorder Traversal',
        difficulty: 'Medium',
        description: 'Return inorder traversal of binary tree',
        function_signature: 'function inorderTraversal(root: TreeNode | null): number[]',
        categories: { name: 'Trees', color: '#F59E0B' },
        test_cases: [{ input: '[1,null,2,3]', expected_output: '[1,3,2]' }],
        examples: [{ input: '[1,null,2,3]', output: '[1,3,2]' }],
        constraints: ['0 <= nodes <= 100'],
        likes: 50,
        dislikes: 2,
        acceptance_rate: 60.0,
        recommended_time_complexity: 'O(n)',
        recommended_space_complexity: 'O(n)',
        companies: ['Apple'],
    },
];

const mockUserAttempts = [
    { problem_id: 'two-sum', status: 'passed' },
    { problem_id: 'valid-parentheses', status: 'failed' },
];

const mockUserStars = [
    { problem_id: 'two-sum' },
];

const mockProblemsForCategories = [
    { id: 'two-sum', categories: { name: 'Arrays' } },
    { id: 'valid-parentheses', categories: { name: 'Strings' } },
    { id: 'binary-tree-inorder', categories: { name: 'Trees' } },
];

// Create chainable query builder
const createQueryBuilder = (data: unknown = [], error: Error | null = null) => {
    const builder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data, error })),
    };
    return builder;
};

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

import { useProblems } from '../useProblems';
import { supabase } from '@/integrations/supabase/client';

const mockSupabase = supabase as unknown as {
    from: ReturnType<typeof vi.fn>;
};

describe('useProblems', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Suppress console.log from hook
        vi.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Helper to set up mock responses
    const setupMocks = (options: {
        problems?: unknown[];
        categories?: unknown[];
        problemsForCategories?: unknown[];
        userAttempts?: unknown[];
        userStars?: unknown[];
        passedAttempts?: unknown[];
        problemsError?: Error | null;
        categoriesError?: Error | null;
    } = {}) => {
        const {
            problems = mockProblems,
            categories = mockCategories,
            problemsForCategories = mockProblemsForCategories,
            userAttempts = [],
            userStars = [],
            passedAttempts = [],
            problemsError = null,
            categoriesError = null,
        } = options;

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'problems') {
                const builder = createQueryBuilder(problems, problemsError);
                // For category fetch (different select)
                builder.select.mockImplementation((selectStr: string) => {
                    if (selectStr.includes('categories(name)')) {
                        return createQueryBuilder(problemsForCategories);
                    }
                    return builder;
                });
                return builder;
            }
            if (table === 'categories') {
                const builder = createQueryBuilder(categories, categoriesError);
                return builder;
            }
            if (table === 'user_problem_attempts') {
                const builder = createQueryBuilder(userAttempts);
                builder.eq.mockImplementation((_col: string, val: string) => {
                    if (val === 'passed') {
                        return createQueryBuilder(passedAttempts);
                    }
                    return builder;
                });
                return builder;
            }
            if (table === 'user_starred_problems') {
                return createQueryBuilder(userStars);
            }
            return createQueryBuilder();
        });
    };

    describe('Initial State', () => {
        it('should start with loading true', () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            expect(result.current.loading).toBe(true);
        });

        it('should start with empty problems array', () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            expect(result.current.problems).toEqual([]);
        });

        it('should start with empty categories array', () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            expect(result.current.categories).toEqual([]);
        });

        it('should start with null error', () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            expect(result.current.error).toBeNull();
        });
    });

    describe('Fetching Problems', () => {
        it('should fetch problems on mount', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('problems');
        });

        it('should set loading to false after fetch', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it('should format problems correctly', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.problems.length).toBeGreaterThan(0);
            });

            const twoSum = result.current.problems.find(p => p.id === 'two-sum');
            expect(twoSum).toBeDefined();
            expect(twoSum?.title).toBe('Two Sum');
            expect(twoSum?.difficulty).toBe('Easy');
            expect(twoSum?.category).toBe('Arrays');
            expect(twoSum?.functionSignature).toBe('function twoSum(nums: number[], target: number): number[]');
        });

        it('should map test cases correctly', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.problems.length).toBeGreaterThan(0);
            });

            const twoSum = result.current.problems.find(p => p.id === 'two-sum');
            expect(twoSum?.testCases).toHaveLength(1);
            expect(twoSum?.testCases[0]).toEqual({
                input: '[2,7,11,15], 9',
                expected: '[0,1]',
            });
        });

        it('should include company information', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.problems.length).toBeGreaterThan(0);
            });

            const twoSum = result.current.problems.find(p => p.id === 'two-sum');
            expect(twoSum?.companies).toEqual(['Google', 'Amazon']);
        });

        it('should include complexity recommendations', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.problems.length).toBeGreaterThan(0);
            });

            const twoSum = result.current.problems.find(p => p.id === 'two-sum');
            expect(twoSum?.recommendedTimeComplexity).toBe('O(n)');
            expect(twoSum?.recommendedSpaceComplexity).toBe('O(n)');
        });
    });

    describe('Fetching Categories', () => {
        it('should fetch categories on mount', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('categories');
        });

        it('should format categories correctly', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.categories.length).toBeGreaterThan(0);
            });

            const arraysCategory = result.current.categories.find(c => c.name === 'Arrays');
            expect(arraysCategory).toBeDefined();
            expect(arraysCategory?.color).toBe('#3B82F6');
            expect(arraysCategory?.total).toBe(1); // One problem in Arrays
        });

        it('should calculate totals per category', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.categories.length).toBe(3);
            });

            // Each category has 1 problem in our mock data
            result.current.categories.forEach(cat => {
                expect(cat.total).toBe(1);
            });
        });
    });

    describe('User-Specific Data', () => {
        it('should fetch user attempts when userId provided', async () => {
            setupMocks({ userAttempts: mockUserAttempts, userStars: mockUserStars });
            const { result } = renderHook(() => useProblems('test-user-id'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('user_problem_attempts');
        });

        it('should fetch user stars when userId provided', async () => {
            setupMocks({ userAttempts: mockUserAttempts, userStars: mockUserStars });
            const { result } = renderHook(() => useProblems('test-user-id'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('user_starred_problems');
        });

        it('should mark solved problems correctly', async () => {
            setupMocks({ userAttempts: mockUserAttempts, userStars: mockUserStars });
            const { result } = renderHook(() => useProblems('test-user-id'));

            await waitFor(() => {
                expect(result.current.problems.length).toBeGreaterThan(0);
            });

            const twoSum = result.current.problems.find(p => p.id === 'two-sum');
            expect(twoSum?.status).toBe('solved');
        });

        it('should mark attempted problems correctly', async () => {
            setupMocks({ userAttempts: mockUserAttempts, userStars: mockUserStars });
            const { result } = renderHook(() => useProblems('test-user-id'));

            await waitFor(() => {
                expect(result.current.problems.length).toBeGreaterThan(0);
            });

            const validParens = result.current.problems.find(p => p.id === 'valid-parentheses');
            expect(validParens?.status).toBe('attempted');
        });

        it('should mark not-started problems correctly', async () => {
            setupMocks({ userAttempts: mockUserAttempts, userStars: mockUserStars });
            const { result } = renderHook(() => useProblems('test-user-id'));

            await waitFor(() => {
                expect(result.current.problems.length).toBeGreaterThan(0);
            });

            const trees = result.current.problems.find(p => p.id === 'binary-tree-inorder');
            expect(trees?.status).toBe('not-started');
        });

        it('should mark starred problems correctly', async () => {
            setupMocks({ userAttempts: mockUserAttempts, userStars: mockUserStars });
            const { result } = renderHook(() => useProblems('test-user-id'));

            await waitFor(() => {
                expect(result.current.problems.length).toBeGreaterThan(0);
            });

            const twoSum = result.current.problems.find(p => p.id === 'two-sum');
            expect(twoSum?.isStarred).toBe(true);

            const validParens = result.current.problems.find(p => p.id === 'valid-parentheses');
            expect(validParens?.isStarred).toBe(false);
        });

        it('should calculate solved per category', async () => {
            setupMocks({
                userAttempts: mockUserAttempts,
                userStars: mockUserStars,
                passedAttempts: [{ problem_id: 'two-sum', status: 'passed' }],
            });
            const { result } = renderHook(() => useProblems('test-user-id'));

            await waitFor(() => {
                expect(result.current.categories.length).toBeGreaterThan(0);
            });

            const arraysCategory = result.current.categories.find(c => c.name === 'Arrays');
            expect(arraysCategory?.solved).toBe(1);
        });

        it('should not fetch user data when no userId', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should have problems but all with not-started status and not starred
            result.current.problems.forEach(problem => {
                expect(problem.status).toBe('not-started');
                expect(problem.isStarred).toBe(false);
            });
        });
    });

    describe('Toggle Star', () => {
        it('should provide toggleStar function', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems('test-user-id'));

            expect(typeof result.current.toggleStar).toBe('function');
        });

        it('should do nothing if no userId', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.toggleStar('two-sum');
            });

            // No insert/delete should be called
            expect(mockSupabase.from).not.toHaveBeenCalledWith('user_starred_problems');
        });

        it('should do nothing if problem not found', async () => {
            setupMocks({ userAttempts: mockUserAttempts, userStars: mockUserStars });
            const { result } = renderHook(() => useProblems('test-user-id'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.toggleStar('non-existent-problem');
            });

            // Should not throw
        });
    });

    describe('Refetch', () => {
        it('should provide refetch function', () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            expect(typeof result.current.refetch).toBe('function');
        });

        it('should refetch problems and categories when called', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const initialCallCount = mockSupabase.from.mock.calls.length;

            act(() => {
                result.current.refetch();
            });

            // Should have more calls after refetch
            await waitFor(() => {
                expect(mockSupabase.from.mock.calls.length).toBeGreaterThan(initialCallCount);
            });
        });
    });

    describe('Error Handling', () => {
        it('should set error when problems fetch fails', async () => {
            setupMocks({ problemsError: new Error('Database connection failed') });
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.error).toBe('Database connection failed');
            });
        });

        it('should set error when categories fetch fails', async () => {
            setupMocks({ categoriesError: new Error('Categories unavailable') });
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.error).toBe('Categories unavailable');
            });
        });

        it('should handle non-Error exceptions', async () => {
            // Mock to throw a string
            mockSupabase.from.mockImplementation(() => {
                throw 'String error';
            });

            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.error).toBe('String error');
            });
        });
    });

    describe('Return Value Structure', () => {
        it('should return all expected properties', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            expect(result.current).toHaveProperty('problems');
            expect(result.current).toHaveProperty('categories');
            expect(result.current).toHaveProperty('loading');
            expect(result.current).toHaveProperty('error');
            expect(result.current).toHaveProperty('toggleStar');
            expect(result.current).toHaveProperty('refetch');
        });

        it('should have correct types for all properties', async () => {
            setupMocks();
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(Array.isArray(result.current.problems)).toBe(true);
            expect(Array.isArray(result.current.categories)).toBe(true);
            expect(typeof result.current.loading).toBe('boolean');
            expect(typeof result.current.toggleStar).toBe('function');
            expect(typeof result.current.refetch).toBe('function');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty problems response', async () => {
            setupMocks({ problems: [], problemsForCategories: [] });
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.problems).toEqual([]);
        });

        it('should handle null test_cases', async () => {
            const problemWithNullTestCases = {
                ...mockProblems[0],
                test_cases: null,
            };
            setupMocks({ problems: [problemWithNullTestCases] });
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.problems.length).toBe(1);
            });

            expect(result.current.problems[0].testCases).toEqual([]);
        });

        it('should handle null examples', async () => {
            const problemWithNullExamples = {
                ...mockProblems[0],
                examples: null,
            };
            setupMocks({ problems: [problemWithNullExamples] });
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.problems.length).toBe(1);
            });

            expect(result.current.problems[0].examples).toEqual([]);
        });

        it('should handle null constraints', async () => {
            const problemWithNullConstraints = {
                ...mockProblems[0],
                constraints: null,
            };
            setupMocks({ problems: [problemWithNullConstraints] });
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.problems.length).toBe(1);
            });

            expect(result.current.problems[0].constraints).toEqual([]);
        });

        it('should handle null companies', async () => {
            const problemWithNullCompanies = {
                ...mockProblems[0],
                companies: null,
            };
            setupMocks({ problems: [problemWithNullCompanies] });
            const { result } = renderHook(() => useProblems());

            await waitFor(() => {
                expect(result.current.problems.length).toBe(1);
            });

            expect(result.current.problems[0].companies).toEqual([]);
        });
    });
});
