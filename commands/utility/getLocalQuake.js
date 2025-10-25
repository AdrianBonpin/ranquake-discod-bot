const { SlashCommandBuilder } = require("discord.js")
const getEarthquakeData = require("../../scripts/phivolcs")
const { postNewQuakeEmbed } = require("../../scripts/quakeEmbed")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("get-local-quake")
        .setDescription(
            "Get the newest earthquake from Phivolcs (Philippines, 4+)"
        ),
    async execute(interaction) {
        await interaction.deferReply()
        await interaction.editReply("Fetching earthquake data...")
        // Get Current Channel ID for Embed
        const channelId = interaction.channelId
        try {
            // Fetch from new Phivolcs Script
            const res = await getEarthquakeData(12, true)
            if (res && res.length > 0) {
                const quake = res[0]
                const channel = interaction.client.channels.cache.get(channelId)
                await postNewQuakeEmbed(channel, quake)
            } else {
                await interaction.editReply(
                    "No recent earthquakes found in the last 6 hours."
                )
            }
        } catch (error) {
            console.error(`Error fetching general earthquake data: ${error}`)
            await interaction.editReply(
                "Failed to fetch earthquake data. Please try again later."
            )
        }
    },
}
