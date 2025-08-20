// functions/telegramHelpers.js

import { TELEGRAM_API, OWNER_ADMIN_IDS } from './constants.js';

// All fetch calls to Telegram API must include the X-Bot-Key header.
// This ensures that your main control bot can validate the request.
// botKeyValue is passed from onRequest context.env.BOT_DATA
export async function sendMessage(token, chat_id, text, parse_mode = 'HTML', reply_markup = null, botKeyValue = null) {
    const apiUrl = `${TELEGRAM_API}${token}/sendMessage`;
    // Ensure parse_mode is always passed and disable_web_page_preview is true by default
    const payload = { chat_id: chat_id, text: text, parse_mode: parse_mode, disable_web_page_preview: true };
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[sendMessage] Sending message to ${chat_id}: ${text.substring(0, 50)}...`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Only send X-Bot-Key if botKeyValue is provided (for control bot validation)
                ...(botKeyValue && { "X-Bot-Key": botKeyValue }) 
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[sendMessage] Failed to send message: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error(`[sendMessage] Error sending message:`, error); return { ok: false, description: error.message }; }
}

export async function sendPhoto(token, chat_id, photo_file_id, caption = null, reply_markup = null, botKeyValue = null) {
    const apiUrl = `${TELEGRAM_API}${token}/sendPhoto`;
    const payload = { chat_id: chat_id, photo: photo_file_id, parse_mode: 'HTML' }; // Always use HTML parse_mode for captions
    if (caption) { payload.caption = caption; }
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[sendPhoto] Sending photo to ${chat_id} with caption: ${caption ? caption.substring(0, 50) : 'N/A'}...`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(botKeyValue && { "X-Bot-Key": botKeyValue })
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[sendPhoto] Failed to send photo: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error(`[sendPhoto] Error sending photo:`, error); return { ok: false, description: error.message }; }
}

export async function editMessageText(token, chat_id, message_id, text, parse_mode = 'HTML', reply_markup = null, botKeyValue = null) {
    const apiUrl = `${TELEGRAM_API}${token}/editMessageText`;
    const payload = { chat_id: chat_id, message_id: message_id, text: text, parse_mode: parse_mode, disable_web_page_preview: true };
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[editMessageText] Editing message ${message_id} in ${chat_id}: ${text.substring(0, 50)}...`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(botKeyValue && { "X-Bot-Key": botKeyValue })
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[editMessageText] Failed to edit message: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error(`[editMessageText] Error editing message:`, error); return { ok: false, description: error.message }; }
}

export async function deleteMessage(token, chat_id, message_id, botKeyValue = null) {
    const apiUrl = `${TELEGRAM_API}${token}/deleteMessage`;
    const payload = { chat_id: chat_id, message_id: message_id };
    try {
        console.log(`[deleteMessage] Deleting message ${message_id} from ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(botKeyValue && { "X-Bot-Key": botKeyValue })
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok && result.error_code !== 400) { // Ignore 400 error (Message to delete not found)
            console.error(`[deleteMessage] Failed to delete message: ${response.status} ${JSON.stringify(result)}`);
        }
        return result;
    } catch (error) { console.error(`[deleteMessage] Error deleting message:`, error); return { ok: false, description: error.message }; }
}

export async function answerCallbackQuery(token, callback_query_id, text = null, show_alert = false) {
    const apiUrl = `${TELEGRAM_API}${token}/answerCallbackQuery`;
    const payload = { callback_query_id: callback_query_id, show_alert: show_alert };
    if (text) { payload.text = text; }
    try {
        console.log(`[answerCallbackQuery] Answering callback query ${callback_query_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[answerCallbackQuery] Failed to answer callback query: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error(`[answerCallbackQuery] Error answering callback query:`, error); return { ok: false, description: error.message }; }
}

export async function getMe(token, botKeyValue = null) {
    const apiUrl = `${TELEGRAM_API}${token}/getMe`;
    try {
        console.log(`[getMe] Fetching bot info...`);
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                ...(botKeyValue && { "X-Bot-Key": botKeyValue })
            }
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[getMe] Failed to get bot info: ${response.status} ${JSON.stringify(result)}`); }
        return result.result; // Return the bot user object directly
    } catch (error) { console.error(`[getMe] Error fetching bot info:`, error); return null; }
}

// Helper function to check if a user is an admin in a given chat
// Not strictly needed for VPN Guide bot only, but kept for completeness
export async function isUserAdmin(token, chatId, userId, isAnonymous = false, senderChatId = null, botKeyValue = null) {
    // Owner admins always have access
    if (OWNER_ADMIN_IDS.includes(userId)) {
        return true;
    }
    // For regular users, check their status in the chat
    try {
        const chatMember = await getChatMember(token, chatId, userId, botKeyValue);
        if (chatMember && (chatMember.status === 'administrator' || chatMember.status === 'creator')) {
            return true;
        }
    } catch (error) {
        console.error(`[isUserAdmin] Error checking admin status for userId ${userId}:`, error);
    }
    return false;
}

export async function getChatMember(token, chatId, userId, botKeyValue = null) {
    const apiUrl = `${TELEGRAM_API}${token}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
    try {
        console.log(`[getChatMember] Getting chat member ${userId} in chat ${chatId}.`);
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                ...(botKeyValue && { "X-Bot-Key": botKeyValue })
            }
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[getChatMember] Failed to get chat member: ${response.status} ${JSON.stringify(result)}`); }
        return result.result;
    } catch (error) { console.error(`[getChatMember] Error getting chat member:`, error); return null; }
}

// These functions are generally for a full sales/admin bot and might not be used in a pure VPN Guide bot.
// They are kept commented out or as stubs to prevent 'undefined' errors if they were ever referenced by old code snippets.
export async function deleteUserData(token, userId, botKeyValue = null) { console.log("[deleteUserData] Stub: This function would delete user data."); return true; }
export async function kickChatMember(token, chatId, userId, untilDate = null, botKeyValue = null) { console.log("[kickChatMember] Stub: This function would kick a user."); return true; }
export async function restrictChatMember(token, chatId, userId, untilDate = null, botKeyValue = null) { console.log("[restrictChatMember] Stub: This function would restrict a user."); return true; }
export async function unbanChatMember(token, chatId, userId, botKeyValue = null) { console.log("[unbanChatMember] Stub: This function would unban a user."); return true; }
export async function unrestrictChatMember(token, chatId, userId, botKeyValue = null) { console.log("[unrestrictChatMember] Stub: This function would unrestrict a user."); return true; }
export async function sendDocument(token, chatId, documentFileId, caption = null, reply_markup = null, botKeyValue = null) { console.log("[sendDocument] Stub: This function would send a document."); return true; }

