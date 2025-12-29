#!/bin/bash

# Apply Judge Authentication Migration to Supabase Cloud
# This script applies the 012_add_user_role.sql migration to your Supabase database

echo "🚀 Applying Judge Authentication Migration..."
echo ""

# Check if Supabase project is linked
if ! npx supabase link --check &> /dev/null; then
  echo "⚠️  No Supabase project linked."
  echo ""
  echo "To link your project, run:"
  echo "  npx supabase link --project-ref YOUR_PROJECT_REF"
  echo ""
  echo "You can find your project ref in your Supabase dashboard URL:"
  echo "  https://supabase.com/dashboard/project/YOUR_PROJECT_REF"
  echo ""
  exit 1
fi

# Apply the migration
echo "Applying migration: 012_add_user_role.sql"
npx supabase db push

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Run 'npm run generate-invite-codes' to create judge invite codes"
  echo "2. Share invite codes with judges for signup at /auth/judge-signup"
else
  echo ""
  echo "❌ Migration failed. Check the error above."
  exit 1
fi
