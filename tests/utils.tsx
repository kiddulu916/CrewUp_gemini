import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Custom render function that wraps components with necessary providers
 *
 * @example
 * ```tsx
 * import { renderWithProviders } from '@/tests/utils';
 *
 * test('renders component', () => {
 *   renderWithProviders(<MyComponent />);
 *   // ...assertions
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient };
}

/**
 * Mock Supabase client for testing
 *
 * @example
 * ```tsx
 * import { mockSupabaseClient } from '@/tests/utils';
 *
 * const mockSupabase = mockSupabaseClient({
 *   from: vi.fn(() => ({
 *     select: vi.fn().mockResolvedValue({ data: [], error: null }),
 *   })),
 * });
 * ```
 */
export function mockSupabaseClient(overrides = {}) {
  return {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      ...overrides,
    }),
    auth: {
      getUser: () => ({ data: { user: null }, error: null }),
      signIn: () => ({ data: null, error: null }),
      signOut: () => ({ error: null }),
      ...overrides,
    },
    ...overrides,
  };
}

/**
 * Wait for async operations to complete
 *
 * @example
 * ```tsx
 * await waitFor(() => {
 *   expect(screen.getByText('Loaded')).toBeInTheDocument();
 * });
 * ```
 */
export { waitFor } from '@testing-library/react';

/**
 * Re-export commonly used testing utilities
 */
export { screen, within } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
