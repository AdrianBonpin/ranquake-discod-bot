# 🌊 Tremor Watch

**Tremor Watch** is a Discord bot that monitors earthquake activity from the **Philippine Institute of Volcanology and Seismology (PHIVOLCS)** and **USGS**, delivering real-time earthquake alerts directly to your Discord server.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## ✨ Features

-   🔔 **Real-time Earthquake Alerts** - Automatically monitors PHIVOLCS/USGS and sends notifications for new earthquakes
-   🌏 **Multi-Server Support** - Configure different alert channels for each Discord server
-   📊 **Rich Embeds** - Beautiful earthquake information cards with detailed data
-   🗺️ **Interactive Maps** - Visual earthquake location using Mapbox integration
-   ⏱️ **Automatic Polling** - Checks for new earthquakes every 5 minutes
-   💾 **Persistent Storage** - SQLite database tracks sent earthquakes to avoid duplicates

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

Create a `.env` file in the root directory with the following variables:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
MAPBOX_API_KEY=your_mapbox_api_key_here
GROQ_API_KEY=your_groq_api_key_here
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

| Command                                | Description                                                         |
| -------------------------------------- | ------------------------------------------------------------------- |
| `/help`                                | Display all available commands                                      |
| `/set-earthquake-channel [channel_id]` | Set the channel for earthquake alerts (defaults to current channel) |
| `/is-linked`                           | Check if this server has an earthquake alert channel configured     |
| `/unlink`                              | Remove the earthquake alert channel for this server                 |
| `/request-update`                      | Manually check for new earthquake updates                           |
| `/get-local-quake`                     | Get information about recent local (Philippine) earthquakes         |
| `/get-global-quake`                    | Get information about recent global earthquakes                     |

## 🔧 Project Structure

```
tremor-watch/
├── commands/           # Discord bot command definitions
│   └── utility/       # Utility commands (help, set-channel, etc.)
├── scripts/           # Core functionality scripts
│   ├── db.js         # SQLite database management
│   ├── phivolcs.js   # PHIVOLCS data scraping
│   ├── quakeEmbed.js # Discord embed creation
│   └── earthquakeTracker.js
├── index.js          # Main bot entry point
├── package.json      # Project dependencies
└── .env             # Environment variables (create this)
```

## 🐳 Docker Support

The project includes a Dockerfile for containerized deployment:

```bash
docker build -t tremor-watch .
docker run -d --env-file .env tremor-watch
```

## 📝 How It Works

1. **Polling**: The bot checks PHIVOLCS/USGS every 5 minutes for new earthquake data
2. **Tracking**: Each earthquake is tracked in a local SQLite database to prevent duplicate alerts
3. **Alerting**: When a new earthquake is detected, the bot sends a rich embed to all configured server channels
4. **Persistence**: Server channel configurations are stored in the database and persist across bot restarts

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
