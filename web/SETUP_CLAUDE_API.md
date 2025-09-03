# Setting up Claude API for AI Analysis

The AI trend analyzer uses Claude Sonnet 3.5 to provide intelligent analysis of trends. For it to work in production, you need to add the API key to Vercel.

## Steps to Enable Claude AI Analysis:

### 1. Go to Vercel Dashboard
- Visit https://vercel.com/dashboard
- Select your WaveSight project

### 2. Navigate to Settings
- Click on the "Settings" tab
- Go to "Environment Variables" in the left sidebar

### 3. Add the API Key
Add a new environment variable:
- **Name:** `ANTHROPIC_API_KEY`
- **Value:** `[Your Anthropic API key - get one from https://console.anthropic.com/]`
- **Environment:** Select all (Production, Preview, Development)

Note: The API key should start with `sk-ant-api` and is available in your local `.env.local` file.

### 4. Redeploy
After adding the environment variable:
- Go to the "Deployments" tab
- Click on the three dots next to your latest deployment
- Select "Redeploy"
- Or push a new commit to trigger automatic deployment

## Testing the AI Analyzer

Once deployed, the AI analyzer should:
1. Show real Claude analysis instead of generic text
2. Provide specific insights about trends
3. Give virality scores based on actual analysis
4. Offer cultural context and predictions

## What You'll See When It Works:

Instead of generic text like:
> "📱 What's Going On Here? [trend] is showing moderate growth..."

You'll see specific Claude analysis like:
> "📱 What's Going On Here? This trend taps into Gen Z's nostalgia for early 2000s aesthetics while subverting them with modern irony. The audio's minor key progression creates an emotional hook that makes viewers watch multiple times..."

## Troubleshooting:

If you still see generic/fallback analysis:
1. Check Vercel logs for errors mentioning "ANTHROPIC_API_KEY"
2. Ensure the environment variable is set correctly in Vercel
3. Make sure you redeployed after adding the variable
4. Check browser console for any API errors

## Security Note:
The API key in `.env.production` is only used for local development. Vercel uses its own environment variables for production, which are more secure.