// Axios
const axios = require("axios")
const https = require("https")

// Cheerio
const cheerio = require("cheerio")

// PHIVOLCS Setup
const URL = "https://earthquake.phivolcs.dost.gov.ph"
const MIN_MAG = 4.0

// In Memory State Management
let firstRun = true // Flag for first run, flip to false after first run
let trackedQuakeIds = new Set()
let lastClearTime = Date.now()
const CLEAR_INTERVAL_MS = 6 * 60 * 60 * 1000 // Clear every 6 hours

// Axios Instance with 30 seconds timeout and ignore SSL
const phivolcsAxios = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
    timeout: 30 * 1000,
})

const spacer = () => console.log("========================================")

function clearOldIds() {
    const now = Date.now()
    if (now - lastClearTime > CLEAR_INTERVAL_MS) {
        const initialSize = trackedQuakeIds.size
        trackedQuakeIds.clear()
        lastClearTime = now
        console.log(
            `\n🧹 Memory cleanup: Cleared ${initialSize} old quake IDs from Set.`
        )
    }
}

async function getEarthquakeData(recentHours = 12, pure = false) {
    // Clear tracked IDs if interval has passed
    clearOldIds()

    // First Run Skips Fetching
    if (firstRun && !pure) {
        firstRun = false
        return []
    }
    const curDate = new Date()
    // Fetch Earthquake Data
    try {
        spacer()
        console.log("Fetching earthquake data from PHIVOLCS...")
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
        const $ = cheerio.load(res.data)
        const loggedQuakes = []

        // Locate Earthquake Table
        const tables = $("table.MsoNormalTable")
        let targetTable = null
        tables.each((idx, table) => {
            const text = $(table).text()
            if (
                text.includes("Date - Time") ||
                text.includes("Philippine Time")
            ) {
                targetTable = table
                console.log(`Found target table at index ${idx}.`)
                return false // Break loop
            }
        })

        if (!targetTable) {
            console.log("Error: Could not find the earthquake data table.")
            return []
        }

        const rows = $(targetTable).find("tr")

        // == Data Cleanup & Parsing
        rows.each((idx, row) => {
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
            const bulletin = dateTimeCol
                .find("a")
                .attr("href")
                .trim()
                .replaceAll("\\", "/")
            const url = `${URL}/${bulletin}`

            if (mag < MIN_MAG) return

            const quake = {
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

            loggedQuakes.push(quake)
            return true
        })

        // Final Cleanup if pure is true (if Pure, requested by user and skip removal of old IDs)
        if (!pure) {
            const newQuakes = []

            loggedQuakes.forEach((quake) => {
                if (!trackedQuakeIds.has(quake.id)) {
                    trackedQuakeIds.add(quake.id)
                    newQuakes.push(quake)
                }
            })
            spacer()
            return newQuakes
        } else {
            spacer()
            return loggedQuakes
        }
    } catch (error) {
        console.error(`Error fetching data from PHIVOLCS: ${error.message}`)
        spacer()
        return []
    }
}

async function test() {
    const data = await getEarthquakeData(24, true)
    console.log(data.reverse())
}

// test()

module.exports = getEarthquakeData
