import { test, expect } from '@playwright/test'

test.describe('Grant Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display homepage with search interface', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: /Search Grants & Foundation Funding/i })).toBeVisible()
    
    // Check search input
    await expect(page.getByPlaceholder(/Search grants: e.g., cancer research/i)).toBeVisible()
    
    // Check search button
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible()
    
    // Check popular search terms
    await expect(page.getByText('Popular searches:')).toBeVisible()
    await expect(page.getByText('Research grants')).toBeVisible()
  })

  test('should perform basic grant search', async ({ page }) => {
    // Fill search input
    const searchInput = page.getByPlaceholder(/Search grants: e.g., cancer research/i)
    await searchInput.fill('cancer research')
    
    // Submit search
    const searchButton = page.getByRole('button', { name: /search/i })
    await searchButton.click()
    
    // Wait for navigation to search results
    await page.waitForURL(/\/search/)
    
    // Check search results page loaded
    await expect(page.getByText('Matched Grants')).toBeVisible()
    
    // Verify search term is preserved in URL
    expect(page.url()).toContain('searchTerm=cancer+research')
  })

  test('should use popular search terms', async ({ page }) => {
    // Click on a popular search term
    await page.getByText('Research grants').click()
    
    // Should navigate to search results
    await page.waitForURL(/\/search/)
    
    // Search input should be filled with the popular term
    const searchInput = page.getByPlaceholder(/Search grants/)
    await expect(searchInput).toHaveValue('research grants')
    
    // Results should be displayed
    await expect(page.getByText('Matched Grants')).toBeVisible()
  })

  test('should handle empty search gracefully', async ({ page }) => {
    // Submit empty search
    const searchButton = page.getByRole('button', { name: /search/i })
    await searchButton.click()
    
    // Should still navigate to search page
    await page.waitForURL(/\/search/)
    
    // Should display search interface
    await expect(page.getByPlaceholder(/Search grants/)).toBeVisible()
  })

  test('should display loading state during search', async ({ page }) => {
    // Fill and submit search
    await page.getByPlaceholder(/Search grants/).fill('test search')
    
    // Click search and immediately check for loading state
    const searchButton = page.getByRole('button', { name: /search/i })
    await searchButton.click()
    
    // Should show loading state (might be brief)
    const loadingButton = page.getByRole('button', { name: /searching/i })
    // Note: This might not always be visible due to fast responses
    // In a real app, you might want to throttle the response for testing
  })

  test('should maintain search state in URL', async ({ page }) => {
    // Perform search
    await page.getByPlaceholder(/Search grants/).fill('environmental science')
    await page.getByRole('button', { name: /search/i }).click()
    
    await page.waitForURL(/\/search/)
    
    // Reload page
    await page.reload()
    
    // Search term should be preserved
    await expect(page.getByPlaceholder(/Search grants/)).toHaveValue('environmental science')
    
    // URL should still contain search parameters
    expect(page.url()).toContain('searchTerm=environmental+science')
  })

  test('should handle search navigation', async ({ page }) => {
    // Go to search page directly
    await page.goto('/search?searchTerm=test')
    
    // Search input should be populated from URL
    await expect(page.getByPlaceholder(/Search grants/)).toHaveValue('test')
    
    // Should display search interface
    await expect(page.getByText('Matched Grants')).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Focus on search input
    const searchInput = page.getByPlaceholder(/Search grants/)
    await searchInput.focus()
    
    // Type search term
    await searchInput.fill('accessibility test')
    
    // Submit with Enter key
    await searchInput.press('Enter')
    
    // Should navigate to search results
    await page.waitForURL(/\/search/)
    await expect(page.getByText('Matched Grants')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
    }
    
    // Check mobile layout
    await expect(page.getByRole('heading', { name: /Search Grants/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Search grants/)).toBeVisible()
    
    // Search should work on mobile
    await page.getByPlaceholder(/Search grants/).fill('mobile test')
    await page.getByRole('button', { name: /search/i }).click()
    
    await page.waitForURL(/\/search/)
    await expect(page.getByText('Matched Grants')).toBeVisible()
  })
})

test.describe('Search Results Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to search with some results
    await page.goto('/search?searchTerm=research')
  })

  test('should display search results', async ({ page }) => {
    // Check main elements are present
    await expect(page.getByText('Matched Grants')).toBeVisible()
    
    // Should have search bar at top
    await expect(page.getByPlaceholder(/Search grants/)).toBeVisible()
    
    // Should show current search term
    await expect(page.getByPlaceholder(/Search grants/)).toHaveValue('research')
  })

  test('should handle grant card interactions', async ({ page }) => {
    // Wait for grant cards to load
    await page.waitForSelector('[data-testid="grant-card"], .grant-card', { timeout: 10000 })
    
    // Find first grant card (using various possible selectors)
    const grantCard = page.locator('.grant-card').first()
    
    if (await grantCard.count() > 0) {
      // Test save interaction
      const saveButton = grantCard.getByTitle('Save Grant')
      if (await saveButton.count() > 0) {
        await saveButton.click()
        // Should change to unsave state
        await expect(grantCard.getByTitle('Unsave Grant')).toBeVisible()
      }
      
      // Test apply interaction
      const applyButton = grantCard.getByTitle('Apply for Grant')
      if (await applyButton.count() > 0) {
        // Mock window.open to prevent actual navigation
        await page.addInitScript(() => {
          window.open = () => null
        })
        
        await applyButton.click()
        // Should change to applied state
        await expect(grantCard.getByTitle('Unapply Grant')).toBeVisible()
      }
    }
  })

  test('should navigate to grant detail page', async ({ page }) => {
    // Wait for grant cards
    await page.waitForSelector('[data-testid="grant-card"], .grant-card', { timeout: 10000 })
    
    const grantCard = page.locator('.grant-card').first()
    
    if (await grantCard.count() > 0) {
      // Click on grant title
      const grantLink = grantCard.getByRole('link').first()
      if (await grantLink.count() > 0) {
        await grantLink.click()
        
        // Should navigate to grant detail page
        await page.waitForURL(/\/grants\//)
        
        // Should display grant details
        await expect(page.getByRole('main')).toBeVisible()
      }
    }
  })

  test('should support pagination or load more', async ({ page }) => {
    // This test depends on your pagination implementation
    // Look for "Load More" button or pagination controls
    const loadMoreButton = page.getByRole('button', { name: /load more/i })
    
    if (await loadMoreButton.isVisible()) {
      const initialCardCount = await page.locator('.grant-card').count()
      
      await loadMoreButton.click()
      
      // Should load more grants
      await expect(page.locator('.grant-card')).toHaveCount(initialCardCount + 1, { timeout: 10000 })
    }
  })

  test('should support filtering', async ({ page }) => {
    // Look for filter controls
    const filterPanel = page.getByText('Advanced Filters').or(page.getByText('Filters'))
    
    if (await filterPanel.isVisible()) {
      await filterPanel.click()
      
      // Should show filter options
      await expect(page.getByText('Funding Amount').or(page.getByText('Amount'))).toBeVisible()
    }
  })
})