#!/bin/bash

echo "🚀 Building for production..."

# Build backend
echo "📦 Building backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi

# Build frontend
echo "📦 Building frontend..."
cd ../frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Production builds complete!"
echo ""
echo "To run in production:"
echo "Backend: cd backend && NODE_ENV=production npm start"
echo "Frontend: cd frontend && npm start"