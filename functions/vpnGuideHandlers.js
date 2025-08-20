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
    VPN_GUIDE_KEY_PREFIX,
    VPN_GUIDE_MENU_TEXT,
    BACK_TO_VPN_GUIDE_MENU_BUTTON,
    ADMIN_USERNAME
} from './constants.js';
import {
    storeData,
    retrieveData,
    deleteData,
    listKeys
} from './dataStorage.js';


// Helper function to split long messages into chunks (copied from managementHandlers.js)
function splitMessage(text, chunkSize = 4000) {
    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
        if ((currentChunk + line).length > chunkSize) {
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

// Helper function to get all step numbers for a specific app code
async function getAllStepNumbersForApp(env, appCode) {
    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', `${VPN_GUIDE_KEY_PREFIX}${appCode}:`);
    const stepNumbers = allKeys.map(key => {
        const parts = key.split(':');
        return parseInt(parts[2], 10);
    }).filter(num => !isNaN(num)).sort((a, b) => a - b);
    return stepNumbers;
}

// --- Admin Commands for VPN Guide Management ---

/**
 * Handles the /addvpnguide command to store a new VPN usage guide step.
 * Command format: /addvpnguide <app_code> <step_number> "<step_text>" ["<image_file_id>"]
 */
export async function handleAddVpnGuideCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const parts = message.text.split(' ');
    const args = message.text.match(/(?:[^\s"]+|"[^"]*")+/g).slice(1).map(arg => arg.replace(/"/g, ''));

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length < 3) {
        await sendMessage(token, chatId, "❌ Command ပုံစံ မှားယွင်းနေပါသည်။ ပုံစံမှန်မှာ:\n`/addvpnguide <app_code> <step_number> \"<step_text>\" [\"<image_file_id>\"]`", 'Markdown', null, botKeyValue);
        return;
    }

    const appCode = args[0].toUpperCase();
    const stepNumber = parseInt(args[1], 10);
    const stepText = args[2];
    const imageFileId = args.length > 3 ? args[3] : null;

    if (isNaN(stepNumber)) {
        await sendMessage(token, chatId, "❌ `step_number` မှာ ကိန်းဂဏန်းဖြစ်ရပါမည်။", 'HTML', null, botKeyValue);
        return;
    }

    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumber}`;
    const guideData = {
        appCode: appCode,
        stepNumber: stepNumber,
        text: stepText,
        image_file_id: imageFileId,
        download_link: null // Optional field for download link
    };

    const success = await storeData(env, 'VPN_GUIDE_DATA', fullKey, guideData);

    if (success) {
        await sendMessage(token, chatId, `✅ <b>${appCode}</b> Guide Step <b>${stepNumber}</b> ကို အောင်မြင်စွာ သိမ်းဆည်းလိုက်ပါပြီ။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ <b>${appCode}</b> Guide Step <b>${stepNumber}</b> ကို သိမ်းဆည်းရာတွင် အမှားအယွင်းတစ်ခု ဖြစ်ပွားခဲ့ပါသည်။`, 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /delvpnguide command to delete a specific VPN guide step.
 * Command format: /delvpnguide <app_code> <step_number>
 */
export async function handleDelVpnGuideCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const parts = message.text.split(' ');

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (parts.length !== 3) {
        await sendMessage(token, chatId, "❌ Command ပုံစံ မှားယွင်းနေပါသည်။ ပုံစံမှန်မှာ: `/delvpnguide <app_code> <step_number>`", 'Markdown', null, botKeyValue);
        return;
    }

    const appCode = parts[1].toUpperCase();
    const stepNumber = parseInt(parts[2], 10);

    if (isNaN(stepNumber)) {
        await sendMessage(token, chatId, "❌ `step_number` မှာ ကိန်းဂဏန်းဖြစ်ရပါမည်။", 'HTML', null, botKeyValue);
        return;
    }

    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumber}`;
    const success = await deleteData(env, 'VPN_GUIDE_DATA', fullKey);

    if (success) {
        await sendMessage(token, chatId, `✅ <b>${appCode}</b> Guide Step <b>${stepNumber}</b> ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ <b>${appCode}</b> Guide Step <b>${stepNumber}</b> ကို ရှာမတွေ့ပါ။`, 'HTML', null, botKeyValue);
    }
}


/**
 * Handles the /listvpnguides command to list all stored VPN guides.
 * Command format: /listvpnguides
 */
export async function handleListVpnGuidesCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', VPN_GUIDE_KEY_PREFIX);
    const appCodes = new Set();
    const guidesByApp = {}; 

    for (const key of allKeys) {
        const parts = key.split(':'); 
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
        await sendMessage(token, chatId, chunk, 'HTML', null, botKeyValue);
    }
}


// --- User-Facing Functions ---

/**
 * Handles the callback query to show the VPN guide menu.
 * Command format: 'show_vpn_guide_menu'
 */
export async function handleShowVpnGuideMenu(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    await answerCallbackQuery(token, callbackQuery.id, "VPN အသုံးပြုနည်းလမ်းညွှန်များကို ပြသပါမည်။", true);

    // Get unique app codes by correctly parsing keys from KV
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
            callback_data: `show_vpn_guide:${code}:step:1`
        }]);
    } else {
        appButtons.push([{
            text: "❌ VPN Guide များ မရှိသေးပါ။ Admin ကို ဆက်သွယ်ပါ။",
            url: `https://t.me/${ADMIN_USERNAME.substring(1)}`
        }]);
    }

    const replyMarkup = {
        inline_keyboard: appButtons.concat([
            [{ text: "↩️ နောက်သို့ (ပင်မ Menu)", callback_data: "main_menu" }]
        ])
    };

    try {
        await editMessageText(token, chatId, messageId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
    } catch (e) {
        console.error(`[handleShowVpnGuideMenu] Error editing message: ${e.message}`);
        await sendMessage(token, chatId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
    }
}

/**
 * Handles the callback query to show a specific VPN guide step.
 * Command format: 'show_vpn_guide:<app_code>:step:<step_number>'
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

    const appCode = parts[1];
    const currentStepNumber = parseInt(parts[3], 10);

    await answerCallbackQuery(token, callbackQuery.id, `📚 ${appCode} Guide Step ${currentStepNumber} ကို ပြသပါမည်။`, true);

    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${currentStepNumber}`;
    const guideData = await retrieveData(env, 'VPN_GUIDE_DATA', fullKey);

    if (!guideData) {
        await sendMessage(token, chatId, `❌ ${appCode} - Step ${currentStepNumber} ကို ရှာမတွေ့ပါ။ Admin ကို ဆက်သွယ်ပါ။`, 'HTML', {
            inline_keyboard: [
                [{ text: "👤 Admin ကို ဆက်သွယ်ရန်", url: `https://t.me/${ADMIN_USERNAME.substring(1)}` }],
                [BACK_TO_VPN_GUIDE_MENU_BUTTON]
            ]
        }, botKeyValue);
        return;
    }

    const allStepNumbersForApp = await getAllStepNumbersForApp(env, appCode);
    const isFirstStep = currentStepNumber === allStepNumbersForApp[0];
    const isLastStep = currentStepNumber === allStepNumbersForApp[allStepNumbersForApp.length - 1];
    const previousStepNumber = isFirstStep ? null : allStepNumbersForApp[allStepNumbersForApp.indexOf(currentStepNumber) - 1];
    const nextStepNumber = isLastStep ? null : allStepNumbersForApp[allStepNumbersForApp.indexOf(currentStepNumber) + 1];

    let dynamicButtons = [];
    let navButtons = [];

    if (!isFirstStep && previousStepNumber !== null) {
        navButtons.push({
            text: "⬅️ အရင် Step",
            callback_data: `show_vpn_guide:${appCode}:step:${previousStepNumber}`
        });
    }

    if (!isLastStep && nextStepNumber !== null) {
        navButtons.push({
            text: "နောက် Step ➡️",
            callback_data: `show_vpn_guide:${appCode}:step:${nextStepNumber}`
        });
    }
    
    // Add download link button if it exists
    if (guideData.download_link) {
        dynamicButtons.push([{
            text: "⬇️ Download Link",
            url: guideData.download_link
        }]);
    }


    if (navButtons.length > 0) {
        dynamicButtons.push(navButtons);
    }
    
    // Add back button
    dynamicButtons.push([BACK_TO_VPN_GUIDE_MENU_BUTTON]);

    const replyMarkup = {
        inline_keyboard: dynamicButtons
    };

    const captionText = `📚 <b>${appCode} - အသုံးပြုနည်း (Step ${currentStepNumber}/${allStepNumbersForApp.length}):</b>\n\n${guideData.text}`;

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
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup, botKeyValue);
        }
    }
}


/**
 * Handles the /addvpnguidedownload command to add a download link to a guide.
 * Command format: /addvpnguidedownload <app_code> <step_number> <download_url>
 */
export async function handleAddVpnGuideDownloadCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const parts = message.text.split(' ');

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (parts.length !== 4) {
        await sendMessage(token, chatId, "❌ Command ပုံစံ မှားယွင်းနေပါသည်။ ပုံစံမှန်မှာ: `/addvpnguidedownload <app_code> <step_number> <download_url>`", 'Markdown', null, botKeyValue);
        return;
    }

    const appCode = parts[1].toUpperCase();
    const stepNumber = parseInt(parts[2], 10);
    const downloadUrl = parts[3];

    if (isNaN(stepNumber)) {
        await sendMessage(token, chatId, "❌ `step_number` မှာ ကိန်းဂဏန်းဖြစ်ရပါမည်။", 'HTML', null, botKeyValue);
        return;
    }

    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumber}`;
    const guideData = await retrieveData(env, 'VPN_GUIDE_DATA', fullKey);

    if (!guideData) {
        await sendMessage(token, chatId, `❌ <b>${appCode}</b> Guide Step <b>${stepNumber}</b> ကို ရှာမတွေ့ပါ။`, 'HTML', null, botKeyValue);
        return;
    }

    // Update the download link
    guideData.download_link = downloadUrl;
    const success = await storeData(env, 'VPN_GUIDE_DATA', fullKey, guideData);

    if (success) {
        await sendMessage(token, chatId, `✅ <b>${appCode}</b> Guide Step <b>${stepNumber}</b> အတွက် Download Link ကို အောင်မြင်စွာ ထည့်သွင်းလိုက်ပါပြီ။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ Download Link ကို သိမ်းဆည်းရာတွင် အမှားအယွင်းတစ်ခု ဖြစ်ပွားခဲ့ပါသည်။`, 'HTML', null, botKeyValue);
    }
}
