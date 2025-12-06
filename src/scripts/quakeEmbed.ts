// scripts/quakeEmbed.ts
// Creates Discord embed messages for earthquake alerts

import { EmbedBuilder, type TextChannel } from "discord.js"
import type { Earthquake } from "../types/index.js"

const mapBoxApiKey = process.env.MAPBOX_API_KEY

export async function postNewQuakeEmbed(
    channel: TextChannel,
    quake: Earthquake
): Promise<void> {
    try {
        // MapBox Settings
        const MAG_LABEL_MAPBOX = Math.floor(quake.magnitude).toString()
        const MAP_SIZE = "600x400"
        let mapLink = ""

        // If MapBox API Key is set
        if (mapBoxApiKey) {
            const customMarker = `pin-s-${MAG_LABEL_MAPBOX}+FF0000(${quake.longitude},${quake.latitude})`
            mapLink =
                `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/` +
                `${customMarker}/` +
                `${quake.longitude},${quake.latitude},7,0/${MAP_SIZE}@2x` +
                `?access_token=${mapBoxApiKey}`
        } else {
            // Otherwise use yandex
            mapLink = `https://static-maps.yandex.ru/1.x/?l=map&size=400,300&z=7&ll=${quake.longitude},${quake.latitude}&pt=${quake.longitude},${quake.latitude},pmwtm1`
        }

        const magnitudeColor = ((): number => {
            if (quake.magnitude >= 7.0) return 0xff0000 // Red (Major)
            if (quake.magnitude >= 6.0) return 0xffa500 // Orange (Strong)
            if (quake.magnitude >= 5.0) return 0xffff00 // Yellow (Moderate)
            return 0x00ff00 // Green (Light)
        })()

        const quakeEmbed = new EmbedBuilder()
            .setColor(magnitudeColor)
            .setTitle(`🚨 M${quake.magnitude.toFixed(1)} - ${quake.location}`)
            .setURL(quake.url)
            .setDescription(
                `An earthquake of magnitude ${quake.magnitude.toFixed(
                    1
                )} occurred ${quake.location}.`
            )
            .addFields(
                {
                    name: "Time (PST)",
                    value: quake.timePST,
                    inline: true,
                },
                {
                    name: "Magnitude",
                    value: `M${quake.magnitude.toFixed(1)}`,
                    inline: true,
                },
                {
                    name: "Depth",
                    value: `${quake.depth} km`,
                    inline: true,
                },
                {
                    name: "Coordinates",
                    value: `Lat: ${quake.latitude.toFixed(
                        2
                    )}, Lon: ${quake.longitude.toFixed(2)}`,
                    inline: true,
                }
            )
            .setImage(mapLink)
            .setFooter({ text: "Data sourced from Phivolcs" })
            .setTimestamp()

        await channel.send({ embeds: [quakeEmbed] })
    } catch (error) {
        console.error(`Error fetching general earthquake data: ${error}`)
    }
}
