import { test, expect } from '@playwright/test'

test.describe('Basic Site Tests', () => {
  test('should load the homepage', async ({ page }) => {
    // Start the dev server and wait for it to be ready
    await page.goto('/')
    
    // Check if page loads successfully
    await expect(page).toHaveTitle(/Grantify/)
  })

  test('should have search functionality visible', async ({ page }) => {
    await page.goto('/')
    
    // Look for search input
    const searchInput = page.getByPlaceholder(/Search grants/)
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })
})