// scripts/db.ts
// JSON-based database manager for Tremor Watch
// No native dependencies - pure TypeScript!

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { DatabaseData, DatabaseStats } from "../types/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Determine database path based on environment
 * Priority: 1) DB_PATH env var, 2) Docker path if exists, 3) Local development path
 */
const getDbPath = (): string => {
    if (process.env.DB_PATH) {
        return process.env.DB_PATH
    }

    // Check if running in Docker (if /app/data exists)
    const dockerPath = "/app/data"
    if (fs.existsSync(dockerPath)) {
        return path.join(dockerPath, "db.json")
    }

    // Local development path
    return path.join(__dirname, "..", "..", "data", "db.json")
}

const DB_PATH = getDbPath()

// Ensure the directory exists
const dbDir = path.dirname(DB_PATH)
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    console.log(`📁 Created database directory: ${dbDir}`)
}

/**
 * JSON-based database manager
 * Stores guild configurations and tracked earthquake IDs
 */
class DbManager {
    private dbPath: string
    private data: DatabaseData

    constructor() {
        console.log(`📊 Using database at: ${DB_PATH}`)
        this.dbPath = DB_PATH
        this.data = this.loadDatabase()
    }

    /**
     * Load database from JSON file, create if doesn't exist
     */
    private loadDatabase(): DatabaseData {
        try {
            if (fs.existsSync(this.dbPath)) {
                const rawData = fs.readFileSync(this.dbPath, "utf8")
                return JSON.parse(rawData) as DatabaseData
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            console.warn(
                `⚠️  Could not load database, creating new one: ${errorMessage}`
            )
        }

        // Initialize with default structure
        const defaultData: DatabaseData = {
            guildConfigs: {},
            trackedQuakes: [],
            version: "2.0.0",
            lastUpdated: new Date().toISOString(),
        }

        this.saveDatabase(defaultData)
        return defaultData
    }

    /**
     * Save database to JSON file with atomic write
     */
    private saveDatabase(data: DatabaseData = this.data): void {
        try {
            // Update timestamp
            data.lastUpdated = new Date().toISOString()

            // Atomic write: write to temp file, then rename
            const tempPath = `${this.dbPath}.tmp`
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8")
            fs.renameSync(tempPath, this.dbPath)
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            console.error(`❌ Failed to save database: ${errorMessage}`)
            throw error
        }
    }

    // ===== Guild Configuration Methods =====

    /**
     * Set alert channel for a guild
     */
    setAlertChannel(guildId: string, channelId: string): void {
        this.data.guildConfigs[guildId] = channelId
        this.saveDatabase()
        console.log(`✅ Set alert channel for guild ${guildId}: ${channelId}`)
    }

    /**
     * Get alert channel for a guild
     */
    getAlertChannel(guildId: string): string | null {
        return this.data.guildConfigs[guildId] || null
    }

    /**
     * Delete alert channel configuration for a guild
     */
    deleteAlertChannel(guildId: string): void {
        delete this.data.guildConfigs[guildId]
        this.saveDatabase()
        console.log(`🗑️  Deleted alert channel for guild ${guildId}`)
    }

    /**
     * Get all guild configurations as a Map
     */
    getAllAlertChannels(): Map<string, string> {
        return new Map(Object.entries(this.data.guildConfigs))
    }

    // ===== Earthquake Tracking Methods =====

    /**
     * Check if an earthquake has been tracked
     */
    isQuakeTracked(quakeId: string): boolean {
        return this.data.trackedQuakes.includes(quakeId)
    }

    /**
     * Add earthquake to tracked list
     */
    addTrackedQuake(quakeId: string): void {
        if (!this.isQuakeTracked(quakeId)) {
            this.data.trackedQuakes.push(quakeId)

            // Keep only last 1000 tracked quakes to prevent unbounded growth
            if (this.data.trackedQuakes.length > 1000) {
                this.data.trackedQuakes = this.data.trackedQuakes.slice(-1000)
            }

            this.saveDatabase()
        }
    }

    /**
     * Get count of tracked earthquakes
     */
    getTrackedQuakeCount(): number {
        return this.data.trackedQuakes.length
    }

    /**
     * Clear old tracked earthquakes (older than specified days)
     */
    clearOldTrackedQuakes(_days: number = 30): void {
        // Note: Since we don't store timestamps with IDs in this simple version,
        // we just keep the most recent 1000 entries
        if (this.data.trackedQuakes.length > 1000) {
            const oldCount = this.data.trackedQuakes.length
            this.data.trackedQuakes = this.data.trackedQuakes.slice(-1000)
            this.saveDatabase()
            console.log(`🧹 Cleaned ${oldCount - 1000} old tracked quakes`)
        }
    }

    // ===== Utility Methods =====

    /**
     * Get database statistics
     */
    getStats(): DatabaseStats {
        return {
            guilds: Object.keys(this.data.guildConfigs).length,
            trackedQuakes: this.data.trackedQuakes.length,
            lastUpdated: this.data.lastUpdated,
            version: this.data.version,
            path: this.dbPath,
        }
    }

    /**
     * Export database as JSON string
     */
    exportDatabase(): string {
        return JSON.stringify(this.data, null, 2)
    }
}

// Export singleton instance
export default new DbManager()
