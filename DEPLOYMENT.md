# E-Deviser LXP - Vercel Deployment Guide

## 🚀 Quick Deployment to Vercel

This guide will help you deploy your E-Deviser Learning Management System to Vercel.

### Prerequisites
- GitHub account
- Vercel account (free)
- Your Supabase project is set up and running

## Step 1: Prepare Your Repository

1. **Push to GitHub** (if not already done):
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy from your project directory
vercel

# Follow the prompts:
# - Link to existing project? N
# - Project name: e-deviser-lxp (or your choice)
# - Directory: ./ (current directory)
# - Build settings: Use default
```

### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

## Step 3: Configure Environment Variables

In your Vercel project dashboard, add these environment variables:

```bash
VITE_SUPABASE_URL=https://farydblfbtxtzwjbpsuk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnlkYmxmYnR4dHp3amJwc3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3NDc1NTMsImV4cCI6MjA1MzMyMzU1M30.K3iY4ZOtP5I_VGFJcOeqcyDBHE9cFNj0Jy6HjYy6O4E
NODE_ENV=production
```

## Step 4: Test Your Deployment

After deployment:
1. Visit your Vercel URL
2. Test the demo login buttons
3. Verify Supabase connection works
4. Check all authentication flows

## 🔧 Configuration Files Created

- `vercel.json` - Vercel deployment configuration
- `.env.production` - Production environment template
- Updated `.gitignore` - Clean deployment files
- Updated `package.json` - Optimized build scripts

## 📱 Features Available After Deployment

✅ **Authentication System** - Supabase Auth integration
✅ **Demo Login Buttons** - Quick access to all 4 roles
✅ **Responsive Design** - Works on all devices
✅ **Database Integration** - Full Supabase functionality
✅ **Role-Based Access** - Admin, Coordinator, Teacher, Student

## 🎯 Demo Credentials

Once deployed, users can quickly test with:
- **Admin**: System Administrator
- **Coordinator**: Program Coordinator
- **Teacher**: Course Teacher
- **Student**: Demo Student

## 🔄 Automatic Deployments

Vercel will automatically redeploy when you push to your main branch:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Ensure Supabase is accessible
4. Check network/CORS settings

---

**Your E-Deviser LXP is ready for the world! 🌍**