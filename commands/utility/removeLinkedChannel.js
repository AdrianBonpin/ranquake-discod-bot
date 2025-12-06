const { SlashCommandBuilder, MessageFlags } = require("discord.js")

let db = null
let guildChannelIds = null

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unlink")
        .setDescription(
            "Removes linked earthquake alert channel from this server."
        ),

    // Allow index.js to pass in dependencies
    setDependencies(database, channelMap) {
        db = database
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
        if (!linkedChannelId) {
            return interaction.editReply(
                "This server does not have an earthquake alert channel set."
            )
        }

        guildChannelIds.delete(guildId)
        db.deleteAlertChannel(guildId)

        return interaction.editReply("Earthquake alert channel unlinked.")
    },
}
