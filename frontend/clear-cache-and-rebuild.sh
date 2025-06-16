#!/bin/bash

echo "🧹 Clearing Next.js cache and rebuilding..."

# Remove Next.js cache
echo "Removing .next directory..."
rm -rf .next

# Clear node_modules cache (optional, uncomment if needed)
# echo "Clearing node_modules..."
# rm -rf node_modules
# npm install

# Clear browser cache hint
echo ""
echo "📌 IMPORTANT: After rebuild, please:"
echo "1. Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)"
echo "2. Or open Developer Tools → Application → Storage → Clear site data"
echo ""

# Rebuild the application
echo "🔨 Rebuilding application..."
npm run build

echo "✅ Done! Now run 'npm run dev' to start the development server"