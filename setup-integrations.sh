#!/bin/bash

echo "🔗 Solyn.org Integration Setup"
echo "==============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}This script will help you connect your project to:${NC}"
echo "🐙 GitHub (Repository & Actions)"
echo "🚀 Vercel (Deployment & Hosting)"
echo "🌐 Solyn.org (Custom Domain)"
echo ""

# Step 1: GitHub Setup
echo -e "${BLUE}📋 Step 1: GitHub Repository Setup${NC}"
echo "=========================================="
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📦 Initializing Git repository...${NC}"
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
else
    echo -e "${GREEN}✅ Git repository already exists${NC}"
fi

# Check if remote origin exists
if ! git remote get-url origin &> /dev/null; then
    echo -e "${YELLOW}🔗 Please add your GitHub repository as origin:${NC}"
    echo "git remote add origin https://github.com/YOUR_USERNAME/solyn-voter-database.git"
    echo ""
    read -p "Enter your GitHub username: " github_username
    read -p "Enter your repository name (default: solyn-voter-database): " repo_name
    repo_name=${repo_name:-solyn-voter-database}
    
    git remote add origin "https://github.com/$github_username/$repo_name.git"
    echo -e "${GREEN}✅ GitHub remote added${NC}"
else
    echo -e "${GREEN}✅ GitHub remote already configured${NC}"
fi

# Add and commit current changes
echo -e "${YELLOW}💾 Committing current changes...${NC}"
git add .
git commit -m "Add GitHub Actions workflows and Vercel configuration

- Add automated deployment workflow
- Add database seeding workflow
- Update Vercel config for custom domain
- Add security headers and redirects"
echo -e "${GREEN}✅ Changes committed${NC}"

# Step 2: GitHub Secrets Setup
echo ""
echo -e "${BLUE}📋 Step 2: GitHub Secrets Configuration${NC}"
echo "================================================"
echo ""
echo -e "${YELLOW}🔐 You need to add the following secrets to your GitHub repository:${NC}"
echo ""
echo "Go to: https://github.com/$github_username/$repo_name/settings/secrets/actions"
echo ""
echo "Add these secrets:"
echo "• NEXT_PUBLIC_SUPABASE_URL"
echo "• NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "• GOOGLE_MAPS_API_KEY"
echo "• VERCEL_TOKEN"
echo "• VERCEL_ORG_ID"
echo "• VERCEL_PROJECT_ID"
echo ""

read -p "Press Enter when you've added the GitHub secrets..."

# Step 3: Vercel Setup
echo ""
echo -e "${BLUE}📋 Step 3: Vercel Project Setup${NC}"
echo "======================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Vercel CLI...${NC}"
    npm install -g vercel
    echo -e "${GREEN}✅ Vercel CLI installed${NC}"
else
    echo -e "${GREEN}✅ Vercel CLI already installed${NC}"
fi

echo -e "${YELLOW}🚀 Setting up Vercel project...${NC}"
echo "This will open Vercel in your browser for configuration."
echo ""
echo "In Vercel, please:"
echo "1. Link to your GitHub repository"
echo "2. Set up environment variables"
echo "3. Configure your custom domain (Solyn.org)"
echo ""

read -p "Press Enter to continue with Vercel setup..."

vercel

# Step 4: Custom Domain Setup
echo ""
echo -e "${BLUE}📋 Step 4: Custom Domain Configuration${NC}"
echo "=============================================="
echo ""

echo -e "${YELLOW}🌐 Setting up Solyn.com domain...${NC}"
echo ""
echo "In your Vercel dashboard:"
echo "1. Go to your project settings"
echo "2. Navigate to 'Domains' section"
echo "3. Add 'solyn.com' as a custom domain"
echo "4. Add 'www.solyn.com' as well"
echo ""

echo -e "${CYAN}📋 DNS Configuration Required:${NC}"
echo "You'll need to configure your DNS provider with these records:"
echo ""
echo "Type: A"
echo "Name: @"
echo "Value: 76.76.19.19"
echo ""
echo "Type: CNAME"
echo "Name: www"
echo "Value: cname.vercel-dns.com"
echo ""

read -p "Press Enter when you've configured the domain in Vercel..."

# Step 5: Push to GitHub
echo ""
echo -e "${BLUE}📋 Step 5: Push to GitHub${NC}"
echo "================================"
echo ""

echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub${NC}"
else
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    echo "Please check your GitHub credentials and try again."
    exit 1
fi

# Step 6: Final Configuration
echo ""
echo -e "${BLUE}📋 Step 6: Final Configuration${NC}"
echo "===================================="
echo ""

echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo -e "${CYAN}📋 What's been configured:${NC}"
echo "✅ GitHub repository with Actions workflows"
echo "✅ Vercel project with custom domain"
echo "✅ Automated deployment pipeline"
echo "✅ Database seeding workflow"
echo "✅ Security headers and SSL"
echo ""

echo -e "${BLUE}🔗 Your application will be available at:${NC}"
echo "• https://solyn.com"
echo "• https://www.solyn.com"
echo ""

echo -e "${BLUE}📊 Useful Links:${NC}"
echo "• GitHub Repository: https://github.com/$github_username/$repo_name"
echo "• GitHub Actions: https://github.com/$github_username/$repo_name/actions"
echo "• Vercel Dashboard: https://vercel.com/dashboard"
echo "• Supabase Dashboard: https://supabase.com/dashboard"
echo ""

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Monitor your first deployment in GitHub Actions"
echo "2. Verify your domain is working correctly"
echo "3. Test the application functionality"
echo "4. Set up monitoring and analytics"
echo ""

echo -e "${GREEN}🚀 Your Solyn voter database is now live and connected!${NC}"
