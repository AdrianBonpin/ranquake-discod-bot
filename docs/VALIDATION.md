# Input Validation & Permission Checks

This document explains the input validation and permission checking implemented in Tremor Watch.

---

## 🔒 Permission Requirements

Certain commands require specific permissions to prevent unauthorized users from changing bot configuration.

### Commands Requiring Permissions

| Command                   | Required Permission                      | Purpose              |
| ------------------------- | ---------------------------------------- | -------------------- |
| `/set-earthquake-channel` | **Administrator** OR **Manage Channels** | Set alert channel    |
| `/unlink`                 | **Administrator** OR **Manage Channels** | Remove alert channel |

### Commands Available to Everyone

| Command             | Description                           |
| ------------------- | ------------------------------------- |
| `/help`             | View available commands               |
| `/is-linked`        | Check if server has alerts configured |
| `/request-update`   | Manually trigger earthquake check     |
| `/get-local-quake`  | Get recent Philippine earthquakes     |
| `/get-global-quake` | Get recent global earthquakes         |
| `/poke`             | Interact with RanQuake AI             |

---

## ✅ Validation Checks

### 1. Channel ID Validation

When setting an earthquake alert channel, the bot validates:

**Format Check:**

-   Channel IDs must be valid Discord snowflakes (17-19 digits)
-   Invalid format example: `abc123` ❌
-   Valid format example: `1234567890123456789` ✅

**Existence Check:**

-   Channel must exist in the server
-   Bot must have access to view the channel
-   Error if channel not found or inaccessible

**Channel Type Check:**

-   Must be a text channel
-   Voice channels, forum channels, etc. are rejected
-   Ensures alerts can be sent properly

### 2. Bot Permission Check

Before setting a channel, the bot verifies it has:

-   ✅ **View Channel** - Can see the channel
-   ✅ **Send Messages** - Can send alerts
-   ✅ **Embed Links** - Can send rich earthquake embeds

If any permission is missing, the command fails with a helpful error message.

### 3. User Permission Check

Before allowing channel configuration, the bot verifies the user has:

-   ✅ **Administrator** permission, OR
-   ✅ **Manage Channels** permission

This prevents regular users from changing server configuration.

---

## 📊 Validation Flow

### Setting an Alert Channel (`/set-earthquake-channel`)

```
User runs command
    ↓
Check User Permissions
    ↓ (if authorized)
Validate Channel ID Format
    ↓ (if valid)
Check Channel Exists
    ↓ (if exists)
Verify Channel Type (text)
    ↓ (if text channel)
Check Bot Permissions in Channel
    ↓ (if bot has access)
Save to Database
    ↓
✅ Success!
```

At each step, if validation fails, a clear error message is returned to the user.

---

## 🛡️ Security Benefits

1. **Prevents Unauthorized Changes** - Only admins/moderators can configure alerts
2. **Avoids Silent Failures** - Validates bot permissions before saving
3. **Better User Experience** - Clear error messages explain what's wrong
4. **Prevents Invalid Configuration** - Channel must exist and be accessible

---

## 🔧 Implementation Details

### Validation Module

Location: [`scripts/validation.js`](file:///Users/adrianbonpin/Documents/Code/personal/ranquake-discod-bot/scripts/validation.js)

**Functions:**

-   `isValidChannelId(channelId)` - Validates snowflake format
-   `validateChannel(guild, channelId)` - Comprehensive channel validation
-   `checkManagePermissions(member)` - User permission check
-   `checkBotPermissions(channel, botMember)` - Bot permission check

### Usage in Commands

Commands import validation functions:

```javascript
const {
    validateChannel,
    checkManagePermissions,
    checkBotPermissions,
} = require("../../scripts/validation.js")
```

Then use them during command execution:

```javascript
// Check user permissions
const permCheck = checkManagePermissions(interaction.member)
if (!permCheck.hasPermission) {
    return interaction.editReply(permCheck.error)
}

// Validate channel
const channelCheck = validateChannel(interaction.guild, channelId)
if (!channelCheck.valid) {
    return interaction.editReply(channelCheck.error)
}

// Check bot permissions
const botPermCheck = checkBotPermissions(channel, botMember)
if (!botPermCheck.hasPermission) {
    return interaction.editReply(botPermCheck.error)
}
```

---

## ⚠️ Common Error Messages

### Permission Errors

**User lacks permissions:**

```
❌ You need **Administrator** or **Manage Channels** permission to use this command.
```

**Bot lacks permissions:**

```
⚠️ I don't have permission to send messages in #alerts. Please ensure I have View Channel, Send Messages, and Embed Links permissions.
```

### Channel Validation Errors

**Invalid format:**

```
Invalid channel ID format. Channel IDs must be 17-19 digit numbers.
```

**Channel not found:**

```
Channel #123456789012345678 not found in this server. Make sure the ID is correct and the bot has access to view the channel.
```

**Wrong channel type:**

```
#voice-chat is not a text channel. Please select a text channel for earthquake alerts.
```

---

## 🧪 Testing Validation

### Test Permission Checks

1. As a regular user (no special permissions):

    ```
    /set-earthquake-channel
    ```

    Expected: Permission denied error

2. As an admin:
    ```
    /set-earthquake-channel
    ```
    Expected: Command succeeds (or next validation step)

### Test Channel Validation

1. Invalid ID:

    ```
    /set-earthquake-channel channel_id:abc123
    ```

    Expected: Invalid format error

2. Non-existent channel:

    ```
    /set-earthquake-channel channel_id:999999999999999999
    ```

    Expected: Channel not found error

3. Voice channel:

    ```
    /set-earthquake-channel channel_id:<voice_channel_id>
    ```

    Expected: Wrong channel type error

4. Valid channel without bot access:
    - Remove bot's View Channel permission
    - Run command
      Expected: Bot permission error

---

## 🔮 Future Enhancements

Potential validation improvements:

1. **Rate Limiting** - Prevent command spam
2. **Input Sanitization** - Additional input validation
3. **Audit Logging** - Log permission-protected actions
4. **Role-based Permissions** - Configure which roles can use commands
5. **Channel Whitelist** - Restrict which channels can be used for alerts

---

For more information, see:

-   [Main README](file:///Users/adrianbonpin/Documents/Code/personal/ranquake-discod-bot/README.md)
-   [Security Guide](file:///Users/adrianbonpin/Documents/Code/personal/ranquake-discod-bot/SECURITY.md)
