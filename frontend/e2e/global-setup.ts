import type { FullConfig } from '@playwright/test'
import { chromium } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  
  console.log('Starting global setup...')
  
  // Create a browser instance for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for the application to be ready
    console.log(`Checking if application is ready at ${baseURL}`)
    await page.goto(baseURL || 'http://localhost:3000')
    
    // Wait for the main content to load
    await page.waitForSelector('h1', { timeout: 30000 })
    console.log('Application is ready')
    
    // Set up test data or authentication if needed
    // For example, you could create test users, seed data, etc.
    
    // Store any global state that tests might need
    await page.context().storageState({ path: 'e2e/storage-state.json' })
    
  } catch (error) {
    console.error('Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
  
  console.log('Global setup completed')
}

export default globalSetup