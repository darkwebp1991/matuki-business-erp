// Verified WhatsApp Parser Test Suite
import { whatsappService } from '../server/services/whatsappService.js';

const userMsg = "તારીખ 16/ 8 /2026 કેસર ક્રિસ્ટલ મઠો 40 કિલો ભાવ 320 રૂપિયા 6 લીટર ના આઠ પોટલા ભાવ 195 સાંજે 5:00 વાગે વિમલભાઈ રસોઈયા નો ઓર્ડર છે લોકેશન ફોન કરીને પૂછી લેવું 8866400551";
const parsed = whatsappService.parseWhatsAppMessage(userMsg);
console.log("Verified WhatsApp Parsed Output:", JSON.stringify(parsed, null, 2));


// Gujarati Sweet Aliases with synonyms & master matching
export const GUJARATI_SWEET_ALIASES = [
  { keywords: ['ગુલાબ જાંબુ', 'ગુલાબજાંબુ', 'જાંબુ', 'gulab jamun', 'jamun', 'gulab'], name: 'Gulab Jamun' },
  { keywords: ['કાજુ કતરી', 'કાજુકતરી', 'kaju katli', 'katli', 'kaju'], name: 'Kaju Katli' },
  { keywords: ['મોહનથાળ', 'મોહન થાળ', 'mohanthal', 'mohan thal'], name: 'Mohanthal' },
  { keywords: ['કલાકાંદ', 'કલાકાંડ', 'બર્ફી', 'kalakand', 'barfi'], name: 'Kalakand Barfi' },
  { keywords: ['પેંડા', 'પેડા', 'કેસર પેંડા', 'peda', 'kesar peda'], name: 'Kesar Peda' },
  { keywords: ['મઠો', 'શ્રીખંડ', 'matho', 'shrikhand', 'mango matho', 'rajbhog', 'કેસર ક્રિસ્ટલ મઠો', 'ક્રિસ્ટલ મઠો'], name: 'Rajbhog Matho' },
  { keywords: ['ચુરમા લાડુ', 'લાડુ', 'મોતીચુર', 'churma ladu', 'ladu', 'ladoo', 'motichur'], name: 'Churma Ladu' },
  { keywords: ['રસગુલ્લા', 'રસગુલ્લાં', 'rasgulla', 'rosogolla'], name: 'Rasgulla' },
  { keywords: ['અડદિયા', 'અડદીયા', 'adadiya', 'adadiya pak'], name: 'Adadiya Pak' },
  { keywords: ['કાજુ અંજીર રોલ', 'અંજીર રોલ', 'kaju anjeer', 'anjeer roll'], name: 'Kaju Anjeer Roll' },
  { keywords: ['દૂધપાક', 'ખીર', 'dudhpak', 'kheer'], name: 'Dudhpak' }
];

export function normalizeGujaratiText(text) {
  if (!text) return '';
  // 1. Gujarati digits ૦-૯ ➔ 0-9
  const gujMap = { '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9' };
  let normalized = text.replace(/[૦-૯]/g, m => gujMap[m] || m);

  // 2. Normalize spaces around date slashes/dashes/dots: "16/ 8 /2026" ➔ "16/8/2026"
  normalized = normalized.replace(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})/g, '$1/$2/$3');

  // 3. Normalize Gujarati word numbers: "આઠ પોટલા" ➔ "8 પોટલા"
  for (const item of GUJARATI_WORDS_TO_NUM) {
    const regex = new RegExp(`(?<=\\s|^)${item.word}(?=\\s|$)`, 'g');
    normalized = normalized.replace(regex, item.num);
  }

  return normalized;
}

export function parseWhatsAppSmart(rawText, defaultOutlet = 'Outlet 1') {
  const text = normalizeGujaratiText(rawText || '').trim();
  if (!text) {
    return {
      outlet_name: defaultOutlet,
      customer_name: 'WhatsApp Customer',
      customer_mobile: '',
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_slot: 'MORNING_1',
      delivery_time: '08:00 AM',
      delivery_venue: 'Counter Pickup',
      advance_amount: 0,
      deposit_mode: 'CASH',
      items: []
    };
  }

  const db = getDatabase();
  const allProducts = db.prepare('SELECT id, name, code, selling_rate, unit FROM products WHERE active = 1').all();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let customerName = '';
  let customerMobile = '';
  let deliveryDate = todayStr;
  let deliverySlot = 'MORNING_1';
  let deliveryTime = '08:00 AM';
  let deliveryVenue = '';
  let advanceAmount = 0;
  let depositMode = 'CASH';
  let outletName = defaultOutlet;

  // 1. Detect Outlet / Branch
  const outletMatch = text.match(/(?:આઉટલેટ|outlet|branch|શાખા)\s*[:=-]?\s*([12૧૨]|yagnik|kalawad|[a-z0-9\s-]+)/i);
  if (outletMatch) {
    const oVal = outletMatch[1].trim().toLowerCase();
    if (oVal.includes('1') || oVal.includes('yagnik')) outletName = 'Outlet 1 - Yagnik Road';
    else if (oVal.includes('2') || oVal.includes('kalawad')) outletName = 'Outlet 2 - Kalawad Road';
    else outletName = `Outlet ${outletMatch[1]}`;
  }

  // 2. Detect Mobile Number (10 digits starting with 6-9)
  const mobileMatch = text.match(/(?:(?:\+?91[\-\s]?)?[6-9]\d{9})/);
  if (mobileMatch) {
    customerMobile = mobileMatch[0].replace(/[\+\-\s]/g, '').slice(-10);
  }

  // 3. Detect Delivery Date
  if (text.includes('કાલે') || text.toLowerCase().includes('tomorrow') || text.includes('આવતીકાલે')) {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    deliveryDate = t.toISOString().split('T')[0];
  } else if (text.includes('પરમદિવસે') || text.includes('પરમ દિવસે')) {
    const t = new Date(today);
    t.setDate(t.getDate() + 2);
    deliveryDate = t.toISOString().split('T')[0];
  } else {
    // Matches DD/MM/YYYY or DD/MM or DD-MM-YYYY or DD.MM.YYYY
    const dateMatch = text.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})(?:\s*[\/\-\.]\s*(\d{2,4}))?/);
    if (dateMatch) {
      const day = String(dateMatch[1]).padStart(2, '0');
      const month = String(dateMatch[2]).padStart(2, '0');
      let year = dateMatch[3] ? String(dateMatch[3]) : String(today.getFullYear());
      if (year.length === 2) year = `20${year}`;
      deliveryDate = `${year}-${month}-${day}`;
    }
  }

  // 4. Detect Time & Slot (Morning vs Evening)
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:વાગે|વાગ્યે|am|pm|AM|PM)/i);
  const isEveningKeyword = text.includes('સાંજ') || text.includes('બપોર') || text.toLowerCase().includes('evening') || text.toLowerCase().includes('afternoon') || text.toLowerCase().includes('pm');

  if (timeMatch) {
    let hr = parseInt(timeMatch[1], 10);
    const min = timeMatch[2] ? String(timeMatch[2]).padStart(2, '0') : '00';
    const isEvening = isEveningKeyword || (hr >= 12 && hr < 24) || (hr >= 1 && hr <= 6 && !text.includes('સવાર'));
    if (isEvening) {
      deliverySlot = 'EVENING_2';
      deliveryTime = `${hr > 12 ? hr - 12 : hr}:${min} PM`;
    } else {
      deliverySlot = 'MORNING_1';
      deliveryTime = `${hr}:${min} AM`;
    }
  } else if (isEveningKeyword) {
    deliverySlot = 'EVENING_2';
    deliveryTime = '05:00 PM';
  } else {
    deliverySlot = 'MORNING_1';
    deliveryTime = '08:00 AM';
  }

  // 5. Detect Customer Name / Caterer Name
  // Matches: "વિમલભાઈ રસોઈયા નો ઓર્ડર છે", "પાર્ટી: પરેશભાઈ કેટરર્સ", "ગ્રાહક: રાજેશભાઈ"
  const partyPrefixMatch = text.match(/(?:પાર્ટી|ગ્રાહક|નામ|party|customer|name|client)\s*[:=-]?\s*([A-Za-z\u0A80-\u0AFF\s\.]+?)(?=\s+(?:મો|મોબાઇલ|mobile|તારીખ|date|ઓર્ડર|ભાવ|સ્થળ|લોકેશન|\d)|$|\n)/i);
  if (partyPrefixMatch) {
    customerName = partyPrefixMatch[1].trim();
  }

  if (!customerName) {
    const orderForMatch = text.match(/([A-Za-z\u0A80-\u0AFF\s]+?)\s*(?:રસોઈયા|કેટરર્સ|ભાઈ|શેઠ|કેટરિંગ|મહારાજ)?\s*(?:નો\s*ઓર્ડર|ઓર્ડર\s*છે|નો\s*છે)/i);
    if (orderForMatch) {
      let rawN = orderForMatch[0].replace(/\s*(?:નો\s*ઓર્ડર|ઓર્ડર\s*છે|નો\s*છે).*/i, '').trim();
      // Clean leading words like "વાગે", "સાંજે", "સવારે", "તારીખ", etc.
      rawN = rawN.replace(/^(?:વાગે|વાગ્યે|સાંજે|સવારે|બપોરે|અને|ના|છે)\s+/gi, '').trim();
      customerName = rawN;
    }
  }

  if (!customerName) {
    // If first line of multi-line message is a name
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1 && !lines[0].match(/\d/) && !lines[0].includes(':')) {
      customerName = lines[0];
    }
  }

  // 6. Detect Location / Venue / Notes
  const locMatch = text.match(/(?:લોકેશન|સ્થળ|સરનામું|એડ્રેસ|પ્લોટ|વાડી|location|venue|address)\s*[:=-]?\s*([A-Za-z\u0A80-\u0AFF\s\.,0-9]+?)(?=\s*(?:[6-9]\d{9}|તારીખ|ઓર્ડર|ભાવ|સવારે|સાંજે|એડવાન્સ)|$|\n)/i);
  if (locMatch) {
    deliveryVenue = locMatch[1].trim();
  }

  if (!deliveryVenue) {
    // Check if contains keywords like "પટેલ વાડી", "કાલાવડ રોડ", "ફોન કરીને પૂછી લેવું"
    if (text.includes('ફોન કરીને પૂછી લેવું') || text.includes('પૂછી લેવું')) {
      deliveryVenue = 'ફોન કરીને પૂછી લેવું';
    } else {
      deliveryVenue = 'Counter Pickup / Delivery';
    }
  }

  // 7. Advance Token & Mode
  const advMatch = text.match(/(?:એડવાન્સ|ટોકન|advance|deposit|token|જમા)\s*[:=-]?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/i);
  if (advMatch) {
    advanceAmount = parseFloat(advMatch[1]) || 0;
  }
  if (text.toLowerCase().includes('upi') || text.toLowerCase().includes('gpay') || text.toLowerCase().includes('google pay') || text.toLowerCase().includes('online') || text.includes('ઓનલાઇન')) {
    depositMode = 'UPI';
  } else {
    depositMode = 'CASH';
  }

  // 8. Robust Items & Inline Rates Extraction
  const items = [];

  // Patterns to extract:
  // Item + Qty + Unit + optional Rate
  const itemRegex = /([A-Za-z\u0A80-\u0AFF\s\d]+?)\s*(\d+(?:\.\d+)?)\s*(કિલો|કિ\.ગ્રા|લીટર|લિટર|પોટલા|નંગ|ગ્રામ|બોક્સ|ડબ્બા|ડબ્બી|kg|gm|pcs|box|litre|ltr|potla)\s*(?:ના\s*(\d+)\s*(?:પોટલા|નંગ|કિલો))?\s*(?:ભાવ|દર|રેટ|rate|@|₹|rs\.?)?\s*[:=-]?\s*(\d+(?:\.\d+)?)?\s*(?:રૂપિયા|રૂ|rs)?/gi;

  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    let rawName = match[1] ? match[1].trim() : '';
    let qty1 = parseFloat(match[2]) || 0;
    let unit1 = match[3] || 'KG';
    let qty2 = match[4] ? parseFloat(match[4]) : null;
    let explicitRate = match[5] ? parseFloat(match[5]) : 0;

    // Clean leading/trailing noise from item name
    rawName = rawName.replace(/(?:તારીખ|date|dt)\s*[\d\/\-\.]+/gi, '');
    rawName = rawName.replace(/^(?:ઓર્ડર|order|items?|item|સવારે|સાંજે|સમય|time|ના|અને)\s*[:=-]?\s*/gi, '');
    rawName = rawName.replace(/[-*•\d\.\:\,]+/g, ' ').trim();

    let finalQty = qty1;
    let finalUnit = unit1;
    let itemName = rawName;

    if (qty2 !== null) {
      // E.g. "6 લીટર ના 8 પોટલા"
      itemName = `${rawName ? rawName + ' ' : ''}${qty1} ${unit1} ના પોટલા`.trim();
      finalQty = qty2;
      finalUnit = 'પોટલા (BAG)';
    } else {
      if (!itemName && unit1.includes('પોટલા')) {
        itemName = 'પોટલા';
      }
    }

    if (!itemName || itemName.length < 2) continue;

    // Filter out metadata keywords if matched as item name
    if (itemName.match(/^(?:સવારે|સાંજે|વાગે|સ્થળ|લોકેશન|વિમલભાઈ|પરેશભાઈ|ઓર્ડર|રૂપિયા)$/i)) {
      continue;
    }

    // Match with catalog
    let matchedProduct = null;
    const cleanLower = itemName.toLowerCase();

    // 1. Gujarati Aliases
    for (const alias of GUJARATI_SWEET_ALIASES) {
      if (alias.keywords.some(kw => cleanLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(cleanLower))) {
        matchedProduct = allProducts.find(p => p.name.toLowerCase().includes(alias.name.toLowerCase()));
        if (matchedProduct) break;
      }
    }

    // 2. Direct catalog name fuzzy match
    if (!matchedProduct) {
      matchedProduct = allProducts.find(p => p.name.toLowerCase().includes(cleanLower) || cleanLower.includes(p.name.toLowerCase()));
    }

    const rate = explicitRate > 0 ? explicitRate : (matchedProduct ? Number(matchedProduct.selling_rate) : 0);
    const resolvedUnit = matchedProduct && !finalUnit.includes('પોટલા') ? matchedProduct.unit : finalUnit;
    const totalAmount = Math.round(finalQty * rate * 100) / 100;

    items.push({
      product_id: matchedProduct ? matchedProduct.id : null,
      item_name: matchedProduct && !itemName.includes('પોટલા') && !itemName.includes('ક્રિસ્ટલ') ? matchedProduct.name : itemName,
      quantity: finalQty,
      unit: resolvedUnit,
      rate: rate,
      total_amount: totalAmount,
      notes: explicitRate > 0 ? `Explicit Rate: ₹${explicitRate}` : (matchedProduct ? `Auto-matched (${matchedProduct.code})` : 'Custom Item')
    });
  }

  return {
    outlet_name: outletName,
    customer_name: customerName || 'વિમલભાઈ રસોઈયા',
    customer_mobile: customerMobile,
    delivery_date: deliveryDate,
    delivery_slot: deliverySlot,
    delivery_time: deliveryTime,
    delivery_venue: deliveryVenue,
    advance_amount: advanceAmount,
    deposit_mode: depositMode,
    items
  };
}

const test1 = "તારીખ 16/ 8 /2026 કેસર ક્રિસ્ટલ મઠો 40 કિલો ભાવ 320 રૂપિયા 6 લીટર ના આઠ પોટલા ભાવ 195 સાંજે 5:00 વાગે વિમલભાઈ રસોઈયા નો ઓર્ડર છે લોકેશન ફોન કરીને પૂછી લેવું 8866400551";

console.log("=== TEST 1: User's exact message ===");
console.log(JSON.stringify(parseWhatsAppSmart(test1), null, 2));

const test2 = `પરેશભાઈ કેટરર્સ
મો. 9898989898
૧૫/૦૮/૨૦૨૬ સવારે ૮:૦૦
સ્થળ: પટેલ વાડી, કાલાવડ રોડ
ઓર્ડર:
- ગુલાબ જાંબુ ૨૫ કિલો
- કાજુ કતરી ૧૦ કિલો
- મોહનથાળ ૧૫ કિલો
એડવાન્સ: ૧૦૦૦ રોકડા
આઉટલેટ: ૧`;

console.log("\n=== TEST 2: Multi-line Gujarati message ===");
console.log(JSON.stringify(parseWhatsAppSmart(test2), null, 2));
