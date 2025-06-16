import { test, expect } from '@playwright/test'

test.describe('Simple Tests', () => {
  test('should run basic test without dev server', async ({ page }) => {
    // Navigate to a simple page to test Playwright is working
    await page.goto('about:blank')
    
    // Check basic Playwright functionality
    await expect(page).toHaveTitle('')
    
    // Test JavaScript execution
    const result = await page.evaluate(() => 1 + 1)
    expect(result).toBe(2)
  })
  
  test('should test browser capabilities', async ({ page }) => {
    await page.goto('data:text/html,<html><head><title>Test Page</title></head><body><h1>Hello World</h1></body></html>')
    
    await expect(page).toHaveTitle('Test Page')
    await expect(page.locator('h1')).toHaveText('Hello World')
  })
})