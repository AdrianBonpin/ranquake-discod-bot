# Security Guidelines

## 🔐 Environment Variables

This project uses environment variables for sensitive configuration. **Never commit your `.env` file or expose your API keys.**

### Required Variables

-   `DISCORD_BOT_TOKEN` - Your Discord bot token (keep secret!)
-   `CLIENT_ID` - Your Discord application client ID
-   `GROQ_API_KEY` - Your Groq API key for AI features

### Optional Variables

-   `MAPBOX_API_KEY` - For enhanced earthquake maps (recommended)
-   `GUILD_ID` - For development/testing in a specific server
-   `CHANNEL_ID` - For development/testing
-   `DB_PATH` - Custom database location
-   `POLLING_INTERVAL_MINUTES` - How often to check for earthquakes (default: 5)

### Setup

1. Copy `.env.example` to `.env`:

    ```bash
    cp .env.example .env
    ```

2. Fill in your actual API keys in `.env`

3. **Never commit `.env` to git** - it's already in `.gitignore`

### If You Accidentally Expose Secrets

If you accidentally commit secrets to git:

1. **Immediately rotate all exposed credentials:**

    - Discord: Regenerate bot token at [Discord Developer Portal](https://discord.com/developers/applications)
    - Mapbox: Revoke and create new token at [Mapbox Account](https://account.mapbox.com/)
    - Groq: Revoke and create new key at [Groq Console](https://console.groq.com/)

2. **Remove from git history:**

    ```bash
    # Option 1: Using BFG Repo Cleaner (recommended)
    # Download from https://rtyley.github.io/bfg-repo-cleaner/
    bfg --delete-files .env
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive

    # Option 2: Using git filter-branch
    git filter-branch --force --index-filter \
      "git rm --cached --ignore-unmatch .env" \
      --prune-empty --tag-name-filter cat -- --all
    ```

3. **Force push to all remotes:**

    ```bash
    git push origin --force --all
    git push origin --force --tags
    ```

4. Update your `.env` with the new credentials

## 🛡️ Best Practices

-   ✅ Use `.env.example` as a template (no real secrets)
-   ✅ Keep `.env` in `.gitignore`
-   ✅ Rotate keys regularly
-   ✅ Use different keys for development and production
-   ✅ Limit API key permissions to only what's needed
-   ❌ Never share your `.env` file
-   ❌ Never commit secrets to git
-   ❌ Never post secrets in issues or discussions

## 📞 Reporting Security Issues

If you discover a security vulnerability, please email the maintainer directly rather than opening a public issue.
