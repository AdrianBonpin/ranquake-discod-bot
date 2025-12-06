// scripts/db.js
// JSON-based database manager for Tremor Watch
// No native dependencies - pure JavaScript!

const fs = require("node:fs")
const path = require("node:path")

/**
 * Determine database path based on environment
 * Priority: 1) DB_PATH env var, 2) Docker path if exists, 3) Local development path
 */
const getDbPath = () => {
    if (process.env.DB_PATH) {
        return process.env.DB_PATH
    }

    // Check if running in Docker (if /app/data exists)
    const dockerPath = "/app/data"
    if (fs.existsSync(dockerPath)) {
        return path.join(dockerPath, "db.json")
    }

    // Local development path
    return path.join(__dirname, "..", "data", "db.json")
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
    constructor() {
        console.log(`📊 Using database at: ${DB_PATH}`)
        this.dbPath = DB_PATH
        this.data = this.loadDatabase()
    }

    /**
     * Load database from JSON file, create if doesn't exist
     */
    loadDatabase() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const rawData = fs.readFileSync(this.dbPath, "utf8")
                return JSON.parse(rawData)
            }
        } catch (error) {
            console.warn(
                `⚠️  Could not load database, creating new one: ${error.message}`
            )
        }

        // Initialize with default structure
        const defaultData = {
            guildConfigs: {}, // { guildId: channelId }
            trackedQuakes: [], // Array of earthquake IDs
            version: "2.0.0", // DB schema version
            lastUpdated: new Date().toISOString(),
        }

        this.saveDatabase(defaultData)
        return defaultData
    }

    /**
     * Save database to JSON file with atomic write
     */
    saveDatabase(data = this.data) {
        try {
            // Update timestamp
            data.lastUpdated = new Date().toISOString()

            // Atomic write: write to temp file, then rename
            const tempPath = `${this.dbPath}.tmp`
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8")
            fs.renameSync(tempPath, this.dbPath)
        } catch (error) {
            console.error(`❌ Failed to save database: ${error.message}`)
            throw error
        }
    }

    // ===== Guild Configuration Methods =====

    /**
     * Set alert channel for a guild
     * @param {string} guildId - Discord guild ID
     * @param {string} channelId - Discord channel ID
     */
    setAlertChannel(guildId, channelId) {
        this.data.guildConfigs[guildId] = channelId
        this.saveDatabase()
        console.log(`✅ Set alert channel for guild ${guildId}: ${channelId}`)
    }

    /**
     * Get alert channel for a guild
     * @param {string} guildId - Discord guild ID
     * @returns {string|null} Channel ID or null if not set
     */
    getAlertChannel(guildId) {
        return this.data.guildConfigs[guildId] || null
    }

    /**
     * Delete alert channel configuration for a guild
     * @param {string} guildId - Discord guild ID
     */
    deleteAlertChannel(guildId) {
        delete this.data.guildConfigs[guildId]
        this.saveDatabase()
        console.log(`🗑️  Deleted alert channel for guild ${guildId}`)
    }

    /**
     * Get all guild configurations as a Map
     * @returns {Map<string, string>} Map of guild ID to channel ID
     */
    getAllAlertChannels() {
        return new Map(Object.entries(this.data.guildConfigs))
    }

    // ===== Earthquake Tracking Methods =====

    /**
     * Check if an earthquake has been tracked
     * @param {string} quakeId - Earthquake ID
     * @returns {boolean} True if already tracked
     */
    isQuakeTracked(quakeId) {
        return this.data.trackedQuakes.includes(quakeId)
    }

    /**
     * Add earthquake to tracked list
     * @param {string} quakeId - Earthquake ID
     */
    addTrackedQuake(quakeId) {
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
     * @returns {number} Number of tracked earthquakes
     */
    getTrackedQuakeCount() {
        return this.data.trackedQuakes.length
    }

    /**
     * Clear old tracked earthquakes (older than specified days)
     * @param {number} days - Days to keep
     */
    clearOldTrackedQuakes(days = 30) {
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
     * @returns {Object} Database stats
     */
    getStats() {
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
     * @returns {string} JSON string of database
     */
    exportDatabase() {
        return JSON.stringify(this.data, null, 2)
    }
}

// Export singleton instance
module.exports = new DbManager()
