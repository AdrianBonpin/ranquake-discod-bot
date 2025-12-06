// commands/utility/showLinkedChannel.ts

import {
    SlashCommandBuilder,
    MessageFlags,
    type ChatInputCommandInteraction,
} from "discord.js"
import type { Command, GuildChannelMap } from "../../types/index.js"

let guildChannelIds: GuildChannelMap | null = null

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("is-linked")
        .setDescription(
            "Check whether if the Server has an earthquake alert channel set."
        ),

    // Allow index.ts to pass in dependencies
    setDependencies(channelMap: GuildChannelMap) {
        guildChannelIds = channelMap
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const guildId = interaction.guildId
        if (!guildId) {
            await interaction.editReply(
                "This command must be used inside a server."
            )
            return
        }

        const linkedChannelId = guildChannelIds?.get(guildId)

        if (linkedChannelId) {
            await interaction.editReply(
                `This server has an earthquake alert channel set to <#${linkedChannelId}>.`
            )
        } else {
            await interaction.editReply(
                "This server does not have an earthquake alert channel set."
            )
        }
    },
}

export default command
