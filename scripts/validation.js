// scripts/validation.js
// Input validation and permission checking utilities

const { PermissionFlagsBits } = require("discord.js")

/**
 * Validates a Discord channel ID format
 * @param {string} channelId - The channel ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidChannelId(channelId) {
    if (!channelId) return false

    // Discord snowflake IDs are 17-19 digits
    const snowflakeRegex = /^\d{17,19}$/
    return snowflakeRegex.test(channelId)
}

/**
 * Checks if a channel exists and is accessible in a guild
 * @param {Guild} guild - The Discord guild
 * @param {string} channelId - The channel ID to check
 * @returns {Object} { valid: boolean, channel: Channel|null, error: string|null }
 */
function validateChannel(guild, channelId) {
    if (!isValidChannelId(channelId)) {
        return {
            valid: false,
            channel: null,
            error: "Invalid channel ID format. Channel IDs must be 17-19 digit numbers.",
        }
    }

    const channel = guild.channels.cache.get(channelId)

    if (!channel) {
        return {
            valid: false,
            channel: null,
            error: `Channel <#${channelId}> not found in this server. Make sure the ID is correct and the bot has access to view the channel.`,
        }
    }

    // Check if it's a text channel
    if (channel.type !== 0) {
        // 0 = GUILD_TEXT
        return {
            valid: false,
            channel: null,
            error: `<#${channelId}> is not a text channel. Please select a text channel for earthquake alerts.`,
        }
    }

    return {
        valid: true,
        channel: channel,
        error: null,
    }
}

/**
 * Checks if a user has required permissions to manage bot settings
 * @param {GuildMember} member - The guild member to check
 * @returns {Object} { hasPermission: boolean, error: string|null }
 */
function checkManagePermissions(member) {
    if (!member) {
        return {
            hasPermission: false,
            error: "Could not verify member permissions.",
        }
    }

    // Check for admin or manage channels permission
    const hasPermission =
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        member.permissions.has(PermissionFlagsBits.ManageChannels)

    if (!hasPermission) {
        return {
            hasPermission: false,
            error: "❌ You need **Administrator** or **Manage Channels** permission to use this command.",
        }
    }

    return {
        hasPermission: true,
        error: null,
    }
}

/**
 * Checks if the bot has permission to send messages in a channel
 * @param {Channel} channel - The channel to check
 * @param {GuildMember} botMember - The bot's guild member
 * @returns {Object} { hasPermission: boolean, error: string|null }
 */
function checkBotPermissions(channel, botMember) {
    if (!channel || !botMember) {
        return {
            hasPermission: false,
            error: "Could not verify bot permissions.",
        }
    }

    const permissions = channel.permissionsFor(botMember)

    const canSend =
        permissions.has(PermissionFlagsBits.SendMessages) &&
        permissions.has(PermissionFlagsBits.ViewChannel) &&
        permissions.has(PermissionFlagsBits.EmbedLinks)

    if (!canSend) {
        return {
            hasPermission: false,
            error: `⚠️ I don't have permission to send messages in <#${channel.id}>. Please ensure I have **View Channel**, **Send Messages**, and **Embed Links** permissions.`,
        }
    }

    return {
        hasPermission: true,
        error: null,
    }
}

module.exports = {
    isValidChannelId,
    validateChannel,
    checkManagePermissions,
    checkBotPermissions,
}
