# CI/CD Setup for SimplyAlgo

This document describes the GitHub Actions workflows set up for the SimplyAlgo LeetCode platform.

## 🚀 Workflows

### 1. CI/CD Pipeline (`.github/workflows/ci.yml`)
**Comprehensive testing and deployment pipeline**

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Jobs:**
1. **test-frontend** - Tests the React/Vite frontend
   - Uses Bun for package management
   - Runs linting with `bun run lint`
   - Builds the app with `bun run build`
   - Starts preview server for health check

2. **test-api** - Tests the Node.js API server
   - Uses Node.js 18
   - Installs dependencies in `code-executor-api/`
   - Creates test environment file
   - Tests API server startup and health endpoints

3. **integration-test** - Tests both services together
   - Starts both frontend and API servers
   - Runs connectivity tests between services
   - Validates end-to-end functionality

4. **deploy-staging** - Deployment preparation (main branch only)
   - Runs after all tests pass
   - Builds production assets
   - Ready for staging deployment

5. **security-check** - Security audit
   - Runs `bun audit` and `npm audit`
   - Checks for vulnerable dependencies

### 2. Development Tests (`.github/workflows/dev-test.yml`)
**Quick testing for development branches**

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Features:**
- Faster execution with focused tests
- Tests both `bun run dev` and API server startup
- Validates that development environment works correctly

## 🛠️ Local Development

### Quick Start
```bash
# Start both frontend and API server
bun run dev:all

# Or individually:
bun run dev        # Frontend only (port 5173)
bun run api        # API server only (port 3001)
```

### Development Script Features
The `scripts/dev-start.sh` script provides:
- ✅ Dependency installation for both frontend and API
- ✅ Automatic .env file creation for API
- ✅ Health checks for both servers
- ✅ Graceful shutdown with Ctrl+C
- ✅ Colored output for better visibility

### Environment Setup

#### Frontend (.env in root)
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### API (code-executor-api/.env)
```env
PORT=3001
JUDGE0_API_URL=https://judge0-extra-ce.p.rapidapi.com
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
JUDGE0_API_KEY=your-judge0-api-key  # Optional
```

## 📋 Available Scripts

### Frontend (Root directory)
```bash
bun run dev          # Start Vite dev server
bun run dev:all      # Start both frontend and API
bun run build        # Build for production
bun run lint         # Run ESLint
bun run preview      # Preview production build
bun run test:ci      # Run CI tests (lint + build)
```

### API (code-executor-api/)
```bash
npm run start        # Start production server
npm run dev          # Start with file watching
```

## 🔧 CI/CD Configuration

### Branch Protection
Recommended branch protection rules for `main`:
- ✅ Require status checks (all CI jobs must pass)
- ✅ Require up-to-date branches
- ✅ Require signed commits (optional)
- ✅ Include administrators

### Environment Variables (GitHub Secrets)
For production deployment, add these secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JUDGE0_API_KEY` (optional)

## 📊 Status Badges

Add these to your main README.md:

```markdown
![CI/CD Pipeline](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)
![Dev Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/dev-test.yml/badge.svg)
```

## 🚨 Troubleshooting

### Common Issues

1. **API Server fails to start in CI**
   - Check environment variables
   - Verify .env file creation in workflow

2. **Frontend build fails**
   - Check for TypeScript errors
   - Verify all dependencies are installed

3. **Integration tests timeout**
   - Increase timeout in workflow
   - Check server startup timing

4. **Bun cache issues**
   - Clear cache in GitHub Actions settings
   - Update cache key in workflow

### Debug Commands
```bash
# Test locally what CI does:
bun install
bun run lint
bun run build

# Test API startup:
cd code-executor-api
npm install
npm start
curl http://localhost:3001/health
```

## 🔄 Workflow Updates

To modify workflows:
1. Edit `.github/workflows/ci.yml` or `dev-test.yml`
2. Test changes on feature branch first
3. Monitor workflow runs in GitHub Actions tab
4. Update this documentation when adding new features

## 📈 Future Enhancements

Planned improvements:
- [ ] Add automated testing with Jest/Vitest
- [ ] Docker containerization for consistent environments  
- [ ] Automated deployment to staging/production
- [ ] Performance monitoring integration
- [ ] Slack/Discord notifications for build status