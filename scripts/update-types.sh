#!/bin/bash

# Update Supabase TypeScript Types
# Usage: ./scripts/update-types.sh

set -e

echo "🔄 Updating Supabase TypeScript types..."

# Extract project ID from .env file
PROJECT_ID=$(grep VITE_SUPABASE_URL .env | cut -d'/' -f3 | cut -d'.' -f1)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Could not extract project ID from .env file"
    exit 1
fi

echo "📡 Fetching types from project: $PROJECT_ID"

# Generate types
supabase gen types typescript --project-id="$PROJECT_ID" > src/integrations/supabase/types.ts

echo "✅ Types updated successfully!"
echo "📁 File: src/integrations/supabase/types.ts"

# Run type check to verify
echo "🔍 Running type check..."
npm run lint

echo "🎉 Type generation complete!"