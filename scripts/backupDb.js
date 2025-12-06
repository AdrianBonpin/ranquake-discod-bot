// scripts/backupDb.js
// Database backup utility for the Tremor Watch bot

const Database = require("better-sqlite3")
const path = require("node:path")
const fs = require("node:fs")

// Get database path (same logic as db.js)
const getDbPath = () => {
    if (process.env.DB_PATH) {
        return process.env.DB_PATH
    }

    const dockerPath = "/app/data"
    if (fs.existsSync(dockerPath)) {
        return path.join(dockerPath, "db.sqlite")
    }

    return path.join(__dirname, "..", "data", "db.sqlite")
}

const DB_PATH = getDbPath()

// Get backup directory
const getBackupDir = () => {
    if (process.env.BACKUP_DIR) {
        return process.env.BACKUP_DIR
    }

    const dockerPath = "/app/data/backups"
    if (fs.existsSync("/app/data")) {
        return dockerPath
    }

    return path.join(__dirname, "..", "data", "backups")
}

const BACKUP_DIR = getBackupDir()

/**
 * Creates a backup of the database
 * @param {string} label - Optional label for the backup (default: timestamp)
 * @returns {string} Path to the backup file
 */
function createBackup(label = null) {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true })
        console.log(`📁 Created backup directory: ${BACKUP_DIR}`)
    }

    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
        throw new Error(`Database not found at ${DB_PATH}`)
    }

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupLabel = label ? `${label}_${timestamp}` : timestamp
    const backupPath = path.join(BACKUP_DIR, `db_backup_${backupLabel}.sqlite`)

    try {
        // Open database in read-only mode
        const db = new Database(DB_PATH, { readonly: true })

        // Use SQLite's backup API
        db.backup(backupPath)

        db.close()

        const backupSize = fs.statSync(backupPath).size
        console.log(
            `✅ Backup created: ${backupPath} (${(backupSize / 1024).toFixed(
                2
            )} KB)`
        )

        return backupPath
    } catch (error) {
        console.error(`❌ Backup failed: ${error.message}`)
        throw error
    }
}

/**
 * Lists all available backups
 * @returns {Array} List of backup files with metadata
 */
function listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) {
        return []
    }

    const files = fs
        .readdirSync(BACKUP_DIR)
        .filter(
            (file) => file.startsWith("db_backup_") && file.endsWith(".sqlite")
        )
        .map((file) => {
            const filePath = path.join(BACKUP_DIR, file)
            const stats = fs.statSync(filePath)
            return {
                filename: file,
                path: filePath,
                size: stats.size,
                created: stats.mtime,
            }
        })
        .sort((a, b) => b.created - a.created) // Most recent first

    return files
}

/**
 * Deletes old backups, keeping only the most recent N backups
 * @param {number} keepCount - Number of backups to keep
 */
function cleanOldBackups(keepCount = 10) {
    const backups = listBackups()

    if (backups.length <= keepCount) {
        console.log(`📊 ${backups.length} backups found, no cleanup needed`)
        return
    }

    const toDelete = backups.slice(keepCount)
    let deletedCount = 0

    for (const backup of toDelete) {
        try {
            fs.unlinkSync(backup.path)
            deletedCount++
            console.log(`🗑️  Deleted old backup: ${backup.filename}`)
        } catch (error) {
            console.error(
                `❌ Failed to delete ${backup.filename}: ${error.message}`
            )
        }
    }

    console.log(
        `✅ Cleaned up ${deletedCount} old backups, kept ${keepCount} most recent`
    )
}

// CLI support for manual backups
if (require.main === module) {
    const args = process.argv.slice(2)
    const command = args[0]

    switch (command) {
        case "create":
            const label = args[1] || null
            createBackup(label)
            break

        case "list":
            const backups = listBackups()
            console.log(`\n📋 Available backups (${backups.length}):\n`)
            if (backups.length === 0) {
                console.log("  No backups found")
            } else {
                backups.forEach((backup, index) => {
                    console.log(
                        `  ${index + 1}. ${backup.filename}\n` +
                            `     Size: ${(backup.size / 1024).toFixed(
                                2
                            )} KB\n` +
                            `     Date: ${backup.created.toLocaleString()}\n`
                    )
                })
            }
            break

        case "clean":
            const keepCount = parseInt(args[1]) || 10
            cleanOldBackups(keepCount)
            break

        default:
            console.log(`
Tremor Watch - Database Backup Utility

Usage:
  node scripts/backupDb.js create [label]   Create a new backup
  node scripts/backupDb.js list             List all backups
  node scripts/backupDb.js clean [keep]     Delete old backups (default: keep 10)

Environment Variables:
  DB_PATH      Custom database path
  BACKUP_DIR   Custom backup directory

Examples:
  node scripts/backupDb.js create manual
  node scripts/backupDb.js clean 5
            `)
    }
}

module.exports = { createBackup, listBackups, cleanOldBackups }
