# Fixing Supabase Database Connection in Production

## Error: "Can't reach database server" (P1001)

This error means Vercel cannot connect to your Supabase database. Follow these steps:

## Step 1: Verify DATABASE_URL in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Check that `DATABASE_URL` exists and is set to:
   ```
   postgresql://postgres:5y5CfV&ww+5M46y@db.lbhnxzijbttrdvcdmfdr.supabase.co:5432/postgres
   ```
3. Make sure it's enabled for **Production**, **Preview**, and **Development**
4. **Important**: The password contains special characters (`&`). Make sure it's URL-encoded or wrapped in quotes in Vercel

## Step 2: Check Supabase IP Restrictions

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `lbhnxzijbttrdvcdmfdr`
3. Go to **Settings** → **Database** → **Connection Pooling**
4. Check **"Restrict connections to specific IP addresses"**
5. **If enabled**, you have two options:

   **Option A: Allow All IPs (Recommended for now)**
   - Disable IP restrictions
   - Or add `0.0.0.0/0` to allow all IPs
   - ⚠️ Less secure, but works for testing

   **Option B: Add Vercel IP Ranges**
   - Vercel uses dynamic IPs, so this is complex
   - Better to disable restrictions for serverless

## Step 3: Verify Supabase Project Status

1. In Supabase Dashboard, check if your project is **paused**
2. If paused, click **"Restore"** to resume it
3. Free tier projects pause after inactivity

## Step 4: Test Connection String Format

Your connection string should be:
```
postgresql://postgres:5y5CfV&ww+5M46y@db.lbhnxzijbttrdvcdmfdr.supabase.co:5432/postgres
```

**Note**: If the password has special characters, you might need to URL-encode it:
- `&` becomes `%26`
- So: `5y5CfV%26ww%2B5M46y`

Try both formats in Vercel if one doesn't work.

## Step 5: Check Vercel Logs

After redeploying, check Vercel logs:
1. Go to **Vercel Dashboard** → Your Project → **Logs**
2. Look for `[DB] Attempting connection to:` message
3. Check for any connection errors

## Step 6: Alternative - Use Supabase Connection Pooler

If direct connection doesn't work, try the pooler URL (port 6543):
```
postgresql://postgres:5y5CfV&ww+5M46y@db.lbhnxzijbttrdvcdmfdr.supabase.co:6543/postgres?pgbouncer=true
```

However, with Prisma 7 adapter, direct connection (port 5432) is recommended.

## Quick Checklist

- [ ] DATABASE_URL is set in Vercel environment variables
- [ ] DATABASE_URL is enabled for Production environment
- [ ] Supabase IP restrictions are disabled or allow Vercel IPs
- [ ] Supabase project is not paused
- [ ] Connection string format is correct
- [ ] Password is properly encoded (if it has special characters)
- [ ] Vercel deployment has completed after adding variables

## Still Not Working?

1. **Double-check the password**: Copy it directly from Supabase
2. **Try regenerating the connection string** in Supabase:
   - Settings → Database → Connection string
   - Copy the "URI" format
3. **Check Supabase status page**: [status.supabase.com](https://status.supabase.com)
4. **Contact Supabase support** if the issue persists

