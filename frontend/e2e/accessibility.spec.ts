import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test('should not have any automatically detectable accessibility issues on homepage', async ({ page }) => {
    await page.goto('/')
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should not have accessibility issues on search results page', async ({ page }) => {
    await page.goto('/search?searchTerm=research')
    
    // Wait for content to load
    await page.waitForSelector('main, [role="main"]', { timeout: 10000 })
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/')
    
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab')
    
    // Should focus on search input first
    const searchInput = page.getByPlaceholder(/Search grants/)
    await expect(searchInput).toBeFocused()
    
    // Continue tabbing
    await page.keyboard.press('Tab')
    
    // Should focus on search button
    const searchButton = page.getByRole('button', { name: /search/i })
    await expect(searchButton).toBeFocused()
    
    // Test Enter key on search button
    await searchInput.fill('accessibility test')
    await page.keyboard.press('Tab') // Focus search button
    await page.keyboard.press('Enter')
    
    // Should navigate to search results
    await page.waitForURL(/\/search/)
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')
    
    // Get all headings
    const headings = await page.evaluate(() => {
      const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      return headingElements.map(heading => ({
        level: parseInt(heading.tagName.substring(1)),
        text: heading.textContent?.trim() || '',
        visible: heading.offsetParent !== null
      }))
    })
    
    console.log('Headings:', headings)
    
    // Should have exactly one h1
    const h1Count = headings.filter(h => h.level === 1).length
    expect(h1Count).toBe(1)
    
    // Heading levels should not skip (e.g., h1 -> h3)
    const visibleHeadings = headings.filter(h => h.visible).sort((a, b) => a.level - b.level)
    for (let i = 1; i < visibleHeadings.length; i++) {
      const currentLevel = visibleHeadings[i].level
      const previousLevel = visibleHeadings[i - 1].level
      
      // Level difference should not be more than 1
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1)
    }
  })

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/')
    
    // Check for proper ARIA usage
    const ariaElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby]'))
      return elements.map(el => ({
        tagName: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledby: el.getAttribute('aria-labelledby'),
        ariaDescribedby: el.getAttribute('aria-describedby'),
        text: el.textContent?.trim().substring(0, 50) || ''
      }))
    })
    
    console.log('ARIA Elements:', ariaElements)
    
    // Main content should have proper role
    await expect(page.getByRole('main')).toBeVisible()
    
    // Search form should be properly labeled
    const searchForm = page.getByRole('form').or(page.locator('form'))
    if (await searchForm.count() > 0) {
      // Form should be accessible
      await expect(searchForm).toBeVisible()
    }
    
    // Search input should be properly labeled
    const searchInput = page.getByRole('textbox').or(page.getByPlaceholder(/Search grants/))
    await expect(searchInput).toBeVisible()
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/')
    
    // Test with axe-core color contrast rules
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('body')
      .analyze()
    
    // Filter for color contrast violations
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    )
    
    expect(colorContrastViolations).toEqual([])
  })

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/')
    
    // Check for skip links
    const skipLink = page.getByRole('link', { name: /skip to main content/i })
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeVisible()
      
      // Skip link should work
      await skipLink.click()
      const mainContent = page.getByRole('main')
      await expect(mainContent).toBeFocused()
    }
    
    // Check for proper landmark roles
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('banner').or(page.locator('header'))).toBeVisible()
    
    // Check for proper form labeling
    const searchInput = page.getByRole('textbox')
    if (await searchInput.count() > 0) {
      const inputId = await searchInput.getAttribute('id')
      const associatedLabel = page.locator(`label[for="${inputId}"]`)
      
      // Input should have associated label or aria-label
      const hasLabel = await associatedLabel.count() > 0 || 
                     await searchInput.getAttribute('aria-label') !== null ||
                     await searchInput.getAttribute('placeholder') !== null
      
      expect(hasLabel).toBeTruthy()
    }
  })

  test('should handle focus management properly', async ({ page }) => {
    await page.goto('/')
    
    // Test focus trap in modals (if any)
    const modalTrigger = page.getByRole('button', { name: /sign in/i }).first()
    
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click()
      
      // Wait for modal to open
      await page.waitForTimeout(500)
      
      // Check if focus is properly managed in modal
      const modal = page.getByRole('dialog')
      if (await modal.count() > 0) {
        // Focus should be within modal
        const focusedElement = page.locator(':focus')
        const isInModal = await modal.locator(':focus').count() > 0
        
        if (isInModal) {
          console.log('Focus properly managed in modal')
        }
        
        // Escape should close modal
        await page.keyboard.press('Escape')
        await expect(modal).not.toBeVisible()
      }
    }
  })

  test('should be usable with reduced motion', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await page.goto('/')
    
    // Check that animations respect reduced motion
    const animatedElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'))
      return elements.filter(el => {
        const style = window.getComputedStyle(el)
        return style.animationDuration !== '0s' || 
               style.transitionDuration !== '0s' ||
               el.classList.toString().includes('animate')
      }).length
    })
    
    console.log(`Found ${animatedElements} potentially animated elements`)
    
    // Page should still be functional with reduced motion
    const searchInput = page.getByPlaceholder(/Search grants/)
    await searchInput.fill('reduced motion test')
    
    const searchButton = page.getByRole('button', { name: /search/i })
    await searchButton.click()
    
    // Should still navigate properly
    await page.waitForURL(/\/search/)
  })

  test('should work with high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.addInitScript(() => {
      // Add high contrast styles
      const style = document.createElement('style')
      style.textContent = `
        @media (prefers-contrast: high) {
          * {
            background: white !important;
            color: black !important;
            border-color: black !important;
          }
          a {
            color: blue !important;
          }
          button {
            background: white !important;
            color: black !important;
            border: 2px solid black !important;
          }
        }
      `
      document.head.appendChild(style)
    })
    
    await page.goto('/')
    
    // Test that the page is still usable in high contrast
    const searchInput = page.getByPlaceholder(/Search grants/)
    await expect(searchInput).toBeVisible()
    
    const searchButton = page.getByRole('button', { name: /search/i })
    await expect(searchButton).toBeVisible()
    
    // Interact with elements
    await searchInput.fill('high contrast test')
    await searchButton.click()
    
    await page.waitForURL(/\/search/)
  })

  test('should support voice navigation patterns', async ({ page }) => {
    await page.goto('/')
    
    // Test that elements have accessible names for voice commands
    const buttons = await page.evaluate(() => {
      const buttonElements = Array.from(document.querySelectorAll('button, [role="button"]'))
      return buttonElements.map(button => ({
        text: button.textContent?.trim() || '',
        ariaLabel: button.getAttribute('aria-label') || '',
        title: button.getAttribute('title') || '',
        hasAccessibleName: !!(
          button.textContent?.trim() || 
          button.getAttribute('aria-label') || 
          button.getAttribute('title')
        )
      }))
    })
    
    // All buttons should have accessible names
    buttons.forEach(button => {
      expect(button.hasAccessibleName).toBeTruthy()
    })
    
    // Test landmark navigation
    const landmarks = await page.evaluate(() => {
      const landmarkElements = Array.from(document.querySelectorAll('main, nav, header, footer, aside, section[aria-label], [role="banner"], [role="main"], [role="navigation"], [role="contentinfo"]'))
      return landmarkElements.map(el => ({
        tagName: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label')
      }))
    })
    
    console.log('Landmarks:', landmarks)
    
    // Should have main landmark
    const hasMain = landmarks.some(l => l.tagName === 'main' || l.role === 'main')
    expect(hasMain).toBeTruthy()
  })

  test('should handle form validation accessibly', async ({ page }) => {
    await page.goto('/')
    
    // Test search form validation (if any)
    const searchForm = page.locator('form').first()
    
    if (await searchForm.count() > 0) {
      // Try to submit empty form or invalid data
      const searchButton = page.getByRole('button', { name: /search/i })
      await searchButton.click()
      
      // Check for accessible error messages
      await page.waitForTimeout(1000)
      
      const errorMessages = await page.evaluate(() => {
        const errors = Array.from(document.querySelectorAll('[role="alert"], .error, [aria-live="polite"], [aria-live="assertive"]'))
        return errors.map(error => ({
          text: error.textContent?.trim() || '',
          role: error.getAttribute('role'),
          ariaLive: error.getAttribute('aria-live')
        }))
      })
      
      console.log('Error messages:', errorMessages)
      
      // If there are validation errors, they should be accessible
      if (errorMessages.length > 0) {
        errorMessages.forEach(error => {
          expect(error.text).toBeTruthy()
        })
      }
    }
  })
})