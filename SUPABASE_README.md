# E-Deviser LXP - Supabase Migration

This project has been successfully migrated from Neon Database + Passport.js authentication to **Supabase** for both database and authentication.

## 🎉 Migration Summary

### What Changed
- **Database**: Migrated from Neon PostgreSQL to Supabase PostgreSQL
- **Authentication**: Migrated from Passport.js sessions to Supabase Auth
- **Real-time**: Added Supabase real-time capabilities
- **Security**: Implemented Row Level Security (RLS) policies
- **Demo Users**: Created quick demo login functionality

### What Stayed the Same
- **Core Functionality**: All OBE (Outcome-Based Education) features preserved
- **UI Components**: Same Shadcn/ui components and styling
- **Business Logic**: Learning outcomes, assignments, and progress tracking
- **Gamification**: XP, badges, and streak systems maintained

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment variables
cp .env.example .env.local

# Install dependencies
npm install
```

### 2. Supabase Setup
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or use existing: `https://farydblfbtxtzwjbpsuk.supabase.co`
3. Run the migration SQL script in Supabase SQL Editor:
   ```sql
   -- Copy and paste contents of supabase-migration.sql
   ```

### 3. Seed Demo Users
```bash
npm run seed:demo
```

### 4. Run Development Server
```bash
# For Supabase version (recommended)
npm run dev:supabase

# For original version (legacy)
npm run dev
```

## 🧑‍💻 Demo Users

The system comes with pre-configured demo accounts for quick testing:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | `admin@edeviser.demo` | `admin123` | System Administrator |
| **Coordinator** | `coordinator@edeviser.demo` | `coord123` | Program Coordinator |
| **Teacher** | `teacher@edeviser.demo` | `teacher123` | Course Teacher |
| **Student** | `student@edeviser.demo` | `student123` | Demo Student |

### Quick Demo Login
The auth page includes one-click demo login buttons for each role.

## 🏗️ Architecture Changes

### Database Schema
```sql
-- Main tables migrated to Supabase:
- profiles (extends auth.users)
- programs
- courses  
- learning_outcomes
- assignments
- student_progress
- badge_templates
- student_badges
```

### Authentication Flow
```typescript
// Old: Passport.js + Sessions
app.use(passport.authenticate('local'))

// New: Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})
```

### Row Level Security (RLS)
```sql
-- Example policies implemented:
- Users can view all profiles
- Users can only update their own profile
- Students can only see their own progress
- Teachers can manage their assigned courses
- Admins have full access to system data
```

## 🔧 Configuration

### Supabase Credentials
```env
NEXT_PUBLIC_SUPABASE_URL=https://farydblfbtxtzwjbpsuk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Switching Between Versions
In `client/src/main.tsx`:
```typescript
// Set to true for Supabase version, false for legacy
const USE_SUPABASE = true;
```

## 📁 New File Structure

```
├── client/src/
│   ├── hooks/
│   │   └── useSupabaseAuth.tsx      # New Supabase auth hook
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client config
│   │   ├── supabase-storage.ts      # Data access layer
│   │   └── demo-users.ts            # Demo user management
│   ├── pages/
│   │   ├── supabase-auth-page.tsx   # New auth page with demo login
│   │   └── supabase-dashboard.tsx   # New dashboard page
│   ├── SupabaseApp.tsx              # Main Supabase app component
│   └── main.tsx                     # Updated entry point
├── server/
│   └── supabase-admin.ts            # Server-side Supabase client
├── shared/
│   └── supabase-types.ts            # TypeScript types for database
├── scripts/
│   └── seed-demo-users.js           # Demo user seeding script
├── supabase-migration.sql           # Database migration script
└── .env.example                     # Environment variables template
```

## 🔐 Security Features

### Row Level Security Policies
- **Profiles**: Users can view all, update only their own
- **Programs**: Everyone can view active, admins/coordinators can manage
- **Courses**: Everyone can view, teachers manage their own
- **Student Progress**: Students see only their own data
- **Badges**: Everyone can view templates, admins manage

### Authentication Security
- Email verification required for new accounts
- JWT-based session management
- Automatic token refresh
- Secure password hashing by Supabase

## 🚀 Deployment

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Build Commands
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🐛 Troubleshooting

### Common Issues

1. **Auth Errors**: Check Supabase project URL and keys in `.env`
2. **Database Connection**: Verify Supabase project is active
3. **RLS Policies**: Ensure policies are applied correctly
4. **Demo Users**: Run `npm run seed:demo` if demo login fails

### Migration from Legacy
To migrate existing users from the legacy system:
1. Export user data from Neon database
2. Use Supabase Admin API to create users
3. Update references to new user IDs

### Debugging
```typescript
// Enable Supabase debug logging
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  auth: {
    debug: true
  }
})
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

## 🤝 Contributing

1. Keep both legacy and Supabase versions working
2. Test with all demo user roles
3. Verify RLS policies work correctly
4. Update documentation for any new features

---

**Migration Completed**: ✅ Your E-Deviser LXP is now running on Supabase with enhanced security, real-time capabilities, and demo user functionality!