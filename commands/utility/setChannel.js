const { SlashCommandBuilder, MessageFlags } = require("discord.js")
const {
    validateChannel,
    checkManagePermissions,
    checkBotPermissions,
} = require("../../scripts/validation.js")

let db = null
let guildChannelIds = null

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

    // Allow index.js to pass in dependencies
    setDependencies(database, channelMap) {
        db = database
        guildChannelIds = channelMap
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        // Check if user has required permissions
        const permCheck = checkManagePermissions(interaction.member)
        if (!permCheck.hasPermission) {
            return interaction.editReply(permCheck.error)
        }

        const fromInteraction = interaction.channelId
        const fromOption = interaction.options.getString("channel_id")
        let newChannelId = fromOption || fromInteraction

        if (!newChannelId) {
            return interaction.editReply("Invalid channel ID provided.")
        }

        // Get Guild ID (Server ID)
        const guildId = interaction.guildId
        if (!guildId) {
            return interaction.editReply(
                "This command must be used inside a server."
            )
        }

        // Validate the channel
        const channelCheck = validateChannel(interaction.guild, newChannelId)
        if (!channelCheck.valid) {
            return interaction.editReply(channelCheck.error)
        }

        const channel = channelCheck.channel

        // Check if bot has permissions in the channel
        const botMember = interaction.guild.members.me
        const botPermCheck = checkBotPermissions(channel, botMember)
        if (!botPermCheck.hasPermission) {
            return interaction.editReply(botPermCheck.error)
        }

        // Store the channel ID in the database
        db.setAlertChannel(guildId, newChannelId)
        guildChannelIds.set(guildId, newChannelId)

        await interaction.editReply(
            `✅ Earthquake alert channel set to <#${newChannelId}>\n\n` +
                `The bot will send earthquake alerts to this channel when new earthquakes are detected.`
        )
    },
}
