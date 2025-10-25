const fs = require("node:fs")
const path = require("node:path")
const { Client, Events, GatewayIntentBits, Collection } = require("discord.js")
const {
    getLocalCommands,
    deployCommandsToGuild,
} = require("./deploy-commands-guild.js")
const getEarthquakeData = require("./scripts/phivolcs.js")
const { postNewQuakeEmbed } = require("./scripts/quakeEmbed.js")
const db = require("./scripts/db.js")

// Global Variables
const botToken = process.env.DISCORD_BOT_TOKEN
const guildChannelIds = new Map()
const POLLING_INTERVAL_MS = 5 * 60 * 1000 // Check every 5 minutes

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
})

async function sendQuakeAlerts() {
    try {
        const newQuakes = await getEarthquakeData() // Check for quakes in the last 12 hours
        if (newQuakes.length === 0) {
            return "No new earthquakes to report."
        }

        // --- Multi Server Support ---
        const guildsToAlert = Array.from(guildChannelIds.entries())

        if (guildsToAlert.length === 0)
            return "No Servers have set an alert channel yet."

        newQuakes.reverse()
        // For each server that has set a channel, send alerts
        guildsToAlert.forEach(async ([guildId, channelId]) => {
            const channel = client.channels.cache.get(channelId)
            newQuakes.forEach(
                async (quake) => await postNewQuakeEmbed(channel, quake)
            )
        })
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
        `Setting up periodic earthquake checks every ${
            POLLING_INTERVAL_MS / 1000
        } seconds.`
    )
    setInterval(sendQuakeAlerts, POLLING_INTERVAL_MS)
    printDividers(1)
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
        if (interaction.commandName === "request-update") {
            await interaction.editReply("Earthquake updates requested!")
            await interaction.editReply(await sendQuakeAlerts())
        } else if (interaction.commandName === "set-earthquake-channel") {
            const fromInteraction = interaction.channelId
            const fromOption = interaction.options.getString("channel_id")
            let newChannelId = fromOption || fromInteraction

            if (!newChannelId) {
                return interaction.editReply("Invalid channel ID provided.")
            }

            // Get Guild ID (Server ID)
            const guildId = interaction.guildId
            if (!guildId) {
                return interaction.editReply(
                    "This command must be used inside a server."
                )
            }

            // Store the channel ID in the database
            db.setAlertChannel(guildId, newChannelId)
            guildChannelIds.set(guildId, newChannelId)

            // Check that the channel ID exists in the bot's cache
            const channel = interaction.guild.channels.cache.get(newChannelId)
            if (!channel)
                return interaction.editReply(
                    `Channel ID set, but channel not found in this server.`
                )

            await interaction.editReply(
                `Earthquake alert channel set to <#${newChannelId}>`
            )
        } else if (interaction.commandName === "is-linked") {
            const guildId = interaction.guildId
            if (!guildId) {
                return interaction.editReply(
                    "This command must be used inside a server."
                )
            }

            const linkedChannelId = guildChannelIds.get(guildId)

            if (linkedChannelId) {
                return interaction.editReply(
                    `This server has an earthquake alert channel set to <#${linkedChannelId}>.`
                )
            } else {
                return interaction.editReply(
                    "This server does not have an earthquake alert channel set."
                )
            }
        } else if (interaction.commandName === "unlink") {
            const guildId = interaction.guildId
            if (!guildId) {
                return interaction.editReply(
                    "This command must be used inside a server."
                )
            }

            const linkedChannelId = guildChannelIds.get(guildId)
            if (!linkedChannelId) {
                return interaction.editReply(
                    "This server does not have an earthquake alert channel set."
                )
            }

            guildChannelIds.delete(guildId)
            db.setAlertChannel(guildId, null)

            return interaction.editReply("Earthquake alert channel unlinked.")
        }
    } catch (error) {
        console.error(error)
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            })
        } else {
            await interaction.reply({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            })
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
