// scripts/deployCommands.ts
// Deploys slash commands to Discord guilds

import { REST, Routes } from "discord.js"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import type { Command } from "../types/index.js"
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Deploys slash commands to a specific Discord Guild (Server).
 */
export async function deployCommandsToGuild(
    guildId: string,
    clientId: string,
    token: string,
    commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]
): Promise<void> {
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
        const data = (await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        )) as unknown[]

        console.log(
            `Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`
        )
    } catch (error) {
        console.error(`Error deploying commands to guild ${guildId}:`, error)
    }
}

/**
 * Collects all local commands from the commands directory
 */
export function getLocalCommands(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
    const foldersPath = path.join(__dirname, "..", "commands")

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
            // Dynamic import for ESM
            const fileUrl = pathToFileURL(filePath).href
            // Note: This is a sync context, we'll need to handle this differently
            // For now, we'll use require-like behavior with a workaround
            console.log(`Loading command from: ${fileUrl}`)
        }
    }

    return commands
}

/**
 * Async version of getLocalCommands for ESM compatibility
 */
export async function getLocalCommandsAsync(): Promise<
    RESTPostAPIChatInputApplicationCommandsJSONBody[]
> {
    const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
    const foldersPath = path.join(__dirname, "..", "commands")

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
            const fileUrl = pathToFileURL(filePath).href

            try {
                const commandModule = (await import(fileUrl)) as {
                    default: Command
                }
                const command = commandModule.default

                if (command.data) {
                    commands.push(command.data.toJSON())
                } else {
                    console.log(
                        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
                    )
                }
            } catch (error) {
                console.error(`Error loading command ${filePath}:`, error)
            }
        }
    }

    return commands
}
