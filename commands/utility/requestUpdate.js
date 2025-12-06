const { SlashCommandBuilder, MessageFlags } = require("discord.js")
const rateLimiter = require("../../scripts/rateLimit.js")

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

        // Check rate limit (60 seconds cooldown)
        const rateCheck = rateLimiter.checkRateLimit(
            "request-update",
            interaction.user.id,
            60
        )

        if (rateCheck.limited) {
            const timeStr = rateLimiter.getCooldownMessage(
                rateCheck.timeRemaining
            )
            return interaction.editReply(
                `⏳ Please wait **${timeStr}** before requesting another update.\n\n` +
                    `This cooldown helps prevent spam and ensures the bot runs smoothly for everyone.`
            )
        }

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
