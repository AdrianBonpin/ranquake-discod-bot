# 🌊 Tremor Watch

**Tremor Watch** is a Discord bot that monitors earthquake activity from the **Philippine Institute of Volcanology and Seismology (PHIVOLCS)** and **USGS**, delivering real-time earthquake alerts directly to your Discord server.

![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## ✨ Features

-   🔔 **Real-time Earthquake Alerts** - Automatically monitors PHIVOLCS/USGS and sends notifications for new earthquakes
-   🌏 **Multi-Server Support** - Configure different alert channels for each Discord server
-   📊 **Rich Embeds** - Beautiful earthquake information cards with detailed data
-   🗺️ **Interactive Maps** - Visual earthquake location using Mapbox integration
-   ⚙️ **Configurable Polling** - Customize earthquake check intervals via environment variables
-   💾 **Persistent Storage** - SQLite database tracks sent earthquakes to avoid duplicates
-   🔒 **Permission Checks** - Admin/moderator permissions required for configuration commands
-   ⏱️ **Rate Limiting** - Prevents command spam with smart cooldowns
-   📦 **Automatic Backups** - Daily database backups with retention management
-   ✅ **Input Validation** - Comprehensive validation for channels and permissions
-   🐳 **Docker Support** - Optimized Docker configuration with pnpm

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

-   **Node.js** (v18 or higher)
-   **pnpm** (v10.19.0 or higher)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/tremor-watch.git
cd tremor-watch
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Then edit `.env` with your values:

```env
# Required Variables
DISCORD_BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
GROQ_API_KEY=your_groq_api_key_here

# Optional Variables
MAPBOX_API_KEY=your_mapbox_api_key_here  # For enhanced maps (optional)
GUILD_ID=your_guild_id_here              # For testing (optional)
CHANNEL_ID=your_channel_id_here          # Default alert channel (optional)
DB_PATH=./data/db.sqlite                 # Custom database path (optional)
POLLING_INTERVAL_MINUTES=5               # Check interval in minutes (default: 5)
BACKUP_DIR=./data/backups                # Backup directory (optional)
```

#### Getting Your API Keys:

-   **DISCORD_BOT_TOKEN & CLIENT_ID**:

    1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
    2. Create a new application
    3. Navigate to the "Bot" section to get your token
    4. The CLIENT_ID is found in the "General Information" section

-   **MAPBOX_API_KEY**:

    1. Sign up at [Mapbox](https://www.mapbox.com/)
    2. Navigate to your [account page](https://account.mapbox.com/) to get your access token

-   **GROQ_API_KEY**:
    1. Sign up at [Groq](https://groq.com/)
    2. Generate an API key from your dashboard

### 4. Start the Bot

```bash
pnpm start
```

## 🎮 Commands

Once the bot is running in your server, you can use the following slash commands:

### Public Commands (Anyone Can Use)

| Command             | Description                                                     | Cooldown |
| ------------------- | --------------------------------------------------------------- | -------- |
| `/help`             | Display all available commands                                  | None     |
| `/get-local-quake`  | Get information about recent local (Philippine) earthquakes     | 30s      |
| `/get-global-quake` | Get information about recent global earthquakes                 | 30s      |
| `/request-update`   | Manually check for new earthquake updates                       | 60s      |
| `/is-linked`        | Check if this server has an earthquake alert channel configured | None     |
| `/poke`             | Interact with RanQuake AI assistant                             | None     |

### Admin Commands (Requires Admin or Manage Channels Permission)

| Command                                | Description                                                         |
| -------------------------------------- | ------------------------------------------------------------------- |
| `/set-earthquake-channel [channel_id]` | Set the channel for earthquake alerts (defaults to current channel) |
| `/unlink`                              | Remove the earthquake alert channel for this server                 |

### Backup Commands (CLI)

| Command                  | Description                             |
| ------------------------ | --------------------------------------- |
| `pnpm run backup:create` | Create a manual database backup         |
| `pnpm run backup:list`   | List all available backups              |
| `pnpm run backup:clean`  | Clean old backups (keep 10 most recent) |

## 🔧 Project Structure

```
tremor-watch/
├── commands/           # Discord bot command definitions
│   └── utility/       # Utility commands (help, set-channel, etc.)
├── scripts/           # Core functionality scripts
│   ├── db.js          # SQLite database management
│   ├── backupDb.js    # Database backup utility
│   ├── phivolcs.js    # PHIVOLCS data scraping
│   ├── quakeEmbed.js  # Discord embed creation
│   ├── validation.js  # Input validation and permissions
│   ├── rateLimit.js   # Rate limiting utility
│   └── validateEnv.js # Environment variable validation
├── index.js           # Main bot entry point
├── package.json       # Project dependencies
├── Dockerfile         # Docker configuration
├── .env.example       # Environment variables template
├── .env               # Environment variables (create this)
├── SECURITY.md        # Security guidelines
├── BACKUP.md          # Database backup documentation
├── VALIDATION.md      # Input validation documentation
└── DOCKER.md          # Docker usage guide
```

## 🐳 Docker Support

The project includes an optimized Dockerfile using pnpm:

```bash
# Build the image
docker build -t tremor-watch .

# Run with environment file
docker run -d \
  --name tremor-watch \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  tremor-watch
```

For more details, see [DOCKER.md](./DOCKER.md).

## 📝 How It Works

1. **Polling**: The bot checks PHIVOLCS/USGS at configurable intervals (default: 5 minutes) for new earthquake data
2. **Tracking**: Each earthquake is tracked in a local SQLite database to prevent duplicate alerts
3. **Validation**: User permissions and channel configurations are validated before processing
4. **Alerting**: When a new earthquake is detected, the bot sends a rich embed to all configured server channels
5. **Rate Limiting**: Commands have cooldowns to prevent spam and API abuse
6. **Backups**: Database is automatically backed up daily with retention management
7. **Persistence**: Server channel configurations are stored in the database and persist across bot restarts

## 📚 Documentation

-   [Security Guidelines](./SECURITY.md) - Environment variable management and secret rotation
-   [Backup Guide](./BACKUP.md) - Database backup and restore procedures
-   [Validation Guide](./VALIDATION.md) - Input validation and permission checks
-   [Docker Guide](./DOCKER.md) - Docker deployment and configuration

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

-   **PHIVOLCS** - Philippine Institute of Volcanology and Seismology
-   **USGS** - United States Geological Survey
-   **Discord.js** - Powerful library for interacting with the Discord API

## 📧 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Made with ❤️ for earthquake awareness and safety**
