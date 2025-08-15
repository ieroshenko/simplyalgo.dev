#!/usr/bin/env bash

set -euo pipefail

echo "🚀 Starting SimplyAlgo Development Environment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_DIR="code-executor-api"
API_PORT="3001"
FRONTEND_PORT="8080"

# Ensure cleanup on exit
API_PID=""
FRONTEND_PID=""
cleanup() {
  echo -e "${YELLOW}🧹 Cleaning up processes...${NC}"
  if [[ -n "${API_PID}" ]]; then kill ${API_PID} 2>/dev/null || true; fi
  if [[ -n "${FRONTEND_PID}" ]]; then kill ${FRONTEND_PID} 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

# Ensure API .env exists with safe defaults (no secrets)
if [[ ! -f "${API_DIR}/.env" ]]; then
  echo -e "${YELLOW}⚠️  Creating ${API_DIR}/.env with defaults...${NC}"
  cat > "${API_DIR}/.env" <<EOL
PORT=${API_PORT}
JUDGE0_API_URL=https://judge0-extra-ce.p.rapidapi.com
# Provide your real credentials locally if needed:
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# Optional: JUDGE0_API_KEY=
EOL
fi

echo -e "${YELLOW}📦 Installing API deps...${NC}"
pushd "${API_DIR}" >/dev/null
npm install --no-audit --no-fund --silent
echo -e "${YELLOW}🚀 Starting API dev server on :${API_PORT}...${NC}"
npm run dev &
API_PID=$!
popd >/dev/null

# Wait for API readiness (60s)
for i in {1..60}; do
  if curl -fsS "http://localhost:${API_PORT}/health" >/dev/null; then
    echo -e "${GREEN}✅ API ready at http://localhost:${API_PORT}${NC}"
    break
  fi
  sleep 1
done
curl -fsS "http://localhost:${API_PORT}/health" >/dev/null || { echo -e "${RED}❌ API failed to start${NC}"; exit 1; }

echo -e "${YELLOW}📦 Installing frontend deps...${NC}"
bun install --no-audit --silent
echo -e "${YELLOW}🚀 Starting frontend dev server on :${FRONTEND_PORT}...${NC}"
bun run dev &
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
echo -e "${GREEN}🎉 Dev environment is ready!${NC}"
echo -e "${GREEN}📱 Frontend:${NC} http://localhost:${FRONTEND_PORT}"
echo -e "${GREEN}🔧 API:${NC} http://localhost:${API_PORT} (health at /health)"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Wait on both
wait ${API_PID} ${FRONTEND_PID}