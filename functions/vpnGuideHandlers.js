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
    NO_IMAGE_PLACEHOLDER_FILE_ID, // Use placeholder if no specific image
    ADMIN_USERNAME, // For contacting admin in error cases
    SUPPORT_MENU_BUTTONS, // For displaying support options
    SUPPORT_MENU_TEXT
} from './constants.js';
import {
    storeVpnGuide, // For storing guide steps
    retrieveData, // Generic retrieve for initial data check
    deleteVpnGuide, // For deleting guide steps
    listVpnGuides // For listing guides (apps or steps)
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
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML');
        return;
    }

    if (args.length < 3) {
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

    let appCode = args[0].toUpperCase();
    let stepNumber = parseInt(args[1], 10);

    if (isNaN(stepNumber) || stepNumber <= 0) {
        await sendMessage(token, chatId, "❌ Step Number မှာ နံပါတ် မှန်ကန်စွာ ထည့်သွင်းပါ။", 'HTML');
        return;
    }

    // Parse step_text, image_file_id, download_link from quoted arguments
    const quotedArgs = message.text.match(/"([^"]*)"/g);
    if (!quotedArgs || quotedArgs.length < 1) {
        await sendMessage(token, chatId, "❌ 'Step Text' ကို quote (\" \") အတွင်း ထည့်သွင်းပေးပါ။", 'HTML');
        return;
    }

    const stepText = quotedArgs[0].substring(1, quotedArgs[0].length - 1);
    const imageFileId = quotedArgs[1] ? quotedArgs[1].substring(1, quotedArgs[1].length - 1) : null;
    const downloadLink = quotedArgs[2] ? quotedArgs[2].substring(1, quotedArgs[2].length - 1) : null;

    const guideData = {
        text: stepText,
        image_file_id: imageFileId,
        download_link: downloadLink
    };

    const success = await storeVpnGuide(env, appCode, stepNumber, guideData);

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
    const stepNumber = args.length > 1 ? parseInt(args[1], 10) : null;

    if (stepNumber !== null && (isNaN(stepNumber) || stepNumber <= 0)) {
        await sendMessage(token, chatId, "❌ Step Number မှာ နံပါတ် မှန်ကန်စွာ ထည့်သွင်းပါ။", 'HTML');
        return;
    }

    if (stepNumber) {
        // Delete specific step
        const success = await deleteVpnGuide(env, appCode, stepNumber);
        if (success) {
            await sendMessage(token, chatId, `✅ VPN Guide <b>${appCode} - Step ${stepNumber}</b> ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'HTML');
        } else {
            await sendMessage(token, chatId, `❌ VPN Guide <b>${appCode} - Step ${stepNumber}</b> ကို ရှာမတွေ့ပါ သို့မဟုတ် ဖျက်၍မရပါ။`, 'HTML');
        }
    } else {
        // Delete all steps for the app code
        const allGuidesForApp = await listVpnGuides(env, appCode);
        if (allGuidesForApp.length === 0) {
            await sendMessage(token, chatId, `❌ <b>${appCode}</b> အတွက် VPN Guide များ ရှာမတွေ့ပါ။`, 'HTML');
            return;
        }

        let deletedCount = 0;
        for (const guide of allGuidesForApp) {
            const success = await deleteVpnGuide(env, guide.appCode, guide.stepNumber);
            if (success) {
                deletedCount++;
            }
        }
        await sendMessage(token, chatId, `✅ <b>${appCode}</b> အတွက် VPN Guide စုစုပေါင်း <b>${deletedCount}</b> ခုကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'HTML');
    }
}

/**
 * Handles the /listvpnguides command to list all configured VPN guides.
 * Command format: /listvpnguides [app_code]
 * @param {object} message - The Telegram message object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 */
export async function handleListVpnGuidesCommand(message, token, env) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);
    const appCodeFilter = args.length > 0 ? args[0].toUpperCase() : null;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML');
        return;
    }

    const guides = await listVpnGuides(env, appCodeFilter);
    let text = `📚 <b>VPN အသုံးပြုနည်းလမ်းညွှန်များ စာရင်း:</b>\n\n`;

    if (appCodeFilter) {
        // Listing steps for a specific app code
        if (guides.length === 0) {
            text += `  <b>${appCodeFilter}</b> အတွက် Guide များ မရှိသေးပါ။`;
        } else {
            text += `  <b>${appCodeFilter} Guides:</b>\n`;
            for (const guide of guides) {
                text += `  - Step ${guide.stepNumber}: ${guide.text.substring(0, 50)}...`;
                if (guide.image_file_id) text += ` (ပုံပါ)`;
                if (guide.download_link) text += ` (Link ပါ)`;
                text += `\n`;
            }
        }
    } else {
        // Listing all unique app codes
        if (guides.length === 0) {
            text += "  VPN Guide များ မရှိသေးပါ။";
        } else {
            text += "  အောက်ပါ VPN App များအတွက် Guide များ ရှိပါသည်။:\n";
            for (const app of guides) {
                text += `  - <b>${app.appCode}</b>\n`;
            }
            text += `\n  App တစ်ခုစီ၏ Guide များကိုကြည့်ရန်: <code>/listvpnguides &lt;app_code&gt;</code>`;
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
 * This is the main entry point for users to view guides.
 * @param {object} callbackQuery - The Telegram callback query object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 */
export async function handleShowVpnGuideMenu(callbackQuery, token, env) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    
    await answerCallbackQuery(token, callbackQuery.id, "VPN အသုံးပြုနည်းလမ်းညွှန်များကို ပြသပါမည်။", true);

    const availableApps = await listVpnGuides(env); // Get list of unique app codes
    let dynamicButtons = [];

    if (availableApps.length > 0) {
        for (const app of availableApps) {
            dynamicButtons.push([{
                text: app.appCode,
                callback_data: `show_vpn_guide_${app.appCode}_step_1` // Start from step 1 for each app
            }]);
        }
    } else {
        dynamicButtons.push([{
            text: "❌ VPN Guide များ မရှိသေးပါ။ Admin ကို ဆက်သွယ်ပါ။",
            callback_data: "menu_support" // Callback to support menu
        }]);
    }

    const replyMarkup = {
        inline_keyboard: dynamicButtons.concat([
            [{ text: "↩️ နောက်သို့ (ပင်မ Menu)", callback_data: "main_menu" }] // Back to general main menu
        ])
    };

    // FIX: If the message has a photo, we need to delete it and send a new text message.
    if (callbackQuery.message.photo) {
        try {
            await deleteMessage(token, chatId, messageId);
            console.log(`[handleShowVpnGuideMenu] Successfully deleted original photo message ${messageId}.`);
        } catch (e) {
            console.error(`[handleShowVpnGuideMenu] Failed to delete original photo message ${messageId}: ${e.message}`);
        }
        await sendMessage(token, chatId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup);
    } else {
        await editMessageText(token, chatId, messageId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup);
    }
}

/**
 * Handles the 'show_vpn_guide_<app_code>_step_<step_number>' callback query to display a specific guide step.
 * @param {object} callbackQuery - The Telegram callback query object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 */
export async function handleShowSpecificVpnGuide(callbackQuery, token, env) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data; // e.g., 'show_vpn_guide_NETMOD_step_1'

    const parts = data.substring('show_vpn_guide_'.length).split('_step_');
    const appCode = parts[0];
    const currentStepNumber = parseInt(parts[1], 10);

    await answerCallbackQuery(token, callbackQuery.id, `📚 ${appCode} Guide Step ${currentStepNumber} ကို ပြသပါမည်။`, true);

    const guideData = await getVpnGuide(env, appCode, currentStepNumber);

    if (!guideData) {
        await editMessageText(token, chatId, messageId, `❌ ${appCode} - Step ${currentStepNumber} ကို ရှာမတွေ့ပါ။ Admin ကို ဆက်သွယ်ပါ။`, 'HTML', { inline_keyboard: [[BACK_TO_VPN_GUIDE_MENU_BUTTON]] });
        return;
    }

    const allGuidesForApp = await listVpnGuides(env, appCode);
    const totalSteps = allGuidesForApp.length;

    let dynamicButtons = [];
    let navButtons = [];

    // Previous button
    if (currentStepNumber > 1) {
        navButtons.push({
            text: "⬅️ အရင် Step",
            callback_data: `show_vpn_guide_${appCode}_step_${currentStepNumber - 1}`
        });
    }

    // Next button
    if (currentStepNumber < totalSteps) {
        navButtons.push({
            text: "နောက် Step ➡️",
            callback_data: `show_vpn_guide_${appCode}_step_${currentStepNumber + 1}`
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

    const captionText = `📚 <b>${appCode} - အသုံးပြုနည်း (Step ${currentStepNumber}/${totalSteps}):</b>\n\n${guideData.text}`;

    if (guideData.image_file_id) {
        // Send photo with caption
        try {
            // Delete previous message if it was a photo or edited text
            await deleteMessage(token, chatId, messageId);
            await sendPhoto(token, chatId, guideData.image_file_id, captionText, replyMarkup);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error sending photo or deleting message: ${e.message}`);
            // Fallback to text message if photo sending fails
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup);
        }
    } else {
        // Edit message text
        try {
            await editMessageText(token, chatId, messageId, captionText, 'HTML', replyMarkup);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error editing message text: ${e.message}`);
            // Fallback to sending new message if editing fails (e.g., message too old, or was photo)
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup);
        }
    }
}
