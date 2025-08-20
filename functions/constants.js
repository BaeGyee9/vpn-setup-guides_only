// functions/constants.js
// VPN Guide Bot အတွက် လိုအပ်သော ကိန်းသေများ (Constants)

// Telegram Bot API base URL
export const TELEGRAM_API = "https://api.telegram.org/bot";

// Global variable to store bot ID after first fetch for efficient passive mode check
export let botIdCache = null;

// Bot Developer's Contact Information (Hardcoded for direct contact)
// VPN Guide Bot အတွက်ဆိုရင် Admin ကို ဆက်သွယ်ဖို့ မလိုအပ်ရင် ဖယ်ထားနိုင်ပါတယ်။
// ဒါပေမဲ့ /addvpnguide, /deletevpnguide, /listvpnguides command တွေအတွက် Admin ID လိုအပ်ပါတယ်။
export const ADMIN_USERNAME = "@YourAdminUsername"; // သင့်ရဲ့ Telegram Username ကို ဒီနေရာမှာ ထည့်ပါ။ (ဥပမာ: @Zero_Free_Vpn)
export const SUPPORT_GROUP_LINK = "https://t.me/your_support_group"; // သင့်ရဲ့ Telegram Support Group Link ကို ဒီနေရာမှာ ထည့်ပါ။ (မလိုအပ်ရင် Empty ထားနိုင်ပါတယ်။)

// Bot Owner/Admin User IDs for THIS VPN Guide Bot
// ဤ ID များသာ /addvpnguide, /deletevpnguide, /listvpnguides command များကို အသုံးပြုနိုင်ပါမည်။
export const OWNER_ADMIN_IDS = [123456789, 987654321]; // <--- သင့်ရဲ့ TELEGRAM USER ID များကို ဒီနေရာမှာ ထည့်ပါ။ (ဥပမာ: [7576434717, 7240495054])

// --- VPN Guide Specific Constants ---
export const VPN_GUIDE_KEY_PREFIX = "vpn_guide:"; // KV key prefix for VPN usage guides

export const VPN_GUIDE_MENU_TEXT = `📚 အောက်ပါ VPN Application များ၏ အသုံးပြုနည်းများကို ရွေးချယ်ကြည့်ရှုနိုင်ပါသည်:`;

// Back button for VPN Guide steps - always goes back to the main VPN Guide menu
export const BACK_TO_VPN_GUIDE_MENU_BUTTON = { text: "↩️ နောက်သို့ (လမ်းညွှန်များ)", callback_data: "show_vpn_guide_menu" };

// Public button for VPN Guides for /vpnguides command (and other main menus if needed)
export const PUBLIC_VPN_GUIDES_BUTTON = { text: "📚 VPN အသုံးပြုနည်းလမ်းညွှန်", callback_data: "show_vpn_guide_menu" };

// Main Menu Buttons for a simplified guide bot (only guide related)
export const MAIN_MENU_BUTTONS = [
    [{ text: "📚 VPN အသုံးပြုနည်းလမ်းညွှန်", callback_data: "show_vpn_guide_menu" }],
    [{ text: "❓ အကူအညီ / ဆက်သွယ်ရန်", callback_data: "menu_support" }]
];

// Support/Contact Menu (simplified)
export const SUPPORT_MENU_TEXT = `အကူအညီလိုအပ်ပါက သို့မဟုတ် မေးမြန်းလိုပါက <b>Admin</b> ကို ဆက်သွယ်နိုင်ပါတယ်:

📞 Admin: ${ADMIN_USERNAME}
🔗 Support Group: ${SUPPORT_GROUP_LINK}
`;
export const SUPPORT_MENU_BUTTONS = [
    [{ text: "↩️ နောက်သို့", callback_data: "main_menu" }] // Back to simplified main menu
];

// Default welcome message for the guide bot
export const DEFAULT_WELCOME_MESSAGE = `
မင်္ဂလာပါ! ကျွန်တော်က VPN အသုံးပြုနည်းလမ်းညွှန် Bot ပါ။

အောက်ပါခလုတ်ကို နှိပ်ပြီး VPN Application များ၏ အသုံးပြုနည်းများကို လေ့လာနိုင်ပါတယ်:
`;

// Placeholder for a generic "no image" file ID (if needed for guides)
export const NO_IMAGE_PLACEHOLDER_FILE_ID = "AgACAgUAAxkBAAOFaI6eLO_qfv3h1kByVuYdIDYEpjwAAuXLMRu_1VhUcPOyaFZwVbUBAAMCAAN4AAM2BA"; // သင်နှစ်သက်ရာ ပုံတစ်ပုံ၏ File ID ကို ထည့်ပါ။

// REMOVED: Sales-related constants (KBANK_ACCOUNT_NAME, KBANK_ACCOUNT_NUMBER, KBANK_QR_CODE_FILE_ID, KBANK_QR_CODE_URL,
// MAIN_MENU_TEXT (replaced with simplified one), VPN_MENU_TEXT, MLBB_MENU_TEXT, PUBG_MENU_TEXT, MONEY_TRANSFER_TEXT,
// TRIAL_VPN_DURATION_HOURS, TRIAL_VPN_COOLDOWN_DAYS, TRIAL_VPN_LIMIT_PER_USER, TRIAL_VPN_KEY_PREFIX, USER_TRIAL_STATUS_PREFIX,
// PUBLIC_BOT_ADMIN_COMMANDS (replaced with simplified list), BLOCKED_DOMAINS, BLOCKED_APP_IDS, BLOCKED_KEYWORDS_REGEX,
// VIEW_PAYMENT_BUTTON, WELCOME_MESSAGE_KEY, WELCOME_PHOTO_KEY, DEFAULT_WELCOME_MESSAGE (replaced),
// DEFAULT_WELCOME_PHOTO_FILE_ID).
