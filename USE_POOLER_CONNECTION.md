# Use Session Pooler for IPv4 Compatibility

## The Problem

Your Supabase direct connection (port 5432) shows **"Not IPv4 compatible"**. Vercel runs on IPv4 networks, so it can't connect to IPv6-only databases.

## The Solution: Use Session Pooler

The Session Pooler (port 6543) is IPv4 compatible and works with Vercel.

## Step 1: Get Pooler Connection String from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"Connect"** button (top right) or go to **Settings** → **Database**
4. In the connection string page:
   - **Type:** Keep as "URI"
   - **Source:** Keep as "Primary Database"  
   - **Method:** Change to **"Session Pooler"** (NOT "Direct connection")
5. Copy the connection string - it should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   OR
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
   ```

## Step 2: Update DATABASE_URL in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `DATABASE_URL` and click to edit
3. **Replace** the entire value with the **Session Pooler** connection string from Supabase
4. Make sure the password is URL-encoded if it has special characters:
   - `&` → `%26`
   - `+` → `%2B`
5. Click **Save**

## Step 3: Verify the Connection String

Your `DATABASE_URL` should:
- Use port **6543** (not 5432)
- Include `pgbouncer=true` parameter (or the code will add it)
- Have the password URL-encoded if needed

## Step 4: Redeploy

1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

## Step 5: Test

After redeploy, test:
```
https://meeting-notes-ai-rust.vercel.app/api/test-db
```

You should see `{"success": true}`.

## Important Notes

- **Session Pooler** works with Prisma adapter
- It's designed for serverless environments like Vercel
- It's IPv4 compatible (unlike direct connection)
- The code will automatically add `pgbouncer=true` if it's missing

## If It Still Doesn't Work

1. Double-check the connection string format from Supabase
2. Make sure you're using **Session Pooler**, not Transaction Pooler
3. Verify the password is correctly URL-encoded
4. Check Vercel logs for connection errors

