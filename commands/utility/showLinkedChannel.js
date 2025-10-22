const { SlashCommandBuilder, MessageFlags } = require("discord.js")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("is-linked")
        .setDescription("Check whether if the Server has an earthquake alert channel set."),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    },
}
