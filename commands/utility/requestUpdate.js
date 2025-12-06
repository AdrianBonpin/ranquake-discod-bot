const { SlashCommandBuilder, MessageFlags } = require("discord.js")

let sendQuakeAlerts = null

module.exports = {
    data: new SlashCommandBuilder()
        .setName("request-update")
        .setDescription("Request the latest earthquake updates"),

    // Allow index.js to pass in the sendQuakeAlerts function
    setSendQuakeAlerts(func) {
        sendQuakeAlerts = func
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        await interaction.editReply("Earthquake updates requested!")

        if (!sendQuakeAlerts) {
            return interaction.editReply(
                "Error: Update function not initialized"
            )
        }

        const result = await sendQuakeAlerts()
        await interaction.editReply(result)
    },
}
