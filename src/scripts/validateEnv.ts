// scripts/validateEnv.ts
// Validates that all required environment variables are present

/**
 * Validates that all required environment variables are set
 * @throws {Error} If any required variables are missing
 */
export function validateEnvironment(): void {
    const required = ["DISCORD_BOT_TOKEN", "CLIENT_ID", "GROQ_API_KEY"]

    const optional = [
        "MAPBOX_API_KEY",
        "GUILD_ID",
        "CHANNEL_ID",
        "DB_PATH",
        "POLLING_INTERVAL_MINUTES",
    ]

    const missing: string[] = []
    const warnings: string[] = []

    // Check required variables
    for (const varName of required) {
        if (!process.env[varName]) {
            missing.push(varName)
        }
    }

    // Check optional variables and warn if missing
    for (const varName of optional) {
        if (!process.env[varName]) {
            warnings.push(varName)
        }
    }

    // Report missing required variables
    if (missing.length > 0) {
        console.error("❌ ERROR: Missing required environment variables:")
        missing.forEach((v) => console.error(`   - ${v}`))
        console.error(
            "\nPlease check your .env file or environment configuration."
        )
        console.error("See .env.example for reference.\n")
        throw new Error("Missing required environment variables")
    }

    // Report warnings for optional variables
    if (warnings.length > 0) {
        console.warn("⚠️  Optional environment variables not set:")
        warnings.forEach((v) => console.warn(`   - ${v}`))
        console.warn("Some features may be limited.\n")
    }

    console.log("✅ Environment validation passed\n")
}
