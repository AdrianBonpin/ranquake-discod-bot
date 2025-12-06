const fs = require("node:fs")
const path = require("node:path")
const {
    Client,
    Events,
    GatewayIntentBits,
    Collection,
    MessageFlags,
    ActivityType,
} = require("discord.js")
const {
    getLocalCommands,
    deployCommandsToGuild,
} = require("./deploy-commands-guild.js")
const getEarthquakeData = require("./scripts/phivolcs.js")
const { postNewQuakeEmbed } = require("./scripts/quakeEmbed.js")
const db = require("./scripts/db.js")
const { validateEnvironment } = require("./scripts/validateEnv.js")

// Validate environment variables on startup
validateEnvironment()

// Global Variables
const botToken = process.env.DISCORD_BOT_TOKEN
let guildChannelIds = new Map()

// Configurable polling interval (default: 5 minutes)
const POLLING_INTERVAL_MINUTES =
    parseInt(process.env.POLLING_INTERVAL_MINUTES) || 5
const POLLING_INTERVAL_MS = POLLING_INTERVAL_MINUTES * 60 * 1000

console.log(`Polling interval set to ${POLLING_INTERVAL_MINUTES} minutes`)

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
})

/**
 * Sends earthquake alerts to all configured Discord servers
 * Fetches new earthquakes from PHIVOLCS, validates channels, sends embeds,
 * and tracks sent earthquakes to prevent duplicates.
 *
 * @returns {string} Status message indicating number of new earthquakes found
 */
async function sendQuakeAlerts() {
    try {
        // Fetch new earthquakes from PHIVOLCS (6+ hours lookback, 4.0+ magnitude)
        const newQuakes = await getEarthquakeData(6, true)

        if (!newQuakes || newQuakes.length === 0) {
            return "No new earthquakes to report."
        }

        // --- Multi Server Support ---
        const guildsToAlert = Array.from(guildChannelIds.entries())

        if (guildsToAlert.length === 0)
            return "No Servers have set an alert channel yet."

        newQuakes.reverse()

        // For each quake, send a message to each server that has set a channel
        for (const quake of newQuakes) {
            // Send to all guilds in parallel, but wait for all to complete before marking as tracked
            const sendPromises = guildsToAlert.map(
                async ([guildId, channelId]) => {
                    try {
                        const channel = client.channels.cache.get(channelId)

                        // Validate channel exists
                        if (!channel) {
                            console.warn(
                                `⚠️  Channel ${channelId} not found for guild ${guildId}. ` +
                                    `The channel may have been deleted. Use /set-earthquake-channel to update.`
                            )
                            return
                        }

                        await postNewQuakeEmbed(channel, quake)
                        console.log(
                            `✅ Sent quake ${quake.id} to guild ${guildId}`
                        )
                    } catch (error) {
                        console.error(
                            `❌ Failed to send quake ${quake.id} to guild ${guildId}:`,
                            error.message
                        )
                    }
                }
            )

            // Wait for all messages to complete (or fail)
            await Promise.allSettled(sendPromises)

            // Only mark as tracked after all send attempts are complete
            db.addTrackedQuake(quake.id)
            console.log(`📊 Tracked quake ${quake.id} in database\n`)
        }

        return `Sent ${newQuakes.length} new earthquake alerts to ${guildsToAlert.length} servers.`
    } catch (error) {
        console.error(`Error sending quake alerts: ${error.message}`)
    }
}

let collectedCommands = []

function printDividers(count) {
    for (let i = 0; i < count; i++)
        console.log("========================================")
}

client.once(Events.ClientReady, async (readyClient) => {
    printDividers(1)
    console.log(`Ready! Logged in as ${readyClient.user.tag}`)

    // Load guild channel IDs from the database
    guildChannelIds = db.getAllAlertChannels()
    console.log(
        `Loaded ${guildChannelIds.size} alert channels from the database.`
    )

    printDividers(1)
    // Collect Commands on Startup
    collectedCommands = getLocalCommands()
    console.log(
        `Collected ${collectedCommands.length} commands for deployment.`
    )

    // Initialize help command with collected commands
    const helpCommand = client.commands.get("help")
    if (helpCommand && helpCommand.setCommands) {
        helpCommand.setCommands(collectedCommands)
    }

    printDividers(2)
    // Deploy to existing guilds on startup
    const guilds = Array.from(readyClient.guilds.cache.values())
    for (const guild of guilds) {
        await deployCommandsToGuild(
            guild.id,
            process.env.CLIENT_ID, // Use CLIENT_ID
            botToken,
            collectedCommands
        )
    }
    printDividers(2)
    // Earthquake Tracking Service Initialization
    console.log("Starting earthquake alert service...")
    sendQuakeAlerts()
    printDividers(1)
    // Set interval for periodic checks
    console.log(
        `Setting up periodic earthquake checks every ${POLLING_INTERVAL_MINUTES} minutes.`
    )
    setInterval(sendQuakeAlerts, POLLING_INTERVAL_MS)
    printDividers(1)

    // Database Backup Service
    const { createBackup, cleanOldBackups } = require("./scripts/backupDb.js")

    // Create initial backup on startup
    try {
        console.log("📦 Creating startup database backup...")
        createBackup("startup")
        cleanOldBackups(10) // Keep only 10 most recent backups
    } catch (error) {
        console.warn(`⚠️  Initial backup failed: ${error.message}`)
    }

    // Create daily backups
    const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours
    setInterval(() => {
        try {
            console.log("📦 Creating scheduled database backup...")
            createBackup("auto")
            cleanOldBackups(10)
        } catch (error) {
            console.error(`❌ Scheduled backup failed: ${error.message}`)
        }
    }, BACKUP_INTERVAL_MS)
    console.log("📦 Database backup service initialized (daily backups)")
    printDividers(1)
    client.user.setActivity({
        type: ActivityType.Custom,
        name: "Listening for earthquakes 🌊 | /help",
    })
    console.log('\nTry "/help" for a list of commands.')
})

// Retrieve and Register Commands
client.commands = new Collection()

const foldersPath = path.join(__dirname, "commands")
const commandFolders = fs.readdirSync(foldersPath)

commandFolders.forEach((folder) => {
    const commandsPath = path.join(foldersPath, folder)
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"))

    commandFiles.forEach((file) => {
        const filePath = path.join(commandsPath, file)
        const command = require(filePath)
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command)

            // Initialize command dependencies based on command name
            if (command.data.name === "help" && command.setCommands) {
                // Will be set later after collectedCommands is populated
            } else if (
                command.data.name === "request-update" &&
                command.setSendQuakeAlerts
            ) {
                command.setSendQuakeAlerts(sendQuakeAlerts)
            } else if (
                command.data.name === "set-earthquake-channel" &&
                command.setDependencies
            ) {
                command.setDependencies(db, guildChannelIds)
            } else if (
                command.data.name === "is-linked" &&
                command.setDependencies
            ) {
                command.setDependencies(guildChannelIds)
            } else if (
                command.data.name === "unlink" &&
                command.setDependencies
            ) {
                command.setDependencies(db, guildChannelIds)
            }
        } else {
            console.log(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
            )
        }
    })
})

// Command Interaction Handling

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return
    const command = interaction.client.commands.get(interaction.commandName)

    if (!command)
        return console.error(
            `No command matching ${interaction.commandName} was found.`
        )

    try {
        await command.execute(interaction)
    } catch (error) {
        // DEBUG: Log error structure to understand what we're getting
        console.log(
            "DEBUG - Error code:",
            error.code,
            "Message:",
            error.message
        )

        // Handle specific Discord API errors gracefully FIRST
        if (error.code === 10062) {
            // Unknown interaction - interaction token expired (>3 seconds)
            console.warn(
                `⚠️  Interaction expired for command: ${interaction.commandName}`
            )
            console.warn(
                `   This usually happens when commands are run immediately after bot startup.`
            )
            console.warn(`   The command will work on subsequent attempts.`)
            return // Don't try to respond to an expired interaction
        }

        if (error.code === 40060) {
            // Interaction already acknowledged
            console.warn(
                `⚠️  Interaction already acknowledged for: ${interaction.commandName}`
            )
            return // Don't try to respond again
        }

        // Only log actual unexpected errors
        const errorMsg = error?.message || error?.toString() || "Unknown error"
        console.error(
            `❌ Error executing command ${interaction.commandName}:`,
            errorMsg
        )

        // For other errors, try to notify the user if interaction is still valid
        try {
            const errorMessage = {
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage)
            } else {
                await interaction.reply(errorMessage)
            }
        } catch (followUpError) {
            // If we can't send an error message, just log it
            const followUpMsg =
                followUpError?.message ||
                followUpError?.toString() ||
                "Unknown error"
            console.error(
                `❌ Could not send error message to user:`,
                followUpMsg
            )
        }
    }
})

// Guild Commands Deployment

client.on(Events.GuildCreate, async (guild) => {
    console.log(
        `Joined new guild: ${guild.name} (id: ${guild.id}), deploying commands.`
    )

    if (collectedCommands.length > 0) {
        await deployCommandsToGuild(
            guild.id,
            process.env.CLIENT_ID,
            botToken,
            collectedCommands
        )
    } else {
        console.warn("No commands collected for deployment.")
    }
})

// End Commands

client.login(botToken)
