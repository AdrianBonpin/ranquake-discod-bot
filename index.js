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
const botToken = process.env.DISCORD_BOT_TOKEN
let channelId = process.env.CHANNEL_ID
const mapBoxApiKey = process.env.MAPBOX_API_KEY
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
        const newQuakes = await getNewEarthquakes(15)
        if (newQuakes.length === 0) {
            return "No new earthquakes to report."
        }
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
                    { name: "Time (PST)", value: quake.timePST, inline: true },
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
        return `Sent ${newQuakes.length} new earthquake alerts.`
    } catch (error) {
        console.error(`Error sending quake alerts: ${error.message}`)
    }
}

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`)

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
            channelId = newChannelId
            await interaction.editReply(
                `Earthquake alert channel set to <#${channelId}>`
            )
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

// End Commands

client.login(botToken)
