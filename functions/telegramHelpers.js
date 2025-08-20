// functions/telegramHelpers.js
// Telegram Bot API အကူအညီ function များ

import { TELEGRAM_API, OWNER_ADMIN_IDS } from './constants.js';

// Telegram API သို့ message ပို့ခြင်း
// botKeyValue ကို ဖယ်ရှားလိုက်ပါပြီ။
export async function sendMessage(token, chat_id, text, parse_mode = 'HTML', reply_markup = null) {
    const apiUrl = `${TELEGRAM_API}${token}/sendMessage`;
    // disable_web_page_preview ကို true လုပ်ထားခြင်းဖြင့် link များ၏ preview ကို ပိတ်ထားပါမည်။
    const payload = { chat_id: chat_id, text: text, parse_mode: parse_mode, disable_web_page_preview: true };
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[sendMessage] Sending message to ${chat_id}: ${text.substring(0, 50)}...`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[sendMessage] Failed to send message: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error(`[sendMessage] Error sending message to ${chat_id}:`, error); return null; }
}

// Telegram API မှ bot ၏ အချက်အလက်များကို ရယူခြင်း (getMe)
// botKeyValue ကို ဖယ်ရှားလိုက်ပါပြီ။
export async function getMe(token) {
    const apiUrl = `${TELEGRAM_API}${token}/getMe`;
    try {
        console.log("[getMe] Fetching bot info.");
        const response = await fetch(apiUrl);
        const result = await response.json();
        if (!response.ok) { console.error(`[getMe] Failed to get bot info: ${response.status} ${JSON.stringify(result)}`); }
        return result.result; // result.result တွင် bot အချက်အလက်များ ပါဝင်သည်။
    } catch (error) { console.error("[getMe] Error fetching bot info:", error); return null; }
}

// Callback Query ကို ပြန်လည်ဖြေကြားခြင်း (answerCallbackQuery)
// botKeyValue ကို ဖယ်ရှားလိုက်ပါပြီ။
export async function answerCallbackQuery(token, callback_query_id, text = null, show_alert = false) {
    const apiUrl = `${TELEGRAM_API}${token}/answerCallbackQuery`;
    const payload = { callback_query_id: callback_query_id, show_alert: show_alert };
    if (text) { payload.text = text; }
    try {
        console.log(`[answerCallbackQuery] Answering callback query ${callback_query_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[answerCallbackQuery] Failed to answer callback query: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error(`[answerCallbackQuery] Error answering callback query ${callback_query_id}:`, error); return null; }
}

// Telegram API သို့ photo ပို့ခြင်း (sendPhoto)
// botKeyValue ကို ဖယ်ရှားလိုက်ပါပြီ။
export async function sendPhoto(token, chat_id, photo, caption = null, reply_markup = null) {
    const apiUrl = `${TELEGRAM_API}${token}/sendPhoto`;
    const payload = { chat_id: chat_id, photo: photo };
    if (caption) { payload.caption = caption; payload.parse_mode = 'HTML'; } // Caption ပါရင် HTML parse_mode ကို သုံးပါ။
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[sendPhoto] Sending photo to ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[sendPhoto] Failed to send photo: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error(`[sendPhoto] Error sending photo to ${chat_id}:`, error); return null; }
}

// Telegram API မှ message text ကို ပြင်ဆင်ခြင်း (editMessageText)
// botKeyValue ကို ဖယ်ရှားလိုက်ပါပြီ။
export async function editMessageText(token, chat_id, message_id, text, parse_mode = 'HTML', reply_markup = null) {
    const apiUrl = `${TELEGRAM_API}${token}/editMessageText`;
    // disable_web_page_preview ကို true လုပ်ထားခြင်းဖြင့် link များ၏ preview ကို ပိတ်ထားပါမည်။
    const payload = { chat_id: chat_id, message_id: message_id, text: text, parse_mode: parse_mode, disable_web_page_preview: true };
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[editMessageText] Editing message ${message_id} in chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[editMessageText] Failed to edit message: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error(`[editMessageText] Error editing message ${message_id}:`, error); return null; }
}

// Telegram API မှ message ကို ဖျက်ခြင်း (deleteMessage)
// botKeyValue ကို ဖယ်ရှားလိုက်ပါပြီ။
export async function deleteMessage(token, chat_id, message_id) {
    const apiUrl = `${TELEGRAM_API}${token}/deleteMessage`;
    const payload = { chat_id: chat_id, message_id: message_id };
    try {
        console.log(`[deleteMessage] Deleting message ${message_id} from chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        // Telegram API returns true for success, false for failure (e.g., message already deleted)
        // Check for specific error code 400 for "message to delete not found" to avoid logging as error
        if (!response.ok && response.status !== 400) { 
            console.error(`[deleteMessage] Failed to delete message: ${response.status} ${JSON.stringify(result)}`); 
        } else if (response.ok) {
            console.log(`[deleteMessage] Message ${message_id} deleted successfully.`);
        } else {
            console.log(`[deleteMessage] Message ${message_id} not found or already deleted (status: ${response.status}).`);
        }
        return result;
    } catch (error) { console.error(`[deleteMessage] Error deleting message ${message_id}:`, error); return null; }
}


// Telegram API မှ chat member အချက်အလက်များ ရယူခြင်း (getChatMember)
// botKeyValue ကို ဖယ်ရှားလိုက်ပါပြီ။
export async function getChatMember(token, chat_id, user_id) {
    const apiUrl = `${TELEGRAM_API}${token}/getChatMember`;
    try {
        console.log(`[getChatMember] Getting chat member ${user_id} from chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ chat_id: chat_id, user_id: user_id })
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[getChatMember] Failed to get chat member: ${response.status} ${JSON.stringify(result)}`); }
        return result.result;
    } catch (error) { console.error(`[getChatMember] Error getting chat member ${user_id}:`, error); return null; }
}

// Helper function to check if a user is an admin in a given chat
// botKeyValue ကို ဖယ်ရှားလိုက်ပါပြီ။
export async function isUserAdmin(token, chatId, userId, isAnonymous = false, senderChatId = null) {
    // Owner admins always have access (OWNER_ADMIN_IDS တွင် သတ်မှတ်ထားသော ID များ)
    if (OWNER_ADMIN_IDS.includes(userId)) {
        return true;
    }

    // If it's an anonymous admin, check if the sender_chat is an admin channel
    if (isAnonymous && senderChatId) {
        try {
            const chatMember = await getChatMember(token, chatId, senderChatId);
            if (chatMember && (chatMember.status === 'administrator' || chatMember.status === 'creator')) {
                return true;
            }
        } catch (error) {
            console.error(`[isUserAdmin] Error checking anonymous admin status for senderChatId ${senderChatId}:`, error);
            return false;
        }
    }

    // For regular users, check their status in the chat
    try {
        const chatMember = await getChatMember(token, chatId, userId);
        if (chatMember && (chatMember.status === 'administrator' || chatMember.status === 'creator')) {
            return true;
        }
    } catch (error) {
        console.error(`[isUserAdmin] Error checking admin status for userId ${userId}:`, error);
    }
    return false;
}

// REMOVED: deleteUserData, kickChatMember, restrictChatMember, unbanChatMember, unrestrictChatMember, sendDocument
// These functions are not needed for a standalone VPN Guide bot.

