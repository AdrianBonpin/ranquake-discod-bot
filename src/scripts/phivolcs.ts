// scripts/phivolcs.ts
// Fetches earthquake data from PHIVOLCS website

import axios from "axios"
import https from "node:https"
import * as cheerio from "cheerio"
import type { Earthquake } from "../types/index.js"
import db from "./db.js"

// PHIVOLCS Setup
const URL = "https://earthquake.phivolcs.dost.gov.ph"
const MIN_MAG = 4.0

// Axios Instance with 30 seconds timeout and ignore SSL
const phivolcsAxios = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
    timeout: 30 * 1000,
})

async function getEarthquakeData(
    recentHours: number = 12,
    filterTracked: boolean = false
): Promise<Earthquake[]> {
    const curDate = new Date()

    // Fetch Earthquake Data
    try {
        const res = await phivolcsAxios.get(URL, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                Connection: "keep-alive",
            },
        })

        // Start Parsing HTML with Cheerio
        const $ = cheerio.load(res.data as string)
        const loggedQuakes: Earthquake[] = []

        // Locate Earthquake Table
        const tables = $("table.MsoNormalTable")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let targetTable: any = null
        tables.each((_idx, table) => {
            const text = $(table).text()
            if (
                text.includes("Date - Time") ||
                text.includes("Philippine Time")
            ) {
                targetTable = table
                return false // Break loop
            }
        })

        if (!targetTable) {
            console.log("Error: Could not find the earthquake data table.")
            return []
        }

        const rows = $(targetTable).find("tr")

        // == Data Cleanup & Parsing
        rows.each((_idx, row) => {
            const col = $(row).find("td")

            if (col.length < 6) return

            const dateTimeCol = $(col[0])
            const dateTime = dateTimeCol.text().trim()
            // Only process rows within recent hours
            if (
                Math.abs(
                    new Date(dateTime.replace(" - ", " ")).getTime() -
                    curDate.getTime()
                ) >
                recentHours * 60 * 60 * 1000
            )
                return false

            const lat = Number($(col[1]).text().trim())
            const long = Number($(col[2]).text().trim())
            const depth = Number($(col[3]).text().trim())
            const mag = Number($(col[4]).text().trim())
            const place = $(col[5]).text().replace(/\s+/g, " ").trim()
            const bulletinHref = dateTimeCol.find("a").attr("href")
            const bulletin = bulletinHref
                ? bulletinHref.trim().replaceAll("\\", "/")
                : ""
            const url = `${URL}/${bulletin}`

            if (mag < MIN_MAG) return

            const quake: Earthquake = {
                // Create ID using dateTime & lat/long
                id: (dateTime + lat + long).replace(/\s+/g, "-"),
                timePST: dateTime.replace(" - ", " "),
                magnitude: mag,
                location: place,
                latitude: lat,
                longitude: long,
                depth: depth,
                url: url,
            }

            // Filter out already tracked quakes if requested
            if (filterTracked && db.isQuakeTracked(quake.id)) {
                return
            }

            loggedQuakes.push(quake)
            return true
        })

        return loggedQuakes
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        console.error(`Error fetching data from PHIVOLCS: ${errorMessage}`)
        return []
    }
}

// Test function
async function test(): Promise<void> {
    const data = await getEarthquakeData()
    console.log(data.reverse())
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    test()
}

export default getEarthquakeData
