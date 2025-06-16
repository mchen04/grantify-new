import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContextProvider } from '@/contexts/AuthContext'
import { SearchContextProvider } from '@/contexts/SearchContext'
import { InteractionContextProvider } from '@/contexts/InteractionContext'

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
}

// Mock grant data
export const mockGrant = {
  id: 'test-grant-id',
  title: 'Test Research Grant',
  agency: 'Test Agency',
  closeDate: '2024-12-31',
  fundingAmount: 500000,
  description: 'This is a test grant for research purposes with detailed description for testing.',
  categories: ['Research', 'Health'],
  sourceUrl: 'https://example.com/grant',
  opportunityId: 'TEST-OPP-001',
  eligibleApplicantTypes: ['Academic Institutions', 'Research Organizations'],
  costSharing: false,
  clinicalTrialAllowed: true,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
}

export const mockGrants = [
  mockGrant,
  {
    ...mockGrant,
    id: 'test-grant-id-2',
    title: 'Environmental Research Grant',
    agency: 'EPA',
    fundingAmount: 750000,
    categories: ['Environment', 'Research'],
  },
]

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Auth context options
  authenticated?: boolean
  user?: typeof mockUser | null
  
  // Search context options
  initialSearchTerm?: string
  initialFilters?: any
  
  // Router options
  initialRoute?: string
}

const AllTheProviders = ({ 
  children, 
  authenticated = false, 
  user = null,
  initialSearchTerm = '',
  initialFilters = {},
}: {
  children: React.ReactNode
  authenticated?: boolean
  user?: typeof mockUser | null
  initialSearchTerm?: string
  initialFilters?: any
}) => {
  return (
    <AuthContextProvider value={{
      user: authenticated ? (user || mockUser) : null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      error: null,
    }}>
      <SearchContextProvider>
        <InteractionContextProvider>
          {children}
        </InteractionContextProvider>
      </SearchContextProvider>
    </AuthContextProvider>
  )
}

export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    authenticated = false,
    user = null,
    initialSearchTerm = '',
    initialFilters = {},
    ...renderOptions
  } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders
      authenticated={authenticated}
      user={user}
      initialSearchTerm={initialSearchTerm}
      initialFilters={initialFilters}
    >
      {children}
    </AllTheProviders>
  )

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Test helpers
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const mockFetch = (data: any, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    })
  ) as jest.Mock
}

export const mockLocalStorage = () => {
  const storage: { [key: string]: string } = {}
  
  return {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key]
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    }),
  }
}

// Mock intersection observer
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })
  window.IntersectionObserver = mockIntersectionObserver
  return mockIntersectionObserver
}

// Custom matchers
expect.extend({
  toBeAccessible(received) {
    // Basic accessibility checks
    const hasAriaLabel = received.getAttribute('aria-label')
    const hasRole = received.getAttribute('role')
    const hasTabIndex = received.getAttribute('tabindex')
    
    const pass = hasAriaLabel || hasRole || hasTabIndex !== null
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be accessible, but it has accessibility attributes`
          : `Expected element to be accessible with aria-label, role, or tabindex`,
    }
  },
})

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R
    }
  }
}