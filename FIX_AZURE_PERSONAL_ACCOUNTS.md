# Fix Azure AD to Allow Personal Microsoft Accounts

## The Problem

You're getting error: **"AADSTS50020: User account does not exist in tenant"**

This happens because your Azure AD app is configured for a specific tenant, but you're trying to sign in with a personal Microsoft account (@gmail.com, @live.com, @outlook.com).

## Solution: Enable Personal Microsoft Accounts

### Step 1: Go to Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with your Azure account (the one you used to create the app)
3. Go to **Azure Active Directory** → **App registrations**
4. Find and click on your app: **"Meeting Notes AI"** (or the app name you created)

### Step 2: Change Supported Account Types

1. In your app registration, click **"Authentication"** in the left menu
2. Scroll down to **"Supported account types"**
3. You'll see options like:
   - **"Accounts in this organizational directory only"** (Single tenant)
   - **"Accounts in any organizational directory"** (Multi-tenant)
   - **"Accounts in any organizational directory and personal Microsoft accounts"** ← **SELECT THIS ONE**
4. Select: **"Accounts in any organizational directory and personal Microsoft accounts"**
5. This allows both work/school accounts AND personal Microsoft accounts (@gmail.com, @live.com, etc.)

### Step 3: Update Redirect URIs (if needed)

While you're in Authentication:
1. Make sure this redirect URI is added:
   ```
   https://meeting-notes-ai-rust.vercel.app/api/auth/microsoft
   ```
2. Also add for local development (optional):
   ```
   http://localhost:3000/api/auth/microsoft
   ```
3. Click **"Save"**

### Step 4: Update API Permissions (if needed)

1. Go to **"API permissions"** in the left menu
2. Make sure you have these permissions:
   - `User.Read` (Delegated)
   - `OnlineMeetings.Read` (Delegated)
   - `offline_access` (Delegated)
3. Click **"Grant admin consent"** if needed (for your organization)

### Step 5: Redeploy Vercel (if you changed anything)

After making changes in Azure:
1. Go to Vercel → Deployments
2. Click "..." → "Redeploy"
3. Wait 2-3 minutes

### Step 6: Try Again

1. Go back to your app: `https://meeting-notes-ai-rust.vercel.app/dashboard`
2. Click **"Connect Teams"**
3. You should now be able to sign in with:
   - Personal Microsoft accounts (@gmail.com, @live.com, @outlook.com)
   - Work/school accounts in any organization

## Alternative: Use a Work/School Account

If you don't want to allow personal accounts, you can:
1. Use a work or school Microsoft account that's in the same tenant
2. Or create a test user in your Azure AD tenant

## Important Notes

- **Multi-tenant apps** can be accessed by users from any organization
- **Personal Microsoft accounts** are separate from organizational accounts
- Enabling personal accounts makes your app accessible to anyone with a Microsoft account
- This is fine for a SaaS product - it's what most apps do

## After Making Changes

1. Wait 1-2 minutes for Azure changes to propagate
2. Clear your browser cache/cookies for Microsoft login
3. Try connecting Teams again

