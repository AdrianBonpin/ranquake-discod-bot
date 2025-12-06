const { SlashCommandBuilder, MessageFlags } = require("discord.js")

let guildChannelIds = null

module.exports = {
    data: new SlashCommandBuilder()
        .setName("is-linked")
        .setDescription(
            "Check whether if the Server has an earthquake alert channel set."
        ),

    // Allow index.js to pass in dependencies
    setDependencies(channelMap) {
        guildChannelIds = channelMap
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

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
    },
}
