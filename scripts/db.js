// data/DbManager.js

const Database = require("better-sqlite3")
const path = require("node:path")

// Use the persistent 'data' directory defined in docker-compose.yml
const DB_PATH = path.join(__dirname, "data", "db.sqlite")

class DbManager {
    constructor() {
        // 'data/db.sqlite' will be created if it doesn't exist
        this.db = new Database(DB_PATH, { verbose: console.log })
        this.initializeDatabase()
    }

    // Creates the table if it doesn't exist
    initializeDatabase() {
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS guild_config (
                guild_id TEXT PRIMARY KEY,
                alert_channel_id TEXT NOT NULL
            );
        `
        this.db.exec(createTableSql)
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
}

module.exports = new DbManager() // Export a singleton instance
