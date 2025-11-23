# Deployment Checklist

## Pre-Deployment

- [ ] All environment variables are documented in `env.template.txt`
- [ ] Database migrations are up to date
- [ ] `.env.local` is in `.gitignore` (should not be committed)
- [ ] Code is tested locally
- [ ] No hardcoded secrets in code

## Vercel Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Production ready"
git push origin main
```

### 2. Create Vercel Project
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Framework: Next.js (auto-detected)
5. Root Directory: `./` (default)

### 3. Environment Variables
Add these in Vercel Dashboard → Settings → Environment Variables:

**Required:**
- `DATABASE_URL` - Your Supabase PostgreSQL connection string
- `NEXTAUTH_URL` - Your Vercel URL: `https://your-app.vercel.app`
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXT_PUBLIC_APP_URL` - Your Vercel URL: `https://your-app.vercel.app`
- `BLOB_READ_WRITE_TOKEN` - From Vercel Blob dashboard
- `OPENAI_API_KEY` - Your OpenAI API key

**Microsoft Teams:**
- `AZURE_CLIENT_ID` - From Azure AD app registration
- `AZURE_CLIENT_SECRET` - From Azure AD app registration
- `AZURE_TENANT_ID` - From Azure AD app registration

**Optional (Stripe):**
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - From Stripe webhook settings
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key

**Optional (Google OAuth):**
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

### 4. Update Azure AD Redirect URI
1. Go to [Azure Portal](https://portal.azure.com)
2. Azure Active Directory → App registrations → Your App
3. Authentication → Redirect URIs
4. Add: `https://your-app.vercel.app/api/auth/microsoft`
5. Save

### 5. Deploy
1. Click "Deploy" in Vercel
2. Wait for build to complete
3. Check deployment logs for errors

### 6. Post-Deployment

- [ ] Test login functionality
- [ ] Test Teams connection
- [ ] Test file upload
- [ ] Verify database connections
- [ ] Check webhook endpoint (should be accessible via HTTPS)
- [ ] Test a meeting upload and processing

## Database Setup

### Initial Migration
```bash
# In Vercel, run via CLI or add to build command:
npx prisma generate
npx prisma db push
```

Or use Prisma Migrate:
```bash
npx prisma migrate deploy
```

## Troubleshooting

### Build Fails
- Check environment variables are set
- Verify `DATABASE_URL` is accessible from Vercel
- Check build logs for specific errors

### Database Connection Issues
- Ensure Supabase allows connections from Vercel
- Check connection string format
- Verify SSL settings

### Teams Integration Issues
- Verify redirect URI matches exactly (including https://)
- Check Azure AD permissions are granted
- Ensure webhook URL is HTTPS

## Monitoring

- Check Vercel logs for errors
- Monitor database connections
- Track OpenAI API usage
- Monitor webhook deliveries

## Rollback

If deployment fails:
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

