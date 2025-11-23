# Check Supabase Project Status

## Critical: Is Your Project Paused?

Supabase free tier projects **automatically pause after 7 days of inactivity**. This is the #1 cause of "Can't reach database server" errors.

## How to Check:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Look at your project list
3. If you see **"Paused"** or a **pause icon** next to your project, click **"Restore"** or **"Resume"**

## How to Restore:

1. Click on your paused project
2. You'll see a message like "This project is paused"
3. Click the **"Restore project"** button
4. Wait 1-2 minutes for it to resume
5. Try your connection again

## Alternative: Check Project Settings

1. Go to **Settings** → **General**
2. Look for project status
3. If paused, you'll see a restore option

## After Restoring:

1. Wait 2-3 minutes for the database to fully resume
2. Test the connection: `https://meeting-notes-ai-rust.vercel.app/api/test-db`
3. Try logging in again

## Prevention:

- Free tier projects pause after 7 days of no activity
- To prevent pausing, you can:
  - Upgrade to Pro plan ($25/month)
  - Or make sure to use the project at least once per week

