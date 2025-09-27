# E-Deviser LXP - Quick Commands for GitHub + Vercel Deployment
# Copy and paste these commands in your terminal

# =====================================
# STEP 1: Initialize Git & Create Repo
# =====================================

# Initialize Git repository
git init
git add .
git commit -m "Initial commit: E-Deviser LXP with Supabase integration"

# If you have GitHub CLI installed:
gh auth login
gh repo create e-deviser-lxp --public --push

# If you don't have GitHub CLI, create repo manually at:
# https://github.com/new
# Then run:
# git remote add origin https://github.com/YOUR_USERNAME/e-deviser-lxp.git
# git branch -M main
# git push -u origin main

# =====================================
# STEP 2: Deploy to Vercel
# =====================================

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# =====================================
# STEP 3: Environment Variables
# =====================================

# Add these in Vercel Dashboard → Settings → Environment Variables:
# VITE_SUPABASE_URL=https://farydblfbtxtzwjbpsuk.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnlkYmxmYnR4dHp3amJwc3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3NDc1NTMsImV4cCI6MjA1MzMyMzU1M30.K3iY4ZOtP5I_VGFJcOeqcyDBHE9cFNj0Jy6HjYy6O4E
# NODE_ENV=production

# =====================================
# STEP 4: Test Your Deployment
# =====================================

# Your app will be available at:
# https://your-app-name.vercel.app

# Features to test:
# ✅ Demo login buttons
# ✅ Supabase authentication
# ✅ Responsive design
# ✅ All 4 user roles