# Deploying to GitHub

This guide will help you push your Fugue State project to GitHub.

## Prerequisites

- A GitHub account
- Git installed on your machine (already done ✓)
- Your code committed locally (already done ✓)

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the repository details:
   - **Repository name**: `fugue-state` (or your preferred name)
   - **Description**: "FugueState.ai - An experiment in memory, creativity, and machine dreaming"
   - **Visibility**: Choose **Private** (recommended) or **Public**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 2: Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these commands in your terminal:

```bash
cd "/Users/kriszwart/Documents/ZWARTIFY PRODUCTS/FUGUE STATE"

# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fugue-state.git

# Or if you prefer SSH (requires SSH key setup):
# git remote add origin git@github.com:YOUR_USERNAME/fugue-state.git

# Push your code to GitHub
git push -u origin main
```

## Step 3: Verify the Push

1. Go to your GitHub repository page
2. You should see all your files listed
3. Check that sensitive files (like `.env`, `gcp/keys/`) are NOT visible (they should be in `.gitignore`)

## Important: Protecting Sensitive Information

Before pushing, make sure these files are NOT in your repository:

- ✅ `.env` files (already in `.gitignore`)
- ✅ `.env.production` (already in `.gitignore`)
- ✅ `gcp/keys/` directory (already in `.gitignore`)
- ✅ Any service account JSON files (already in `.gitignore`)

## Optional: Set Up GitHub Actions for Deployment

If you want to automatically deploy to Cloud Run when you push to GitHub, you can set up GitHub Actions. See `CLOUD_RUN_DEPLOYMENT.md` for details.

## Future Updates

To push future changes:

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "Description of your changes"

# Push to GitHub
git push
```

## Troubleshooting

### If you get "remote origin already exists"
```bash
# Remove the existing remote
git remote remove origin

# Add it again with the correct URL
git remote add origin https://github.com/YOUR_USERNAME/fugue-state.git
```

### If you get authentication errors
- For HTTPS: GitHub may prompt for username/password. Use a Personal Access Token instead of password
- For SSH: Make sure you've set up SSH keys with GitHub

### To check your remote URL
```bash
git remote -v
```

## Next Steps

After pushing to GitHub, you can:
1. Set up GitHub Actions for CI/CD
2. Configure branch protection rules
3. Add collaborators
4. Set up automated deployments (see `CLOUD_RUN_DEPLOYMENT.md`)


