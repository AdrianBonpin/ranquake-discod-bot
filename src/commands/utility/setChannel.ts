// commands/utility/setChannel.ts

import {
    SlashCommandBuilder,
    MessageFlags,
    type ChatInputCommandInteraction,
    type GuildMember,
    type GuildBasedChannel,
} from "discord.js"
import {
    validateChannel,
    checkManagePermissions,
    checkBotPermissions,
} from "../../scripts/validation.js"
import type { Command, GuildChannelMap } from "../../types/index.js"

// These will be set by setDependencies
let db: {
    setAlertChannel: (guildId: string, channelId: string) => void
} | null = null
let guildChannelIds: GuildChannelMap | null = null

const command: Command = {
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

    // Allow index.ts to pass in dependencies
    setDependencies(
        database: { setAlertChannel: (guildId: string, channelId: string) => void },
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

        const fromInteraction = interaction.channelId
        const fromOption = interaction.options.getString("channel_id")
        const newChannelId = fromOption || fromInteraction

        if (!newChannelId) {
            await interaction.editReply("Invalid channel ID provided.")
            return
        }

        // Get Guild ID (Server ID)
        const guildId = interaction.guildId
        if (!guildId) {
            await interaction.editReply(
                "This command must be used inside a server."
            )
            return
        }

        // Validate the channel
        const channelCheck = validateChannel(interaction.guild!, newChannelId)
        if (!channelCheck.valid) {
            await interaction.editReply(channelCheck.error!)
            return
        }

        const channel = channelCheck.channel as GuildBasedChannel

        // Check if bot has permissions in the channel
        const botMember = interaction.guild!.members.me
        const botPermCheck = checkBotPermissions(channel, botMember)
        if (!botPermCheck.hasPermission) {
            await interaction.editReply(botPermCheck.error!)
            return
        }

        // Store the channel ID in the database
        if (db && guildChannelIds) {
            db.setAlertChannel(guildId, newChannelId)
            guildChannelIds.set(guildId, newChannelId)
        }

        await interaction.editReply(
            `✅ Earthquake alert channel set to <#${newChannelId}>\n\n` +
            `The bot will send earthquake alerts to this channel when new earthquakes are detected.`
        )
    },
}

export default command
