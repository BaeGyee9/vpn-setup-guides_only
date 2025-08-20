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

// vpnGuideHandlers.js မှ VPN Guide logic function များကို import လုပ်ပါ။
import {
    handleAddVpnGuideCommand,
    handleDeleteVpnGuideCommand,
    handleListVpnGuidesCommand,
    handleShowVpnGuideMenu,
    handleShowSpecificVpnGuide
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

    console.log(`[onRequest] Received request: ${request.method} ${request.url}`);

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

                // Command Handling
                if (messageText.startsWith('/')) {
                    const command = messageText.split(' ')[0].toLowerCase();

                    // Public Commands (accessible by anyone)
                    if (command === '/start' || command === '/menu' || command === '/shop') {
                        // Simplified welcome for Guide Bot
                        await sendMessage(token, chatId, DEFAULT_WELCOME_MESSAGE, 'HTML', { inline_keyboard: MAIN_MENU_BUTTONS });
                    } else if (command === '/vpnguides') { // Handle /vpnguides command
                        await sendMessage(token, chatId, "📚 VPN အသုံးပြုနည်းလမ်းညွှန်ကို ကြည့်ရှုနိုင်ပါသည်:", 'HTML', {
                            inline_keyboard: [
                                [PUBLIC_VPN_GUIDES_BUTTON]
                            ]
                        });
                    } else if (command === '/support') { // Handle /support command
                        await sendMessage(token, chatId, SUPPORT_MENU_TEXT, 'HTML', { inline_keyboard: SUPPORT_MENU_BUTTONS });
                    }
                    // Admin Commands (only for OWNER_ADMIN_IDS)
                    else if (OWNER_ADMIN_IDS.includes(userId)) {
                        switch (command) {
                            case '/addvpnguide':
                                await handleAddVpnGuideCommand(message, token, env);
                                break;
                            case '/deletevpnguide':
                                await handleDeleteVpnGuideCommand(message, token, env);
                                break;
                            case '/listvpnguides':
                                await handleListVpnGuidesCommand(message, token, env);
                                break;
                            default:
                                await sendMessage(token, chatId, "❌ မသိသော Admin command ဖြစ်ပါသည်။", 'HTML');
                                break;
                        }
                    } else {
                        // Default response for non-admin, non-command messages in private chat
                        if (message.chat.type === 'private') {
                             await sendMessage(token, chatId, DEFAULT_WELCOME_MESSAGE, 'HTML', { inline_keyboard: MAIN_MENU_BUTTONS });
                        }
                        console.log(`[onRequest] Ignoring unknown command from non-admin: ${command}`);
                    }
                } else {
                    // Non-command, non-photo messages (e.g., plain text messages in private chat)
                    if (message.chat.type === 'private') {
                        // Default response for private chat text messages
                        await sendMessage(token, chatId, DEFAULT_WELCOME_MESSAGE, 'HTML', { inline_keyboard: MAIN_MENU_BUTTONS });
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

                if (data === 'main_menu') { // Main menu from constants.js
                    await sendMessage(token, chatId, DEFAULT_WELCOME_MESSAGE, 'HTML', { inline_keyboard: MAIN_MENU_BUTTONS });
                } else if (data === 'menu_support') { // Support menu
                    await editMessageText(token, chatId, messageId, SUPPORT_MENU_TEXT, 'HTML', { inline_keyboard: SUPPORT_MENU_BUTTONS });
                }
                // VPN Guide Callbacks
                else if (data === 'show_vpn_guide_menu') {
                    await handleShowVpnGuideMenu(callbackQuery, token, env);
                } else if (data.startsWith('show_vpn_guide_')) { // Handles specific steps like 'show_vpn_guide_NETMOD_step_1'
                    await handleShowSpecificVpnGuide(callbackQuery, token, env);
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
                        await sendMessage(token, chat.id, DEFAULT_WELCOME_MESSAGE, 'HTML', { inline_keyboard: MAIN_MENU_BUTTONS });
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
