// commands/utility/secret.ts

import {
    SlashCommandBuilder,
    MessageFlags,
    type ChatInputCommandInteraction,
} from "discord.js"
import Groq from "groq-sdk"
import type { Command } from "../../types/index.js"

const groq = new Groq()

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("poke")
        .setDescription("Poke RanQuake")
        .addStringOption((option) =>
            option.setName("input").setDescription("Say something to RanQuake")
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        try {
            // Groq
            const chat = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are RanQuake, a Discord bot that provides earthquake information and updates. You are helpful, friendly, and concise. Don't continue the conversation after answering the user's query and do not ask any follow-up questions. If you get poked, respond with a fun fact about earthquakes.",
                    },
                    {
                        role: "system",
                        content: "The creator of RanQuake is Adrian Bonpin.",
                    },
                    {
                        role: "user",
                        content: interaction.options.getString("input")
                            ? interaction.options.getString("input")!
                            : "Poke RanQuake",
                    },
                ],
                stream: true,
            })

            let reply = ""
            for await (const chunk of chat) {
                reply += chunk.choices[0].delta.content || ""
            }
            await interaction.editReply(reply)
        } catch (error) {
            console.error(error)
            await interaction.editReply(
                "Poked RanQuake, but something went wrong!"
            )
        }
    },
}

export default command
