/**
 * Test helper types
 * Centralized types for testing utilities and mocks
 */

import type { Mock } from 'vitest';
import type React from 'react';

// Vitest mock function type
export type MockFunction<T extends (...args: never[]) => unknown> = Mock<
  Parameters<T>,
  ReturnType<T>
>;

// Debounce/memoize function types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DebounceFunction = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) => T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MemoizeFunction = <T extends (...args: any[]) => any>(fn: T) => T;

// Supabase mock types
export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface ChainableQuery {
  select: (columns?: string) => ChainableQuery;
  insert: (data: unknown) => ChainableQuery;
  update: (data: unknown) => ChainableQuery;
  delete: () => ChainableQuery;
  eq: (column: string, value: unknown) => ChainableQuery;
  then: <T>(resolve: (value: SupabaseResponse<T>) => unknown) => Promise<SupabaseResponse<T>>;
}

export interface SupabaseMockClient {
  from: (table: string) => ChainableQuery;
  auth: {
    getUser: () => Promise<{ data: { user: unknown | null }; error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
  };
}

// Common React component prop types for test mocks
export interface MockCardProps {
  children: React.ReactNode;
  className?: string;
}

export interface MockButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export interface MockScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

export interface MockContainerProps {
  children: React.ReactNode;
}

export interface MockMarkdownProps {
  children: React.ReactNode;
}

export interface MockTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
}

// Factory function to create a chainable Supabase query mock
export function createChainableSupabaseMock(
  mockData: { data: unknown; error: unknown }
): ChainableQuery {
  const mock = {} as ChainableQuery;
  mock.select = () => mock;
  mock.insert = () => mock;
  mock.update = () => mock;
  mock.delete = () => mock;
  mock.eq = () => mock;
  mock.then = (resolve) => Promise.resolve(mockData).then(resolve);
  return mock;
}
