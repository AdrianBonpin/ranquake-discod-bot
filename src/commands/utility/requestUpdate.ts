// commands/utility/requestUpdate.ts

import {
    SlashCommandBuilder,
    MessageFlags,
    type ChatInputCommandInteraction,
} from "discord.js"
import rateLimiter from "../../scripts/rateLimit.js"
import type { Command, SendQuakeAlertsFunction } from "../../types/index.js"

let sendQuakeAlerts: SendQuakeAlertsFunction | null = null

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("request-update")
        .setDescription("Request the latest earthquake updates"),

    // Allow index.ts to pass in the sendQuakeAlerts function
    setSendQuakeAlerts(func: SendQuakeAlertsFunction) {
        sendQuakeAlerts = func
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
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
            await interaction.editReply(
                `⏳ Please wait **${timeStr}** before requesting another update.\n\n` +
                `This cooldown helps prevent spam and ensures the bot runs smoothly for everyone.`
            )
            return
        }

        await interaction.editReply("Earthquake updates requested!")

        if (!sendQuakeAlerts) {
            await interaction.editReply(
                "Error: Update function not initialized"
            )
            return
        }

        const result = await sendQuakeAlerts()
        await interaction.editReply(result)
    },
}

export default command
