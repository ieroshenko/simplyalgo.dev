/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

// Mock user for authenticated tests
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
};

// Mock session
export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

// Create chainable query builder mock
export const createQueryBuilderMock = (data: unknown = [], error: Error | null = null) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error })),
  };

  // Make all methods return the builder for chaining
  Object.keys(builder).forEach((key) => {
    if (key !== 'then') {
      (builder as any)[key].mockReturnValue(builder);
    }
  });

  return builder;
};

// Create realtime channel mock
export const createChannelMock = () => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn().mockResolvedValue('ok'),
});

// Create full Supabase client mock
export const createSupabaseMock = (overrides: Record<string, unknown> = {}) => {
  const queryBuilder = createQueryBuilderMock();

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: mockSession, user: mockUser }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { session: mockSession, user: mockUser }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      ...overrides.auth,
    },
    from: vi.fn().mockReturnValue(queryBuilder),
    channel: vi.fn().mockReturnValue(createChannelMock()),
    removeChannel: vi.fn().mockResolvedValue('ok'),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://mock-url.com/file' } }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    ...overrides,
  };
};

// Mock the supabase module
export const mockSupabaseModule = (mock = createSupabaseMock()) => {
  vi.mock('@/integrations/supabase/client', () => ({
    supabase: mock,
  }));
  return mock;
};

// Helper to mock authenticated state
export const mockAuthenticatedUser = (supabaseMock: ReturnType<typeof createSupabaseMock>) => {
  supabaseMock.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
};

// Helper to mock unauthenticated state
export const mockUnauthenticatedUser = (supabaseMock: ReturnType<typeof createSupabaseMock>) => {
  supabaseMock.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
};
