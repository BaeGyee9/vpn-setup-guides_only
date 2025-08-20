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
    BACK_TO_VPN_GUIDE_MENU_BUTTON
} from './constants.js';
import {
    storeData,
    retrieveData,
    deleteData,
    listKeys
} from './dataStorage.js';


// Helper function to split long messages into chunks
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


// --- Admin Commands for VPN Guide Management ---

/**
 * Handles the /addvpnguide command to store a new VPN usage guide step.
 * Command format: /addvpnguide <app_code> <step_number> "<step_text>" ["<image_file_id>"]
 */
export async function handleAddVpnGuideCommand(message, token, env) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ');

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML');
        return;
    }

    if (args.length < 4) {
        await sendMessage(token, chatId, "❌ Command မှားယွင်းနေပါသည်။ ပုံစံမှာ `/addvpnguide <app_code> <step_number> \"<step_text>\" [\"<image_file_id>\"]` ဖြစ်ပါသည်။", 'Markdown');
        return;
    }

    const appCode = args[1].toUpperCase();
    const stepNumber = parseInt(args[2], 10);
    const textStartIndex = message.text.indexOf('"') + 1;
    const textEndIndex = message.text.indexOf('"', textStartIndex);

    if (textStartIndex === -1 || textEndIndex === -1) {
        await sendMessage(token, chatId, "❌ Step text ကို `\"\"` အတွင်း ထည့်သွင်းပေးပါ။", 'Markdown');
        return;
    }

    const stepText = message.text.substring(textStartIndex, textEndIndex);
    const imageId = message.text.substring(message.text.indexOf('"', textEndIndex + 1) + 1).trim().replace(/"/g, '');
    const guideKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}_step_${stepNumber}`;
    const guideData = {
        text: stepText,
        image_file_id: imageId || null,
        app_code: appCode,
        step_number: stepNumber
    };

    const success = await storeData(env, 'VPN_GUIDE_DATA', guideKey, guideData);

    if (success) {
        await sendMessage(token, chatId, `✅ VPN guide step **${appCode}** - Step **${stepNumber}** ကို အောင်မြင်စွာ သိမ်းဆည်းလိုက်ပါပြီ။`, 'Markdown');
    } else {
        await sendMessage(token, chatId, "❌ VPN guide step ကို သိမ်းဆည်းရာတွင် အမှားအယွင်းတစ်ခု ဖြစ်ပွားခဲ့ပါသည်။", 'HTML');
    }
}

/**
 * Handles the /deletevpnguide command to delete a specific VPN guide step.
 * Command format: /deletevpnguide <app_code> <step_number>
 */
export async function handleDeleteVpnGuideCommand(message, token, env) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ');

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML');
        return;
    }

    if (args.length !== 3) {
        await sendMessage(token, chatId, "❌ Command မှားယွင်းနေပါသည်။ ပုံစံမှာ `/deletevpnguide <app_code> <step_number>` ဖြစ်ပါသည်။", 'Markdown');
        return;
    }

    const appCode = args[1].toUpperCase();
    const stepNumber = parseInt(args[2], 10);
    const guideKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}_step_${stepNumber}`;

    const success = await deleteData(env, 'VPN_GUIDE_DATA', guideKey);

    if (success) {
        await sendMessage(token, chatId, `✅ VPN guide step **${appCode}** - Step **${stepNumber}** ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'Markdown');
    } else {
        await sendMessage(token, chatId, `❌ VPN guide step **${appCode}** - Step **${stepNumber}** ကို ရှာမတွေ့ပါ သို့မဟုတ် ဖျက်၍မရပါ။`, 'Markdown');
    }
}

/**
 * Handles the /listvpnguides command to list all configured VPN guide apps.
 * Command format: /listvpnguides
 */
export async function handleListVpnGuidesCommand(message, token, env) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML');
        return;
    }

    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', VPN_GUIDE_KEY_PREFIX);
    const appCodes = new Set();
    const guidesByApp = {};

    for (const key of allKeys) {
        const parts = key.split('_');
        const appCode = parts[1];
        const stepNumber = parseInt(parts[3], 10);
        
        appCodes.add(appCode);
        if (!guidesByApp[appCode]) {
            guidesByApp[appCode] = [];
        }
        guidesByApp[appCode].push(stepNumber);
    }
    
    let text = "📚 <b>သိမ်းဆည်းထားသော VPN Guide များ:</b>\n\n";
    if (appCodes.size === 0) {
        text += "Guide များ မရှိသေးပါ။";
    } else {
        for (const appCode of appCodes) {
            const steps = guidesByApp[appCode].sort((a, b) => a - b);
            text += `  - <b>${appCode}</b>: (Steps: ${steps.join(', ')})\n`;
        }
    }
    
    await sendMessage(token, chatId, text, 'HTML');
}

// --- Public Handlers for VPN Guide Navigation ---

/**
 * Handles the callback for displaying the main VPN guide menu.
 * MODIFIED: Uses editMessageText to update the previous message.
 */
export async function handleShowVpnGuideMenu(callbackQuery, token, env) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    // Get all unique app codes from KV
    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', VPN_GUIDE_KEY_PREFIX);
    const appCodes = [...new Set(allKeys.map(key => key.split('_')[1]))];

    if (appCodes.length === 0) {
        await answerCallbackQuery(token, callbackQuery.id, "❌ Guide များ မရှိသေးပါ။", true);
        return;
    }
    
    // Sort app codes alphabetically for consistent display
    appCodes.sort();

    const appButtons = appCodes.map(code => [{
        text: code,
        callback_data: `show_vpn_guide_${code}_step_1`
    }]);

    const replyMarkup = {
        inline_keyboard: appButtons
    };

    try {
        await editMessageText(token, chatId, messageId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup);
        await answerCallbackQuery(token, callbackQuery.id, "Guide Menu ကို ပြောင်းလိုက်ပါပြီ။");
    } catch (e) {
        console.error(`[handleShowVpnGuideMenu] Error editing message: ${e.message}`);
        await answerCallbackQuery(token, callbackQuery.id, "Menu ကို ဖွင့်မရပါ။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ပါ။", true);
        // Fallback to sending a new message if editing fails
        await sendMessage(token, chatId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup);
    }
}

/**
 * Handles the callback for displaying a specific VPN guide step.
 * Uses deleteMessage + sendPhoto or editMessageText.
 */
export async function handleShowSpecificVpnGuide(callbackQuery, token, env) {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    // Parse data: 'show_vpn_guide_NETMOD_step_1' -> appCode='NETMOD', stepNumber=1
    const parts = data.split('_');
    const appCode = parts[3];
    const currentStepNumber = parseInt(parts[5], 10);
    const guideKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}_step_${currentStepNumber}`;

    await answerCallbackQuery(token, callbackQuery.id, "Loading...");

    const guideData = await retrieveData(env, 'VPN_GUIDE_DATA', guideKey);
    if (!guideData) {
        await sendMessage(token, chatId, "❌ Guide ကို ရှာမတွေ့ပါ။", 'HTML');
        return;
    }

    const allKeys = await listKeys(env, 'VPN_GUIDE_DATA', `${VPN_GUIDE_KEY_PREFIX}${appCode}_`);
    const allSteps = allKeys.map(key => parseInt(key.split('_')[3], 10)).sort((a, b) => a - b);
    const isFirstStep = currentStepNumber === allSteps[0];
    const isLastStep = currentStepNumber === allSteps[allSteps.length - 1];
    const previousStepNumber = isFirstStep ? null : allSteps[allSteps.indexOf(currentStepNumber) - 1];
    const nextStepNumber = isLastStep ? null : allSteps[allSteps.indexOf(currentStepNumber) + 1];

    const dynamicButtons = [];
    const navButtons = [];

    // Add Previous button if not on the first step
    if (!isFirstStep) {
        navButtons.push({
            text: "⬅️ နောက်ပြန်",
            callback_data: `show_vpn_guide_${appCode}_step_${previousStepNumber}`
        });
    }
    // Add Next button if not on the last step
    if (!isLastStep) {
        navButtons.push({
            text: "နောက် Step ➡️",
            callback_data: `show_vpn_guide_${appCode}_step_${nextStepNumber}`
        });
    }
    if (navButtons.length > 0) {
        dynamicButtons.push(navButtons);
    }

    dynamicButtons.push([BACK_TO_VPN_GUIDE_MENU_BUTTON]); // Back to main guide menu

    const replyMarkup = {
        inline_keyboard: dynamicButtons
    };

    const captionText = `📚 <b>${appCode} - အသုံးပြုနည်း (Step ${currentStepNumber}):</b>\n\n${guideData.text}`;

    if (guideData.image_file_id) {
        // Send photo with caption
        try {
            // Delete previous message if it was a text or edited text
            await deleteMessage(token, chatId, messageId);
            await sendPhoto(token, chatId, guideData.image_file_id, captionText, replyMarkup);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error sending photo or deleting message: ${e.message}`);
            // Fallback to sending a new message
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup);
        }
    } else {
        // Edit message text
        try {
            await editMessageText(token, chatId, messageId, captionText, 'HTML', replyMarkup);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error editing message text: ${e.message}`);
            // Fallback to sending a new message if editing fails
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup);
        }
    }
}
