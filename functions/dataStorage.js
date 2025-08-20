// functions/dataStorage.js

import { WELCOME_MESSAGE_KEY, WELCOME_PHOTO_KEY, VPN_GUIDE_KEY_PREFIX } from './constants.js';

/**
 * Stores general data in the specified KV namespace.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} namespaceName - The name of the KV namespace (e.g., 'USER_DATA', 'SALES_DATA', 'VPN_GUIDE_DATA').
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
 * @param {string} namespaceName - The name of the KV namespace.
 * @param {string} key - The unique key for the data.
 * @returns {Promise<object|null>} - The retrieved object or null if not found/error.
 */
export async function retrieveData(env, namespaceName, key) {
    console.log(`[retrieveData] Attempting to retrieve data from '${namespaceName}' for key: ${key}`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[retrieveData] KV namespace '${namespaceName}' is not bound. Cannot retrieve data.`);
        return null;
    }
    try {
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
 * @param {string} namespaceName - The name of the KV namespace.
 * @param {string} key - The unique key for the data to delete.
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
        console.log(`[deleteData] Deleted data from '${namespaceName}' for key: ${key}`);
        return true;
    } catch (error) {
        console.error(`[deleteData] Error deleting data from '${namespaceName}' for key ${key}:`, error);
        return false;
    }
}

/**
 * Lists all keys with a given prefix in the specified KV namespace.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} namespaceName - The name of the KV namespace.
 * @param {string} prefix - The prefix to filter keys by.
 * @returns {Promise<Array<string>>} - An array of full keys (strings).
 */
export async function listKeys(env, namespaceName, prefix = '') {
    console.log(`[listKeys] Attempting to list keys in '${namespaceName}' with prefix: ${prefix}`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[listKeys] KV namespace '${namespaceName}' is not bound. Cannot list keys.`);
        return [];
    }
    try {
        const { keys } = await kvNamespace.list({ prefix: prefix });
        const fullKeys = keys.map(key => key.name);
        console.log(`[listKeys] Found ${fullKeys.length} keys with prefix '${prefix}'.`);
        return fullKeys;
    } catch (error) {
        console.error(`[listKeys] Error listing keys in '${namespaceName}' with prefix ${prefix}:`, error);
        return [];
    }
}

// --- Welcome Message Storage ---
/**
 * Stores the welcome message text in KV.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} messageText - The message text to store.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeWelcomeMessage(env, messageText) {
    return await storeData(env, 'SALES_DATA', WELCOME_MESSAGE_KEY, { text: messageText });
}

/**
 * Retrieves the welcome message text from KV.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<string|null>} - The welcome message text or null if not found.
 */
export async function getWelcomeMessage(env) {
    const data = await retrieveData(env, 'SALES_DATA', WELCOME_MESSAGE_KEY);
    return data ? data.text : null;
}

/**
 * Deletes the welcome message from KV.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteWelcomeMessage(env) {
    return await deleteData(env, 'SALES_DATA', WELCOME_MESSAGE_KEY);
}

// --- Welcome Photo Storage ---
/**
 * Stores the welcome photo file ID in KV.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} fileId - The Telegram file_id of the photo.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeWelcomePhoto(env, fileId) {
    return await storeData(env, 'SALES_DATA', WELCOME_PHOTO_KEY, { file_id: fileId });
}

/**
 * Retrieves the welcome photo file ID from KV.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<string|null>} - The welcome photo file ID or null if not found.
 */
export async function getWelcomePhoto(env) {
    const data = await retrieveData(env, 'SALES_DATA', WELCOME_PHOTO_KEY);
    return data ? data.file_id : null;
}

/**
 * Deletes the welcome photo from KV.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteWelcomePhoto(env) {
    return await deleteData(env, 'SALES_DATA', WELCOME_PHOTO_KEY);
}


// --- Payment Details Storage ---
/**
 * Stores payment transaction details.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} transactionId - Unique ID for the transaction.
 * @param {object} details - Object containing payment details.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storePaymentDetails(env, transactionId, details) {
    const key = `payment:${transactionId}`;
    return await storeData(env, 'SALES_DATA', key, details);
}

/**
 * Retrieves payment transaction details.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} transactionId - Unique ID for the transaction.
 * @returns {Promise<object|null>} - The payment details object or null.
 */
export async function getPaymentDetails(env, transactionId) {
    const key = `payment:${transactionId}`;
    return await retrieveData(env, 'SALES_DATA', key);
}

/**
 * Updates the status of a payment transaction.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} transactionId - Unique ID for the transaction.
 * @param {string} newStatus - The new status to set.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function updatePaymentStatus(env, transactionId, newStatus) {
    const key = `payment:${transactionId}`;
    const details = await getPaymentDetails(env, transactionId);
    if (details) {
        details.status = newStatus;
        return await storeData(env, 'SALES_DATA', key, details);
    }
    return false;
}

// --- VPN Key Storage (MODIFIED to include operator_code) ---
/**
 * Stores a VPN key with its type, content, and initial status.
 * Key format: vpn_key:<operator_code>:<key_type>:<unique_id>
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The operator code (e.g., 'DTAC', 'TRUE').
 * @param {string} keyType - The type of VPN key (e.g., 'DNS_30DAY', 'SSH_7DAY').
 * @param {string} keyContent - The actual VPN key content.
 * @returns {Promise<string|null>} - The unique ID of the stored key, or null if failed.
 */
export async function storeVpnKey(env, operatorCode, keyType, keyContent) {
    const uniqueId = Math.random().toString(36).substring(2, 15); // Simple unique ID
    const fullKey = `vpn_key:${operatorCode}:${keyType}:${uniqueId}`;
    const keyData = {
        key: keyContent,
        status: 'available', // 'available', 'sold', 'trial'
        assigned_to: null,
        expiration_time: null,
        created_at: new Date().toISOString()
    };
    const success = await storeData(env, 'SALES_DATA', fullKey, keyData);
    return success ? uniqueId : null;
}

/**
 * Retrieves a VPN key by its full key (e.g., 'vpn_key:DTAC:DNS_30DAY:abc123def456').
 * @param {object} env - The Cloudflare environment object.
 * @param {string} fullKey - The full key of the VPN key.
 * @returns {Promise<object|null>} - The VPN key data, or null.
 */
export async function getVpnKey(env, fullKey) {
    return await retrieveData(env, 'SALES_DATA', fullKey);
}

/**
 * Retrieves a VPN key's full data by its unique ID.
 * This function will search across all operator_code and key_type prefixes.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} uniqueId - The unique ID of the key (the last part of the full key).
 * @returns {Promise<{fullKey: string, vpnKeyData: object}|null>} - The full key and key data, or null.
 */
export async function getVpnKeyByUniqueId(env, uniqueId) {
    // List all vpn_key prefixes and iterate to find the uniqueId
    const allKeys = await listKeys(env, 'SALES_DATA', 'vpn_key:'); // List all keys starting with vpn_key:
    for (const fullKey of allKeys) {
        const parts = fullKey.split(':');
        // Ensure it's a valid VPN key format and the last part matches uniqueId
        if (parts.length === 4 && parts[3] === uniqueId) {
            const vpnKeyData = await getVpnKey(env, fullKey);
            if (vpnKeyData) {
                return { fullKey: fullKey, vpnKeyData: vpnKeyData };
            }
        }
    }
    return null;
}


/**
 * Deletes a VPN key by its full key (e.g., 'vpn_key:DTAC:DNS_30DAY:abc123def456').
 * @param {object} env - The Cloudflare environment object.
 * @param {string} keyId - The full key of the VPN key.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteVpnKey(env, keyId) {
    // For deletion, if a user provides only the unique ID, we need to find its full key.
    // However, the admin command /delkey <key_id> expects the full key.
    // If you want /delkey to accept only the uniqueId, you'd need to modify its handler
    // to call getVpnKeyByUniqueId first, then use the returned fullKey.
    // For now, assuming keyId is the fullKey or a unique ID that getVpnKeyByUniqueId can find.
    
    // Check if the provided keyId is a fullKey or just the unique ID
    let actualKeyToDelete = keyId;
    if (!keyId.startsWith(VPN_GUIDE_KEY_PREFIX)) { // Check if it looks like a full VPN key or just unique ID
        const foundKey = await getVpnKeyByUniqueId(env, keyId);
        if (foundKey) {
            actualKeyToDelete = foundKey.fullKey;
        } else {
            // If it's not a full key and not a unique ID that we can find, it doesn't exist.
            console.warn(`[deleteVpnKey] Key ${keyId} not found as full key or unique ID.`);
            return false;
        }
    }
    
    return await deleteData(env, 'SALES_DATA', actualKeyToDelete);
}

/**
 * Updates the status of a VPN key.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} fullKey - The full key of the VPN key.
 * @param {string} status - The new status ('available', 'sold', 'trial').
 * @param {string|null} assignedTo - User ID assigned to, or null.
 * @param {number|null} expirationTime - Unix timestamp in seconds for expiration, or null.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function updateVpnKeyStatus(env, fullKey, status, assignedTo = null, expirationTime = null) {
    const keyData = await getVpnKey(env, fullKey);
    if (keyData) {
        keyData.status = status;
        keyData.assigned_to = assignedTo;
        keyData.expiration_time = expirationTime;
        return await storeData(env, 'SALES_DATA', fullKey, keyData);
    }
    return false;
}

// --- User Trial Status Storage ---
/**
 * Stores the trial status for a user.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} userId - The user's ID.
 * @param {boolean} isTrialUsed - Whether the trial has been used.
 * @param {string|null} trialKeyId - The ID of the trial key used, if any.
 * @param {string|null} trialUsedAt - ISO string timestamp when trial was used.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeUserTrialStatus(env, userId, isTrialUsed, trialKeyId = null, trialUsedAt = null) {
    const key = `user_trial_status:${userId}`;
    const trialStatusData = {
        is_trial_used: isTrialUsed,
        trial_key_id: trialKeyId,
        trial_used_at: trialUsedAt
    };
    return await storeData(env, 'USER_DATA', key, trialStatusData);
}

/**
 * Retrieves the trial status for a user.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} userId - The user's ID.
 * @returns {Promise<object|null>} - The trial status data or null.
 */
export async function getUserTrialStatus(env, userId) {
    const key = `user_trial_status:${userId}`;
    return await retrieveData(env, 'USER_DATA', key);
}

/**
 * Deletes all associated user data from KV.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} userId - The user's ID.
 * @returns {Promise<boolean>} - True if any data was deleted, false otherwise.
 */
export async function deleteUserDataFromKV(env, userId) {
    const keysToDelete = [
        `user_trial_status:${userId}`,
        `user_data:${userId}`, // Assuming general user data is stored here
        // Add other user-specific keys if they exist, e.g., pending payments
    ];
    let successCount = 0;
    for (const key of keysToDelete) {
        const success = await deleteData(env, 'USER_DATA', key); // Assuming user data is in 'USER_DATA' KV
        if (success) successCount++;
    }
    console.log(`[deleteUserDataFromKV] Deleted ${successCount} user data keys for user ${userId}.`);
    return successCount > 0;
}


// --- Product Price Management (MODIFIED to include operator_code for VPN) ---
/**
 * Sets or updates the price and details for a product.
 * Key format: product_price:<type>:<product_id>
 * For VPN: product_price:vpn:<operator_code>_<key_type>
 * @param {object} env - The Cloudflare environment object.
 * @param {string} itemType - The type of item ('mlbb', 'pubg', 'vpn').
 * @param {string} productId - The unique ID of the product. For VPN, this is `operator_code`_`key_type`.
 * @param {string} name - The display name of the product.
 * @param {string} price - The price string (e.g., "50 Baht", "2,000 MMK").
 * @param {string|null} fileId - Optional: Telegram file_id for the product's image.
 * @param {string|null} description - Optional: Detailed description of the product.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function setProductPrice(env, itemType, productId, name, price, fileId = null, description = null) {
    const key = `product_price:${itemType}:${productId}`;
    const productData = {
        item_type: itemType,
        product_id: productId, // Store the raw product ID (or combined for VPN)
        name: name,
        price: price,
        file_id: fileId,
        description: description
    };
    return await storeData(env, 'SALES_DATA', key, productData);
}

/**
 * Deletes a product's price and details.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} itemType - The type of item.
 * @param {string} productId - The unique ID of the product. For VPN, this is `operator_code`_`key_type`.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteProductPrice(env, itemType, productId) {
    const key = `product_price:${itemType}:${productId}`;
    return await deleteData(env, 'SALES_DATA', key);
}

/**
 * Lists all products for a given item type.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} itemType - The type of item to list.
 * @returns {Promise<Array<object>>} - An array of product objects.
 */
export async function listProducts(env, itemType) {
    const prefix = `product_price:${itemType}:`;
    const allKeys = await listKeys(env, 'SALES_DATA', prefix);
    const products = [];
    for (const fullKey of allKeys) {
        const productData = await retrieveData(env, 'SALES_DATA', fullKey);
        if (productData) {
            products.push(productData);
        }
    }
    // Sort by name for consistent display
    products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return products;
}

// --- VPN Operator Button Storage (NEW) ---
/**
 * Stores an operator button's name.
 * Key format: vpn_operator_button:<operator_code>
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The unique code for the operator (e.g., 'DTAC', 'TRUE').
 * @param {string} operatorName - The display name of the operator (e.g., 'DTAC', 'True Move H').
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeVpnOperatorButton(env, operatorCode, operatorName) {
    const fullKey = `vpn_operator_button:${operatorCode}`;
    const buttonData = {
        code: operatorCode,
        name: operatorName
    };
    return await storeData(env, 'SALES_DATA', fullKey, buttonData);
}

/**
 * Retrieves an operator button by its code.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The unique code for the operator.
 * @returns {Promise<object|null>} - The operator button data or null.
 */
export async function getVpnOperatorButton(env, operatorCode) {
    const fullKey = `vpn_operator_button:${operatorCode}`;
    return await retrieveData(env, 'SALES_DATA', fullKey);
}

/**
 * Deletes an operator button.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The unique code for the operator.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteVpnOperatorButton(env, operatorCode) {
    const fullKey = `vpn_operator_button:${operatorCode}`;
    return await deleteData(env, 'SALES_DATA', fullKey);
}

/**
 * Lists all stored VPN operator buttons.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<Array<object>>} - An array of operator button objects.
 */
export async function listVpnOperatorButtons(env) {
    const prefix = `vpn_operator_button:`;
    const allKeys = await listKeys(env, 'SALES_DATA', prefix);
    const buttons = [];
    for (const fullKey of allKeys) {
        const buttonData = await retrieveData(env, 'SALES_DATA', fullKey);
        if (buttonData) {
            // Ensure buttonData contains the expected 'code' and 'name' properties
            buttons.push({ code: buttonData.code, name: buttonData.name });
        }
    }
    // Sort alphabetically by name for consistent display
    buttons.sort((a, b) => a.name.localeCompare(b.name));
    return buttons;
}

