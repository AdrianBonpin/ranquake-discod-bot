// scripts/backupDb.ts
// Database backup utility for the Tremor Watch bot (JSON version)

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { BackupMetadata } from "../types/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get database path (same logic as db.ts)
const getDbPath = (): string => {
    if (process.env.DB_PATH) {
        return process.env.DB_PATH
    }

    const dockerPath = "/app/data"
    if (fs.existsSync(dockerPath)) {
        return path.join(dockerPath, "db.json")
    }

    return path.join(__dirname, "..", "..", "data", "db.json")
}

const DB_PATH = getDbPath()

// Get backup directory
const getBackupDir = (): string => {
    if (process.env.BACKUP_DIR) {
        return process.env.BACKUP_DIR
    }

    const dockerPath = "/app/data/backups"
    if (fs.existsSync("/app/data")) {
        return dockerPath
    }

    return path.join(__dirname, "..", "..", "data", "backups")
}

const BACKUP_DIR = getBackupDir()

/**
 * Creates a backup of the database
 */
export function createBackup(label: string | null = null): string {
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
    const backupPath = path.join(BACKUP_DIR, `db_backup_${backupLabel}.json`)

    try {
        // Copy the JSON database file
        fs.copyFileSync(DB_PATH, backupPath)

        const backupSize = fs.statSync(backupPath).size
        console.log(
            `✅ Backup created: ${backupPath} (${(backupSize / 1024).toFixed(
                2
            )} KB)`
        )

        return backupPath
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        console.error(`❌ Backup failed: ${errorMessage}`)
        throw error
    }
}

/**
 * Lists all available backups
 */
export function listBackups(): BackupMetadata[] {
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log("📋 No backups directory found")
        return []
    }

    const files = fs.readdirSync(BACKUP_DIR)
    const backups: BackupMetadata[] = files
        .filter(
            (file) => file.startsWith("db_backup_") && file.endsWith(".json")
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
        .sort((a, b) => b.created.getTime() - a.created.getTime()) // Most recent first

    return backups
}

/**
 * Deletes old backups, keeping only the most recent N backups
 */
export function cleanOldBackups(keepCount: number = 10): void {
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
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            console.error(
                `❌ Failed to delete ${backup.filename}: ${errorMessage}`
            )
        }
    }

    console.log(
        `✅ Cleaned up ${deletedCount} old backups, kept ${keepCount} most recent`
    )
}

// CLI support for manual backups
const isMainModule = import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
    const args = process.argv.slice(2)
    const command = args[0]

    switch (command) {
        case "create": {
            const label = args[1] || null
            createBackup(label)
            break
        }

        case "list": {
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
        }

        case "clean": {
            const keepCount = parseInt(args[1]) || 10
            cleanOldBackups(keepCount)
            break
        }

        default:
            console.log(`
Tremor Watch - Database Backup Utility

Usage:
  tsx src/scripts/backupDb.ts create [label]   Create a new backup
  tsx src/scripts/backupDb.ts list             List all backups
  tsx src/scripts/backupDb.ts clean [keep]     Delete old backups (default: keep 10)

Environment Variables:
  DB_PATH      Custom database path
  BACKUP_DIR   Custom backup directory

Examples:
  tsx src/scripts/backupDb.ts create manual
  tsx src/scripts/backupDb.ts clean 5
            `)
    }
}
