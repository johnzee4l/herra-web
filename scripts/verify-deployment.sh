#!/bin/bash

# Pre-Deployment Verification Script
# Run this before deploying to catch issues early

echo "🔍 Herra Web - Pre-Deployment Verification"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✓${NC} Node.js version: $(node -v)"
else
    echo -e "${RED}✗${NC} Node.js version too old. Need 18+, got: $(node -v)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} node_modules not found. Run: npm install"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check environment variables
echo "🔐 Checking environment variables..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local exists"
    
    # Check required vars
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "HMAC_PEPPER"
    )
    
    for VAR in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${VAR}=" .env.local; then
            echo -e "${GREEN}✓${NC} $VAR is set"
        else
            echo -e "${RED}✗${NC} $VAR is missing"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo -e "${RED}✗${NC} .env.local not found"
    echo "   Copy .env.example to .env.local and fill in values"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check TypeScript
echo "📝 Running TypeScript check..."
npm run typecheck > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} TypeScript check passed"
else
    echo -e "${RED}✗${NC} TypeScript errors found. Run: npm run typecheck"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check for build
echo "🏗️  Testing build..."
npm run build > build.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Build successful"
    rm -rf .next build.log
else
    echo -e "${RED}✗${NC} Build failed. Check build.log for details"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check critical files
echo "📁 Checking critical files..."
CRITICAL_FILES=(
    "middleware.ts"
    "app/api/cron/daily/route.ts"
    "db/migrations/001_enable_extensions.sql"
    "db/migrations/011_seed_data.sql"
    "vercel.json"
)

for FILE in "${CRITICAL_FILES[@]}"; do
    if [ -f "$FILE" ]; then
        echo -e "${GREEN}✓${NC} $FILE exists"
    else
        echo -e "${RED}✗${NC} $FILE missing"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check for placeholder data
echo "🧹 Checking for placeholder data..."
if grep -r "FIXTURES\|fixtures" app/ components/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "lib/fixtures" | grep -v "node_modules" > /dev/null; then
    echo -e "${YELLOW}⚠${NC} Found fixture imports in components"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓${NC} No fixture data in components"
fi
echo ""

# Check migration files
echo "🗄️  Checking database migrations..."
MIGRATION_COUNT=$(ls db/migrations/*.sql 2>/dev/null | wc -l)
if [ "$MIGRATION_COUNT" -eq 11 ]; then
    echo -e "${GREEN}✓${NC} All 11 migrations present"
else
    echo -e "${RED}✗${NC} Expected 11 migrations, found: $MIGRATION_COUNT"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Verification Summary"
echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "✅ Ready for deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Run migrations in Supabase SQL Editor"
    echo "2. Set access code pepper in database"
    echo "3. Deploy: vercel --prod"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s)${NC}"
    echo ""
    echo "You can proceed with deployment, but review warnings above."
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo ""
    echo "❌ Fix errors before deploying!"
    exit 1
fi
