import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface WrapperProps {
  children: React.ReactNode;
}

// All providers wrapper for tests
function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom render that wraps with all providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Override render with our custom render
export { customRender as render };

// Utility to create a wrapper with custom query client
export function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: WrapperProps) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Wait for async operations in tests
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock for ResizeObserver (not available in jsdom)
export const mockResizeObserver = () => {
  const ResizeObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  return ResizeObserverMock;
};

// Mock for IntersectionObserver (not available in jsdom)
export const mockIntersectionObserver = () => {
  const IntersectionObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  return IntersectionObserverMock;
};

// Import vi for mocking
import { vi } from 'vitest';
