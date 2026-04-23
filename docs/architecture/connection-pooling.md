# Connection Pooling Configuration (Task 90)

## Supabase PgBouncer Setup

Supabase projects include PgBouncer as a built-in connection pooler. It sits between your application and PostgreSQL, reusing database connections to prevent exhaustion under load.

## Connection Strings

| Mode | Port | Use Case |
|------|------|----------|
| Transaction mode (pooled) | 6543 | Application queries, Edge Functions, serverless |
| Session mode (direct) | 5432 | Migrations, long-running queries, LISTEN/NOTIFY |

Use the **pooled connection string** (port 6543) for all application traffic. Use the **direct connection** (port 5432) only for migrations and admin tasks.

## Pool Size Recommendations

| Plan | Max Pool Size | Recommended `pool_size` | Notes |
|------|--------------|------------------------|-------|
| Free | 15 | 10–12 | Leave headroom for migrations and admin |
| Pro | 50 | 35–40 | Sufficient for moderate production traffic |
| Team | 100 | 70–80 | Scale with connection monitoring |

## Configuration

Pool settings are managed in the Supabase Dashboard under **Settings → Database → Connection Pooling**.

Key parameters:
- **Pool Mode**: `transaction` (recommended for web apps)
- **Default Pool Size**: Set per plan tier above
- **Ignore Startup Parameters**: Leave default unless specific extensions require it

## Best Practices

1. **Always use pooled connections** in application code and Edge Functions
2. **Set `pool_size`** below the plan maximum to leave room for direct connections
3. **Monitor connection usage** via the Supabase Dashboard metrics
4. **Use `statement_timeout`** to prevent long-running queries from holding connections:
   ```sql
   ALTER ROLE authenticator SET statement_timeout = '30s';
   ```
5. **Avoid session-level features** in pooled mode (prepared statements, temp tables, advisory locks)
6. **Edge Functions** automatically use the pooled connection — no extra config needed

## Monitoring

Check active connections:
```sql
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

Check waiting connections:
```sql
SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL;
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "too many connections" | Pool exhausted | Increase pool size or optimize query duration |
| Slow query starts | Connection queue full | Add connection timeout, optimize slow queries |
| Prepared statement errors | Using session features in transaction mode | Switch to direct connection or avoid prepared statements |
