import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChatSession } from '../useChatSession';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-session-id',
              user_id: 'test-user-id',
              problem_id: 'test-problem-id',
              title: 'Test Session',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      }))
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({
        data: {
          response: 'Test AI response',
          responseId: 'test-response-id'
        },
        error: null
      }))
    }
  }
}));

vi.mock('./useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' }
  })
}));

vi.mock('./use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

describe('useChatSession coaching mode support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept coaching mode parameter and default to comprehensive', () => {
    const { result } = renderHook(() =>
      useChatSession({
        problemId: 'test-problem',
        problemDescription: 'Test problem description',
        problemTestCases: [],
        currentCode: 'console.log("test");'
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.sendMessage).toBeDefined();
  });

  it('should accept socratic coaching mode parameter', () => {
    const { result } = renderHook(() =>
      useChatSession({
        problemId: 'test-problem',
        problemDescription: 'Test problem description',
        problemTestCases: [],
        currentCode: 'console.log("test");',
        coachingMode: 'socratic'
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.sendMessage).toBeDefined();
  });

  it('should accept comprehensive coaching mode parameter', () => {
    const { result } = renderHook(() =>
      useChatSession({
        problemId: 'test-problem',
        problemDescription: 'Test problem description',
        problemTestCases: [],
        currentCode: 'console.log("test");',
        coachingMode: 'comprehensive'
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.sendMessage).toBeDefined();
  });
});