// data/DbManager.js

const Database = require("better-sqlite3")
const path = require("node:path")
const fs = require("node:fs")

// Determine database path based on environment
// Priority: 1) DB_PATH env var, 2) Docker path if exists, 3) Local development path
const getDbPath = () => {
    if (process.env.DB_PATH) {
        return process.env.DB_PATH
    }

    // Check if running in Docker (if /app/data exists)
    const dockerPath = "/app/data"
    if (fs.existsSync(dockerPath)) {
        return path.join(dockerPath, "db.sqlite")
    }

    // Local development path
    return path.join(__dirname, "..", "data", "db.sqlite")
}

const DB_PATH = getDbPath()

// Ensure the directory exists
const dbDir = path.dirname(DB_PATH)
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    console.log(`Created database directory: ${dbDir}`)
}

class DbManager {
    constructor() {
        console.log(`Using database at: ${DB_PATH}`)
        this.db = new Database(DB_PATH)
        this.initializeDatabase()
    }

    // Creates the table if it doesn't exist
    initializeDatabase() {
        // Create guild_config table
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS guild_config (
                guild_id TEXT PRIMARY KEY,
                alert_channel_id TEXT NOT NULL
            );
        `
        this.db.exec(createTableSql)

        // Create tracked_quakes table
        const createQuakeTableSql = `
            CREATE TABLE IF NOT EXISTS tracked_quakes (
                quake_id TEXT PRIMARY KEY
            );
        `
        this.db.exec(createQuakeTableSql)
    }

    /**
     * Stores or updates the alert channel ID for a guild.
     * @param {string} guildId
     * @param {string} channelId
     */
    setAlertChannel(guildId, channelId) {
        const stmt = this.db.prepare(`
            INSERT INTO guild_config (guild_id, alert_channel_id) 
            VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET 
                alert_channel_id=excluded.alert_channel_id;
        `)
        stmt.run(guildId, channelId)
    }

    /**
     * Stores a tracked earthquake ID.
     * @param {string} quakeId
     */
    addTrackedQuake(quakeId) {
        const stmt = this.db.prepare(
            "INSERT OR IGNORE INTO tracked_quakes (quake_id) VALUES (?)"
        )
        stmt.run(quakeId)
    }

    /**
     * Retrieves the alert channel ID for a guild.
     * @param {string} guildId
     * @returns {string | null}
     */
    getAlertChannel(guildId) {
        const stmt = this.db.prepare(
            "SELECT alert_channel_id FROM guild_config WHERE guild_id = ?"
        )
        const row = stmt.get(guildId)
        return row ? row.alert_channel_id : null
    }

    /**
     * Retrieves all configured channel IDs as a Map.
     * @returns {Map<string, string>}
     */
    getAllAlertChannels() {
        const stmt = this.db.prepare(
            "SELECT guild_id, alert_channel_id FROM guild_config"
        )
        const rows = stmt.all()
        const map = new Map()
        rows.forEach((row) => map.set(row.guild_id, row.alert_channel_id))
        return map
    }

    /**
     * Deletes the configuration row for a guild.
     * @param {string} guildId
     */
    deleteAlertChannel(guildId) {
        const stmt = this.db.prepare(
            "DELETE FROM guild_config WHERE guild_id = ?"
        )
        stmt.run(guildId)
    }

    /**
     * Checks if an earthquake ID has already been tracked.
     * @param {string} quakeId
     * @returns {boolean}
     */
    isQuakeTracked(quakeId) {
        const stmt = this.db.prepare(
            "SELECT 1 FROM tracked_quakes WHERE quake_id = ?"
        )
        const row = stmt.get(quakeId)
        return !!row // Returns true if a row is found, false otherwise
    }
}

module.exports = new DbManager() // Export a singleton instance
