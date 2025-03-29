
# Deployment Guide for Digitalshopi Client Management on Netlify

This guide will help you deploy the Digitalshopi Client Management application on Netlify.

## Prerequisites

1. Create a Netlify account at [netlify.com](https://netlify.com) if you don't already have one.
2. Make sure your project is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

## Step 1: Prepare Your Project

Before deploying, make sure your project is ready:

1. Ensure all dependencies are correctly listed in your `package.json`.
2. Verify that your application builds successfully locally with `npm run build`.
3. Create a `netlify.toml` file in the root of your project with the following content:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This configuration tells Netlify how to build your project and ensures that all routes are redirected to your single-page app.

## Step 2: Deploy to Netlify

### Option 1: Deploy via Netlify UI

1. Log in to your Netlify account.
2. Click the "Add new site" button and select "Import an existing project".
3. Connect to your Git provider and select your repository.
4. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click "Deploy site".

### Option 2: Deploy via Netlify CLI

1. Install the Netlify CLI globally:
   ```
   npm install -g netlify-cli
   ```

2. Log in to your Netlify account:
   ```
   netlify login
   ```

3. Initialize your project:
   ```
   netlify init
   ```

4. Follow the prompts to set up your site.

5. Deploy your site:
   ```
   netlify deploy --prod
   ```

## Step 3: Environment Variables

Since your application uses Supabase, you need to set the following environment variables in Netlify:

1. Go to your site settings in Netlify.
2. Navigate to "Build & deploy" > "Environment variables".
3. Add the following variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Step 4: Custom Domain (Optional)

To set up a custom domain:

1. Go to your site settings in Netlify.
2. Navigate to "Domain management" > "Domains".
3. Click "Add custom domain".
4. Follow the instructions to configure your domain's DNS settings.

## Step 5: Continuous Deployment

Netlify automatically sets up continuous deployment from your Git repository. When you push changes to your repository:

1. Netlify automatically detects the changes.
2. It builds your application using the specified build command.
3. If the build succeeds, it deploys the new version of your application.

## Troubleshooting

If you encounter issues during deployment:

1. Check the build logs in Netlify for errors.
2. Verify that your environment variables are correctly set.
3. Ensure your application builds correctly locally with the same Node.js version Netlify uses.
4. If routes are not working, check your redirects configuration in the `netlify.toml` file.

## Important Notes

- For security, never commit sensitive information like API keys directly in your code. Always use environment variables.
- For large media files or assets, consider using Supabase Storage or a CDN.
- Regularly check your site's performance in Netlify Analytics to optimize user experience.

By following this guide, you should have your Digitalshopi Client Management application successfully deployed on Netlify!
