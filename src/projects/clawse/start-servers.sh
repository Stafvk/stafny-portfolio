#!/bin/bash

echo "🚀 Starting Business Compliance Checker"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing backend dependencies..."
if [ -f "backend-package.json" ]; then
    cp backend-package.json package.json
    npm install
    echo "✅ Backend dependencies installed"
else
    echo "❌ backend-package.json not found"
    exit 1
fi

echo "🔧 Starting backend server..."
node server.js &
BACKEND_PID=$!

echo "✅ Backend server started on http://localhost:3001"
echo "📋 Backend PID: $BACKEND_PID"

echo "🌐 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Frontend server started on http://localhost:5173"
echo "📋 Frontend PID: $FRONTEND_PID"

echo ""
echo "🎉 Both servers are running!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
