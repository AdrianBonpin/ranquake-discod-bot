const { SlashCommandBuilder, MessageFlags } = require("discord.js")

let collectedCommands = []

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get a list of commands and their descriptions"),

    // Allow index.js to pass in the collected commands
    setCommands(commands) {
        collectedCommands = commands
    },

    async execute(interaction) {
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
