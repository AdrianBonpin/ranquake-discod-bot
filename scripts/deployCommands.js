const { REST, Routes } = require("discord.js")
const fs = require("node:fs")
const path = require("node:path")

// Note: We don't need to load token/clientId/commands here,
// we will pass them in from the main bot file.

/**
 * Deploys slash commands to a specific Discord Guild (Server).
 * @param {string} guildId The ID of the guild to deploy commands to.
 * @param {string} clientId The bot's client ID.
 * @param {string} token The bot's authentication token.
 * @param {Array<Object>} commands An array of command data (JSON objects).
 */
async function deployCommandsToGuild(guildId, clientId, token, commands) {
    if (!guildId) {
        console.error("Guild ID is required for deployment.")
        return
    }

    const rest = new REST().setToken(token)

    try {
        console.log(
            `Started refreshing ${commands.length} application (/) commands for guild ${guildId}.`
        )

        // The put method fully refreshes all commands in the specified guild
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        )

        console.log(
            `Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`
        )
    } catch (error) {
        console.error(`Error deploying commands to guild ${guildId}:`, error)
    }
}

// --- Command Collection Logic (Keep this in the main deployer file if you want,
// or move it to a helper, but it needs to run once) ---

// This part collects the commands and should run once at bot startup.
function getLocalCommands() {
    const commands = []
    const foldersPath = path.join(__dirname, "commands")
    // Ensure the path is correct relative to where you call this function
    if (!fs.existsSync(foldersPath)) {
        console.error(`Commands folder not found at: ${foldersPath}`)
        return []
    }
    const commandFolders = fs.readdirSync(foldersPath)

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder)
        const commandFiles = fs
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith(".js"))

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file)
            const command = require(filePath)
            if ("data" in command && "execute" in command) {
                commands.push(command.data.toJSON())
            } else {
                console.log(
                    `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
                )
            }
        }
    }
    return commands
}

module.exports = { deployCommandsToGuild, getLocalCommands }
