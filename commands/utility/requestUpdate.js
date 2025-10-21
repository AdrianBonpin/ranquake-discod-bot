const { SlashCommandBuilder, MessageFlags } = require("discord.js")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("request-update")
        .setDescription("Request the latest earthquake updates"),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        await interaction.editReply(
            "Requesting the latest earthquake updates..."
        )
    },
}
