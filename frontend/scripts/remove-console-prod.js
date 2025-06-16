// Script to remove console statements for production build
const fs = require('fs');
const path = require('path');

const removeConsoleFromFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove console.log, console.warn, console.error statements
  content = content.replace(/console\.(log|warn|error|info|debug)\([^)]*\);?/g, '');
  
  // Remove multi-line console statements
  content = content.replace(/console\.(log|warn|error|info|debug)\([^)]*\n[^)]*\);?/gm, '');
  
  fs.writeFileSync(filePath, content);
};

const processDirectory = (dirPath, extensions = ['.js', '.jsx', '.ts', '.tsx']) => {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processDirectory(fullPath, extensions);
    } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
      console.log(`Processing: ${fullPath}`);
      removeConsoleFromFile(fullPath);
    }
  });
};

// Only run in production build
if (process.env.NODE_ENV === 'production') {
  console.log('Removing console statements for production...');
  processDirectory(path.join(__dirname, '../src'));
  console.log('Console statements removed!');
}