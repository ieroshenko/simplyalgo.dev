#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔒 Checking for hardcoded secrets and sensitive data...${NC}"

SECRETS_FOUND=0

# Simple patterns that work reliably
echo -e "${YELLOW}Checking for API keys and secrets...${NC}"

# Check for OpenAI keys
if grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --exclude-dir="node_modules" --exclude-dir="dist" --exclude-dir="build" "sk_[a-zA-Z0-9]" . 2>/dev/null; then
  echo -e "${RED}❌ Found potential OpenAI API key${NC}"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Check for Stripe keys
if grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --exclude-dir="node_modules" --exclude-dir="dist" --exclude-dir="build" "pk_[a-zA-Z0-9]" . 2>/dev/null; then
  echo -e "${RED}❌ Found potential Stripe public key${NC}"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Check for AWS keys
if grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --exclude-dir="node_modules" --exclude-dir="dist" --exclude-dir="build" "AKIA[0-9A-Z]" . 2>/dev/null; then
  echo -e "${RED}❌ Found potential AWS Access Key${NC}"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Check for GitHub tokens
if grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --exclude-dir="node_modules" --exclude-dir="dist" --exclude-dir="build" "ghp_[0-9A-Za-z]" . 2>/dev/null; then
  echo -e "${RED}❌ Found potential GitHub personal access token${NC}"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Check for database connection strings
if grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --exclude-dir="node_modules" --exclude-dir="dist" --exclude-dir="build" "postgres://.*:.*@" . 2>/dev/null; then
  echo -e "${RED}❌ Found potential PostgreSQL connection string with credentials${NC}"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

if grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --exclude-dir="node_modules" --exclude-dir="dist" --exclude-dir="build" "mysql://.*:.*@" . 2>/dev/null; then
  echo -e "${RED}❌ Found potential MySQL connection string with credentials${NC}"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Check if .env files are staged for commit (this is what matters)
echo -e "${YELLOW}Checking if .env files are staged for commit...${NC}"
if git diff --cached --name-only | grep -E "\.env$|^\.env\."; then
  echo -e "${RED}❌ Found .env files staged for commit:${NC}"
  git diff --cached --name-only | grep -E "\.env$|^\.env\."
  echo -e "${RED}❌ .env files should never be committed!${NC}"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Check for common secret patterns in code
echo -e "${YELLOW}Checking for hardcoded secrets in code...${NC}"
if grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir="node_modules" --exclude-dir="dist" --exclude-dir="build" -i "api.key.*=.*['\"][a-z0-9]" . 2>/dev/null | grep -v "your_api_key_here" | grep -v "your_key_here" | grep -v "api_key_placeholder"; then
  echo -e "${RED}❌ Found potential hardcoded API key assignment${NC}"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

if [ $SECRETS_FOUND -gt 0 ]; then
  echo -e "${RED}❌ Security check failed! Found $SECRETS_FOUND potential security issues.${NC}"
  echo -e "${RED}Please remove any hardcoded secrets before committing.${NC}"
  echo -e "${YELLOW}💡 Use environment variables or secure secret management instead.${NC}"
  echo -e "${YELLOW}💡 Make sure .env files are in .gitignore and not committed.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ No obvious hardcoded secrets detected!${NC}"
  exit 0
fi