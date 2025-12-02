#!/usr/bin/env bash

set -euo pipefail

echo "🚀 Starting SimplyAlgo Development Environment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

RESUME_SERVER_PORT="3002"
FRONTEND_PORT="8080"

# Ensure cleanup on exit
RESUME_SERVER_PID=""
FRONTEND_PID=""
cleanup() {
  echo -e "${YELLOW}🧹 Cleaning up processes...${NC}"
  if [[ -n "${RESUME_SERVER_PID}" ]]; then kill ${RESUME_SERVER_PID} 2>/dev/null || true; fi
  if [[ -n "${FRONTEND_PID}" ]]; then kill ${FRONTEND_PID} 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

echo -e "${YELLOW}ℹ️  Note: code-executor-api is now a Supabase Edge Function${NC}"
echo -e "${YELLOW}   Run 'npx supabase functions serve' in a separate terminal if needed${NC}"
echo ""

# Install Resume Parser Server dependencies
echo -e "${YELLOW}📦 Installing Resume Parser deps...${NC}"
pushd "server" >/dev/null
npm install --no-audit --no-fund --silent
popd >/dev/null

# Start Resume Parser Server
echo -e "${YELLOW}🚀 Starting Resume Parser server on :${RESUME_SERVER_PORT}...${NC}"
node server/index.js &
RESUME_SERVER_PID=$!

# Wait for Resume Parser readiness (30s)
for i in {1..30}; do
  if curl -fsS "http://localhost:${RESUME_SERVER_PORT}/health" >/dev/null; then
    echo -e "${GREEN}✅ Resume Parser ready at http://localhost:${RESUME_SERVER_PORT}${NC}"
    break
  fi
  sleep 1
done
curl -fsS "http://localhost:${RESUME_SERVER_PORT}/health" >/dev/null || { echo -e "${RED}❌ Resume Parser failed to start${NC}"; exit 1; }


echo -e "${YELLOW}📦 Installing frontend deps...${NC}"
npm install --no-audit --no-fund --silent
echo -e "${YELLOW}🚀 Starting frontend dev server on :${FRONTEND_PORT}...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend readiness (60s)
for i in {1..60}; do
  if curl -fsS "http://localhost:${FRONTEND_PORT}/" >/dev/null; then
    echo -e "${GREEN}✅ Frontend ready at http://localhost:${FRONTEND_PORT}${NC}"
    break
  fi
  sleep 1
done
curl -fsS "http://localhost:${FRONTEND_PORT}/" >/dev/null || { echo -e "${RED}❌ Frontend failed to start${NC}"; exit 1; }

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Dev environment is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📱 Frontend:${NC}        http://localhost:${FRONTEND_PORT}"
echo -e "${GREEN} Resume Parser:${NC}  http://localhost:${RESUME_SERVER_PORT}/health"
echo ""
echo -e "${YELLOW}💡 To use code execution features:${NC}"
echo -e "${YELLOW}   Run 'npx supabase functions serve code-executor-api' in a separate terminal${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait on all processes
wait ${RESUME_SERVER_PID} ${FRONTEND_PID}