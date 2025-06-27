#!/usr/bin/env node

/**
 * Setup script to ensure logs directory exists
 * This script is run automatically before starting the server
 */

const fs = require('fs');
const path = require('path');

// Define logs directory path
const logsDir = path.join(__dirname, '..', 'logs');

/**
 * Create logs directory if it doesn't exist
 */
function setupLogsDirectory() {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('✅ Logs directory created at:', logsDir);
    } else {
      // Verify write permissions
      fs.accessSync(logsDir, fs.constants.W_OK);
      console.log('✅ Logs directory already exists and is writable');
    }
  } catch (error) {
    console.error('❌ Error setting up logs directory:', error.message);
    process.exit(1);
  }
}

// Execute setup
setupLogsDirectory();