@echo off
echo 🚀 E-Deviser LXP - Vercel Deployment
echo ====================================

REM Check if vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
)

REM Test build locally first
echo 🔨 Testing build process...
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo ✅ Build successful! Ready for deployment.
    echo.
    echo 🌐 Deploying to Vercel...
    call vercel --prod
    echo.
    echo 🎉 Deployment complete!
    echo.
    echo 📋 Next steps:
    echo 1. Add environment variables in Vercel dashboard:
    echo    - VITE_SUPABASE_URL
    echo    - VITE_SUPABASE_ANON_KEY
    echo    - NODE_ENV=production
    echo.
    echo 2. Test your deployment with demo login buttons
    echo 3. Verify Supabase integration works
) else (
    echo ❌ Build failed! Please check the errors above.
    exit /b 1
)

pause