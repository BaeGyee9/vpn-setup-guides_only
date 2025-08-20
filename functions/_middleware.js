// functions/_middleware.js

// constants.js မှ variables များကို import လုပ်ပါ။
import {
    TELEGRAM_API,
    ADMIN_USERNAME,
    SUPPORT_GROUP_LINK,
    OWNER_ADMIN_IDS,
    DEFAULT_WELCOME_MESSAGE, // Make sure this is imported for default messages
    MAIN_MENU_BUTTONS, // Make sure this is imported for default messages
    VPN_GUIDE_KEY_PREFIX, // Import for parsing guide keys
    BOT_API_KEY
} from './constants.js';

// telegramHelpers.js မှ functions များကို import လုပ်ပါ။
import {
    sendMessage,
    getMe,
    answerCallbackQuery,
    deleteUserData, // Import deleteUserData
    kickChatMember, // Ensure this is imported if used in adminHandlers
    restrictChatMember, // Ensure this is imported if used in adminHandlers
    unbanChatMember, // Ensure this is imported if used in adminHandlers
    unrestrictChatMember, // Ensure this is imported if used in adminHandlers
    sendDocument, // Ensure this is imported if used in adminHandlers or managementHandlers
    sendPhoto, // Ensure this is imported if used in adminHandlers or managementHandlers
    getChatMember, // Ensure this is imported if used in adminHandlers
    editMessageText, // Ensure this is imported if used in adminHandlers
    deleteMessage // Ensure this is imported if used in adminHandlers
} from './telegramHelpers.js';

// dataStorage.js မှ functions များကို import လုပ်ပါ။
import {
    getPaymentDetails,
    getWelcomeMessage,
    getWelcomePhoto,
    deleteUserDataFromKV, // Import deleteUserDataFromKV (if used for user data cleanup)
    retrieveData,
    storeData,
    deleteData
} from './dataStorage.js';

// salesHandlers.js မှ functions များကို import လုပ်ပါ။
import {
    handleShowMainMenu,
    handleShowVpnMenu,
    handleShowMlbbMenu,
    handleShowPubgMenu,
    handleShowMoneyTransferMenu,
    handleShowSupportMenu,
    handleGameItemBuyRequest,
    handleShowVpnOperatorMenu,
    handleShowVpnKeyTypeMenu,
    handleShowVpnFinalKeyMenu,
    handleRequestTrialVpn,
    handlePaymentInstructionCallback,
    handleShowVpnUserDashboard,
    handleCallbackToRequestPayment,
    handleShowWelcomeMessageMenu,
    handleShowVpnKeyInfo
} from './salesHandlers.js';

// paymentHandlers.js မှ functions များကို import လုပ်ပါ။
import {
    handleIncomingPhoto,
    handleIncomingTextMessage
} from './paymentHandlers.js';

// managementHandlers.js မှ functions များကို import လုပ်ပါ။
import {
    handleSetKeyCommand,
    handleDeleteKeyCommand,
    handleListKeysCommand,
    handleSetWelcomeCommand,
    handleDeleteWelcomeCommand,
    handleSetPriceCommand,
    handleDeletePriceCommand,
    handleListProductsCommand,
    handleAddOperatorButtonCommand,
    handleDeleteOperatorButtonCommand,
    handleListOperatorButtonsCommand
} from './managementHandlers.js';

// adminHandlers.js မှ functions များကို import လုပ်ပါ။
import {
    handleApprovePaymentCallback,
    handleRejectPaymentCallback,
    handleCheckUserVpnKey,
    handleGiveKeyCommand,
    handleRevokeKeyCommand,
    handleUserTrialResetCommand,
    handleForceUpdateCommand
} from './adminHandlers.js';

// vpnGuideHandlers.js မှ functions များကို import လုပ်ပါ။
import {
    handleAddVpnGuideCommand,
    handleDelVpnGuideCommand, // <-- THIS WAS THE TYPO, CORRECTED TO `handleDelVpnGuideCommand`
    handleListVpnGuidesCommand,
    handleShowVpnGuideMenu,
    handleShowSpecificVpnGuide,
    handleAddVpnGuideDownloadCommand
} from './vpnGuideHandlers.js';

// Bot token ကို Cloudflare Environment Variable ကနေ ရယူသည်။
// const token = env.BOT_TOKEN; // This is now handled in the fetch request header

async function handleUpdates(update, env) {
    const {
        message,
        callback_query
    } = update;
    const token = env.BOT_TOKEN;
    const botKeyValue = env.BOT_DATA; // The key to validate requests from the control bot

    // Telegram Bot ကိုယ်တိုင်ရဲ့ info ကို တစ်ကြိမ်တည်း fetch လုပ်ပြီး cache လုပ်ထားသည်။
    let botInfo = {};
    try {
        if (!env.botInfo) {
            botInfo = await getMe(token, botKeyValue);
            env.botInfo = botInfo; // Cache the bot info in the env object for the current request
        } else {
            botInfo = env.botInfo;
        }
    } catch (e) {
        console.error(`[handleUpdates] Failed to get bot info: ${e.message}`);
        // Can't proceed without bot info, so we'll just log the error and exit
        return new Response('Error: Failed to get bot info', {
            status: 500
        });
    }

    if (message) {
        const chatId = message.chat.id;
        const text = message.text || '';
        const userId = message.from.id;
        const isGroupChat = message.chat.type === 'group' || message.chat.type === 'supergroup';
        const isPrivateChat = message.chat.type === 'private';
        const isBotMentioned = text.includes(`@${botInfo.username}`);
        const isOwnerAdmin = OWNER_ADMIN_IDS.includes(userId);

        // Don't respond to messages in public groups unless the bot is explicitly mentioned,
        // unless it's an owner/admin command which should always be private for security.
        if (isGroupChat && !isBotMentioned && !isOwnerAdmin && !text.startsWith('/')) {
            console.log("[handleUpdates] Ignoring unmentioned message in group chat.");
            return;
        }

        // --- User Commands (starts with '/') ---
        if (text.startsWith('/start')) {
            await handleShowMainMenu(message, token, env, botKeyValue);
        } else if (text.startsWith('/menu') || text.startsWith('🏠 ပင်မ Menu')) {
            await handleShowMainMenu(message, token, env, botKeyValue);
        } else if (text.startsWith('/mykey')) {
            await handleShowVpnUserDashboard(message, token, env, botKeyValue);
        } else if (text.startsWith('/payment')) {
            await sendMessage(token, chatId, "🚫 သင်ဝယ်ယူလိုသော ဝန်ဆောင်မှုကို ရွေးချယ်ပြီးမှ `ငွေပေးချေရန်` ကို နှိပ်ပါ။", 'HTML', null, botKeyValue);
        } else if (text.startsWith('/givekey')) {
            await handleGiveKeyCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/revoke')) {
            await handleRevokeKeyCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/addkey')) {
            await handleSetKeyCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/delkey')) {
            await handleDeleteKeyCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/listkeys')) {
            await handleListKeysCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/checkuser')) {
            await handleCheckUserVpnKey(message, token, env, botKeyValue);
        } else if (text.startsWith('/addvpnguide')) {
            await handleAddVpnGuideCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/delvpnguide')) {
            await handleDelVpnGuideCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/listvpnguides')) {
            await handleListVpnGuidesCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/addvpnguidedownload')) {
            await handleAddVpnGuideDownloadCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/addoperatorbutton')) {
            await handleAddOperatorButtonCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/deleteoperatorbutton')) {
            await handleDeleteOperatorButtonCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/listoperatorbuttons')) {
            await handleListOperatorButtonsCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/addprice')) {
            await handleSetPriceCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/deleteprice')) {
            await handleDeletePriceCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/listproducts')) {
            await handleListProductsCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/setwelcome')) {
            await handleSetWelcomeCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/deletewelcome')) {
            await handleDeleteWelcomeCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/resetuser')) {
            await handleUserTrialResetCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/forceupdate')) {
            await handleForceUpdateCommand(message, token, env, botKeyValue);
        } else if (text.startsWith('/help')) {
            const helpText = `<b>🤖 Bot Commands:</b>\n\n` +
                `<b>✨ User Commands:</b>\n` +
                `/start - Bot ကို စတင်အသုံးပြုရန်\n` +
                `/menu - ပင်မ Menu ကို ပြန်သွားရန်\n` +
                `/mykey - သင်၏ VPN Key အချက်အလက်များကို ကြည့်ရန်\n` +
                `/payment - ငွေပေးချေရန် (menu မှတဆင့် သွားပါ)\n\n` +
                `<b>🔐 Admin Commands:</b> (အောက်ပါ Commands များကို Private Chat တွင်သာ အသုံးပြုပါရန်)\n` +
                `<b>🔑 Key Management:</b>\n` +
                `/givekey &lt;user_id&gt; &lt;key_type&gt; - User တစ်ဦးအား Key ပေးရန်\n` +
                `/revoke &lt;key_unique_id&gt; - Key တစ်ခုကို ပြန်ရုပ်သိမ်းရန်\n` +
                `/addkey &lt;key_type&gt; &lt;key_value&gt; - Key အသစ်ထည့်ရန်\n` +
                `/delkey &lt;key_value&gt; - Key တစ်ခုကို ဖျက်ရန်\n` +
                `/listkeys &lt;key_type&gt; - Key စာရင်းကြည့်ရန်\n` +
                `/checkuser &lt;user_id&gt; - User ရဲ့ Key အခြေအနေ စစ်ဆေးရန်\n\n` +
                `<b>📜 VPN Guide Management:</b>\n` +
                `/addvpnguide &lt;app_code&gt; &lt;step_number&gt; &quot;&lt;step_text&gt;&quot; [&quot;&lt;image_file_id&gt;&quot;] - Guide Step အသစ်ထည့်ရန်\n` +
                `/delvpnguide &lt;app_code&gt; &lt;step_number&gt; - Guide Step ဖျက်ရန်\n` +
                `/listvpnguides - ရှိပြီးသား Guide များအားလုံးကို ကြည့်ရန်\n` +
                `/addvpnguidedownload &lt;app_code&gt; &lt;step_number&gt; &lt;download_url&gt; - Guide Step အတွက် Download Link ထည့်ရန်\n\n` +
                `<b>💰 Price & Product Management:</b>\n` +
                `/addprice &lt;item_type&gt; &lt;product_id&gt; &lt;price_mmk&gt; &lt;price_thb&gt; - Product Price ထည့်ရန်\n` +
                `/deleteprice &lt;item_type&gt; &lt;product_id&gt; - Product Price ဖျက်ရန်\n` +
                `/listproducts &lt;item_type&gt; - Product Price စာရင်းကြည့်ရန်\n\n` +
                `<b>✅ Operator Button Management:</b>\n` +
                `/addoperatorbutton &lt;operator_code&gt; &quot;&lt;operator_name&gt;&quot; &quot;&lt;image_file_id&gt;&quot; - Operator Button ထည့်ရန်\n` +
                `/deleteoperatorbutton &lt;operator_code&gt; - Operator Button ဖျက်ရန်\n` +
                `/listoperatorbuttons - Operator Button စာရင်းကြည့်ရန်\n\n` +
                `<b>💬 Welcome Message Management:</b>\n` +
                `/setwelcome [&lt;text&gt;] - Welcome Message သတ်မှတ်ရန်\n` +
                `/deletewelcome - Welcome Message ဖျက်ရန်\n\n` +
                `<b>⚙️ Other Commands:</b>\n` +
                `/resetuser &lt;user_id&gt; - User ၏ Trial Key အသုံးပြုမှုမှတ်တမ်းကို ဖျက်ရန်\n` +
                `/forceupdate - စနစ်အား ပြန်လည်စတင်ရန်\n`;
            await sendMessage(token, chatId, helpText, 'HTML', null, botKeyValue);
        } else if (text.startsWith('/') && text.length > 1) {
            await sendMessage(token, chatId, "❌ Command ကို ရှာမတွေ့ပါခင်ဗျာ။ /help ကို အသုံးပြုနိုင်ပါတယ်။", 'HTML', null, botKeyValue);
        }

        // --- User Text Messages ---
        else if (text.includes("vpn")) {
            await handleShowVpnMenu(message, token, env, botKeyValue);
        } else if (text.includes("mlbb")) {
            await handleShowMlbbMenu(message, token, env, botKeyValue);
        } else if (text.includes("pubg")) {
            await handleShowPubgMenu(message, token, env, botKeyValue);
        } else if (text.includes("ငွေလွှဲ")) {
            await handleShowMoneyTransferMenu(message, token, env, botKeyValue);
        } else if (text.includes("support")) {
            await handleShowSupportMenu(message, token, env, botKeyValue);
        } else if (message.photo) {
            // Photos are only handled in private chat as payment receipts.
            if (isPrivateChat) {
                await handleIncomingPhoto(message, token, env, botKeyValue);
            }
        } else if (text.length > 0) {
            // Fallback for any unhandled text messages
            if (isPrivateChat) {
                await handleIncomingTextMessage(message, token, env, botKeyValue);
            }
        }

    } else if (callback_query) {
        const data = callback_query.data;
        const messageId = callback_query.message.message_id;
        const chatId = callback_query.message.chat.id;
        const userId = callback_query.from.id;

        console.log(`[handleUpdates] Received callback data: ${data}`);

        // --- Callback Queries ---
        if (data === 'main_menu') {
            await handleShowMainMenu(callback_query, token, env, botKeyValue);
        } else if (data === 'vpn_menu') {
            await handleShowVpnMenu(callback_query, token, env, botKeyValue);
        } else if (data === 'mlbb_menu') {
            await handleShowMlbbMenu(callback_query, token, env, botKeyValue);
        } else if (data === 'pubg_menu') {
            await handleShowPubgMenu(callback_query, token, env, botKeyValue);
        } else if (data === 'money_transfer_menu') {
            await handleShowMoneyTransferMenu(callback_query, token, env, botKeyValue);
        } else if (data === 'support_menu') {
            await handleShowSupportMenu(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('buy_')) {
            await handleGameItemBuyRequest(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('confirm_initiate_payment')) {
            await handlePaymentInstructionCallback(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('approve_payment_')) {
            await handleApprovePaymentCallback(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('reject_payment_')) {
            await handleRejectPaymentCallback(callback_query, token, env, botKeyValue);
        } else if (data === 'request_trial_vpn') {
            await handleRequestTrialVpn(callback_query, token, env, botKeyValue);
        } else if (data === 'vpn_user_dashboard') {
            await handleShowVpnUserDashboard(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('show_vpn_operator_menu')) {
            await handleShowVpnOperatorMenu(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('show_vpn_key_type_menu')) {
            await handleShowVpnKeyTypeMenu(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('show_vpn_final_key_menu')) {
            await handleShowVpnFinalKeyMenu(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('request_payment_')) {
            await handleCallbackToRequestPayment(callback_query, token, env, botKeyValue);
        } else if (data === 'show_welcome_message') {
            await handleShowWelcomeMessageMenu(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('show_vpn_guide_menu')) {
            await handleShowVpnGuideMenu(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('show_vpn_guide:')) {
            await handleShowSpecificVpnGuide(callback_query, token, env, botKeyValue);
        } else if (data.startsWith('show_vpn_key_info')) {
            await handleShowVpnKeyInfo(callback_query, token, env, botKeyValue);
        } else {
            console.warn(`[handleUpdates] Unhandled callback query: ${data}`);
            await answerCallbackQuery(token, callback_query.id, "🚧 ဤလုပ်ဆောင်ချက်ကို မသိရှိသေးပါ သို့မဟုတ် အမှားအယွင်းတစ်ခု ဖြစ်ပွားခဲ့ပါသည်။");
        }
    } else {
        console.log("[handleUpdates] Unhandled update type:", JSON.stringify(update, null, 2));
    }
}


export async function onRequest(context) {
    const {
        request,
        env
    } = context;
    const url = new URL(request.url);

    // Telegram webhook validation
    const botKeyHeader = request.headers.get('X-Bot-Key');
    const isBotWebhookRequest = botKeyHeader && botKeyHeader === env.BOT_DATA;

    if (request.method === 'POST' && url.pathname === '/webhook') {
        if (!isBotWebhookRequest) {
            console.warn(`[onRequest] Unauthorized webhook request from IP: ${request.headers.get('CF-Connecting-IP')}`);
            return new Response('Unauthorized', {
                status: 401
            });
        }
        try {
            const update = await request.json();
            await handleUpdates(update, env);
            return new Response("OK", {
                status: 200
            });
        } catch (error) {
            console.error("[onRequest] Error handling Telegram webhook:", error.stack || error.message);
            return new Response(`Error: ${error.message}`, {
                status: 500
            });
        }
    } else {
        console.log(`[onRequest] Non-POST/non-webhook request received: ${request.method} ${url.pathname}`);
        return new Response("This is a Telegram bot webhook endpoint. Please send POST requests.", {
            status: 200
        });
    }
}
