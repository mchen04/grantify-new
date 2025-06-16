import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')
    
    // Measure performance metrics
    const performanceMetrics = await page.evaluate(() => {
      return new Promise(resolve => {
        // Wait for page to be fully loaded
        if (document.readyState === 'complete') {
          measureMetrics()
        } else {
          window.addEventListener('load', measureMetrics)
        }
        
        function measureMetrics() {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          const paint = performance.getEntriesByType('paint')
          
          const firstPaint = paint.find(entry => entry.name === 'first-paint')?.startTime || 0
          const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
          
          resolve({
            // Load times
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            
            // Core Web Vitals
            firstPaint,
            firstContentfulPaint,
            
            // Resource timing
            totalResourceCount: performance.getEntriesByType('resource').length,
            
            // Network timing
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            request: navigation.responseStart - navigation.requestStart,
            response: navigation.responseEnd - navigation.responseStart,
            
            // Memory (if available)
            memory: (performance as any).memory ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
            } : null
          })
        }
      })
    })
    
    console.log('Performance Metrics:', performanceMetrics)
    
    // Assert Core Web Vitals thresholds
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2500) // FCP < 2.5s
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000) // DOM ready < 3s
    expect(performanceMetrics.loadComplete).toBeLessThan(5000) // Load complete < 5s
  })

  test('should have acceptable bundle sizes', async ({ page }) => {
    // Navigate and wait for resources to load
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Get resource sizes
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource')
      const sizes = {
        totalJS: 0,
        totalCSS: 0,
        totalImages: 0,
        totalFonts: 0,
        resources: []
      }
      
      resources.forEach((resource: any) => {
        const size = resource.transferSize || resource.encodedBodySize || 0
        const type = resource.name.split('.').pop()?.toLowerCase()
        
        sizes.resources.push({
          name: resource.name,
          size,
          type
        })
        
        if (resource.name.includes('.js') || resource.initiatorType === 'script') {
          sizes.totalJS += size
        } else if (resource.name.includes('.css') || resource.initiatorType === 'css') {
          sizes.totalCSS += size
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type)) {
          sizes.totalImages += size
        } else if (['woff', 'woff2', 'ttf', 'otf'].includes(type)) {
          sizes.totalFonts += size
        }
      })
      
      return sizes
    })
    
    console.log('Resource Sizes:', {
      totalJS: `${(resourceSizes.totalJS / 1024).toFixed(2)} KB`,
      totalCSS: `${(resourceSizes.totalCSS / 1024).toFixed(2)} KB`,
      totalImages: `${(resourceSizes.totalImages / 1024).toFixed(2)} KB`,
      totalFonts: `${(resourceSizes.totalFonts / 1024).toFixed(2)} KB`
    })
    
    // Assert reasonable bundle sizes
    expect(resourceSizes.totalJS).toBeLessThan(500 * 1024) // JS < 500KB
    expect(resourceSizes.totalCSS).toBeLessThan(100 * 1024) // CSS < 100KB
  })

  test('should load search results efficiently', async ({ page }) => {
    const startTime = Date.now()
    
    // Perform a search
    await page.goto('/')
    await page.getByPlaceholder(/Search grants/).fill('research')
    
    // Measure search response time
    const searchStartTime = Date.now()
    await page.getByRole('button', { name: /search/i }).click()
    
    // Wait for results to load
    await page.waitForSelector('.grant-card, [data-testid="grant-card"]', { timeout: 10000 })
    const searchEndTime = Date.now()
    
    const searchDuration = searchEndTime - searchStartTime
    console.log(`Search completed in ${searchDuration}ms`)
    
    // Search should complete within reasonable time
    expect(searchDuration).toBeLessThan(5000) // < 5 seconds
    
    // Check that multiple results are loaded efficiently
    const grantCards = await page.locator('.grant-card, [data-testid="grant-card"]').count()
    expect(grantCards).toBeGreaterThan(0)
    
    console.log(`Loaded ${grantCards} grant cards`)
  })

  test('should handle large result sets without performance degradation', async ({ page }) => {
    // Navigate to search with potentially large result set
    await page.goto('/search?searchTerm=grant')
    
    let loadTime = Date.now()
    
    // Wait for initial results
    await page.waitForSelector('.grant-card, [data-testid="grant-card"]', { timeout: 10000 })
    loadTime = Date.now() - loadTime
    
    console.log(`Initial load time: ${loadTime}ms`)
    
    // Test pagination/load more if available
    const loadMoreButton = page.getByRole('button', { name: /load more/i })
    if (await loadMoreButton.isVisible()) {
      const initialCount = await page.locator('.grant-card').count()
      
      const loadMoreStartTime = Date.now()
      await loadMoreButton.click()
      
      // Wait for additional results
      await page.waitForFunction(
        (count) => document.querySelectorAll('.grant-card').length > count,
        initialCount,
        { timeout: 5000 }
      )
      
      const loadMoreTime = Date.now() - loadMoreStartTime
      console.log(`Load more time: ${loadMoreTime}ms`)
      
      // Load more should be reasonably fast
      expect(loadMoreTime).toBeLessThan(3000)
    }
  })

  test('should optimize images and assets', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check for image optimization
    const images = await page.evaluate(() => {
      const imgElements = Array.from(document.querySelectorAll('img'))
      return imgElements.map(img => ({
        src: img.src,
        alt: img.alt,
        loading: img.loading,
        sizes: img.sizes,
        srcset: img.srcset,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }))
    })
    
    // Verify images have proper optimization attributes
    images.forEach(img => {
      if (img.src && !img.src.includes('data:')) {
        // Should have alt text for accessibility
        expect(img.alt).toBeTruthy()
        
        // Should use lazy loading for non-critical images
        if (img.naturalHeight > 0) { // Only check loaded images
          console.log(`Image: ${img.src} - Alt: ${img.alt} - Loading: ${img.loading}`)
        }
      }
    })
  })

  test('should have efficient JavaScript execution', async ({ page }) => {
    // Enable CPU throttling for more realistic testing
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    
    const startTime = Date.now()
    
    await page.goto('/')
    
    // Measure JavaScript execution time
    const jsExecutionTime = await page.evaluate(() => {
      const start = performance.now()
      
      // Simulate heavy interaction (search + interaction)
      const event = new Event('input', { bubbles: true })
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
      
      if (searchInput) {
        searchInput.value = 'performance test'
        searchInput.dispatchEvent(event)
      }
      
      return performance.now() - start
    })
    
    console.log(`JavaScript execution time: ${jsExecutionTime}ms`)
    
    // JS execution should be reasonably fast even with throttling
    expect(jsExecutionTime).toBeLessThan(100)
    
    // Cleanup
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  })
})