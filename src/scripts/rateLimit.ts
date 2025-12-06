// scripts/rateLimit.ts
// Rate limiting utility for Discord bot commands

import type { RateLimitResult } from "../types/index.js"

/**
 * Simple rate limiter using in-memory Map storage
 * Stores last execution time per user per command
 */
class RateLimiter {
    // Map structure: commandName -> userId -> timestamp
    private cooldowns: Map<string, Map<string, number>>

    constructor() {
        this.cooldowns = new Map()
    }

    /**
     * Checks if a user is on cooldown for a command
     */
    checkRateLimit(
        commandName: string,
        userId: string,
        cooldownSeconds: number
    ): RateLimitResult {
        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Map())
        }

        const commandCooldowns = this.cooldowns.get(commandName)!
        const now = Date.now()
        const cooldownMs = cooldownSeconds * 1000

        if (commandCooldowns.has(userId)) {
            const lastUsed = commandCooldowns.get(userId)!
            const timeElapsed = now - lastUsed
            const timeRemaining = cooldownMs - timeElapsed

            if (timeRemaining > 0) {
                return {
                    limited: true,
                    timeRemaining: Math.ceil(timeRemaining / 1000), // Convert to seconds
                }
            }
        }

        // Update the timestamp
        commandCooldowns.set(userId, now)

        // Clean up old entries to prevent memory leak
        this.cleanup(commandName, cooldownMs)

        return {
            limited: false,
            timeRemaining: 0,
        }
    }

    /**
     * Removes expired cooldown entries to prevent memory buildup
     */
    private cleanup(commandName: string, cooldownMs: number): void {
        const commandCooldowns = this.cooldowns.get(commandName)
        if (!commandCooldowns) return

        const now = Date.now()
        const toDelete: string[] = []

        for (const [userId, timestamp] of commandCooldowns.entries()) {
            if (now - timestamp > cooldownMs) {
                toDelete.push(userId)
            }
        }

        toDelete.forEach((userId) => commandCooldowns.delete(userId))
    }

    /**
     * Manually reset a user's cooldown for a command
     */
    resetCooldown(commandName: string, userId: string): void {
        if (this.cooldowns.has(commandName)) {
            this.cooldowns.get(commandName)!.delete(userId)
        }
    }

    /**
     * Get a formatted cooldown message
     */
    getCooldownMessage(seconds: number): string {
        if (seconds >= 60) {
            const minutes = Math.floor(seconds / 60)
            const remainingSeconds = seconds % 60
            if (remainingSeconds > 0) {
                return `${minutes}m ${remainingSeconds}s`
            }
            return `${minutes}m`
        }
        return `${seconds}s`
    }
}

// Export a singleton instance
export default new RateLimiter()
