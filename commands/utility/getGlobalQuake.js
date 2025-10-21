const axios = require("axios")
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js")
const mapBoxApiKey = process.env.MAPBOX_API_KEY

module.exports = {
    data: new SlashCommandBuilder()
        .setName("get-global-quake")
        .setDescription(
            "Get the newest earthquake from USGS (Global 6 hours, 2.5+)"
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        await interaction.editReply("Fetching earthquake data...")
        // Get Current Channel ID for Embed
        const channelId = interaction.channelId
        // Fetch data from USGS API
        const apiUrl =
            "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=now%20-6%20hour&minmagnitude=2.5&orderby=time"
        try {
            const { data } = await axios.get(apiUrl, { timeout: 10000 })
            if (data) {
                const latestEvent = data.features[0]
                if (latestEvent) {
                    const channel =
                        interaction.client.channels.cache.get(channelId)
                    const properties = latestEvent.properties
                    // Create an embed message for better formatting

                    // Values for Map Link
                    const LONGITUDE =
                        latestEvent.geometry.coordinates[0].toFixed(4)
                    const LATITUDE =
                        latestEvent.geometry.coordinates[1].toFixed(4)
                    // 🚨 CORRECTION: Use only the integer part for the Mapbox pin label
                    // because it is limited to two characters (e.g., "6" or "10")
                    const MAG_LABEL_MAPBOX = Math.floor(
                        properties.mag
                    ).toString() // For the Mapbox marker
                    const MAP_SIZE = "600x400"
                    let mapLink = ""
                    if (mapBoxApiKey) {
                        const markerColor = (() => {
                            if (properties.mag >= 7.0) return "FF0000" // Red
                            if (properties.mag >= 6.0) return "FFA500" // Orange
                            if (properties.mag >= 5.0) return "FFFF00" // Yellow
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
                        if (properties.mag >= 7.0) return 0xff0000 // Red (Major)
                        if (properties.mag >= 6.0) return 0xffa500 // Orange (Strong)
                        if (properties.mag >= 5.0) return 0xffff00 // Yellow (Moderate)
                        return 0x00ff00 // Green (Light)
                    })()

                    const quakeEmbed = new EmbedBuilder()
                        .setColor(magnitudeColor)
                        .setTitle(
                            `🚨 M${properties.mag.toFixed(1)} - ${
                                properties.place
                            }`
                        )
                        .setURL(properties.url)
                        .setDescription(
                            `An earthquake of magnitude ${properties.mag.toFixed(
                                1
                            )} occurred.`
                        )
                        .addFields(
                            {
                                name: "Time (PST)",
                                value: new Date(properties.time).toLocaleString(
                                    "en-PH",
                                    {
                                        timeZone: "Asia/Manila",
                                    }
                                ),
                                inline: true,
                            },
                            {
                                name: "Magnitude",
                                value: `M${properties.mag.toFixed(1)}`,
                                inline: true,
                            },
                            {
                                name: "Depth",
                                value: `${latestEvent.geometry.coordinates[2].toFixed(
                                    1
                                )} km`,
                                inline: true,
                            },
                            {
                                name: "Coordinates",
                                value: `Lat: ${latestEvent.geometry.coordinates[1].toFixed(
                                    2
                                )}, Lon: ${latestEvent.geometry.coordinates[0].toFixed(
                                    2
                                )}`,
                                inline: true,
                            }
                        )
                        .setImage(mapLink)
                        .setFooter({ text: "Data sourced from USGS" })
                        .setTimestamp()

                    await channel.send({ embeds: [quakeEmbed] })
                } else {
                    await interaction.editReply(
                        "No recent earthquakes found in the last hour."
                    )
                }
            }
        } catch (error) {
            console.error(`Error fetching general earthquake data: ${error}`)
            await interaction.editReply(
                "Failed to fetch earthquake data. Please try again later."
            )
        }
    },
}
