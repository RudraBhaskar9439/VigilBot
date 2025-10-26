#!/bin/bash

# Trading Bot Detection - Deployment Script
# This script helps deploy the application to Vercel (Frontend) and Railway (Backend)

echo "🚀 Trading Bot Detection - Deployment Helper"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_tools() {
    echo "📋 Checking required tools..."
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js and npm are installed${NC}"
}

# Deploy Frontend to Vercel
deploy_frontend() {
    echo ""
    echo "🎨 Deploying Frontend to Vercel..."
    echo "-----------------------------------"
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
        npm i -g vercel
    fi
    
    cd frontend
    
    echo "Building frontend..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Build successful${NC}"
        echo ""
        echo "Deploying to Vercel..."
        vercel --prod
    else
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
    
    cd ..
}

# Deploy Backend to Railway
deploy_backend() {
    echo ""
    echo "⚙️  Deploying Backend to Railway..."
    echo "-----------------------------------"
    
    if ! command -v railway &> /dev/null; then
        echo -e "${YELLOW}⚠️  Railway CLI not found.${NC}"
        echo "Install it with: npm i -g @railway/cli"
        echo "Then run: railway login"
        echo ""
        read -p "Do you want to install Railway CLI now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm i -g @railway/cli
            railway login
        else
            echo "Skipping backend deployment"
            return
        fi
    fi
    
    cd backend
    
    echo "Deploying to Railway..."
    railway up
    
    cd ..
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to deploy?"
    echo "1) Frontend only (Vercel)"
    echo "2) Backend only (Railway)"
    echo "3) Both Frontend and Backend"
    echo "4) Exit"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_frontend
            ;;
        2)
            deploy_backend
            ;;
        3)
            deploy_backend
            deploy_frontend
            ;;
        4)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            show_menu
            ;;
    esac
}

# Pre-deployment checklist
pre_deployment_check() {
    echo ""
    echo "📝 Pre-Deployment Checklist"
    echo "-----------------------------------"
    echo "Before deploying, ensure you have:"
    echo "✓ Updated frontend/.env.production with your backend URL"
    echo "✓ Set environment variables in Railway/Vercel dashboard"
    echo "✓ Deployed your smart contract to Sepolia"
    echo "✓ Updated backend/src/config/contract.json with contract address"
    echo ""
    read -p "Have you completed the checklist? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Please complete the checklist before deploying${NC}"
        exit 1
    fi
}

# Main execution
main() {
    check_tools
    pre_deployment_check
    show_menu
    
    echo ""
    echo -e "${GREEN}🎉 Deployment process completed!${NC}"
    echo ""
    echo "📚 Next Steps:"
    echo "1. Check your Vercel dashboard for frontend URL"
    echo "2. Check your Railway dashboard for backend URL"
    echo "3. Update frontend/.env.production with the backend URL"
    echo "4. Test your deployment"
    echo ""
    echo "📖 For detailed instructions, see VERCEL_DEPLOYMENT.md"
}

main
