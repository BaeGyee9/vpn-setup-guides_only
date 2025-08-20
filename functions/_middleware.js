// functions/_middleware.js
// VPN Guide Bot အတွက် အဓိက Telegram Webhook Handler

// constants.js မှ လိုအပ်သော ကိန်းသေများကို import လုပ်ပါ။
import {
    TELEGRAM_API,
    ADMIN_USERNAME,
    OWNER_ADMIN_IDS,
    DEFAULT_WELCOME_MESSAGE,
    MAIN_MENU_BUTTONS,
    PUBLIC_VPN_GUIDES_BUTTON, // /vpnguides command အတွက် button
    SUPPORT_MENU_TEXT,
    SUPPORT_MENU_BUTTONS
} from './constants.js';

// telegramHelpers.js မှ Telegram API function များကို import လုပ်ပါ။
import {
    sendMessage,
    getMe,
    answerCallbackQuery,
    editMessageText,
    deleteMessage
} from './telegramHelpers.js';

// dataStorage.js မှ functions များကို import လုပ်ပါ။
import {
    getWelcomeMessage,
    getWelcomePhoto
} from './dataStorage.js';

// vpnGuideHandlers.js မှ VPN Guide logic function များကို import လုပ်ပါ။
import {
    handleAddVpnGuideCommand,
    handleDelVpnGuideCommand, // <-- CORRECTED FUNCTION NAME IMPORT
    handleListVpnGuidesCommand,
    handleShowVpnGuideMenu,
    handleShowSpecificVpnGuide,
    handleAddVpnGuideDownloadCommand // NEW: Import for download link command
} from './vpnGuideHandlers.js';

// Global variable to store bot ID after first fetch for efficient caching
let botInfoCache = null;

// Function to get bot info (cached for efficiency)
async function getBotInfo(token) {
    if (!botInfoCache) {
        botInfoCache = await getMe(token);
    }
    return botInfoCache;
}

/**
 * Cloudflare Worker ရဲ့ main entry point ဖြစ်ပါတယ်။
 * Telegram webhook ကနေ လာတဲ့ request တွေကို လက်ခံပြီး သက်ဆိုင်ရာ handler function တွေဆီ လမ်းကြောင်းပြောင်းပေးပါတယ်။
 * @param {Request} request - Incoming request object.
 * @param {object} env - Cloudflare environment variables (including KV bindings like VPN_GUIDE_DATA).
 * @param {object} ctx - Context object (e.g., for waitUntil).
 * @returns {Response} - A new Response object.
 */
export async function onRequest(context) {
    const {
        request,
        env
    } = context;
    const url = new URL(request.url);
    const token = env.TELEGRAM_BOT_TOKEN; // Bot token ကို environment variables မှ ရယူသည်။
    const botKeyValue = env.BOT_DATA || null; // For VPN Guide Bot, this might not be used for validation, but passed to helpers.

    console.log(`[onRequest] Received request: ${request.method} ${url.pathname}`);

    let requestBody = {};
    try {
        if (request.method === "POST" && request.headers.get("content-type")?.includes("application/json")) {
            requestBody = await request.clone().json();
            console.log("[onRequest] Full incoming request body:", JSON.stringify(requestBody, null, 2));
        } else {
            console.log("[onRequest] Request headers (non-JSON/non-POST):", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
        }
    } catch (e) {
        console.error("[onRequest] Failed to parse request body as JSON:", e.message);
        console.log("[onRequest] Request headers (body parse error):", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    }

    if (!token) {
        console.error("[onRequest] Error: TELEGRAM_BOT_TOKEN environment variable is not set.");
        return new Response("TELEGRAM_BOT_TOKEN environment variable is not set.", {
            status: 500
        });
    }

    // --- Webhook Registration/Unregistration Routes ---
    if (request.method === "GET" && url.pathname.endsWith("/registerWebhook")) {
        const pagesUrl = url.origin + url.pathname.replace("/registerWebhook", "/webhook"); // Webhook endpoint should be /webhook
        console.log(`[onRequest] Registering webhook to Telegram: ${pagesUrl}`);
        const setWebhookApiUrl = `${TELEGRAM_API}${token}/setWebhook`;
        const payload = {
            url: pagesUrl,
            allowed_updates: ["message", "callback_query", "my_chat_member"]
        };
        try {
            const response = await fetch(setWebhookApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.ok && result.ok) {
                console.log("[onRequest] Webhook registration successful:", result);
                return new Response(`Webhook registered to: ${pagesUrl} (Success: ${result.ok})`, { status: 200 });
            } else {
                console.error("[onRequest] Webhook registration failed:", result);
                return new Response(`Webhook registration failed: ${result.description || JSON.stringify(result)}`, { status: 500 });
            }
        } catch (error) {
            console.error("[onRequest] Error during webhook registration fetch:", error);
            return new Response(`Error registering webhook: ${error.message}`, { status: 500 });
        }
    } else if (request.method === "GET" && url.pathname.endsWith("/unregisterWebhook")) {
        const deleteWebhookApiUrl = `${TELEGRAM_API}${token}/deleteWebhook`;
        try {
            const response = await fetch(deleteWebhookApiUrl);
            const result = await response.json();
            if (response.ok && result.ok) {
                console.log("[onRequest] Webhook unregistered successfully:", result);
                return new Response(`Webhook unregistered (Success: ${result.ok})`, { status: 200 });
            } else {
                console.error("[onRequest] Webhook unregistration failed:", result);
                return new Response(`Webhook unregistration failed: ${result.description || JSON.stringify(result)}`, { status: 500 });
            }
        } catch (error) {
            console.error("[onRequest] Error during webhook unregistration fetch:", error);
            return new Response(`Error unregistering webhook: ${error.message}`, { status: 500 });
        }
    }

    // --- Main Telegram Update Handling (POST requests from Telegram) ---
    if (request.method === "POST" && url.pathname === '/webhook') {
        try {
            const update = requestBody;

            if (Object.keys(update).length === 0) {
                console.warn("[onRequest] Received an empty or unparseable Telegram update body. Skipping processing.");
                return new Response("OK - Empty update received", { status: 200 });
            }

            // Message Handling
            if (update.message) {
                const message = update.message;
                const chatId = message.chat.id;
                const userId = message.from.id;
                const messageText = message.text || '';

                console.log(`[onRequest] Handling message update from user ${userId} in chat ${chatId}.`);

                // Store env in message object for easier access in handlers
                message.env = env;

                // Handle incoming photos to return file_id for admins
                if (message.photo && OWNER_ADMIN_IDS.includes(userId)) {
                    // Get the largest photo available
                    const fileId = message.photo[message.photo.length - 1].file_id;
                    console.log(`[onRequest] Admin ${userId} sent photo with file_id: ${fileId}`);
                    await sendMessage(token, chatId, `✅ သင်ပို့လိုက်သော ပုံ၏ File ID: \n<code>${fileId}</code>`, 'HTML', null, botKeyValue);
                    return new Response("OK", { status: 200 }); // Process photo and return OK
                }

                // Command Handling
                if (messageText.startsWith('/')) {
                    const command = messageText.split(' ')[0].toLowerCase();

                    // Public Commands (accessible by anyone)
                    if (command === '/start' || command === '/menu' || command === '/shop') {
                        // Get custom welcome message and photo from KV, or use defaults
                        const customWelcomeMessage = await getWelcomeMessage(env);
                        const customWelcomePhotoFileId = await getWelcomePhoto(env);

                        const finalWelcomeMessage = customWelcomeMessage || DEFAULT_WELCOME_MESSAGE;
                        const finalWelcomePhotoFileId = customWelcomePhotoFileId; // Only use if explicitly set

                        const replyMarkup = {
                            inline_keyboard: MAIN_MENU_BUTTONS
                        };

                        if (finalWelcomePhotoFileId) {
                            // Send photo with welcome message as caption
                            await sendPhoto(token, chatId, finalWelcomePhotoFileId, finalWelcomeMessage, null, botKeyValue);
                            // Then send a separate message with the main menu buttons
                            await sendMessage(token, chatId, MAIN_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
                        } else {
                            // If no photo, just send the welcome message text with main menu buttons
                            await sendMessage(token, chatId, finalWelcomeMessage, 'HTML', replyMarkup, botKeyValue);
                        }
                    } else if (command === '/vpnguides') { // Handle /vpnguides command
                        await sendMessage(token, chatId, "📚 VPN အသုံးပြုနည်းလမ်းညွှန်ကို ကြည့်ရှုနိုင်ပါသည်:", 'HTML', {
                            inline_keyboard: [
                                [PUBLIC_VPN_GUIDES_BUTTON]
                            ]
                        }, botKeyValue);
                    } else if (command === '/support') { // Handle /support command
                        await sendMessage(token, chatId, SUPPORT_MENU_TEXT, 'HTML', { inline_keyboard: SUPPORT_MENU_BUTTONS }, botKeyValue);
                    }
                    // Admin Commands (only for OWNER_ADMIN_IDS)
                    else if (OWNER_ADMIN_IDS.includes(userId)) {
                        switch (command) {
                            case '/addvpnguide':
                                await handleAddVpnGuideCommand(message, token, env, botKeyValue);
                                break;
                            case '/delvpnguide': // Corrected function name
                                await handleDelVpnGuideCommand(message, token, env, botKeyValue);
                                break;
                            case '/listvpnguides':
                                await handleListVpnGuidesCommand(message, token, env, botKeyValue);
                                break;
                            case '/addvpnguidedownload': // New command for download link
                                await handleAddVpnGuideDownloadCommand(message, token, env, botKeyValue);
                                break;
                            default:
                                await sendMessage(token, chatId, "❌ မသိသော Admin command ဖြစ်ပါသည်။", 'HTML', null, botKeyValue);
                                break;
                        }
                    } else {
                        // Default response for non-admin, non-command messages in private chat
                        if (message.chat.type === 'private') {
                             await sendMessage(token, chatId, DEFAULT_WELCOME_MESSAGE, 'HTML', { inline_keyboard: MAIN_MENU_BUTTONS }, botKeyValue);
                        }
                        console.log(`[onRequest] Ignoring unknown command from non-admin: ${command}`);
                    }
                } else {
                    // Non-command, non-photo messages (e.g., plain text messages in private chat)
                    if (message.chat.type === 'private') {
                        // Default response for private chat text messages
                        await sendMessage(token, chatId, DEFAULT_WELCOME_MESSAGE, 'HTML', { inline_keyboard: MAIN_MENU_BUTTONS }, botKeyValue);
                    }
                    console.log("[onRequest] Ignoring non-command, non-photo message.");
                }

            } else if (update.callback_query) {
                const callbackQuery = update.callback_query;
                const data = callbackQuery.data;
                const chatId = callbackQuery.message.chat.id;
                const messageId = callbackQuery.message.message_id;

                // Pass env to callbackQuery object for easier access in handlers
                callbackQuery.env = env; 

                // Use editMessageText for menu navigation callbacks where possible
                if (data === 'main_menu') {
                    // Get custom welcome message and photo from KV, or use defaults
                    const customWelcomeMessage = await getWelcomeMessage(env);
                    const customWelcomePhotoFileId = await getWelcomePhoto(env);

                    const finalWelcomeMessage = customWelcomeMessage || DEFAULT_WELCOME_MESSAGE;
                    // Note: We don't re-send the photo on every menu callback to avoid complexity.
                    // If the original message was a photo, it will be deleted and a text message sent.

                    const replyMarkup = {
                        inline_keyboard: MAIN_MENU_BUTTONS
                    };

                    // FIX: If the message has a photo, we need to delete it and send a new text message.
                    if (callbackQuery.message.photo) {
                        try {
                            await deleteMessage(token, chatId, messageId, botKeyValue);
                            console.log(`[onRequest] Successfully deleted original photo message ${messageId}.`);
                        } catch (e) {
                            console.error(`[onRequest] Failed to delete original photo message ${messageId}: ${e.message}`);
                        }
                        // Send a new text message
                        await sendMessage(token, chatId, finalWelcomeMessage, 'HTML', replyMarkup, botKeyValue);
                    } else {
                        // If no photo, just edit the text message
                        try {
                            await editMessageText(token, chatId, messageId, finalWelcomeMessage, 'HTML', replyMarkup, botKeyValue);
                            await answerCallbackQuery(token, callbackQuery.id, "ပင်မ Menu သို့ ပြန်ရောက်ပါပြီ။");
                        } catch (e) {
                            console.error(`[onRequest] Error editing message for main_menu: ${e.message}`);
                            await sendMessage(token, chatId, finalWelcomeMessage, 'HTML', replyMarkup, botKeyValue);
                            await answerCallbackQuery(token, callbackQuery.id, "ပင်မ Menu ကို ဖွင့်မရပါ။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ပါ။", true);
                        }
                    }
                } else if (data === 'menu_support') {
                    // When going to support menu, use editMessageText
                    try {
                        await editMessageText(token, chatId, messageId, SUPPORT_MENU_TEXT, 'HTML', { inline_keyboard: SUPPORT_MENU_BUTTONS }, botKeyValue);
                        await answerCallbackQuery(token, callbackQuery.id, "အကူအညီ Menu သို့ ပြောင်းလိုက်ပါပြီ။");
                    } catch (e) {
                        console.error(`[onRequest] Error editing message for menu_support: ${e.message}`);
                        await sendMessage(token, chatId, SUPPORT_MENU_TEXT, 'HTML', { inline_keyboard: SUPPORT_MENU_BUTTONS }, botKeyValue);
                        await answerCallbackQuery(token, callbackQuery.id, "အကူအညီ Menu ကို ဖွင့်မရပါ။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ပါ။", true);
                    }
                }
                // VPN Guide Callbacks
                else if (data === 'show_vpn_guide_menu') {
                    await handleShowVpnGuideMenu(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('show_vpn_guide:')) { // Handles specific steps like 'show_vpn_guide:NETMOD:step:1'
                    await handleShowSpecificVpnGuide(callbackQuery, token, env, botKeyValue);
                }
                else {
                    console.log(`[onRequest] Unhandled callback data: ${data}`);
                    await answerCallbackQuery(token, callbackQuery.id, "မသိသော ရွေးချယ်မှု ဖြစ်ပါသည်။", true);
                }
            }
            // My Chat Member Update (Bot added/removed from group)
            else if (update.my_chat_member) {
                const chat = update.my_chat_member.chat;
                const newChatMember = update.my_chat_member.new_chat_member;
                const botInfo = await getBotInfo(token);

                if (newChatMember.status === 'member' && newChatMember.user.is_bot && newChatMember.user.id === botInfo.id) {
                    if (chat.type === 'group' || chat.type === 'supergroup') {
                        const welcomeMessage = await getWelcomeMessage(env) || DEFAULT_WELCOME_MESSAGE;
                        await sendMessage(token, chat.id, welcomeMessage, 'HTML', null, botKeyValue);
                    }
                } else if (newChatMember.status === 'kicked' || newChatMember.status === 'left') {
                    console.log(`[onRequest] Bot was removed from chat: ${chat.title || chat.id}`);
                }
            } else {
                console.log("[onRequest] Unhandled update type:", JSON.stringify(update, null, 2));
            }

            return new Response("OK", { status: 200 });
        } catch (error) {
            console.error("[onRequest] Error handling Telegram webhook:", error.stack || error.message);
            return new Response(`Error: ${error.message}`, { status: 500 });
        }
    } else {
        console.log(`[onRequest] Non-POST/non-webhook-registration request received: ${request.method} ${url.pathname}`);
        return new Response("This is a Telegram bot webhook endpoint. Please send POST requests or access /registerWebhook or /unregisterWebhook.", { status: 200 });
    }
}
