// commands/utility/getLocalQuake.ts

import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type TextChannel,
} from "discord.js"
import getEarthquakeData from "../../scripts/phivolcs.js"
import { postNewQuakeEmbed } from "../../scripts/quakeEmbed.js"
import rateLimiter from "../../scripts/rateLimit.js"
import type { Command } from "../../types/index.js"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("get-local-quake")
        .setDescription(
            "Get the newest earthquake from Phivolcs (Philippines, 4+)"
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply()

        // Check rate limit (30 seconds cooldown)
        const rateCheck = rateLimiter.checkRateLimit(
            "get-local-quake",
            interaction.user.id,
            30
        )

        if (rateCheck.limited) {
            const timeStr = rateLimiter.getCooldownMessage(
                rateCheck.timeRemaining
            )
            await interaction.editReply(
                `⏳ Please wait **${timeStr}** before requesting another earthquake update.`
            )
            return
        }

        await interaction.editReply("Fetching earthquake data...")
        // Get Current Channel ID for Embed
        const channelId = interaction.channelId

        try {
            // Fetch from new Phivolcs Script
            const res = await getEarthquakeData(12, true)
            if (res && res.length > 0) {
                const quake = res[0]
                const channel = interaction.client.channels.cache.get(
                    channelId
                ) as TextChannel
                await postNewQuakeEmbed(channel, quake)
            } else {
                await interaction.editReply(
                    "No recent earthquakes found in the last 6 hours."
                )
            }
        } catch (error) {
            console.error(`Error fetching general earthquake data: ${error}`)
            await interaction.editReply(
                "Failed to fetch earthquake data. Please try again later."
            )
        }
    },
}

export default command
