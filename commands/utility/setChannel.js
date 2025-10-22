const { SlashCommandBuilder, MessageFlags } = require("discord.js")

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
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        await interaction.editReply("Setting earthquake alert channel...")
    },
}
