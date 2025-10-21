const { default: axios } = require("axios")
const { SlashCommandBuilder } = require("discord.js")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("get-recent-quakes")
        .setDescription(
            "Fetches recent earthquake data from USGS in the Philippine area (last 1 hour, M2.5+)"
        ),
    async execute(interaction) {
        // Defer to allow more time for processing
        await interaction.deferReply()
        await interaction.editReply("Fetching recent earthquake data...")
        // Fetch data from USGS API
        const apiUrl =
            "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=now%20-1%20hour&minmagnitude=2.5&minlatitude=0&maxlatitude=25&minlongitude=115&maxlongitude=135&orderby=time"

        try {
            const { data } = await axios.get(apiUrl, { timeout: 10000 })
            if (data) {
                const latestEvent = data.features[0]
                if (latestEvent) {
                    const properties = latestEvent.properties
                    const logEntry = {
                        timePST: new Date(properties.time).toLocaleString(
                            "en-US",
                            {
                                timeZone: "Asia/Manila",
                            }
                        ),
                        magnitude: properties.mag.toFixed(1),
                        location: properties.place,
                        depth_km:
                            latestEvent.geometry.coordinates[2].toFixed(1),
                        usgs_url: properties.url,
                    }
                    console.log(properties)
                    console.log(
                        "--------------------------------------------------"
                    )
                    console.log(`🚨 ${properties.title}`)
                    console.log(`   Time (PST): ${logEntry.timePST}`)
                    console.log(`   Magnitude: M${logEntry.magnitude}`)
                    console.log(`   Location: ${logEntry.location}`)
                    console.log(`   Depth: ${logEntry.depth_km} km`)
                    console.log(`   USGS Link: ${logEntry.usgs_url}`)
                    console.log(
                        "--------------------------------------------------"
                    )
                    await interaction.editReply(
                        "Recent Earthquakes in the Philippine Area (Last 1 Hour, M2.5+)\n" +
                            `🚨 **${properties.title}**\n` +
                            `   **Time (PST):** ${logEntry.timePST}\n` +
                            `   **Magnitude:** M${logEntry.magnitude}\n` +
                            `   **Location:** ${logEntry.location}\n` +
                            `   **Depth:** ${logEntry.depth_km} km\n` +
                            `   **USGS Link:** ${logEntry.usgs_url}`
                    )
                } else {
                    await interaction.editReply(
                        "No recent earthquakes found in the Philippines in the last 1 Hour."
                    )
                }
            }
        } catch (error) {
            console.error("Error fetching earthquake data:", error)
            await interaction.editReply(
                "Failed to fetch earthquake data. Please try again later."
            )
        }
    },
}
