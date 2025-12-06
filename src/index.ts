// src/index.ts
// Main entry point for Tremor Watch Discord bot

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import {
    Client,
    Events,
    GatewayIntentBits,
    Collection,
    MessageFlags,
    ActivityType,
    type ChatInputCommandInteraction,
    type TextChannel,
    type Guild,
} from "discord.js"
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js"
import { deployCommandsToGuild } from "./scripts/deployCommands.js"
import getEarthquakeData from "./scripts/phivolcs.js"
import { postNewQuakeEmbed } from "./scripts/quakeEmbed.js"
import db from "./scripts/db.js"
import { validateEnvironment } from "./scripts/validateEnv.js"
import type { Command, GuildChannelMap } from "./types/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Extend the Client type to include commands collection
declare module "discord.js" {
    interface Client {
        commands: Collection<string, Command>
    }
}

// Validate environment variables on startup
validateEnvironment()

// Global Variables
const botToken = process.env.DISCORD_BOT_TOKEN!
let guildChannelIds: GuildChannelMap = new Map()

// Configurable polling interval (default: 5 minutes)
const POLLING_INTERVAL_MINUTES =
    parseInt(process.env.POLLING_INTERVAL_MINUTES || "5") || 5
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
 */
async function sendQuakeAlerts(): Promise<string> {
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
                        const channel = client.channels.cache.get(
                            channelId
                        ) as TextChannel | undefined

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
                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : String(error)
                        console.error(
                            `❌ Failed to send quake ${quake.id} to guild ${guildId}:`,
                            errorMessage
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
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        console.error(`Error sending quake alerts: ${errorMessage}`)
        return "Error occurred while sending earthquake alerts."
    }
}

let collectedCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []

function printDividers(count: number): void {
    for (let i = 0; i < count; i++)
        console.log("========================================")
}

/**
 * Load commands from the commands directory
 */
async function loadCommands(): Promise<void> {
    client.commands = new Collection()

    const foldersPath = path.join(__dirname, "commands")
    const commandFolders = fs.readdirSync(foldersPath)

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder)
        const commandFiles = fs
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith(".js"))

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file)
            const fileUrl = pathToFileURL(filePath).href

            try {
                const commandModule = (await import(fileUrl)) as {
                    default: Command
                }
                const command = commandModule.default

                if (command.data) {
                    client.commands.set(command.data.name, command)

                    // Initialize command dependencies based on command name
                    if (
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
            } catch (error) {
                console.error(`Error loading command ${filePath}:`, error)
            }
        }
    }
}

/**
 * Collect commands for deployment
 */
async function collectCommands(): Promise<
    RESTPostAPIChatInputApplicationCommandsJSONBody[]
> {
    const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []

    for (const command of client.commands.values()) {
        commands.push(command.data.toJSON())
    }

    return commands
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
    collectedCommands = await collectCommands()
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
            process.env.CLIENT_ID!,
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
    const { createBackup, cleanOldBackups } = await import(
        "./scripts/backupDb.js"
    )

    // Create initial backup on startup
    try {
        console.log("📦 Creating startup database backup...")
        createBackup("startup")
        cleanOldBackups(10) // Keep only 10 most recent backups
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        console.warn(`⚠️  Initial backup failed: ${errorMessage}`)
    }

    // Create daily backups
    const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours
    setInterval(() => {
        try {
            console.log("📦 Creating scheduled database backup...")
            createBackup("auto")
            cleanOldBackups(10)
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            console.error(`❌ Scheduled backup failed: ${errorMessage}`)
        }
    }, BACKUP_INTERVAL_MS)
    console.log("📦 Database backup service initialized (daily backups)")
    printDividers(1)

    client.user?.setActivity({
        type: ActivityType.Custom,
        name: "Listening for earthquakes 🌊 | /help",
    })
    console.log('\nTry "/help" for a list of commands.')
})

// Command Interaction Handling
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    const command = client.commands.get(interaction.commandName)

    if (!command) {
        console.error(
            `No command matching ${interaction.commandName} was found.`
        )
        return
    }

    try {
        await command.execute(interaction as ChatInputCommandInteraction)
    } catch (error: unknown) {
        const discordError = error as { code?: number; message?: string }

        // Handle specific Discord API errors gracefully FIRST
        if (discordError.code === 10062) {
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

        if (discordError.code === 40060) {
            // Interaction already acknowledged
            console.warn(
                `⚠️  Interaction already acknowledged for: ${interaction.commandName}`
            )
            return // Don't try to respond again
        }

        // Only log actual unexpected errors
        const errorMsg =
            discordError.message || String(error) || "Unknown error"
        console.error(
            `❌ Error executing command ${interaction.commandName}:`,
            errorMsg
        )

        // For other errors, try to notify the user if interaction is still valid
        try {
            const errorContent = "There was an error while executing this command!"

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: errorContent,
                    ephemeral: true,
                })
            } else {
                await interaction.reply({
                    content: errorContent,
                    ephemeral: true,
                })
            }
        } catch (followUpError) {
            // If we can't send an error message, just log it
            const followUpMsg =
                followUpError instanceof Error
                    ? followUpError.message
                    : String(followUpError)
            console.error(`❌ Could not send error message to user:`, followUpMsg)
        }
    }
})

// Guild Commands Deployment
client.on(Events.GuildCreate, async (guild: Guild) => {
    console.log(
        `Joined new guild: ${guild.name} (id: ${guild.id}), deploying commands.`
    )

    if (collectedCommands.length > 0) {
        await deployCommandsToGuild(
            guild.id,
            process.env.CLIENT_ID!,
            botToken,
            collectedCommands
        )
    } else {
        console.warn("No commands collected for deployment.")
    }
})

// Initialize and start the bot
async function main(): Promise<void> {
    // Load commands before logging in
    await loadCommands()
    console.log(`Loaded ${client.commands.size} commands.`)

    // Login to Discord
    await client.login(botToken)
}

main().catch(console.error)
