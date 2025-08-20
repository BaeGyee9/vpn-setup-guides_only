// functions/vpnGuideHandlers.js
// VPN အသုံးပြုနည်းလမ်းညွှန်များနှင့် သက်ဆိုင်သော functions များကို ဤနေရာတွင် စုစည်းထားသည်

import {
    sendMessage,
    sendPhoto,
    editMessageText,
    answerCallbackQuery,
    deleteMessage
} from './telegramHelpers.js';
import {
    OWNER_ADMIN_IDS,
    VPN_GUIDE_KEY_PREFIX, // "vpn_guide:"
    VPN_GUIDE_MENU_TEXT,
    BACK_TO_VPN_GUIDE_MENU_BUTTON,
    ADMIN_USERNAME // For support link in error message
} from './constants.js';
import {
    storeData, // Generic store function
    retrieveData, // Generic retrieve function
    deleteData, // Generic delete function
    listKeys // Generic list keys function
} from './dataStorage.js';


// Helper function to split long messages into chunks (Telegram's message limit is 4096 characters)
function splitMessage(text, chunkSize = 4000) {
    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
        // If adding the next line makes the current chunk too long, push the current chunk and start a new one
        if ((currentChunk + line + '\n').length > chunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = line + '\n';
        } else {
            currentChunk += line + '\n';
        }
    }
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

// Helper function to get all step numbers for a given appCode
// Assumes keys are like 'vpn_guide:APPCODE:STEP_NUMBER'
async function getAllStepNumbersForApp(env, appCode) {
    const prefix = `${VPN_GUIDE_KEY_PREFIX}${appCode}:`;
    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', prefix);
    const stepNumbers = allKeys.map(key => {
        const parts = key.split(':');
        // FIX: Ensure parts[2] is always the step number
        return parseInt(parts[2], 10);
    }).filter(num => !isNaN(num)).sort((a, b) => a - b);
    return stepNumbers;
}


// --- Admin Commands for VPN Guide Management ---

/**
 * Handles the /addvpnguide command to store a new VPN usage guide step.
 * Command format: /addvpnguide <app_code> <step_number> "<step_text>" ["<image_file_id>"] ["<download_link>"]
 * @param {object} message - The Telegram message object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object (should have VPN_GUIDE_DATA bound).
 */
export async function handleAddVpnGuideCommand(message, token, env) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML');
        return;
    }

    // Command parsing logic needs to be more robust for quoted strings
    // Matches /addvpnguide <app_code> <step_number> "<step_text>" ["<image_file_id>"] ["<download_link>"]
    const regex = /^\/addvpnguide\s+([^\s]+)\s+([0-9]+)\s+"([^"]+)"(?:\s+"([^"]+)")?(?:\s+"([^"]+)")?$/;
    const match = message.text.match(regex);

    if (!match) {
        await sendMessage(token, chatId, `
❌ အသုံးပြုပုံ မှားယွင်းနေပါသည်။
<b>အသုံးပြုနည်း:</b>
<code>/addvpnguide &lt;app_code&gt; &lt;step_number&gt; "&lt;step_text&gt;" ["&lt;image_file_id&gt;"] ["&lt;download_link&gt;"]</code>

<b>ဥပမာ:</b>
<code>/addvpnguide NETMOD 1 "NetMod VPN application ကို install လုပ်ပါ။"</code>
<code>/addvpnguide NETMOD 2 "VPN Configuration ဖိုင်ကို Download လုပ်ပါ။" "AgACAgUAAxkBAAIH...xyz"</code>
<code>/addvpnguide NETMOD 3 "VPN App ကိုဖွင့်ပြီး configuration ကို Import လုပ်ပါ။" "AgACAgUAAxkBAAIH...abc" "https://example.com/netmod.apk"</code>
`, 'HTML');
        return;
    }

    const appCode = match[1].toUpperCase();
    const stepNumber = parseInt(match[2], 10);
    const stepText = match[3];
    const imageFileId = match[4] || null;
    const downloadLink = match[5] || null;

    if (isNaN(stepNumber) || stepNumber <= 0) {
        await sendMessage(token, chatId, "❌ Step Number မှာ နံပါတ် မှန်ကန်စွာ ထည့်သွင်းပါ။ (ဥပမာ: 1, 2, 3)", 'HTML');
        return;
    }

    // Correct key format: vpn_guide:APPCODE:STEP_NUMBER
    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumber}`;
    const guideData = {
        text: stepText,
        image_file_id: imageFileId,
        download_link: downloadLink
    };

    const success = await storeData(env, 'VPN_GUIDE_DATA', fullKey, guideData);

    if (success) {
        await sendMessage(token, chatId, `✅ VPN Guide <b>${appCode} - Step ${stepNumber}</b> ကို အောင်မြင်စွာ ထည့်သွင်းလိုက်ပါပြီ။`, 'HTML');
    } else {
        await sendMessage(token, chatId, `❌ VPN Guide <b>${appCode} - Step ${stepNumber}</b> ကို ထည့်သွင်း၍ မရပါ။ KV Namespace ကို သေချာစစ်ပါ။`, 'HTML');
    }
}

/**
 * Handles the /deletevpnguide command to delete a VPN usage guide step or all steps for an app.
 * Command format: /deletevpnguide <app_code> [step_number]
 * @param {object} message - The Telegram message object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 */
export async function handleDeleteVpnGuideCommand(message, token, env) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML');
        return;
    }

    if (args.length < 1) {
        await sendMessage(token, chatId, `
❌ အသုံးပြုပုံ မှားယွင်းနေပါသည်။
<b>အသုံးပြုနည်း:</b>
<code>/deletevpnguide &lt;app_code&gt; [step_number]</code>

<b>ဥပမာ:</b>
<code>/deletevpnguide NETMOD 1</code> (NETMOD ရဲ့ Step 1 ကို ဖျက်ရန်)
<code>/deletevpnguide NETMOD</code> (NETMOD ရဲ့ Guide အားလုံးကို ဖျက်ရန်)
`, 'HTML');
        return;
    }

    const appCode = args[0].toUpperCase();
    const stepNumberToDelete = args.length > 1 ? parseInt(args[1], 10) : null;

    if (stepNumberToDelete !== null && (isNaN(stepNumberToDelete) || stepNumberToDelete <= 0)) {
        await sendMessage(token, chatId, "❌ Step Number မှာ နံပါတ် မှန်ကန်စွာ ထည့်သွင်းပါ။ (ဥပမာ: 1, 2, 3)", 'HTML');
        return;
    }

    if (stepNumberToDelete) {
        // Delete specific step
        const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumberToDelete}`;
        const success = await deleteData(env, 'VPN_GUIDE_DATA', fullKey);
        if (success) {
            await sendMessage(token, chatId, `✅ VPN Guide <b>${appCode} - Step ${stepNumberToDelete}</b> ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'HTML');
        } else {
            await sendMessage(token, chatId, `❌ VPN Guide <b>${appCode} - Step ${stepNumberToDelete}</b> ကို ရှာမတွေ့ပါ သို့မဟုတ် ဖျက်၍မရပါ။`, 'HTML');
        }
    } else {
        // Delete all steps for the app code
        const allStepNumbersForApp = await getAllStepNumbersForApp(env, appCode);
        if (allStepNumbersForApp.length === 0) {
            await sendMessage(token, chatId, `❌ <b>${appCode}</b> အတွက် VPN Guide များ ရှာမတွေ့ပါ။`, 'HTML');
            return;
        }

        let deletedCount = 0;
        for (const stepNum of allStepNumbersForApp) {
            const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNum}`;
            const success = await deleteData(env, 'VPN_GUIDE_DATA', fullKey);
            if (success) {
                deletedCount++;
            }
        }
        await sendMessage(token, chatId, `✅ <b>${appCode}</b> အတွက် VPN Guide စုစုပေါင်း <b>${deletedCount}</b> ခုကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'HTML');
    }
}

/**
 * Handles the /listvpnguides command to list all configured VPN guide apps.
 * Command format: /listvpnguides
 * @param {object} message - The Telegram message object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 */
export async function handleListVpnGuidesCommand(message, token, env) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    // const args = message.text.split(' ').slice(1); // This is no longer used for filtering in this function

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML');
        return;
    }

    // FIX: Get unique app codes by correctly parsing keys from KV
    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', VPN_GUIDE_KEY_PREFIX);
    const appCodes = new Set();
    const guidesByApp = {}; // To store steps for each app

    for (const key of allKeys) {
        const parts = key.split(':'); // Expected format: vpn_guide:APPCODE:STEP_NUMBER
        if (parts.length === 3 && parts[0] === 'vpn_guide') {
            const currentAppCode = parts[1];
            const currentStepNumber = parseInt(parts[2], 10);
            appCodes.add(currentAppCode);
            if (!guidesByApp[currentAppCode]) {
                guidesByApp[currentAppCode] = [];
            }
            guidesByApp[currentAppCode].push(currentStepNumber);
        }
    }
    
    let text = "📚 <b>သိမ်းဆည်းထားသော VPN Guide များ:</b>\n\n";
    if (appCodes.size === 0) {
        text += "Guide များ မရှိသေးပါ။";
    } else {
        const sortedAppCodes = Array.from(appCodes).sort();
        for (const appCode of sortedAppCodes) {
            const steps = guidesByApp[appCode].sort((a, b) => a - b);
            text += `  - <b>${appCode}</b> (Steps: ${steps.join(', ')})\n`;
        }
    }
    
    const chunks = splitMessage(text);
    for (const chunk of chunks) {
        await sendMessage(token, chatId, chunk, 'HTML');
    }
}


// --- User-facing VPN Guide Display Functions ---

/**
 * Handles the 'show_vpn_guide_menu' callback query to display available VPN apps.
 * MODIFIED: Uses editMessageText to update the previous message.
 * @param {object} callbackQuery - The Telegram callback query object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 */
export async function handleShowVpnGuideMenu(callbackQuery, token, env) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    await answerCallbackQuery(token, callbackQuery.id, "VPN အသုံးပြုနည်းလမ်းညွှန်များကို ပြသပါမည်။", true);

    // FIX: Get unique app codes by correctly parsing keys from KV
    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', VPN_GUIDE_KEY_PREFIX);
    const appCodes = new Set();
    for (const key of allKeys) {
        const parts = key.split(':'); // Expected format: vpn_guide:APPCODE:STEP_NUMBER
        if (parts.length === 3 && parts[0] === 'vpn_guide') {
            appCodes.add(parts[1]); // Add the APPCODE (e.g., ZIVPN, NETMOD)
        }
    }

    const sortedAppCodes = [...appCodes].sort();

    let appButtons = [];
    if (sortedAppCodes.length > 0) {
        appButtons = sortedAppCodes.map(code => [{
            text: code,
            // FIX: Correct callback_data format for showing specific guide
            // New format: 'show_vpn_guide:APPCODE:step:1'
            callback_data: `show_vpn_guide:${code}:step:1`
        }]);
    } else {
        appButtons.push([{
            text: "❌ VPN Guide များ မရှိသေးပါ။ Admin ကို ဆက်သွယ်ပါ။",
            url: `https://t.me/${ADMIN_USERNAME.substring(1)}` // Link to Admin
        }]);
    }

    const replyMarkup = {
        inline_keyboard: appButtons.concat([
            [{ text: "↩️ နောက်သို့ (ပင်မ Menu)", callback_data: "main_menu" }] // Back to general main menu
        ])
    };

    // Always try to edit the message text first. If it was a photo, it will throw error, then send a new message.
    try {
        await editMessageText(token, chatId, messageId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup);
    } catch (e) {
        console.error(`[handleShowVpnGuideMenu] Error editing message (might be photo or old message): ${e.message}`);
        // Fallback to sending a new message if editing fails (e.g., message was a photo)
        await sendMessage(token, chatId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup);
    }
}

/**
 * Handles the 'show_vpn_guide:APPCODE:step:STEP_NUMBER' callback query to display a specific guide step.
 * MODIFIED: Uses deleteMessage + sendPhoto or editMessageText based on image existence.
 * @param {object} callbackQuery - The Telegram callback query object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 */
export async function handleShowSpecificVpnGuide(callbackQuery, token, env) {
    const data = callbackQuery.data; // e.g., 'show_vpn_guide:NETMOD:step:1'
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    // FIX: Correct parsing of appCode and stepNumber from the new callback_data format
    // Expected format: 'show_vpn_guide:APPCODE:step:STEP_NUMBER'
    const parts = data.split(':'); // Split by colon
    if (parts.length !== 5 || parts[0] !== 'show_vpn_guide' || parts[2] !== 'step') {
        console.error(`[handleShowSpecificVpnGuide] Invalid callback data format: ${data}`);
        await answerCallbackQuery(token, callbackQuery.id, "❌ လမ်းညွှန် အချက်အလက် မှားယွင်းနေပါသည်။", true);
        return;
    }

    const appCode = parts[1]; // APPCODE (e.g., NETMOD)
    const currentStepNumber = parseInt(parts[3], 10); // STEP_NUMBER (e.g., 1)

    await answerCallbackQuery(token, callbackQuery.id, `📚 ${appCode} Guide Step ${currentStepNumber} ကို ပြသပါမည်။`, true);

    // Correct key format for retrieving guide data
    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${currentStepNumber}`;
    const guideData = await retrieveData(env, 'VPN_GUIDE_DATA', fullKey);

    if (!guideData) {
        // If guide not found, send an error message and link to admin
        await sendMessage(token, chatId, `❌ ${appCode} - Step ${currentStepNumber} ကို ရှာမတွေ့ပါ။ Admin ကို ဆက်သွယ်ပါ။`, 'HTML', {
            inline_keyboard: [
                [{ text: "👤 Admin ကို ဆက်သွယ်ရန်", url: `https://t.me/${ADMIN_USERNAME.substring(1)}` }],
                [BACK_TO_VPN_GUIDE_MENU_BUTTON]
            ]
        });
        return;
    }

    // Get all step numbers for correct previous/next logic
    const allStepNumbersForApp = await getAllStepNumbersForApp(env, appCode);
    const isFirstStep = currentStepNumber === allStepNumbersForApp[0];
    const isLastStep = currentStepNumber === allStepNumbersForApp[allStepNumbersForApp.length - 1];
    const previousStepNumber = isFirstStep ? null : allStepNumbersForApp[allStepNumbersForApp.indexOf(currentStepNumber) - 1];
    const nextStepNumber = isLastStep ? null : allStepNumbersForApp[allStepNumbersForApp.indexOf(currentStepNumber) + 1];


    let dynamicButtons = [];
    let navButtons = [];

    // Previous button
    if (!isFirstStep && previousStepNumber !== null) {
        navButtons.push({
            text: "⬅️ အရင် Step",
            // Correct callback_data format for previous step
            callback_data: `show_vpn_guide:${appCode}:step:${previousStepNumber}`
        });
    }

    // Next button
    if (!isLastStep && nextStepNumber !== null) {
        navButtons.push({
            text: "နောက် Step ➡️",
            // Correct callback_data format for next step
            callback_data: `show_vpn_guide:${appCode}:step:${nextStepNumber}`
        });
    }

    if (navButtons.length > 0) {
        dynamicButtons.push(navButtons);
    }

    // Add download link button if available
    if (guideData.download_link) {
        dynamicButtons.push([{
            text: "⬇️ Download Link",
            url: guideData.download_link
        }]);
    }

    dynamicButtons.push([BACK_TO_VPN_GUIDE_MENU_BUTTON]); // Back to main guide menu

    const replyMarkup = {
        inline_keyboard: dynamicButtons
    };

    const captionText = `📚 <b>${appCode} - အသုံးပြုနည်း (Step ${currentStepNumber}/${allStepNumbersForApp.length}):</b>\n\n${guideData.text}`;

    if (guideData.image_file_id) {
        // Send photo with caption
        try {
            // Delete previous message before sending new photo
            await deleteMessage(token, chatId, messageId);
            await sendPhoto(token, chatId, guideData.image_file_id, captionText, replyMarkup);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error sending photo or deleting message: ${e.message}`);
            // Fallback to sending a new message if photo sending fails
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup);
        }
    } else {
        // Edit message text
        try {
            await editMessageText(token, chatId, messageId, captionText, 'HTML', replyMarkup);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error editing message text: ${e.message}`);
            // Fallback to sending a new message if editing fails (e.g., message was a photo)
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup);
        }
    }
}
