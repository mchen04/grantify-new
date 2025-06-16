import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...')
  
  try {
    // Clean up any test data
    // For example, delete test users, reset database state, etc.
    
    // Clean up storage state file
    const storageStatePath = path.join(__dirname, 'storage-state.json')
    if (fs.existsSync(storageStatePath)) {
      fs.unlinkSync(storageStatePath)
      console.log('🗑️  Cleaned up storage state')
    }
    
    // Clean up any temporary files created during tests
    const tempDir = path.join(__dirname, '../test-results')
    if (fs.existsSync(tempDir)) {
      // Keep test results for CI but clean up old ones locally
      if (!process.env.CI) {
        console.log('🗂️  Test results preserved for local debugging')
      }
    }
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw here as it might mask test failures
  }
  
  console.log('✅ Global teardown completed')
}

export default globalTeardown