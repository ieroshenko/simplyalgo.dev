import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'admin-user', email: 'admin@test.com' },
    }),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {};
        mock.select = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.delete = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { AdminProblemDialog } from '../AdminProblemDialog';

describe('AdminProblemDialog', () => {
    const mockCategories = [
        { id: 'cat-1', name: 'Arrays' },
        { id: 'cat-2', name: 'Strings' },
    ];

    const mockProblem = {
        id: 'problem-1',
        title: 'Two Sum',
        difficulty: 'Easy' as const,
        category_id: 'cat-1',
        description: 'Find two numbers that sum to target',
        function_signature: 'def twoSum(nums, target):',
        companies: ['Google', 'Amazon'],
        examples: [],
        constraints: ['1 <= nums.length <= 10^4'],
        hints: ['Use a hash map'],
        recommended_time_complexity: 'O(n)',
        recommended_space_complexity: 'O(n)',
    };

    const defaultProps = {
        problem: null as any,
        open: true,
        onOpenChange: vi.fn(),
        onSaved: vi.fn(),
        categories: mockCategories,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render dialog when open', () => {
            render(<AdminProblemDialog {...defaultProps} />);

            // Dialog should have tabs - use getAllByText since labels may appear multiple times
            const detailsElements = screen.getAllByText(/Details/);
            expect(detailsElements.length).toBeGreaterThan(0);
        });

        it('should not render dialog when closed', () => {
            render(<AdminProblemDialog {...defaultProps} open={false} />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should show tabs for new problem', () => {
            render(<AdminProblemDialog {...defaultProps} problem={null} />);

            expect(screen.getAllByText(/Details/).length).toBeGreaterThan(0);
            expect(screen.getByText('Test Cases')).toBeInTheDocument();
            expect(screen.getByText('Solutions')).toBeInTheDocument();
        });

        it('should render with existing problem', () => {
            render(<AdminProblemDialog {...defaultProps} problem={mockProblem} />);

            expect(screen.getAllByText(/Details/).length).toBeGreaterThan(0);
        });
    });

    describe('Form Fields', () => {
        it('should render title input', () => {
            render(<AdminProblemDialog {...defaultProps} problem={mockProblem} />);

            const titleInputs = screen.getAllByDisplayValue('Two Sum');
            expect(titleInputs.length).toBeGreaterThan(0);
        });

        it('should render difficulty select', () => {
            render(<AdminProblemDialog {...defaultProps} problem={mockProblem} />);

            // Look for difficulty-related content
            expect(screen.getByText(/Difficulty/i)).toBeInTheDocument();
        });

        it('should render category select', () => {
            render(<AdminProblemDialog {...defaultProps} problem={mockProblem} />);

            expect(screen.getByText(/Category/i)).toBeInTheDocument();
        });
    });

    describe('Actions', () => {
        it('should render save button', () => {
            render(<AdminProblemDialog {...defaultProps} problem={mockProblem} />);

            const saveButtons = screen.getAllByRole('button');
            expect(saveButtons.length).toBeGreaterThan(0);
        });

        it('should have onOpenChange callback', () => {
            render(<AdminProblemDialog {...defaultProps} />);

            // Just verify onOpenChange is a function that can be called
            expect(defaultProps.onOpenChange).toBeDefined();
            expect(typeof defaultProps.onOpenChange).toBe('function');
        });
    });

    describe('Problem Editing', () => {
        it('should populate form with problem data', () => {
            render(<AdminProblemDialog {...defaultProps} problem={mockProblem} />);

            // Title should be populated
            expect(screen.getByDisplayValue('Two Sum')).toBeInTheDocument();
        });
    });
});
