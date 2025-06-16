#!/bin/bash

# Script to safely kill backend processes and free up port 3001

echo "🔍 Checking for processes using port 3001..."

# Find process using port 3001
PID=$(lsof -ti:3001)

if [ ! -z "$PID" ]; then
    echo "📝 Found process $PID using port 3001"
    echo "🔧 Killing process $PID..."
    kill $PID
    sleep 2
    
    # Check if process is still running
    if kill -0 $PID 2>/dev/null; then
        echo "⚠️  Process still running, force killing..."
        kill -9 $PID
    fi
    echo "✅ Process killed successfully"
else
    echo "✅ Port 3001 is already free"
fi

# Kill any remaining backend processes
echo "🧹 Cleaning up any remaining backend processes..."
pkill -f "ts-node src/index.ts" 2>/dev/null || true
pkill -f "nodemon.*backend" 2>/dev/null || true

echo "🎉 Backend cleanup complete! You can now run 'npm run dev'"