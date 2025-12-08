import { vi } from 'vitest';

// Mock navigation functions
export const mockNavigate = vi.fn();
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};
export const mockParams = {};

// Mock react-router-dom hooks
export const mockReactRouterDom = () => {
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
      ...actual,
      useNavigate: () => mockNavigate,
      useLocation: () => mockLocation,
      useParams: () => mockParams,
      useSearchParams: () => [new URLSearchParams(), vi.fn()],
    };
  });
};

// Helper to set mock route params
export const setMockParams = (params: Record<string, string>) => {
  Object.assign(mockParams, params);
};

// Helper to set mock location
export const setMockLocation = (location: Partial<typeof mockLocation>) => {
  Object.assign(mockLocation, location);
};

// Reset all router mocks
export const resetRouterMocks = () => {
  mockNavigate.mockReset();
  Object.keys(mockParams).forEach((key) => delete (mockParams as any)[key]);
  Object.assign(mockLocation, {
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  });
};
