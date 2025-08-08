#!/bin/bash

# Development startup script for SimplyAlgo platform
# Starts both the frontend (Bun) and API server (Node.js) in parallel

set -e

echo "🚀 Starting SimplyAlgo Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup on exit
# Ensure cleanup runs on SIGINT, SIGTERM, or normal exit
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up background processes...${NC}"
    if [[ -n "${API_PID:-}" ]]; then
        kill ${API_PID} 2>/dev/null || true
    fi
    if [[ -n "${FRONTEND_PID:-}" ]]; then
        kill ${FRONTEND_PID} 2>/dev/null || true
    fi
}
trap cleanup SIGINT SIGTERM EXIT

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed. Please install Bun first: https://bun.sh${NC}"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
bun install

echo -e "${BLUE}📦 Installing API dependencies...${NC}"
cd code-executor-api
npm install

# Check if .env exists in API directory
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Creating API .env file with default values...${NC}"
    cat > .env << EOL
PORT=3001
JUDGE0_API_URL=https://judge0-extra-ce.p.rapidapi.com
# Add your actual Supabase credentials below:
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
# Optional: Add your Judge0 API key for better rate limits
# JUDGE0_API_KEY=your-judge0-api-key
EOL
    echo -e "${YELLOW}📝 Please update code-executor-api/.env with your actual credentials${NC}"
fi

cd ..

echo -e "${BLUE}🚀 Starting API server on port 3001...${NC}"
cd code-executor-api
npm run dev &
API_PID=$!
cd ..

# Wait for API to start
echo -e "${YELLOW}⏳ Waiting for API server to start...${NC}"
sleep 3

# Check if API is running
if curl -f http://localhost:3001/health &>/dev/null; then
    echo -e "${GREEN}✅ API server is running at http://localhost:3001${NC}"
else
    echo -e "${YELLOW}⚠️  API server may not be fully ready yet (this is normal)${NC}"
fi

echo -e "${BLUE}🚀 Starting frontend server on port 5173...${NC}"
bun run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo -e "${YELLOW}⏳ Waiting for frontend server to start...${NC}"
sleep 5

echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo -e "${GREEN}📱 Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}🔧 API Server: http://localhost:3001${NC}"
echo -e "${GREEN}💊 API Health Check: http://localhost:3001/health${NC}"
echo -e "${GREEN}⚖️  Judge0 Status: http://localhost:3001/judge0-info${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop both servers${NC}"

# Wait for user to stop
wait $API_PID $FRONTEND_PID