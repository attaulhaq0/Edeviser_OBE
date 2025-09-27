#!/bin/bash

# E-Deviser LXP - Vercel Deployment Script
# Run this script to deploy your project to Vercel

echo "🚀 E-Deviser LXP - Vercel Deployment"
echo "===================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Test build locally first
echo "🔨 Testing build process..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Ready for deployment."
    echo ""
    echo "🌐 Deploying to Vercel..."
    vercel --prod
    echo ""
    echo "🎉 Deployment complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Add environment variables in Vercel dashboard:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo "   - NODE_ENV=production"
    echo ""
    echo "2. Test your deployment with demo login buttons"
    echo "3. Verify Supabase integration works"
else
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi