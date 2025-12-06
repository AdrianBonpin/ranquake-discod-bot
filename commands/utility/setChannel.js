const { SlashCommandBuilder, MessageFlags } = require("discord.js")

let db = null
let guildChannelIds = null

module.exports = {
    data: new SlashCommandBuilder()
        .setName("set-earthquake-channel")
        .setDescription("Sets the current channel for earthquake alerts.")
        .addStringOption((option) =>
            option
                .setName("channel_id")
                .setDescription(
                    "The ID of the channel to set for earthquake alerts"
                )
                .setRequired(false)
        ),

    // Allow index.js to pass in dependencies
    setDependencies(database, channelMap) {
        db = database
        guildChannelIds = channelMap
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

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
    },
}
