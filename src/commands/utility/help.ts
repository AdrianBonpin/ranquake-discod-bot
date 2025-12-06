// commands/utility/help.ts

import {
    SlashCommandBuilder,
    MessageFlags,
    type ChatInputCommandInteraction,
} from "discord.js"
import type {
    Command,
    SendQuakeAlertsFunction,
    GuildChannelMap,
} from "../../types/index.js"
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js"
import type DbManager from "../../scripts/db.js"

let collectedCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get a list of commands and their descriptions"),

    // Allow index.ts to pass in the collected commands
    setCommands(commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]) {
        collectedCommands = commands
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const user = interaction.user
        let commandList = ""
        for (const command of collectedCommands) {
            commandList += `\n- \`/${command.name}\` : ${command.description}`
        }

        await interaction.editReply(
            `### Hello ${user}!\n\nHere's the list of commands:${commandList}`
        )
    },
}

export default command
