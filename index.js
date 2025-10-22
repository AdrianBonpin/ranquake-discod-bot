const fs = require("node:fs")
const path = require("node:path")
const {
    Client,
    Events,
    GatewayIntentBits,
    Collection,
    EmbedBuilder,
} = require("discord.js")
const { getNewEarthquakes } = require("./scripts/earthquakeTracker.js")
const {
    getLocalCommands,
    deployCommandsToGuild,
} = require("./deploy-commands-guild.js")
const botToken = process.env.DISCORD_BOT_TOKEN
const guildChannelIds = new Map()
const mapBoxApiKey = process.env.MAPBOX_API_KEY
const POLLING_INTERVAL_MS = 90 * 1000 // Check every 1 minute 30 seconds

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
})

async function sendQuakeAlerts() {
    try {
        const newQuakes = await getNewEarthquakes(15)
        if (newQuakes.length === 0) {
            return "No new earthquakes to report."
        }

        // --- Multi Server Support ---
        let sentAlertsCount = 0
        const guildsToAlert = Array.from(guildChannelIds.entries())

        if (guildsToAlert.length === 0)
            return "No Servers have set an alert channel yet."

        // For each server that has set a channel, send alerts
        guildsToAlert.forEach(async ([guildId, channelId]) => {
            const channel = client.channels.cache.get(channelId)
            newQuakes.forEach(async (quake) => {
                // Create an embed message for better formatting

                // Values for Map Link
                const LONGITUDE = quake.longitude.toFixed(4)
                const LATITUDE = quake.latitude.toFixed(4)
                // 🚨 CORRECTION: Use only the integer part for the Mapbox pin label
                // because it is limited to two characters (e.g., "6" or "10")
                const MAG_LABEL_MAPBOX = Math.floor(quake.magnitude).toString() // For the Mapbox marker
                const MAP_SIZE = "600x400"
                let mapLink = ""
                if (mapBoxApiKey) {
                    const markerColor = (() => {
                        if (quake.magnitude >= 7.0) return "FF0000" // Red
                        if (quake.magnitude >= 6.0) return "FFA500" // Orange
                        if (quake.magnitude >= 5.0) return "FFFF00" // Yellow
                        return "00FF00" // Green
                    })()
                    const customMarker = `pin-s-${MAG_LABEL_MAPBOX}+${markerColor}(${LONGITUDE},${LATITUDE})`
                    mapLink =
                        `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/` +
                        `${customMarker}/` +
                        `${LONGITUDE},${LATITUDE},7,0/${MAP_SIZE}@2x` + // <--- KEY CHANGE: Added @2x
                        `?access_token=${mapBoxApiKey}`
                } else {
                    mapLink = `https://static-maps.yandex.ru/1.x/?l=map&size=400,300&z=7&ll=${LONGITUDE},${LATITUDE}&pt=${LONGITUDE},${LATITUDE},pmwtm1`
                }

                const magnitudeColor = (() => {
                    if (quake.magnitude >= 7.0) return 0xff0000 // Red (Major)
                    if (quake.magnitude >= 6.0) return 0xffa500 // Orange (Strong)
                    if (quake.magnitude >= 5.0) return 0xffff00 // Yellow (Moderate)
                    return 0x00ff00 // Green (Light)
                })()

                const quakeEmbed = new EmbedBuilder()
                    .setColor(magnitudeColor)
                    .setTitle(
                        `🚨 M${quake.magnitude.toFixed(1)} - ${quake.location}`
                    )
                    .setURL(quake.usgsUrl)
                    .setDescription(
                        `An earthquake of magnitude ${quake.magnitude.toFixed(
                            1
                        )} occurred.`
                    )
                    .addFields(
                        {
                            name: "Time (PST)",
                            value: quake.timePST,
                            inline: true,
                        },
                        {
                            name: "Magnitude",
                            value: `M${quake.magnitude.toFixed(1)}`,
                            inline: true,
                        },
                        {
                            name: "Depth",
                            value: `${quake.depthKm.toFixed(1)} km`,
                            inline: true,
                        },
                        {
                            name: "Coordinates",
                            value: `Lat: ${quake.latitude.toFixed(
                                2
                            )}, Lon: ${quake.longitude.toFixed(2)}`,
                            inline: true,
                        }
                    )
                    .setImage(mapLink)
                    .setFooter({ text: "Data sourced from USGS" })
                    .setTimestamp()

                await channel.send({ embeds: [quakeEmbed] })
            })
        })
        return `Sent ${newQuakes.length} new earthquake alerts to ${guildsToAlert.length} servers.`
    } catch (error) {
        console.error(`Error sending quake alerts: ${error.message}`)
    }
}

let collectedCommands = []

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`)

    // Collect Commands on Startup
    collectedCommands = getLocalCommands()
    console.log(
        `Collected ${collectedCommands.length} commands for deployment.`
    )

    // Deploy to existing guilds on startup
    readyClient.guilds.cache.forEach(async ([guildId, guild]) => {
        deployCommandsToGuild(
            guildId,
            process.env.CLIENT_ID,
            botToken,
            collectedCommands
        )
    })

    // Earthquake Tracking Service Initialization
    sendQuakeAlerts()
    setInterval(sendQuakeAlerts, POLLING_INTERVAL_MS)
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
            const newChannelId = interaction.options.getString("channel_id")
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

            guildChannelIds.set(guildId, newChannelId)

            // Check that the channel ID exists in the bot's cache
            const channel = interaction.guild.channels.cache.get(newChannelId)
            if (!channel)
                return interaction.editReply(
                    `Channel ID set, but channel not found in this server.`
                )

            await interaction.editReply(
                `Earthquake alert channel set to <#${channelId}>`
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
