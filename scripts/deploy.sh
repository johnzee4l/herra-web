#!/bin/bash

# Herra Web - One-Command Deploy Script
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Herra Web - Deployment Script"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're ready to deploy
echo -e "${BLUE}Step 1: Pre-deployment checks${NC}"
echo "Running verification script..."

if [ -f "scripts/verify-deployment.sh" ]; then
    bash scripts/verify-deployment.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}Verification failed. Fix errors before deploying.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Warning: Verification script not found, skipping...${NC}"
fi

echo ""
echo -e "${GREEN}✓ Pre-deployment checks passed${NC}"
echo ""

# Confirm deployment
echo -e "${BLUE}Step 2: Confirm deployment${NC}"
echo ""
echo "This will deploy to Vercel production."
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Check Vercel CLI
echo ""
echo -e "${BLUE}Step 3: Check Vercel CLI${NC}"
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi
echo -e "${GREEN}✓ Vercel CLI ready${NC}"

# Login to Vercel
echo ""
echo -e "${BLUE}Step 4: Vercel authentication${NC}"
vercel whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Please login to Vercel:"
    vercel login
fi
echo -e "${GREEN}✓ Authenticated${NC}"

# Build locally first
echo ""
echo -e "${BLUE}Step 5: Testing build${NC}"
echo "Building locally to catch errors..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
    rm -rf .next
else
    echo -e "${RED}✗ Build failed. Check errors and try again.${NC}"
    exit 1
fi

# Deploy to Vercel
echo ""
echo -e "${BLUE}Step 6: Deploying to Vercel${NC}"
echo "This may take a few minutes..."
echo ""

vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Deployment successful!${NC}"
    echo ""
    echo "=========================================="
    echo "🎉 Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Go to your Vercel dashboard to see deployment URL"
    echo "2. Verify environment variables are set"
    echo "3. Run database migrations in Supabase"
    echo "4. Create first admin user"
    echo "5. Test the deployment"
    echo ""
    echo "See DEPLOYMENT_GUIDE.md for detailed post-deployment steps."
    echo ""
else
    echo ""
    echo -e "${RED}✗ Deployment failed${NC}"
    echo "Check Vercel logs for details."
    exit 1
fi
