#!/usr/bin/env node

/**
 * Script to create the logs directory for the application
 * This ensures that the logger can write to the logs directory
 */

const fs = require('fs');
const path = require('path');

// Define the logs directory path
const logsDir = path.join(__dirname, '../logs');

// Create the logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  console.log(`Creating logs directory at: ${logsDir}`);
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Logs directory created successfully');
} else {
  console.log(`Logs directory already exists at: ${logsDir}`);
}

// Create empty log files if they don't exist
const logFiles = ['error.log', 'combined.log'];

logFiles.forEach(file => {
  const logFilePath = path.join(logsDir, file);
  if (!fs.existsSync(logFilePath)) {
    console.log(`Creating log file: ${file}`);
    fs.writeFileSync(logFilePath, '');
    console.log(`Log file ${file} created successfully`);
  } else {
    console.log(`Log file ${file} already exists`);
  }
});

console.log('Logs setup completed successfully');