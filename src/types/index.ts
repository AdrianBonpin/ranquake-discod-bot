import type {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
} from "discord.js"
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js"

/**
 * Earthquake data from PHIVOLCS
 */
export interface Earthquake {
    id: string
    timePST: string
    magnitude: number
    location: string
    latitude: number
    longitude: number
    depth: number
    url: string
}

/**
 * Database structure stored in JSON file
 */
export interface DatabaseData {
    guildConfigs: Record<string, string>
    trackedQuakes: string[]
    version: string
    lastUpdated: string
}

/**
 * Database statistics
 */
export interface DatabaseStats {
    guilds: number
    trackedQuakes: number
    lastUpdated: string
    version: string
    path: string
}

/**
 * Backup file metadata
 */
export interface BackupMetadata {
    filename: string
    path: string
    size: number
    created: Date
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
    limited: boolean
    timeRemaining: number
}

/**
 * Channel validation result
 */
export interface ChannelValidationResult {
    valid: boolean
    channel: unknown | null
    error: string | null
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
    hasPermission: boolean
    error: string | null
}

/**
 * Discord bot command structure
 */
export interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>
    // Optional dependency setters
    setCommands?: (
        commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]
    ) => void
    setSendQuakeAlerts?: (func: () => Promise<string>) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDependencies?: (...args: any[]) => void
}

/**
 * Type for the sendQuakeAlerts function
 */
export type SendQuakeAlertsFunction = () => Promise<string>

/**
 * Guild channel ID map type
 */
export type GuildChannelMap = Map<string, string>
