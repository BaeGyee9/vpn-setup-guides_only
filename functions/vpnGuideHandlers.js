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
    ADMIN_USERNAME, // For support link in error message
    VPN_GUIDE_MENU_PHOTO_KEY, // NEW: VPN Guide Menu အတွက် ဓာတ်ပုံ key
    DEFAULT_VPN_GUIDE_MENU_PHOTO_FILE_ID // NEW: VPN Guide Menu အတွက် default photo file id
} from './constants.js';
import {
    storeData, // Generic store function
    retrieveData, // Generic retrieve function
    deleteData, // Generic delete function
    listKeys, // Generic list keys function
    getVpnGuideMenuPhoto // NEW: VPN Guide Menu photo ကို ပြန်ယူရန်
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
    // VPN_GUIDE_DATA KV namespace မှ keys များကို list လုပ်ရန်
    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', prefix);
    const stepNumbers = allKeys.map(key => {
        const parts = key.split(':');
        // Ensure parts[2] is always the step number
        return parseInt(parts[2], 10);
    }).filter(num => !isNaN(num)).sort((a, b) => a - b);
    return stepNumbers;
}


// --- Admin Commands for VPN Guide Management ---

/**
 * Handles the /addvpnguide command to store a new VPN usage guide step.
 * Command format: /addvpnguide <app_code> <step_number> "<step_text>" ["<image_file_id>"] ["<display_name>"] ["<download_link>"]
 * @param {object} message - The Telegram message object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object (should have VPN_GUIDE_DATA bound).
 * @param {string} botKeyValue - The bot key for API calls (can be null for guide bot).
 */
export async function handleAddVpnGuideCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    // --- NEW: More robust parsing logic to handle potential invisible characters or odd formatting ---
    // This approach finds all quoted strings first, then handles the unquoted ones.
    const text = message.text;
    const quotedMatches = [...text.matchAll(/"([^"]*)"/g)];
    const quotedStrings = quotedMatches.map(match => match[1]);

    // Split the text by spaces, but only the parts outside of the quotes
    const unquotedParts = text.split(/"[^"]*"/).map(s => s.trim()).filter(Boolean);
    const unquotedArgs = unquotedParts[0].split(/\s+/);

    // Ensure basic structure is present: /command app_code step_number "step_text"
    if (unquotedArgs.length < 3 || quotedStrings.length < 1) {
        await sendMessage(token, chatId, `
❌ အသုံးပြုပုံ မှားယွင်းနေပါသည်။ (Quotes များ သေချာစစ်ပါ။)
<b>အသုံးပြုနည်း:</b>
<code>/addvpnguide &lt;app_code&gt; &lt;step_number&gt; "&lt;step_text&gt;" ["&lt;image_file_id&gt;"] ["&lt;display_name&gt;"] ["&lt;download_link&gt;"]</code>

<b>ဥပမာများ:</b>
<code>/addvpnguide NETMOD 1 "NetMod VPN application ကို install လုပ်ပါ။"</code>
<code>/addvpnguide NETMOD 2 "VPN Configuration ဖိုင်ကို Download လုပ်ပါ။" "AgACAgUAAxkBAAIH...xyz" "NETMOD"</code>
<code>/addvpnguide HTTPCUSTOM 3 "HTTP Custom App ကိုဖွင့်ပြီး config ကို Import လုပ်ပါ။" "" "Http Custom" "https://example.com/httpcustom.apk"</code>
<i>(မလိုအပ်သော parameters များအတွက် <b>""</b> (quotes အလွတ်) ထည့်ပါ။)</i>
<i>(Command တစ်ကြောင်းလုံးကို Copy/Paste လုပ်ပြီး quotes များ မှန်ကန်ကြောင်း သေချာစစ်ပါ။)</i>
`, 'HTML', null, botKeyValue);
        return;
    }

    const rawAppCode = unquotedArgs[1];
    const appCodeForStorage = rawAppCode.toUpperCase();
    const stepNumber = parseInt(unquotedArgs[2], 10);
    const stepText = quotedStrings[0];
    const imageFileId = quotedStrings[1] || null;
    // FIX: Changed order based on user's suggestion
    const displayName = quotedStrings[2] || rawAppCode;
    // Display name is now the 3rd quoted parameter (index 2)
    const downloadLink = quotedStrings[3] || null;
    // Download link is now the 4th quoted parameter (index 3)

    if (isNaN(stepNumber)) {
        await sendMessage(token, chatId, "❌ Step Number မှာ ကိန်းဂဏန်းဖြစ်ရပါမည်။", 'HTML', null, botKeyValue);
        return;
    }

    // Correct key format: vpn_guide:APPCODE_UPPERCASE:STEP_NUMBER
    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCodeForStorage}:${stepNumber}`;
    const guideData = {
        text: stepText,
        image_file_id: imageFileId,
        download_link: downloadLink,
        display_name: displayName
    };
    const success = await storeData(env, 'VPN_GUIDE_DATA', fullKey, guideData);

    if (success) {
        await sendMessage(token, chatId, `✅ VPN Guide <b>${displayName} - Step ${stepNumber}</b> ကို အောင်မြင်စွာ ထည့်သွင်းလိုက်ပါပြီ။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ VPN Guide <b>${displayName} - Step ${stepNumber}</b> ကို ထည့်သွင်း၍ မရပါ။ KV Namespace ကို သေချာစစ်ပါ။`, 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /delvpnguide command to delete a VPN usage guide step or all steps for an app.
 * Command format: /delvpnguide <app_code> [step_number]
 * @param {object} message - The Telegram message object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} botKeyValue - The bot key for API calls (can be null for guide bot).
 */
export async function handleDelVpnGuideCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length < 1) {
        await sendMessage(token, chatId, `
❌ အသုံးပြုပုံ မှားယွင်းနေပါသည်။
<b>အသုံးပြုနည်း:</b>
<code>/delvpnguide &lt;app_code&gt; [step_number]</code>

<b>ဥပမာ:</b>
<code>/delvpnguide NETMOD 1</code> (NETMOD ရဲ့ Step 1 ကို ဖျက်ရန်)
<code>/delvpnguide NETMOD</code> (NETMOD ရဲ့ Guide အားလုံးကို ဖျက်ရန်)
`, 'HTML', null, botKeyValue);
        return;
    }

    const appCode = args[0].toUpperCase();
    const stepNumberToDelete = args.length > 1 ? parseInt(args[1], 10) : null;
    let successCount = 0;
    let failCount = 0;

    if (stepNumberToDelete !== null) {
        // Delete a specific step
        const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumberToDelete}`;
        const success = await deleteData(env, 'VPN_GUIDE_DATA', fullKey);
        if (success) {
            await sendMessage(token, chatId, `✅ VPN Guide <b>${appCode} - Step ${stepNumberToDelete}</b> ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'HTML', null, botKeyValue);
        } else {
            await sendMessage(token, chatId, `❌ VPN Guide <b>${appCode} - Step ${stepNumberToDelete}</b> ကို ဖျက်၍ မရပါ။ (အချက်အလက် မရှိနိုင်ပါ)`, 'HTML', null, botKeyValue);
        }
    } else {
        // Delete all steps for the app
        const prefix = `${VPN_GUIDE_KEY_PREFIX}${appCode}:`;
        const keysToDelete = await listKeys(env, 'VPN_GUIDE_DATA', prefix);
        if (keysToDelete.length === 0) {
            await sendMessage(token, chatId, `⚠️ <b>${appCode}</b> အတွက် Guide အချက်အလက်များ မရှိပါ။`, 'HTML', null, botKeyValue);
            return;
        }

        for (const key of keysToDelete) {
            const success = await deleteData(env, 'VPN_GUIDE_DATA', key);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }
        await sendMessage(token, chatId, `✅ <b>${appCode}</b> အတွက် VPN Guide အဆင့် (<b>${successCount}</b>) ခုကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။ (မဖျက်နိုင်ခဲ့ပါ: ${failCount})`, 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /listvpnguides command to list all available VPN guide app codes.
 * @param {object} message - The Telegram message object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} botKeyValue - The bot key for API calls.
 */
export async function handleListVpnGuidesCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', VPN_GUIDE_KEY_PREFIX);
    const appCodes = new Set(allKeys.map(key => key.split(':')[1]));
    const appList = Array.from(appCodes).sort();

    if (appList.length === 0) {
        await sendMessage(token, chatId, "ℹ️ VPN Guide အချက်အလက်များ မရှိသေးပါ။", 'HTML', null, botKeyValue);
        return;
    }

    let responseMessage = "📚 <b>လက်ရှိရှိသော VPN Guides များ:</b>\n\n";
    for (const appCode of appList) {
        const stepNumbers = await getAllStepNumbersForApp(env, appCode);
        const guideData = await retrieveData(env, 'VPN_GUIDE_DATA', `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumbers[0]}`);
        const displayName = guideData ? guideData.display_name : appCode;
        responseMessage += `<b>${displayName}</b> (${appCode}) - <b>${stepNumbers.length}</b> Steps\n`;
    }

    await sendMessage(token, chatId, responseMessage, 'HTML', null, botKeyValue);
}


// --- User-Facing Functions ---

/**
 * Handles the /vpnguides command or 'show_vpn_guide_menu' callback to show the VPN Guide menu.
 * Displays all available VPN guide app buttons.
 * @param {object} update - The Telegram update object (can be message or callbackQuery).
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} botKeyValue - The bot key for API calls.
 */
export async function handleShowVpnGuideMenu(update, token, env, botKeyValue) {
    // ဤနေရာတွင် callbackQuery.message ကို တိုက်ရိုက်မသုံးတော့ဘဲ chat ID ကို update object မှတဆင့် ရယူသည်
    // ဤနည်းလမ်းသည် message သို့မဟုတ် callback_query နှစ်ခုလုံးအတွက် အဆင်ပြေစေသည်
    const chatId = update.callback_query?.message?.chat?.id || update.message?.chat?.id;
    const messageId = update.callback_query?.message?.message_id; // For editing existing message

    if (!chatId) {
        console.error(`[handleShowVpnGuideMenu] Error: Could not get chatId from update object.`);
        return;
    }

    // `update.callback_query` object ရှိမှသာ callback query အတွက် `answerCallbackQuery` ကို ခေါ်ရန်
    if (update.callback_query) {
        await answerCallbackQuery(token, update.callback_query.id, "📚 VPN Guide Menu ကို ပြသပါမည်။", false);
    }
    
    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', VPN_GUIDE_KEY_PREFIX);
    const appDisplayNamesMap = new Map();

    const uniqueAppCodes = new Set();
    for (const key of allKeys) {
        const parts = key.split(':');
        // Make sure it's a guide key (e.g., "vpn_guide:APPCODE:STEP_NUMBER")
        if (parts.length === 3 && parts[0] === 'vpn_guide') {
            uniqueAppCodes.add(parts[1]);
        }
    }

    // Attempt to get the display name from the first step of each guide
    for (const appCode of uniqueAppCodes) {
        const firstStepKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:1`;
        const guideData = await retrieveData(env, 'VPN_GUIDE_DATA', firstStepKey);
        if (guideData && guideData.display_name) {
            appDisplayNamesMap.set(appCode, guideData.display_name);
        } else {
            // Fallback to appCode if display_name is not found for the first step
            appDisplayNamesMap.set(appCode, appCode); 
        }
    }
    
    const sortedAppCodes = Array.from(appDisplayNamesMap.keys()).sort();

    let appButtons = [];
    if (sortedAppCodes.length > 0) {
        appButtons = sortedAppCodes.map(code => {
            const displayName = appDisplayNamesMap.get(code);
            return [{
                text: `${displayName} အသုံးပြုနည်း`,
                callback_data: `show_vpn_guide:${code}:step:1`
            }];
        });
    } else {
        appButtons.push([{
            text: "❌ VPN Guide များ မရှိသေးပါ။ Admin ကို ဆက်သွယ်ပါ။",
            url: `https://t.me/${ADMIN_USERNAME.substring(1)}`
        }]);
    }

    const replyMarkup = {
        inline_keyboard: appButtons.concat([
            [{ text: "↩️ နောက်သို့ (Main Menu)", callback_data: "main_menu" }]
        ])
    };
    
    // NEW: Get VPN Guide Menu Photo
    const vpnGuideMenuPhotoFileId = await getVpnGuideMenuPhoto(env);
    const finalPhotoFileId = vpnGuideMenuPhotoFileId || DEFAULT_VPN_GUIDE_MENU_PHOTO_FILE_ID; // Use stored photo or default null

    // Check if the message is from a callback query to edit the message
    if (update.callback_query && messageId) { // Ensure messageId is available for editing
        try {
            // If there's a photo, we need to send a new photo message instead of editing text
            if (finalPhotoFileId) {
                await deleteMessage(token, chatId, messageId, botKeyValue); // Delete old message
                await sendPhoto(token, chatId, finalPhotoFileId, VPN_GUIDE_MENU_TEXT, replyMarkup, botKeyValue); // Send new photo with text and buttons
            } else {
                await editMessageText(token, chatId, messageId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
            }
        } catch (e) {
            console.error(`[handleShowVpnGuideMenu] Error editing message text or sending photo: ${e.message}`);
            // Fallback in case editMessageText/sendPhoto fails
            if (finalPhotoFileId) {
                await sendPhoto(token, chatId, finalPhotoFileId, VPN_GUIDE_MENU_TEXT, replyMarkup, botKeyValue);
            } else {
                await sendMessage(token, chatId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
            }
        }
    } else {
        // Otherwise, just send a new message (e.g., from /vpnguides command)
        if (finalPhotoFileId) {
            await sendPhoto(token, chatId, finalPhotoFileId, VPN_GUIDE_MENU_TEXT, replyMarkup, botKeyValue);
        } else {
            await sendMessage(token, chatId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
        }
    }
}


/**
 * Handles the callback query to show a specific VPN guide step.
 * Command format: 'show_vpn_guide:<app_code>:step:<step_number>'
 * @param {object} callbackQuery - The Telegram callback query object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} botKeyValue - The bot key for API calls (can be null for guide bot).
 */
export async function handleShowSpecificVpnGuide(callbackQuery, token, env, botKeyValue) {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    const parts = data.split(':');
    if (parts.length !== 4 || parts[0] !== 'show_vpn_guide' || parts[2] !== 'step') {
        console.error(`[handleShowSpecificVpnGuide] Invalid callback data format: ${data}`);
        await answerCallbackQuery(token, callbackQuery.id, "❌ လမ်းညွှန် အချက်အလက် မှားယွင်းနေပါသည်။", true);
        return;
    }

    const appCode = parts[1]; // This is the uppercase code (e.g., HTTPCUSTOM)
    const currentStepNumber = parseInt(parts[3], 10);

    await answerCallbackQuery(token, callbackQuery.id, `📚 ${appCode} Guide Step ${currentStepNumber} ကို ပြသပါမည်။`, true);

    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${currentStepNumber}`;
    const guideData = await retrieveData(env, 'VPN_GUIDE_DATA', fullKey);

    if (!guideData) {
        await sendMessage(token, chatId, `❌ အချက်အလက် ရှာမတွေ့ပါ။ အောက်ပါ Admin ကို ဆက်သွယ်မေးမြန်းနိုင်ပါသည်။ <a href="https://t.me/${ADMIN_USERNAME.substring(1)}">${ADMIN_USERNAME}</a>`, 'HTML', null, botKeyValue);
        return;
    }

    const displayNameForCaption = guideData.display_name || appCode;
    const dynamicButtons = [];
    let navButtons = []; // Changed from const to let as it's reassigned

    const allStepNumbersForApp = await getAllStepNumbersForApp(env, appCode);
    const currentStepIndex = allStepNumbersForApp.indexOf(currentStepNumber);

    const prevStepNumber = (currentStepIndex > 0) ? allStepNumbersForApp[currentStepIndex - 1] : null;
    const nextStepNumber = (currentStepIndex < allStepNumbersForApp.length - 1) ? allStepNumbersForApp[currentStepIndex + 1] : null;


    if (prevStepNumber !== null) {
        navButtons.push({
            text: "⬅️ Prev",
            callback_data: `show_vpn_guide:${appCode}:step:${prevStepNumber}`
        });
    }

    if (nextStepNumber !== null) {
        navButtons.push({
            text: "Next ➡️",
            callback_data: `show_vpn_guide:${appCode}:step:${nextStepNumber}`
        });
    }

    if (navButtons.length > 0) {
        dynamicButtons.push(navButtons);
    }

    if (guideData.download_link) {
        dynamicButtons.push([{
            text: "⬇️ Download Link",
            url: guideData.download_link
        }]);
    }

    dynamicButtons.push([BACK_TO_VPN_GUIDE_MENU_BUTTON]);

    const replyMarkup = {
        inline_keyboard: dynamicButtons
    };

    const captionText = `📚 <b>${displayNameForCaption} - အသုံးပြုနည်း (Step ${currentStepNumber}/${allStepNumbersForApp.length}):</b>\n\n${guideData.text}`;

    if (guideData.image_file_id) {
        try {
            await deleteMessage(token, chatId, messageId, botKeyValue);
            await sendPhoto(token, chatId, guideData.image_file_id, captionText, replyMarkup, botKeyValue);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error sending photo or deleting message: ${e.message}`);
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup, botKeyValue);
        }
    } else {
        try {
            await editMessageText(token, chatId, messageId, captionText, 'HTML', replyMarkup, botKeyValue);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error editing message text: ${e.message}`);
            // Fallback to sending a new message if editing fails (e.g., if a photo was previously shown)
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup, botKeyValue);
        }
    }
}


/**
 * Handles the /addvpnguidedownload command (new, improved version).
 * Command format: /addvpnguidedownload <app_code> "<download_link>"
 * @param {object} message - The Telegram message object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} botKeyValue - The bot key for API calls.
 */
export async function handleAddVpnGuideDownloadLinkCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const text = message.text;
    const parts = text.split(/\s+/);
    if (parts.length < 3 || !text.includes('"')) {
        await sendMessage(token, chatId, `
❌ အသုံးပြုပုံ မှားယွင်းနေပါသည်။ (Quotes များ သေချာစစ်ပါ။)
<b>အသုံးပြုနည်း:</b>
<code>/addvpnguidedownload &lt;app_code&gt; "&lt;download_link&gt;"</code>
<b>ဥပမာ:</b>
<code>/addvpnguidedownload HTTPCUSTOM "https://example.com/httpcustom.apk"</code>
`, 'HTML', null, botKeyValue);
        return;
    }

    const appCode = parts[1].toUpperCase();
    const downloadLink = text.substring(text.indexOf('"') + 1, text.lastIndexOf('"'));
    
    const allStepNumbers = await getAllStepNumbersForApp(env, appCode);
    if (allStepNumbers.length === 0) {
        await sendMessage(token, chatId, `⚠️ <b>${appCode}</b> အတွက် Guide အချက်အလက်များ မရှိသေးပါ။`, 'HTML', null, botKeyValue);
        return;
    }
    
    // Find the first step and add/update the download link
    const firstStepNumber = allStepNumbers[0];
    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${firstStepNumber}`;
    const guideData = await retrieveData(env, 'VPN_GUIDE_DATA', fullKey) || {};
    
    guideData.download_link = downloadLink;
    const success = await storeData(env, 'VPN_GUIDE_DATA', fullKey, guideData);

    if (success) {
        await sendMessage(token, chatId, `✅ <b>${appCode}</b> အတွက် Download Link ကို အောင်မြင်စွာ ထည့်သွင်းလိုက်ပါပြီ။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ Download Link ထည့်သွင်း၍ မရပါ။`, 'HTML', null, botKeyValue);
    }
}

