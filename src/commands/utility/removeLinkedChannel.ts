// commands/utility/removeLinkedChannel.ts

import {
    SlashCommandBuilder,
    MessageFlags,
    type ChatInputCommandInteraction,
    type GuildMember,
} from "discord.js"
import { checkManagePermissions } from "../../scripts/validation.js"
import type { Command, GuildChannelMap } from "../../types/index.js"

let db: { deleteAlertChannel: (guildId: string) => void } | null = null
let guildChannelIds: GuildChannelMap | null = null

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("unlink")
        .setDescription(
            "Removes linked earthquake alert channel from this server."
        ),

    // Allow index.ts to pass in dependencies
    setDependencies(
        database: { deleteAlertChannel: (guildId: string) => void },
        channelMap: GuildChannelMap
    ) {
        db = database
        guildChannelIds = channelMap
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        // Check if user has required permissions
        const permCheck = checkManagePermissions(
            interaction.member as GuildMember
        )
        if (!permCheck.hasPermission) {
            await interaction.editReply(permCheck.error!)
            return
        }

        const guildId = interaction.guildId
        if (!guildId) {
            await interaction.editReply(
                "This command must be used inside a server."
            )
            return
        }

        const linkedChannelId = guildChannelIds?.get(guildId)
        if (!linkedChannelId) {
            await interaction.editReply(
                "This server does not have an earthquake alert channel set."
            )
            return
        }

        if (guildChannelIds && db) {
            guildChannelIds.delete(guildId)
            db.deleteAlertChannel(guildId)
        }

        await interaction.editReply(
            "✅ Earthquake alert channel unlinked successfully.\n\n" +
            `The bot will no longer send earthquake alerts to this server. ` +
            `Use \`/set-earthquake-channel\` to set up alerts again.`
        )
    },
}

export default command
