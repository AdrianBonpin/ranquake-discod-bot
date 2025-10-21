import axios from "axios"

// --- Configuration ---
const PHILIPPINES_BBOX = {
    maxlatitude: 21.0, // North
    minlongitude: 116.0, // West
    minlatitude: 4.0, // South
    maxlongitude: 130.0, // East
}
const USGS_API_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
const MIN_MAGNITUDE = 4.5
const ID_CLEAR_INTERVAL_MS = 6 * 60 * 60 * 1000 // Clear set every 6 hours

// --- State Management (Private) ---
let trackedQuakeIds = new Set()
let lastClearTime = Date.now()

// --- Private Functions ---

/**
 * Clears the set of tracked IDs if the defined interval has passed.
 */
function clearOldIds() {
    const now = Date.now()
    if (now - lastClearTime > ID_CLEAR_INTERVAL_MS) {
        const initialSize = trackedQuakeIds.size
        trackedQuakeIds.clear()
        lastClearTime = now
        console.log(
            `\n🧹 Memory cleanup: Cleared ${initialSize} old quake IDs from Set.`
        )
    }
}

/**
 * Transforms the raw USGS GeoJSON feature into a cleaner data object.
 * @param {object} quake - A single earthquake feature object from USGS.
 * @returns {object} The standardized earthquake data object.
 */
function formatQuakeData(quake) {
    const properties = quake.properties
    const quakeCoords = quake.geometry.coordinates // [longitude, latitude, depth]
    const time = new Date(properties.time).toLocaleString("en-US", {
        timeZone: "Asia/Manila",
    })

    return {
        id: quake.id,
        timePST: time,
        magnitude: properties.mag,
        location: properties.place,
        latitude: quakeCoords[1],
        longitude: quakeCoords[0],
        depthKm: quakeCoords[2],
        usgsUrl: properties.url,
    }
}

// --- Public Function ---

/**
 * Fetches recent earthquakes within the Philippines region, filters out already
 * seen IDs, and returns a list of new events.
 * @param {number} recentMinutes - How many minutes back to query the USGS API.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of new earthquake objects.
 */
export async function getNewEarthquakes(recentMinutes = 15) {
    // 1. Perform memory cleanup check
    clearOldIds()

    // 2. Set API query parameters
    const startTime = new Date(
        Date.now() - recentMinutes * 60 * 1000
    ).toISOString()

    const params = {
        format: "geojson",
        starttime: startTime,
        minmagnitude: MIN_MAGNITUDE,
        orderby: "time",
        ...PHILIPPINES_BBOX,
    }

    try {
        // 3. Fetch data
        const response = await axios.get(USGS_API_URL, { params })
        const allQuakes = response.data.features || []

        const newQuakes = []

        // 4. Filter and Track
        for (const quake of allQuakes) {
            if (!trackedQuakeIds.has(quake.id)) {
                // This is a new quake!
                trackedQuakeIds.add(quake.id)
                newQuakes.push(formatQuakeData(quake))
            }
        }

        return newQuakes
    } catch (error) {
        console.error(`\n🚨 Error fetching data from USGS: ${error.message}`)
        // Return empty array on error to allow script to continue
        return []
    }
}
