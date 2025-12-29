#!/bin/bash

# Waitlist Setup Script
# Applies migration and sets up admin key

set -e

echo "🚀 Setting up Waitlist System..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  exit 1
fi

# 1. Generate admin API key if not set
if ! grep -q "ADMIN_API_KEY" .env.local; then
  echo "🔑 Generating admin API key..."
  ADMIN_KEY=$(openssl rand -hex 32)
  echo "" >> .env.local
  echo "# Admin API key for waitlist management" >> .env.local
  echo "ADMIN_API_KEY=$ADMIN_KEY" >> .env.local
  echo "✅ ADMIN_API_KEY added to .env.local"
else
  echo "✅ ADMIN_API_KEY already exists"
fi

echo ""
echo "📋 Next step: Apply database migration"
echo ""
echo "Choose an option:"
echo ""
echo "  Option 1: Open Supabase Dashboard (Recommended)"
echo "  ───────────────────────────────────────────────"
echo "  1. Go to: https://supabase.com/dashboard/project/qeaqyxxbcnwnuhobcway/sql/new"
echo "  2. Copy & paste: supabase/migrations/005_create_waitlist.sql"
echo "  3. Click 'Run'"
echo ""
echo "  Option 2: Copy SQL to clipboard"
echo "  ─────────────────────────────────"

# Try to copy to clipboard
if command -v pbcopy &> /dev/null; then
  cat supabase/migrations/005_create_waitlist.sql | pbcopy
  echo "  ✅ SQL copied to clipboard!"
  echo "  → Paste into Supabase SQL Editor and run"
elif command -v xclip &> /dev/null; then
  cat supabase/migrations/005_create_waitlist.sql | xclip -selection clipboard
  echo "  ✅ SQL copied to clipboard!"
  echo "  → Paste into Supabase SQL Editor and run"
else
  echo "  → Manually copy: supabase/migrations/005_create_waitlist.sql"
fi

echo ""
echo "  Option 3: Open migration file"
echo "  ───────────────────────────────"

# Try to open the file
if command -v code &> /dev/null; then
  code supabase/migrations/005_create_waitlist.sql
  echo "  ✅ Opened in VS Code"
elif command -v open &> /dev/null; then
  open supabase/migrations/005_create_waitlist.sql
  echo "  ✅ Opened migration file"
fi

echo ""
echo "🎯 After running the SQL migration:"
echo "   1. Restart your dev server: npm run dev"
echo "   2. Visit: http://localhost:3000/waitlist"
echo "   3. Visit: http://localhost:3000/admin/waitlist"
echo ""
echo "📚 Full guide: WAITLIST_SETUP.md"
echo ""
