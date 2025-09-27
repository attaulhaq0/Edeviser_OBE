# E-Deviser LXP - PowerShell Deployment Script
# Run this script in PowerShell as Administrator

Write-Host "🚀 E-Deviser LXP - Automated Deployment Setup" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git first." -ForegroundColor Red
    Write-Host "Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    pause
    exit
}

# Initialize Git repository
Write-Host "📦 Initializing Git repository..." -ForegroundColor Green
git init
git add .
git commit -m "Initial commit: E-Deviser LXP with Supabase integration"

# Check if GitHub CLI is installed
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "🔧 GitHub CLI found! Setting up repository..." -ForegroundColor Green
    
    # Check if user is logged in
    $ghStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "🔑 Please login to GitHub CLI..." -ForegroundColor Yellow
        gh auth login
    }
    
    # Create repository
    Write-Host "📂 Creating GitHub repository..." -ForegroundColor Green
    gh repo create e-deviser-lxp --public --push
    
} else {
    Write-Host "⚠️  GitHub CLI not found. Manual setup required:" -ForegroundColor Yellow
    Write-Host "1. Go to https://github.com/new" -ForegroundColor White
    Write-Host "2. Repository name: e-deviser-lxp" -ForegroundColor White
    Write-Host "3. Set to Public" -ForegroundColor White
    Write-Host "4. Click 'Create repository'" -ForegroundColor White
    Write-Host "5. Follow the push instructions shown" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter after creating the GitHub repository..."
}

# Check if Vercel CLI is installed
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Green
    npm install -g vercel
}

# Deploy to Vercel
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Green
Write-Host "You'll need to login to Vercel and follow the prompts." -ForegroundColor Yellow
vercel --prod

Write-Host ""
Write-Host "🎉 Deployment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Final steps:" -ForegroundColor Cyan
Write-Host "1. Go to your Vercel dashboard" -ForegroundColor White
Write-Host "2. Add environment variables:" -ForegroundColor White
Write-Host "   - VITE_SUPABASE_URL=https://farydblfbtxtzwjbpsuk.supabase.co" -ForegroundColor Gray
Write-Host "   - VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnlkYmxmYnR4dHp3amJwc3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3NDc1NTMsImV4cCI6MjA1MzMyMzU1M30.K3iY4ZOtP5I_VGFJcOeqcyDBHE9cFNj0Jy6HjYy6O4E" -ForegroundColor Gray
Write-Host "   - NODE_ENV=production" -ForegroundColor Gray
Write-Host "3. Test your live app!" -ForegroundColor White
Write-Host ""

pause