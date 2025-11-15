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
RESUME_SERVER_PORT="3002"
FRONTEND_PORT="8080"

# Ensure cleanup on exit
API_PID=""
RESUME_SERVER_PID=""
FRONTEND_PID=""
NGROK_PID=""
cleanup() {
  echo -e "${YELLOW}🧹 Cleaning up processes...${NC}"
  if [[ -n "${API_PID}" ]]; then kill ${API_PID} 2>/dev/null || true; fi
  if [[ -n "${RESUME_SERVER_PID}" ]]; then kill ${RESUME_SERVER_PID} 2>/dev/null || true; fi
  if [[ -n "${FRONTEND_PID}" ]]; then kill ${FRONTEND_PID} 2>/dev/null || true; fi
  if [[ -n "${NGROK_PID}" ]]; then kill ${NGROK_PID} 2>/dev/null || true; fi
  # Clean up PID files
  rm -f /tmp/code-executor.pid /tmp/ngrok.pid /tmp/code-executor.log /tmp/ngrok.log
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

# Start ngrok tunnel
echo -e "${YELLOW}🌐 Starting ngrok tunnel...${NC}"
ngrok http ${API_PORT} > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "${NGROK_PID}" > /tmp/ngrok.pid

# Wait for ngrok to initialize
sleep 3

# Get ngrok URL from API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[a-zA-Z0-9.-]*\.ngrok-free\.app' | head -1)

if [[ -n "${NGROK_URL}" ]]; then
  echo -e "${GREEN}✅ ngrok tunnel: ${NGROK_URL}${NC}"
  
  # Update Supabase secret
  echo -e "${YELLOW}🔐 Updating Supabase secret...${NC}"
  if npx supabase secrets set CODE_EXECUTOR_URL="${NGROK_URL}" 2>/dev/null; then
    echo -e "${GREEN}✅ Supabase secret updated${NC}"
  else
    echo -e "${YELLOW}⚠️  Could not update Supabase secret (may need to run 'npx supabase login')${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  ngrok tunnel not available (continuing without it)${NC}"
fi

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
echo -e "${GREEN}🔧 API:${NC}            http://localhost:${API_PORT}/health"
echo -e "${GREEN}📄 Resume Parser:${NC}  http://localhost:${RESUME_SERVER_PORT}/health"
if [[ -n "${NGROK_URL}" ]]; then
  echo -e "${GREEN}🌐 Public API:${NC}     ${NGROK_URL}"
  echo -e "${GREEN}📈 ngrok Dashboard:${NC} http://localhost:4040"
fi
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait on all processes
wait ${API_PID} ${RESUME_SERVER_PID} ${FRONTEND_PID} ${NGROK_PID}