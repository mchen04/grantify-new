const fs = require('fs');
const path = require('path');

console.log('Checking for performance issues...\n');

// Check for large components
const checkFileSize = (filePath) => {
  const stats = fs.statSync(filePath);
  const fileSizeInKB = stats.size / 1024;
  if (fileSizeInKB > 50) {
    console.log(`Warning: Large file: ${filePath} (${fileSizeInKB.toFixed(2)} KB)`);
  }
};

// Check for synchronous operations in components
const checkForSyncOperations = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for localStorage/sessionStorage in render
  if (content.includes('localStorage.') || content.includes('sessionStorage.')) {
    if (!content.includes('useEffect')) {
      console.log(`Warning: Potential sync storage access in: ${filePath}`);
    }
  }
  
  // Check for heavy computations outside useMemo
  if (content.match(/\.map\(.*\)\.filter\(.*\)/) && !content.includes('useMemo')) {
    console.log(`Warning: Potential heavy computation without memoization in: ${filePath}`);
  }
};

// Check directory
const checkDirectory = (dirPath) => {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      checkDirectory(fullPath);
    } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
      checkFileSize(fullPath);
      checkForSyncOperations(fullPath);
    }
  });
};

// Check build output
const buildStats = path.join(__dirname, '../.next/build-manifest.json');
if (fs.existsSync(buildStats)) {
  const manifest = JSON.parse(fs.readFileSync(buildStats, 'utf8'));
  console.log('\nPage sizes:');
  Object.entries(manifest.pages).forEach(([page, assets]) => {
    console.log(`${page}: ${assets.length} assets`);
  });
}

console.log('\nChecking components...');
checkDirectory(path.join(__dirname, '../src'));

console.log('\nPerformance check complete!');