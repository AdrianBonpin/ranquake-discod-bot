const { SlashCommandBuilder, MessageFlags } = require("discord.js")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unlink")
        .setDescription(
            "Removes linked earthquake alert channel from this server."
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    },
}
