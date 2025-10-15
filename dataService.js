// This file handles reading and writing data to the file system.
// It acts as a bridge between the renderer process (UI) and the main process (Electron's backend).

export const defaultsMap = {
    shpenzimet: [],
    qarkullimi: [],
    punetoret: [],
    custom: [],
    furnitoret: [],
    nenkategorite: [],
    shpenzimeKategorite: ['fature', 'karburant', 'material', 'pajisje'],
    customCategories: [],
    inventari: [], // Added for the new inventory feature
};

/**
 * Loads all data from their respective JSON files.
 * If a file doesn't exist, it uses the default value from defaultsMap.
 * @returns {Promise<Object>} A promise that resolves to the complete state object.
 */
export async function loadAll() {
    const state = {};
    for (const key in defaultsMap) {
        state[key] = await window.api.readJSON(`${key}.json`, defaultsMap[key]);
    }
    return state;
}

/**
 * Saves the entire state object to their respective JSON files.
 * @param {Object} state - The complete state object to save.
 * @returns {Promise<void>}
 */
export async function saveAll(state) {
    for (const key in defaultsMap) {
        if (state.hasOwnProperty(key)) {
            await window.api.writeJSON(`${key}.json`, state[key]);
        }
    }
}

/**
 * Saves a single item (a specific part of the state) to its JSON file.
 * @param {string} key - The key of the state part to save (e.g., 'shpenzimet').
 * @param {*} data - The data to save.
 * @returns {Promise<boolean>} A promise that resolves to true if successful.
 */
export async function saveItem(key, data) {
    if (key in defaultsMap) {
        return await window.api.writeJSON(`${key}.json`, data);
    }
    console.error(`Error: Attempted to save unknown item '${key}'`);
    return false;
}

