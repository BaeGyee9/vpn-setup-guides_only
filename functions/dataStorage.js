// functions/dataStorage.js
// VPN Guide Bot အတွက် အချက်အလက် သိမ်းဆည်းခြင်းနှင့် ပြန်လည်ရယူခြင်း (KV Storage)

import { VPN_GUIDE_KEY_PREFIX } from './constants.js'; // VPN Guide အတွက် Prefix ကို import လုပ်ပါ။
// REMOVED: WELCOME_MESSAGE_KEY, WELCOME_PHOTO_KEY, etc. from constants import as they are not needed for guide bot.

/**
 * Stores general data in the specified KV namespace.
 * @param {object} env - The Cloudflare environment object (e.g., context.env).
 * @param {string} namespaceName - The name of the KV namespace (e.g., 'VPN_GUIDE_DATA').
 * @param {string} key - The unique key for the data.
 * @param {object} data - The object to store.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeData(env, namespaceName, key, data) {
    console.log(`[storeData] Attempting to store data in '${namespaceName}' for key: ${key}`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[storeData] KV namespace '${namespaceName}' is not bound. Cannot store data.`);
        return false;
    }
    try {
        // Data ကို JSON string အဖြစ်ပြောင်းပြီး သိမ်းဆည်းခြင်း။
        await kvNamespace.put(key, JSON.stringify(data));
        console.log(`[storeData] Stored data in '${namespaceName}' for key: ${key}`);
        return true;
    } catch (error) {
        console.error(`[storeData] Error storing data in '${namespaceName}' for key ${key}:`, error);
        return false;
    }
}

/**
 * Retrieves general data from the specified KV namespace.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} namespaceName - The name of the KV namespace (e.g., 'VPN_GUIDE_DATA').
 * @param {string} key - The unique key for the data.
 * @returns {Promise<object|null>} - The retrieved data object or null if not found/error.
 */
export async function retrieveData(env, namespaceName, key) {
    console.log(`[retrieveData] Attempting to retrieve data from '${namespaceName}' for key: ${key}`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[retrieveData] KV namespace '${namespaceName}' is not bound. Cannot retrieve data.`);
        return null;
    }
    try {
        // Data ကို JSON အဖြစ် ပြန်ပြောင်းပြီး ရယူခြင်း။
        const data = await kvNamespace.get(key, { type: 'json' });
        console.log(`[retrieveData] Retrieved data for key ${key}:`, data);
        return data;
    } catch (error) {
        console.error(`[retrieveData] Error retrieving data from '${namespaceName}' for key ${key}:`, error);
        return null;
    }
}

/**
 * Deletes data from the specified KV namespace.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} namespaceName - The name of the KV namespace (e.g., 'VPN_GUIDE_DATA').
 * @param {string} key - The unique key of the data to delete.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteData(env, namespaceName, key) {
    console.log(`[deleteData] Attempting to delete data from '${namespaceName}' for key: ${key}`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[deleteData] KV namespace '${namespaceName}' is not bound. Cannot delete data.`);
        return false;
    }
    try {
        await kvNamespace.delete(key);
        console.log(`[deleteData] Deleted data for key: ${key}`);
        return true;
    } catch (error) {
        console.error(`[deleteData] Error deleting data from '${namespaceName}' for key ${key}:`, error);
        return false;
    }
}

/**
 * Lists keys within a specified prefix in a KV namespace.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} namespaceName - The name of the KV namespace.
 * @param {string} prefix - The prefix to filter keys by.
 * @returns {Promise<Array<string>>} - An array of full keys (strings).
 */
export async function listKeys(env, namespaceName, prefix = '') {
    console.log(`[listKeys] Attempting to list keys with prefix '${prefix}' from '${namespaceName}'.`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[listKeys] KV namespace '${namespaceName}' is not bound. Cannot list keys.`);
        return [];
    }
    try {
        let keys = [];
        let cursor = undefined;
        do {
            const listResult = await kvNamespace.list({ prefix: prefix, cursor: cursor });
            keys = keys.concat(listResult.keys.map(key => key.name));
            cursor = listResult.list_complete ? undefined : listResult.cursor;
        } while (cursor);
        console.log(`[listKeys] Found ${keys.length} keys with prefix '${prefix}'.`);
        return keys;
    } catch (error) {
        console.error(`[listKeys] Error listing keys with prefix '${prefix}' from '${namespaceName}':`, error);
        return [];
    }
}

/**
 * Stores a VPN usage guide step.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} appCode - The code for the VPN app (e.g., 'NETMOD').
 * @param {number} stepNumber - The step number.
 * @param {object} guideData - The guide data object { text, image_file_id, download_link }.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeVpnGuide(env, appCode, stepNumber, guideData) {
    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumber}`;
    return await storeData(env, 'VPN_GUIDE_DATA', fullKey, guideData);
}

/**
 * Retrieves a VPN usage guide step.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} appCode - The code for the VPN app.
 * @param {number} stepNumber - The step number.
 * @returns {Promise<object|null>} - The guide data object or null.
 */
export async function getVpnGuide(env, appCode, stepNumber) {
    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumber}`;
    return await retrieveData(env, 'VPN_GUIDE_DATA', fullKey);
}

/**
 * Deletes a VPN usage guide step.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} appCode - The code for the VPN app.
 * @param {number} stepNumber - The step number.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteVpnGuide(env, appCode, stepNumber) {
    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumber}`;
    return await deleteData(env, 'VPN_GUIDE_DATA', fullKey);
}

/**
 * Lists all VPN guide steps for a given app code, or all app codes if no appCode is provided.
 * @param {object} env - The Cloudflare environment object.
 * @param {string|null} appCode - Optional: The app code to filter by.
 * @returns {Promise<Array<object>>} - An array of guide objects { appCode, stepNumber, text, image_file_id, download_link }.
 */
export async function listVpnGuides(env, appCode = null) {
    const prefix = appCode ? `${VPN_GUIDE_KEY_PREFIX}${appCode}:` : VPN_GUIDE_KEY_PREFIX;
    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', prefix);
    const guides = [];
    const uniqueAppCodes = new Set(); // For listing only app codes when no appCode is specified

    for (const fullKey of allKeys) {
        const parts = fullKey.split(':'); // e.g., vpn_guide:NETMOD:1
        if (parts.length >= 3) {
            const currentAppCode = parts[1];
            const currentStepNumber = parseInt(parts[2], 10);
            if (!isNaN(currentStepNumber)) {
                // If specific appCode is requested, fetch and add full guide data
                if (appCode) {
                    const guideData = await retrieveData(env, 'VPN_GUIDE_DATA', fullKey);
                    if (guideData) {
                        guides.push({
                            appCode: currentAppCode,
                            stepNumber: currentStepNumber,
                            text: guideData.text,
                            image_file_id: guideData.image_file_id || null,
                            download_link: guideData.download_link || null
                        });
                    }
                } else {
                    // If no appCode is specified, just add unique app codes
                    uniqueAppCodes.add(currentAppCode);
                }
            }
        }
    }

    // If no appCode was specified, return a list of unique app codes found
    if (!appCode) {
        return Array.from(uniqueAppCodes).map(code => ({ appCode: code }));
    }

    // Sort steps by stepNumber if a specific appCode was requested
    guides.sort((a, b) => a.stepNumber - b.stepNumber);
    return guides;
}

// REMOVED: All sales-related data storage functions like:
// - storePaymentDetails, getPaymentDetails, updatePaymentStatus
// - storeVpnKey, getVpnKey, updateVpnKeyStatus
// - storeUserTrialStatus, getUserTrialStatus
// - setProductPrice, deleteProductPrice, listProducts
// - storeWelcomeMessage, getWelcomeMessage, deleteWelcomeMessage
// - storeWelcomePhoto, getWelcomePhoto, deleteWelcomePhoto
// - storeVpnOperatorButton, getVpnOperatorButton, deleteVpnOperatorButton, listVpnOperatorButtons
