// functions/constants.js

// Telegram Bot API base URL
export const TELEGRAM_API = "https://api.telegram.org/bot";

// Bot Developer's Contact Information (Hardcoded for direct contact)
export const ADMIN_USERNAME = "@Zero_Free_Vpn"; // Your Telegram Username (without @)
export const SUPPORT_GROUP_LINK = "https://t.me/zero_freevpn"; // Your Telegram Support Group Link

// Admin ရဲ့ Telegram Account ပြသနာမည် (ဥပမာ: "မောင်သုည")
export const ADMIN_DISPLAY_NAME = "မောင်သုည"; // ဆရာလိုချင်သော နာမည်ကို ဤနေရာတွင် ထည့်ပါ။

// Bot Owner/Admin User IDs for THIS Public User Bot - Pre-filled with user's provided ID
// These IDs will be able to use the /addvpnguide, /delvpnguide etc. commands on THIS bot.
export const OWNER_ADMIN_IDS = [7576434717, 7240495054]; // <--- REPLACE WITH YOUR OWN TELEGRAM USER IDs (e.g., [123456789, 987654321])

// --- Welcome Message Constants ---
export const WELCOME_MESSAGE_KEY = "bot_welcome_message"; // KV key for welcome message text
export const WELCOME_PHOTO_KEY = "bot_welcome_photo_file_id"; // KV key for welcome photo file ID

export const DEFAULT_WELCOME_MESSAGE = `
မောင်သုည - အကောင်းဆုံး နဲ့ မြန်ဆန်သော ဒစ်ဂျစ်တယ် ဝန်ဆောင်မှုများကို အခုပဲ ရယူလိုက်ပါ။

<b>✅ VPN Services</b> - အမြန်နှုန်းမြင့် VPN ဝန်ဆောင်မှုများဖြင့် အင်တာနက်လွတ်လပ်စွာသုံးစွဲပါ။

<b>✅ MLBB Diamonds</b> - Mobile Legends အတွက် Diamond များကို စျေးနှုန်းချိုသာစွာဖြင့် ရယူလိုက်ပါ။

<b>✅ PUBG UC</b> - PUBG Mobile UC များကို အမြန်ဆုံးပို့ဆောင်ပေးပါသည်။

<b>✅ ငွေလွှဲဝန်ဆောင်မှု</b> - ထိုင်းမှ မြန်မာသို့ လုံခြုံပြီးမြန်ဆန်သော ငွေလွှဲဝန်ဆောင်မှုများ။
`;

// Default welcome photo (use the uploaded image's file_id)
// Make sure this file_id is valid and accessible by your bot.
export const DEFAULT_WELCOME_PHOTO_FILE_ID = "AgACAgUAAxkBAAOFaI6eLO_qfv3h1kByVuYdIDYEpjwAAuXLMRu_1VhUcPOyaFZwVbUBAAMCA... (replace with a real file_id if you want)";
export const NO_IMAGE_PLACEHOLDER_FILE_ID = "AgACAgUAAxkBAAIHv2iaKHlw-GnO3jlkSrnC... (replace with a real placeholder file_id if you want)"; // Placeholder for images not found

// --- Main Menu Buttons ---
export const MAIN_MENU_BUTTONS = [
    [{ text: "📚 VPN အသုံးပြုနည်းလမ်းညွှန်", callback_data: "show_vpn_guide_menu" }], // Direct to VPN Guide Menu
    [{ text: "💬 အကူအညီ", callback_data: "menu_support" }] // Support button
];

// --- Support Menu Constants ---
export const SUPPORT_MENU_TEXT = `
မည်သည့် အကူအညီ လိုအပ်ပါက အောက်ပါ လမ်းကြောင်းများမှ ဆက်သွယ်နိုင်ပါသည်။

<b>👤 Admin ကို တိုက်ရိုက်ဆက်သွယ်ရန်:</b>
<a href="https://t.me/${ADMIN_USERNAME.substring(1)}">${ADMIN_USERNAME}</a>

<b>👥 ပံ့ပိုးကူညီမှု Group သို့ ဝင်ရန်:</b>
<a href="${SUPPORT_GROUP_LINK}">Group Link</a>

<b>မေးလေ့ရှိသော မေးခွန်းများ (FAQ):</b>
မကြာမီ လာမည်။
`;
export const SUPPORT_MENU_BUTTONS = [
    [{ text: "↩️ နောက်သို့", callback_data: "main_menu" }]
];

// --- VPN Guide Constants ---
export const VPN_GUIDE_KEY_PREFIX = "vpn_guide:"; // Key prefix for storing VPN guide steps in KV
export const VPN_GUIDE_MENU_TEXT = "📚 <b>အောက်ပါ VPN Application များ၏ အသုံးပြုနည်းများကို ရွေးချယ်ကြည့်ရှုနိုင်ပါသည်:</b>";
export const PUBLIC_VPN_GUIDES_BUTTON = { text: "📚 VPN အသုံးပြုနည်းလမ်းညွှန်ကို ကြည့်ရန်", callback_data: "show_vpn_guide_menu" };
// အသုံးပြုနည်းလမ်းညွှန် အဆင့်များမှ ပင်မ Menu သို့ ပြန်သွားရန် ခလုတ်
export const BACK_TO_VPN_GUIDE_MENU_BUTTON = { text: "↩️ နောက်သို့ (ပင်မ Menu)", callback_data: "main_menu" };

// Empty constant for BOT_API_KEY as it's not directly used here
export const BOT_API_KEY = "";

