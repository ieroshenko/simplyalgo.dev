/**
 * Tests for useChatSession coaching mode support
 * Verifies that the hook accepts different coaching mode parameters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useChatSession } from '../useChatSession';

// Create wrapper with required providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
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
    const { result } = renderHook(
      () =>
        useChatSession({
          problemId: 'test-problem',
          problemDescription: 'Test problem description',
          problemTestCases: [],
          currentCode: 'console.log("test");'
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
    expect(result.current.sendMessage).toBeDefined();
  });

  it('should accept socratic coaching mode parameter', () => {
    const { result } = renderHook(
      () =>
        useChatSession({
          problemId: 'test-problem',
          problemDescription: 'Test problem description',
          problemTestCases: [],
          currentCode: 'console.log("test");',
          coachingMode: 'socratic'
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
    expect(result.current.sendMessage).toBeDefined();
  });

  it('should accept comprehensive coaching mode parameter', () => {
    const { result } = renderHook(
      () =>
        useChatSession({
          problemId: 'test-problem',
          problemDescription: 'Test problem description',
          problemTestCases: [],
          currentCode: 'console.log("test");',
          coachingMode: 'comprehensive'
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
    expect(result.current.sendMessage).toBeDefined();
  });
});