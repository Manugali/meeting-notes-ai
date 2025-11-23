# Meeting Notes AI

AI-powered meeting summarization tool that automatically transcribes and summarizes meeting recordings from Microsoft Teams or manual uploads.

## Features

- 🎙️ **Automatic Transcription** - Uses OpenAI Whisper for accurate transcription
- 📝 **AI Summarization** - GPT-4 powered summaries with action items and key decisions
- 🔗 **Microsoft Teams Integration** - Automatic processing of Teams meeting recordings
- 📤 **Manual Upload** - Upload audio/video files for processing
- 💳 **Subscription Plans** - Stripe integration for monetization
- 🔐 **Secure Authentication** - NextAuth.js with multiple providers

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 7
- **Authentication**: NextAuth.js v5
- **AI**: OpenAI (Whisper + GPT-4o-mini)
- **Storage**: Vercel Blob
- **Payments**: Stripe
- **Styling**: Tailwind CSS

## Prerequisites

- Node.js 18+ 
- PostgreSQL database (Supabase recommended)
- OpenAI API key
- Vercel account (for Blob storage)
- Azure AD app registration (for Teams integration)
- Stripe account (optional, for payments)

## Environment Variables

Copy `.env.local` from `env.template.txt` and fill in:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="generate-a-random-secret"

# App URL
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe (optional)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Microsoft Teams / Azure AD
AZURE_CLIENT_ID="your-client-id"
AZURE_CLIENT_SECRET="your-client-secret"
AZURE_TENANT_ID="your-tenant-id"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Production ready"
git push origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or leave default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### Step 3: Add Environment Variables

In Vercel dashboard → Settings → Environment Variables, add all variables from `.env.local`:

- `DATABASE_URL`
- `NEXTAUTH_URL` (use your Vercel URL: `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` (use your Vercel URL)
- `BLOB_READ_WRITE_TOKEN`
- `OPENAI_API_KEY`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`
- (Optional) Stripe keys
- (Optional) Google OAuth keys

### Step 4: Update Azure AD Redirect URI

1. Go to Azure Portal → App Registrations → Your App
2. Authentication → Redirect URIs
3. Add: `https://your-app.vercel.app/api/auth/microsoft`
4. Save

### Step 5: Deploy

Click "Deploy" and wait for build to complete.

## Database Migrations

For production database changes:

```bash
# Create migration
npx prisma migrate dev --name migration-name

# Apply to production (after deployment)
npx prisma migrate deploy
```

## Project Structure

```
meeting-notes-ai/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── login/             # Auth pages
├── components/            # React components
├── lib/                   # Utilities and helpers
├── prisma/                # Database schema
└── types/                 # TypeScript types
```

## Security Notes

- Never commit `.env.local` or `.env` files
- Use strong `NEXTAUTH_SECRET` in production
- Enable HTTPS only (Vercel does this automatically)
- Use production Stripe keys in production
- Rotate secrets regularly

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` is correct
- Ensure database allows connections from Vercel IPs
- For Supabase, use direct connection (not pooler) with Prisma adapter

### Teams Integration Not Working
- Verify Azure AD app has correct permissions
- Check redirect URI matches exactly
- Ensure webhook URL uses HTTPS (production only)

### OpenAI Errors
- Check API key is valid
- Verify account has credits
- Check rate limits

## License

MIT

