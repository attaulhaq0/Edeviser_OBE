# Supabase Database Setup Instructions

## 1. Database Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/farydblfbtxtzwjbpsuk
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the entire contents of `supabase-migration.sql`
5. Run the query

This will create:
- All necessary tables (profiles, programs, courses, etc.)
- Row Level Security (RLS) policies
- Triggers for updated_at columns
- Function to handle new user signup

## 2. Demo Users

Demo users have been created successfully! ✅

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@edeviser.demo | admin123 |
| Coordinator | coordinator@edeviser.demo | coord123 |
| Teacher | teacher@edeviser.demo | teacher123 |
| Student | student@edeviser.demo | student123 |

## 3. Start Development Server

```bash
npm run dev:supabase
```

The app will run on http://localhost:5173 with Supabase integration enabled.

## 4. Testing

1. Go to http://localhost:5173
2. You'll see the new Supabase auth page with demo login buttons
3. Click any demo login button to instantly log in with that role
4. The dashboard will show your profile information and role-specific features

## Troubleshooting

If you encounter any issues:

1. **Database Connection**: Make sure the SQL migration has been run in Supabase
2. **Auth Issues**: Verify that demo users exist in Supabase Auth dashboard
3. **RLS Policies**: Check that RLS is enabled and policies are applied correctly

## Next Steps

- The existing functionality is preserved
- All original features work with Supabase backend
- Real-time capabilities are now enabled
- Enhanced security with RLS policies