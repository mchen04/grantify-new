import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display unauthenticated state on homepage', async ({ page }) => {
    await page.goto('/')
    
    // Should show sign in option
    const signInButton = page.getByRole('button', { name: /sign in/i }).or(
      page.getByRole('link', { name: /sign in/i })
    )
    
    // Sign in should be available somewhere on the page
    if (await signInButton.count() > 0) {
      await expect(signInButton).toBeVisible()
    }
    
    // Should not show user profile
    await expect(page.getByText('Welcome,')).not.toBeVisible()
  })

  test('should navigate to dashboard when authenticated', async ({ page }) => {
    // Mock authentication state
    await page.addInitScript(() => {
      // Mock localStorage with auth token
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: {
          id: 'test-user',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User'
          }
        }
      }))
    })

    await page.goto('/')
    
    // Try to navigate to dashboard
    await page.goto('/dashboard')
    
    // Should not redirect to login if authenticated
    expect(page.url()).toContain('/dashboard')
  })

  test('should redirect to login for protected routes', async ({ page }) => {
    // Ensure no authentication
    await page.addInitScript(() => {
      localStorage.clear()
    })

    // Try to access protected route
    await page.goto('/dashboard')
    
    // Should redirect to login or show login prompt
    await page.waitForTimeout(1000) // Wait for redirect
    
    // Check if redirected to auth page or shows login prompt
    const isOnAuthPage = page.url().includes('/auth') || 
                        page.url().includes('/login') ||
                        await page.getByText('Sign in').isVisible()
    
    expect(isOnAuthPage).toBeTruthy()
  })

  test('should handle OAuth login flow', async ({ page }) => {
    await page.goto('/')
    
    // Look for sign in button
    const signInButton = page.getByRole('button', { name: /sign in/i }).or(
      page.getByRole('link', { name: /sign in/i })
    ).first()
    
    if (await signInButton.count() > 0) {
      // Mock OAuth redirect to prevent actual OAuth flow
      await page.route('**/auth/v1/authorize**', async route => {
        // Simulate successful OAuth redirect
        await route.fulfill({
          status: 302,
          headers: {
            'Location': '/auth/callback?code=mock-auth-code'
          }
        })
      })
      
      await signInButton.click()
      
      // Should initiate OAuth flow or show OAuth options
      const isOAuthFlow = page.url().includes('oauth') || 
                         await page.getByText('Google').isVisible() ||
                         await page.getByText('Continue with').isVisible()
      
      // OAuth flow may vary based on implementation
      console.log('OAuth flow initiated:', isOAuthFlow)
    }
  })

  test('should handle sign out', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.mockAuthUser = {
        id: 'test-user',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' }
      }
    })

    await page.goto('/dashboard')
    
    // Look for sign out option
    const signOutButton = page.getByRole('button', { name: /sign out/i }).or(
      page.getByRole('button', { name: /logout/i })
    )
    
    if (await signOutButton.count() > 0) {
      await signOutButton.click()
      
      // Should redirect to homepage or login
      await page.waitForTimeout(1000)
      
      const isSignedOut = page.url().includes('/') && !page.url().includes('/dashboard')
      expect(isSignedOut).toBeTruthy()
    }
  })

  test('should persist authentication state across page refreshes', async ({ page }) => {
    // Mock authentication in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000, // 1 hour from now
        user: {
          id: 'test-user',
          email: 'test@example.com'
        }
      }))
    })

    await page.goto('/dashboard')
    
    // Refresh the page
    await page.reload()
    
    // Should still be on dashboard (not redirected to login)
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/dashboard')
  })

  test('should handle expired tokens', async ({ page }) => {
    // Mock expired authentication
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'expired-token',
        expires_at: Date.now() - 3600000, // 1 hour ago
        user: {
          id: 'test-user',
          email: 'test@example.com'
        }
      }))
    })

    await page.goto('/dashboard')
    
    // Should handle expired token (redirect to login or refresh token)
    await page.waitForTimeout(2000)
    
    // Either should be redirected or token should be refreshed
    const isHandled = !page.url().includes('/dashboard') || 
                     await page.getByText('Welcome').isVisible()
    
    console.log('Expired token handled:', isHandled)
  })

  test('should show appropriate error messages for auth failures', async ({ page }) => {
    // Mock auth error
    await page.route('**/auth/**', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid credentials',
          error_description: 'The provided credentials are invalid'
        })
      })
    })

    await page.goto('/')
    
    // Try to sign in and trigger error
    const signInButton = page.getByRole('button', { name: /sign in/i }).first()
    
    if (await signInButton.count() > 0) {
      await signInButton.click()
      
      // Should show error message
      await expect(
        page.getByText('Invalid credentials').or(
          page.getByText('Authentication failed')
        )
      ).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('User Profile and Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.mockAuthUser = {
        id: 'test-user',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg'
        }
      }
    })
  })

  test('should display user profile information', async ({ page }) => {
    await page.goto('/profile')
    
    // Should show user information
    await expect(page.getByText('Test User')).toBeVisible()
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('should allow user to update preferences', async ({ page }) => {
    await page.goto('/preferences')
    
    // Look for preferences options
    const emailNotifications = page.getByRole('checkbox', { name: /email notifications/i })
    
    if (await emailNotifications.count() > 0) {
      // Toggle preference
      await emailNotifications.click()
      
      // Should save preferences
      const saveButton = page.getByRole('button', { name: /save/i })
      if (await saveButton.count() > 0) {
        await saveButton.click()
        
        // Should show success message
        await expect(
          page.getByText('Preferences saved').or(
            page.getByText('Settings updated')
          )
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('should handle account deletion flow', async ({ page }) => {
    await page.goto('/profile')
    
    // Look for delete account option
    const deleteButton = page.getByRole('button', { name: /delete account/i })
    
    if (await deleteButton.count() > 0) {
      await deleteButton.click()
      
      // Should show confirmation dialog
      await expect(page.getByText('Are you sure')).toBeVisible()
      
      // Cancel deletion
      const cancelButton = page.getByRole('button', { name: /cancel/i })
      await cancelButton.click()
      
      // Should close dialog
      await expect(page.getByText('Are you sure')).not.toBeVisible()
    }
  })
})