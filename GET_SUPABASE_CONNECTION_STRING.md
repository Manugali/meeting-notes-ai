# Get Correct Connection String from Supabase

## Step 1: Get Connection String from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **meeting-notes-ai** (or the project name)
3. Go to **Settings** → **Database**
4. Scroll down to **Connection string** section
5. Look for **"URI"** format (not "Session mode" or "Transaction mode")
6. Copy the connection string - it should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## Step 2: Important Notes

- **Direct Connection (port 5432)**: Use this for Prisma adapter
- **Pooler Connection (port 6543)**: Don't use this with Prisma adapter
- Make sure you're copying the **direct connection** string

## Step 3: Update Vercel

1. Copy the **exact** connection string from Supabase
2. Go to Vercel → Settings → Environment Variables
3. Update `DATABASE_URL` with the exact string from Supabase
4. **Don't modify it** - use it exactly as Supabase provides it
5. Save and redeploy

## Step 4: If Password Has Special Characters

If the connection string from Supabase has special characters in the password:
- Supabase might already provide it URL-encoded
- Or you might need to URL-encode it manually:
  - `&` → `%26`
  - `+` → `%2B`
  - `@` → `%40`

## Alternative: Use Connection Pooling URL

If direct connection doesn't work, you can try the **Connection Pooling** URL:
1. In Supabase → Settings → Database
2. Look for **"Connection Pooling"** section
3. Copy the **"Transaction"** mode connection string
4. But note: This might not work with Prisma adapter

## What to Check

1. Is the connection string from Supabase the **direct connection** (port 5432)?
2. Does it match what you have in Vercel?
3. Are there any differences in the hostname or format?

