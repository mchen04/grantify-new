import React from 'react'
import { screen, waitFor, act } from '@testing-library/react'
import { render, mockUser } from '../utils/test-utils'
import { AuthContextProvider, useAuth } from '@/contexts/AuthContext'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}

jest.mock('@/lib/supabaseClient', () => ({
  __esModule: true,
  default: mockSupabase,
}))

// Test component that uses auth context
const AuthTestComponent = () => {
  const { user, loading, signIn, signOut, error } = useAuth()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {user ? (
        <div>
          <div>Welcome, {user.user_metadata?.full_name}</div>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <div>Not authenticated</div>
          <button onClick={() => signIn('google')}>Sign In</button>
        </div>
      )}
    </div>
  )
}

describe('AuthContext Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with loading state', () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })

    render(
      <AuthContextProvider>
        <AuthTestComponent />
      </AuthContextProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows unauthenticated state when no session', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })

    render(
      <AuthContextProvider>
        <AuthTestComponent />
      </AuthContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })

    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('shows authenticated state when session exists', async () => {
    const mockSession = {
      user: mockUser,
      access_token: 'fake-token',
    }

    mockSupabase.auth.getSession.mockResolvedValue({ 
      data: { session: mockSession } 
    })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })

    render(
      <AuthContextProvider>
        <AuthTestComponent />
      </AuthContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument()
    })

    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('handles sign in flow', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({ 
      data: { url: 'https://oauth-url.com' },
      error: null 
    })

    const { user } = render(
      <AuthContextProvider>
        <AuthTestComponent />
      </AuthContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })

    const signInButton = screen.getByText('Sign In')
    await user.click(signInButton)

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/auth/callback'),
      },
    })
  })

  it('handles sign out flow', async () => {
    const mockSession = {
      user: mockUser,
      access_token: 'fake-token',
    }

    mockSupabase.auth.getSession.mockResolvedValue({ 
      data: { session: mockSession } 
    })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    const { user } = render(
      <AuthContextProvider>
        <AuthTestComponent />
      </AuthContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument()
    })

    const signOutButton = screen.getByText('Sign Out')
    await user.click(signOutButton)

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('handles authentication errors', async () => {
    mockSupabase.auth.getSession.mockRejectedValue(new Error('Session error'))
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })

    render(
      <AuthContextProvider>
        <AuthTestComponent />
      </AuthContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Error: Session error')).toBeInTheDocument()
    })
  })

  it('handles sign in errors', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({ 
      data: null,
      error: { message: 'OAuth error' } 
    })

    const { user } = render(
      <AuthContextProvider>
        <AuthTestComponent />
      </AuthContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })

    const signInButton = screen.getByText('Sign In')
    await user.click(signInButton)

    await waitFor(() => {
      expect(screen.getByText('Error: OAuth error')).toBeInTheDocument()
    })
  })

  it('listens to auth state changes', async () => {
    const mockUnsubscribe = jest.fn()
    const mockOnAuthStateChange = jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })

    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange = mockOnAuthStateChange

    const { unmount } = render(
      <AuthContextProvider>
        <AuthTestComponent />
      </AuthContextProvider>
    )

    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function))

    // Simulate auth state change
    const authStateChangeCallback = mockOnAuthStateChange.mock.calls[0][0]
    
    await act(async () => {
      authStateChangeCallback('SIGNED_IN', { user: mockUser })
    })

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument()
    })

    // Cleanup should unsubscribe
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('handles concurrent auth operations', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({ 
      data: { url: 'https://oauth-url.com' },
      error: null 
    })

    const { user } = render(
      <AuthContextProvider>
        <AuthTestComponent />
      </AuthContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })

    const signInButton = screen.getByText('Sign In')
    
    // Click multiple times rapidly
    await user.click(signInButton)
    await user.click(signInButton)
    await user.click(signInButton)

    // Should only call signInWithOAuth once due to loading state
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1)
    })
  })
})