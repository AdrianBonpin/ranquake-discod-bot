const { SlashCommandBuilder, MessageFlags } = require("discord.js")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get a list of commands and their descriptions"),
    async execute(interaction) {
        await interaction.deferReply({ MessageFlags: MessageFlags.Ephemeral })
        await interaction.editReply("Loading commands...")
    },
}
