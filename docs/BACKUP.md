# Database Backup & Restore Guide

This guide explains how to backup and restore the Tremor Watch bot's database.

---

## 🔄 Automatic Backups

The bot automatically creates backups:

-   **On startup** - Labeled as `startup`
-   **Daily** - Labeled as `auto` (every 24 hours)
-   **Retention** - Keeps the 10 most recent backups, deletes older ones

Backups are stored in:

-   **Docker**: `/app/data/backups/`
-   **Local**: `./data/backups/`

---

## 📦 Manual Backup Commands

### Create a Backup

```bash
# Using npm script
pnpm run backup:create

# With a custom label
node scripts/backupDb.js create my-label

# Example output:
# 📁 Created backup directory: /path/to/data/backups
# ✅ Backup created: /path/to/data/backups/db_backup_my-label_2025-12-07T00-12-00-000Z.sqlite (45.23 KB)
```

### List All Backups

```bash
# Using npm script
pnpm run backup:list

# OR
node scripts/backupDb.js list

# Example output:
# 📋 Available backups (5):
#
#   1. db_backup_startup_2025-12-07T00-12-00-000Z.sqlite
#      Size: 45.23 KB
#      Date: 12/7/2025, 12:12:00 AM
#
#   2. db_backup_auto_2025-12-06T00-12-00-000Z.sqlite
#      Size: 44.87 KB
#      Date: 12/6/2025, 12:12:00 AM
```

### Clean Old Backups

```bash
# Keep 10 most recent (default)
pnpm run backup:clean

# Keep only 5 most recent
node scripts/backupDb.js clean 5

# Example output:
# 🗑️  Deleted old backup: db_backup_auto_2025-11-01T00-12-00-000Z.sqlite
# ✅ Cleaned up 3 old backups, kept 5 most recent
```

---

## 🔧 Restore from Backup

> [!WARNING] > **Stop the bot before restoring!** Restoring while the bot is running can cause database corruption.

### Method 1: Direct File Replacement

1. **Stop the bot**:

    ```bash
    # If running in Docker
    docker stop tremor-watch

    # If running locally, press Ctrl+C
    ```

2. **Backup current database** (just in case):

    ```bash
    pnpm run backup:create
    ```

3. **Find the backup you want to restore**:

    ```bash
    pnpm run backup:list
    ```

4. **Replace the current database**:

    **Docker:**

    ```bash
    # Copy backup to replace current database
    docker cp container_name:/app/data/backups/db_backup_TIMESTAMP.sqlite /tmp/restore.sqlite
    docker cp /tmp/restore.sqlite container_name:/app/data/db.sqlite
    ```

    **Local:**

    ```bash
    # Copy backup file
    cp data/backups/db_backup_TIMESTAMP.sqlite data/db.sqlite
    ```

5. **Restart the bot**:

    ```bash
    # Docker
    docker start tremor-watch

    # Local
    pnpm start
    ```

### Method 2: Using SQLite CLI

If you need to merge data or inspect the backup first:

```bash
# Enter SQLite CLI
sqlite3 data/db.sqlite

# Inside SQLite CLI:
sqlite> .backup data/backups/restore_point.sqlite  # Create backup first
sqlite> .restore data/backups/db_backup_TIMESTAMP.sqlite  # Restore from backup
sqlite> .exit
```

---

## ⚙️ Configuration

### Custom Backup Directory

Set the `BACKUP_DIR` environment variable in `.env`:

```env
# Custom backup location
BACKUP_DIR=/custom/path/to/backups
```

### Custom Database Path

If you've customized the database path:

```env
DB_PATH=/custom/path/to/db.sqlite
BACKUP_DIR=/custom/path/to/backups
```

---

## 🛡️ Best Practices

1. **Test restores regularly** - Verify backups are working by testing restoration in a dev environment

2. **External backups** - Copy backups to external storage (S3, Google Drive, etc.) for disaster recovery:

    ```bash
    # Example: Copy to external location
    cp data/backups/db_backup_*.sqlite /path/to/external/storage/
    ```

3. **Before major changes** - Create a labeled backup:

    ```bash
    node scripts/backupDb.js create before-update
    ```

4. **Monitor backup logs** - Check bot logs for backup success/failure messages

5. **Backup retention** - Adjust retention based on your needs:
    ```bash
    # Keep more backups for production
    node scripts/backupDb.js clean 30
    ```

---

## 📊 Database Contents

The database contains:

-   **guild_config** - Server alert channel configurations
-   **tracked_quakes** - Earthquake IDs that have been sent (prevents duplicates)

Losing this data means:

-   Servers will need to reconfigure alert channels
-   Bot might resend old earthquake alerts

---

## 🐳 Docker Volumes

If using Docker, mount the data directory as a volume to persist backups:

```yaml
# docker-compose.yml
volumes:
    - ./data:/app/data
```

This ensures backups survive container restarts and removals.

---

## 🆘 Recovery Scenarios

### Scenario 1: Corrupt Database

```bash
# The bot crashes on startup
pnpm run backup:list
cp data/backups/db_backup_LATEST.sqlite data/db.sqlite
pnpm start
```

### Scenario 2: Accidental Data Loss

```bash
# Oops, deleted important configuration
pnpm run backup:list
# Pick a backup from before the mistake
cp data/backups/db_backup_TIMESTAMP.sqlite data/db.sqlite
pnpm start
```

### Scenario 3: Migration to New Server

```bash
# On old server
pnpm run backup:create

# Copy backup to new server
scp data/backups/db_backup_LATEST.sqlite new-server:/path/to/tremor-watch/data/db.sqlite

# On new server
pnpm start
```

---

## 📝 Backup File Naming

Format: `db_backup_[label]_[timestamp].sqlite`

Examples:

-   `db_backup_startup_2025-12-07T00-12-00-000Z.sqlite`
-   `db_backup_auto_2025-12-06T00-12-00-000Z.sqlite`
-   `db_backup_manual_2025-12-05T15-30-00-000Z.sqlite`

The timestamp uses ISO 8601 format with characters safe for filenames.

---

## 🔍 Troubleshooting

### "Database not found" error

The database file doesn't exist yet. Start the bot first to create it:

```bash
pnpm start
```

### "Permission denied" when creating backup

Check file permissions:

```bash
chmod 755 data
chmod 644 data/db.sqlite
```

### Backups taking up too much space

Reduce retention:

```bash
node scripts/backupDb.js clean 5  # Keep only 5
```

Or manually delete old backups:

```bash
rm data/backups/db_backup_2025-11-*.sqlite
```

---

For more help, check the main [README.md](file:///Users/adrianbonpin/Documents/Code/personal/ranquake-discod-bot/README.md) or open an issue on GitHub.
