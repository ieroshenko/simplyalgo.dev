import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockIlike = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockReturnThis();

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: mockSelect,
            eq: mockEq,
            ilike: mockIlike,
            order: mockOrder,
            single: mockSingle,
        })),
    },
}));

import { problemQueries } from '../problemQueries';
import { supabase } from '@/integrations/supabase/client';

describe('problemQueries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAll', () => {
        it('should query problems table', () => {
            problemQueries.getAll();
            expect(supabase.from).toHaveBeenCalledWith('problems');
        });

        it('should select all fields', () => {
            problemQueries.getAll();
            expect(mockSelect).toHaveBeenCalledWith('*');
        });

        it('should order by created_at descending', () => {
            problemQueries.getAll();
            expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
        });
    });

    describe('getById', () => {
        it('should query problems table', () => {
            problemQueries.getById('two-sum');
            expect(supabase.from).toHaveBeenCalledWith('problems');
        });

        it('should filter by id', () => {
            problemQueries.getById('two-sum');
            expect(mockEq).toHaveBeenCalledWith('id', 'two-sum');
        });

        it('should return single result', () => {
            problemQueries.getById('two-sum');
            expect(mockSingle).toHaveBeenCalled();
        });
    });

    describe('getByDifficulty', () => {
        it('should query problems table', () => {
            problemQueries.getByDifficulty('Easy');
            expect(supabase.from).toHaveBeenCalledWith('problems');
        });

        it('should filter by difficulty', () => {
            problemQueries.getByDifficulty('Easy');
            expect(mockEq).toHaveBeenCalledWith('difficulty', 'Easy');
        });

        it('should filter by Medium difficulty', () => {
            problemQueries.getByDifficulty('Medium');
            expect(mockEq).toHaveBeenCalledWith('difficulty', 'Medium');
        });

        it('should filter by Hard difficulty', () => {
            problemQueries.getByDifficulty('Hard');
            expect(mockEq).toHaveBeenCalledWith('difficulty', 'Hard');
        });

        it('should order by created_at descending', () => {
            problemQueries.getByDifficulty('Easy');
            expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
        });
    });

    describe('getByCategory', () => {
        it('should query problems table', () => {
            problemQueries.getByCategory('Arrays');
            expect(supabase.from).toHaveBeenCalledWith('problems');
        });

        it('should filter by category', () => {
            problemQueries.getByCategory('Arrays');
            expect(mockEq).toHaveBeenCalledWith('category', 'Arrays');
        });

        it('should order by created_at descending', () => {
            problemQueries.getByCategory('Arrays');
            expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
        });
    });

    describe('searchByTitle', () => {
        it('should query problems table', () => {
            problemQueries.searchByTitle('two');
            expect(supabase.from).toHaveBeenCalledWith('problems');
        });

        it('should use ilike for case-insensitive search', () => {
            problemQueries.searchByTitle('two');
            expect(mockIlike).toHaveBeenCalledWith('title', '%two%');
        });

        it('should search with partial match', () => {
            problemQueries.searchByTitle('sum');
            expect(mockIlike).toHaveBeenCalledWith('title', '%sum%');
        });

        it('should order by created_at descending', () => {
            problemQueries.searchByTitle('two');
            expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
        });
    });
});
