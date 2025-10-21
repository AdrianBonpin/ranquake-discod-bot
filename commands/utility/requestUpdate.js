const { SlashCommandBuilder } = require("discord.js")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("request-update")
        .setDescription("Request the latest earthquake updates"),
    async execute(interaction) {
        await interaction.deferReply()
        await interaction.editReply(
            "Requesting the latest earthquake updates..."
        )
    },
}
