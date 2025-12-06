// scripts/validation.ts
// Input validation and permission checking utilities

import {
    PermissionFlagsBits,
    ChannelType,
    type Guild,
    type GuildMember,
    type GuildBasedChannel,
} from "discord.js"
import type {
    ChannelValidationResult,
    PermissionCheckResult,
} from "../types/index.js"

/**
 * Validates a Discord channel ID format
 */
export function isValidChannelId(channelId: string): boolean {
    if (!channelId) return false

    // Discord snowflake IDs are 17-19 digits
    const snowflakeRegex = /^\d{17,19}$/
    return snowflakeRegex.test(channelId)
}

/**
 * Checks if a channel exists and is accessible in a guild
 */
export function validateChannel(
    guild: Guild,
    channelId: string
): ChannelValidationResult {
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
    if (channel.type !== ChannelType.GuildText) {
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
 */
export function checkManagePermissions(
    member: GuildMember | null
): PermissionCheckResult {
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
 */
export function checkBotPermissions(
    channel: GuildBasedChannel | null,
    botMember: GuildMember | null
): PermissionCheckResult {
    if (!channel || !botMember) {
        return {
            hasPermission: false,
            error: "Could not verify bot permissions.",
        }
    }

    const permissions = channel.permissionsFor(botMember)

    if (!permissions) {
        return {
            hasPermission: false,
            error: "Could not retrieve bot permissions for the channel.",
        }
    }

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
