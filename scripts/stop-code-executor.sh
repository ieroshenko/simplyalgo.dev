#!/bin/bash

# Stop Code Executor and ngrok
# Usage: ./scripts/stop-code-executor.sh

echo "🛑 Stopping Code Executor and ngrok..."
echo ""

# Kill processes by PID if files exist
if [ -f /tmp/code-executor.pid ]; then
  CODE_EXECUTOR_PID=$(cat /tmp/code-executor.pid)
  kill $CODE_EXECUTOR_PID 2>/dev/null && echo "✅ Stopped code executor (PID: $CODE_EXECUTOR_PID)" || echo "⚠️  Code executor already stopped"
  rm /tmp/code-executor.pid
fi

if [ -f /tmp/ngrok.pid ]; then
  NGROK_PID=$(cat /tmp/ngrok.pid)
  kill $NGROK_PID 2>/dev/null && echo "✅ Stopped ngrok (PID: $NGROK_PID)" || echo "⚠️  ngrok already stopped"
  rm /tmp/ngrok.pid
fi

# Fallback: kill by port and process name
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
pkill -f "ngrok http 3001" 2>/dev/null || true

# Clean up log files
rm -f /tmp/code-executor.log /tmp/ngrok.log

echo ""
echo "✨ All services stopped"
