#!/bin/bash

# Start Code Executor with ngrok and auto-update Supabase secret
# Usage: ./scripts/start-code-executor.sh

set -e

echo "🚀 Starting Code Executor with ngrok..."
echo ""

# Kill any existing processes on port 3001
echo "🧹 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
pkill -f "ngrok http 3001" 2>/dev/null || true
sleep 1

# Start code executor in background
echo "▶️  Starting code executor on port 3001..."
cd code-executor-api
node server.js > /tmp/code-executor.log 2>&1 &
CODE_EXECUTOR_PID=$!
cd ..

# Wait for code executor to be ready
echo "⏳ Waiting for code executor to start..."
sleep 2

# Check if code executor is running
if ! curl -s http://localhost:3001/health > /dev/null; then
  echo "❌ Code executor failed to start. Check logs:"
  cat /tmp/code-executor.log
  exit 1
fi

echo "✅ Code executor running (PID: $CODE_EXECUTOR_PID)"
echo ""

# Start ngrok in background
echo "🌐 Starting ngrok tunnel..."
ngrok http 3001 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start and get URL
echo "⏳ Waiting for ngrok to initialize..."
sleep 3

# Get ngrok URL from API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[a-zA-Z0-9.-]*\.ngrok-free\.app' | head -1)

if [ -z "$NGROK_URL" ]; then
  echo "❌ Failed to get ngrok URL. Check if ngrok is running:"
  cat /tmp/ngrok.log
  kill $CODE_EXECUTOR_PID 2>/dev/null || true
  kill $NGROK_PID 2>/dev/null || true
  exit 1
fi

echo "✅ ngrok tunnel created: $NGROK_URL"
echo ""

# Update Supabase secret
echo "🔐 Updating Supabase secret..."
npx supabase secrets set CODE_EXECUTOR_URL="$NGROK_URL"

if [ $? -eq 0 ]; then
  echo "✅ Supabase secret updated successfully"
else
  echo "❌ Failed to update Supabase secret"
  kill $CODE_EXECUTOR_PID 2>/dev/null || true
  kill $NGROK_PID 2>/dev/null || true
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ All systems ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Code Executor:  http://localhost:3001/health"
echo "🌐 Public URL:     $NGROK_URL"
echo "📈 ngrok Dashboard: http://localhost:4040"
echo ""
echo "Process IDs:"
echo "  Code Executor: $CODE_EXECUTOR_PID"
echo "  ngrok:         $NGROK_PID"
echo ""
echo "To stop all services, run:"
echo "  kill $CODE_EXECUTOR_PID $NGROK_PID"
echo ""
echo "Press Ctrl+C to view logs (services will keep running)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save PIDs to file for easy cleanup later
echo "$CODE_EXECUTOR_PID" > /tmp/code-executor.pid
echo "$NGROK_PID" > /tmp/ngrok.pid

# Keep script running and show logs
tail -f /tmp/code-executor.log
