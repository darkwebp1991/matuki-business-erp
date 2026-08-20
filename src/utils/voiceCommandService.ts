// Natural Voice Command & Gujarati Intent Parser for Matuki Business ERP

export type VoiceIntentType = 
  | 'NAVIGATE'
  | 'OPEN_NEW_SALE'
  | 'OPEN_NEW_PURCHASE'
  | 'OPEN_NEW_EXPENSE'
  | 'OPEN_PAYMENT_IN'
  | 'OPEN_PAYMENT_OUT'
  | 'OPEN_WHATSAPP'
  | 'SEARCH_ITEM'
  | 'SEARCH_CUSTOMER'
  | 'SEARCH_SUPPLIER'
  | 'GLOBAL_SEARCH'
  | 'UNKNOWN';

export interface ParsedVoiceCommand {
  intent: VoiceIntentType;
  targetView?: string;
  searchQuery?: string;
  spokenText: string;
  feedbackGujarati: string;
  feedbackEnglish: string;
}

// Multi-lingual keyword maps for navigation & ERP actions
const NAVIGATION_KEYWORDS: Array<{ patterns: string[]; view: string; labelGu: string; labelEn: string }> = [
  {
    patterns: ['ડેશબોર્ડ', 'હોમ', 'મેઇન પેજ', 'dashboard', 'home', 'main page'],
    view: 'dashboard',
    labelGu: 'લાઇવ ડેશબોર્ડ ખોલી રહ્યું છે',
    labelEn: 'Opening Live Dashboard'
  },
  {
    patterns: ['ઓર્ડર', 'એડવાન્સ ઓર્ડર', 'કેટરર્સ ઓર્ડર', 'ઓર્ડર બુકિંગ', 'પ્લાનર', 'advance order', 'orders', 'order planner', 'catering'],
    view: 'advance_orders',
    labelGu: 'એડવાન્સ ઓર્ડર પ્લાનર ખોલી રહ્યું છે',
    labelEn: 'Opening Advance Orders'
  },
  {
    patterns: ['ગ્રાહક', 'પાર્ટી', 'ખાતાવહી', 'ઉઘરાણી', 'ગ્રાહકો', 'કસ્ટમર', 'customer', 'customers', 'khata', 'parties'],
    view: 'customers',
    labelGu: 'ગ્રાહક ખાતાવહી લિસ્ટ ખોલી રહ્યું છે',
    labelEn: 'Opening Customers Khata'
  },
  {
    patterns: ['વેપારી', 'સપ્લાયર', 'ખરીદી ખાતું', 'માલ આપનાર', 'supplier', 'suppliers', 'vendors'],
    view: 'suppliers',
    labelGu: 'સપ્લાયર અને વેપારી લિસ્ટ ખોલી રહ્યું છે',
    labelEn: 'Opening Suppliers List'
  },
  {
    patterns: ['સ્ટોક', 'મીઠાઈ', 'આઈટમ', 'પ્રોડક્ટ', 'માલ', 'રેટ લિસ્ટ', 'ભાવ', 'stock', 'items', 'products', 'sweets'],
    view: 'products',
    labelGu: 'મીઠાઈ અને આઈટમ માસ્ટર ખોલી રહ્યું છે',
    labelEn: 'Opening Items Master'
  },
  {
    patterns: ['ખરીદી રજિસ્ટર', 'પરચેઝ', 'માલ ખરીદી', 'purchases', 'purchase register'],
    view: 'purchases',
    labelGu: 'ખરીદી રજિસ્ટર ખોલી રહ્યું છે',
    labelEn: 'Opening Purchases Register'
  },
  {
    patterns: ['ખર્ચ', 'ખર્ચા', 'રોજના ખર્ચા', 'ફેક્ટરી ખર્ચ', 'expenses', 'factory expense'],
    view: 'expenses',
    labelGu: 'રોજના ખર્ચા લિસ્ટ ખોલી રહ્યું છે',
    labelEn: 'Opening Expenses Register'
  },
  {
    patterns: ['રોજમેળ', 'ગલ્લો', 'કેશ મેળ', 'ડેબુક', 'આવક જાવક', 'rojmel', 'daybook', 'cash book'],
    view: 'rojmel',
    labelGu: 'આજનો રોજમેળ (ડેબુક) ખોલી રહ્યું છે',
    labelEn: 'Opening Daily Daybook (Rojmel)'
  },
  {
    patterns: ['હાજરી', 'કારીગર પગાર', 'સ્ટાફ', 'હાજરીપત્રક', 'પગાર', 'attendance', 'salary', 'staff'],
    view: 'attendance',
    labelGu: 'સ્ટાફ અને કારીગર હાજરી ખોલી રહ્યું છે',
    labelEn: 'Opening Staff Attendance'
  },
  {
    patterns: ['રિપોર્ટ', 'હિસાબ', 'નફો નુકસાન', 'સેલ્સ રિપોર્ટ', 'reports', 'profit loss', 'pnl'],
    view: 'reports',
    labelGu: 'બિઝનેસ રિપોર્ટ્સ ખોલી રહ્યું છે',
    labelEn: 'Opening Financial Reports'
  },
  {
    patterns: ['ગુગલ શીટ', 'સ્ટોક ઓડિટ', 'બ્રાન્ચ ઓડિટ', 'google sheet', 'audit'],
    view: 'google_sheet_pnl',
    labelGu: '૩ શાખા સ્ટોક ઓડિટ ખોલી રહ્યું છે',
    labelEn: 'Opening 3-Branch Stock Audit'
  },
  {
    patterns: ['વાસણ', 'ચોકી', 'ડબ્બો', 'વાસણ ટ્રેકિંગ', 'utensils', 'vasan'],
    view: 'vasan',
    labelGu: 'વાસણ અને ચોકી ટ્રેકિંગ ખોલી રહ્યું છે',
    labelEn: 'Opening Vasan Utensil Ledger'
  },
  {
    patterns: ['સેટિંગ', 'પાસવર્ડ', 'યુઝર', 'કંપની સેટિંગ', 'settings', 'config'],
    view: 'settings',
    labelGu: 'સિસ્ટમ સેટિંગ્સ ખોલી રહ્યું છે',
    labelEn: 'Opening System Settings'
  },
  {
    patterns: ['બેકઅપ', 'ડેટાબેઝ', 'રિસ્ટોર', 'backup', 'restore'],
    view: 'backup',
    labelGu: 'ડેટાબેઝ બેકઅપ પેજ ખોલી રહ્યું છે',
    labelEn: 'Opening Backup & Restore'
  },
  {
    patterns: ['ટાસ્ક', 'કામ', 'ટુ ડુ', 'રિમાઇન્ડર', 'todos', 'task planner'],
    view: 'todos',
    labelGu: 'ડેઇલી ટાસ્ક પ્લાનર ખોલી રહ્યું છે',
    labelEn: 'Opening Task Planner'
  }
];

export function parseVoiceCommand(rawTranscript: string): ParsedVoiceCommand {
  const text = rawTranscript.trim().toLowerCase();

  // 1. Check for Billing / New Sale trigger
  const newSaleTriggers = [
    'નવું બિલ', 'નવુ બિલ', 'બિલ બનાવો', 'બિલિંગ', 'કાઉન્ટર બિલ', 'સેલ બિલ', 
    'new bill', 'create bill', 'add sale', 'billing', 'sale invoice'
  ];
  if (newSaleTriggers.some(t => text.includes(t))) {
    return {
      intent: 'OPEN_NEW_SALE',
      spokenText: rawTranscript,
      feedbackGujarati: 'નવું સેલ્સ બિલિંગ કાઉન્ટર ખુલી રહ્યું છે',
      feedbackEnglish: 'Opening New Sales Billing counter'
    };
  }

  // 2. Check for New Purchase trigger
  const newPurchaseTriggers = [
    'નવી ખરીદી', 'ખરીદી બિલ', 'માલ ખરીદી બિલ', 'new purchase', 'add purchase'
  ];
  if (newPurchaseTriggers.some(t => text.includes(t))) {
    return {
      intent: 'OPEN_NEW_PURCHASE',
      spokenText: rawTranscript,
      feedbackGujarati: 'નવું ખરીદી બિલ ખુલી રહ્યું છે',
      feedbackEnglish: 'Opening New Purchase form'
    };
  }

  // 3. Check for New Expense trigger
  const newExpenseTriggers = [
    'નવો ખર્ચ', 'ખર્ચ ઉમેરો', 'ફેક્ટરી ખર્ચ લખો', 'new expense', 'add expense'
  ];
  if (newExpenseTriggers.some(t => text.includes(t))) {
    return {
      intent: 'OPEN_NEW_EXPENSE',
      spokenText: rawTranscript,
      feedbackGujarati: 'નવો ખર્ચ એન્ટ્રી ફોર્મ ખુલી રહ્યું છે',
      feedbackEnglish: 'Opening New Expense entry'
    };
  }

  // 4. Check for Payment In / Jama Receipt
  const paymentInTriggers = [
    'જમા પાવતી', 'ઉઘરાણી જમા', 'રૂપિયા જમા', 'payment in', 'receipt'
  ];
  if (paymentInTriggers.some(t => text.includes(t))) {
    return {
      intent: 'OPEN_PAYMENT_IN',
      spokenText: rawTranscript,
      feedbackGujarati: 'જમા પાવતી (Payment In) ખુલી રહ્યું છે',
      feedbackEnglish: 'Opening Payment In receipt'
    };
  }

  // 5. Check for Payment Out / Kharch Chookavni
  const paymentOutTriggers = [
    'ચૂકવણી પાવતી', 'વેપારી ચૂકવણી', 'payment out'
  ];
  if (paymentOutTriggers.some(t => text.includes(t))) {
    return {
      intent: 'OPEN_PAYMENT_OUT',
      spokenText: rawTranscript,
      feedbackGujarati: 'ચૂકવણી પાવતી (Payment Out) ખુલી રહ્યું છે',
      feedbackEnglish: 'Opening Payment Out voucher'
    };
  }

  // 6. Check for WhatsApp Gateway
  const waTriggers = ['વોટ્સએપ', 'વોટ્સએપ ગેટવે', 'whatsapp', 'wa connect'];
  if (waTriggers.some(t => text === t || text.startsWith('વોટ્સએપ'))) {
    return {
      intent: 'OPEN_WHATSAPP',
      spokenText: rawTranscript,
      feedbackGujarati: 'વોટ્સએપ બોટ કનેક્શન સ્ટેટસ ખોલી રહ્યું છે',
      feedbackEnglish: 'Opening WhatsApp Gateway status'
    };
  }

  // 7. Check direct navigation keywords
  for (const nav of NAVIGATION_KEYWORDS) {
    if (nav.patterns.some(p => text.includes(p))) {
      return {
        intent: 'NAVIGATE',
        targetView: nav.view,
        spokenText: rawTranscript,
        feedbackGujarati: nav.labelGu,
        feedbackEnglish: nav.labelEn
      };
    }
  }

  // 8. Search query detection ("શોધો [નામ]" or "Search [name]" or direct sweet name)
  let cleanQuery = rawTranscript;
  const searchPrefixes = ['શોધો', 'સર્ચ', 'ગોતો', 'search for', 'search', 'find'];
  for (const p of searchPrefixes) {
    if (cleanQuery.toLowerCase().startsWith(p)) {
      cleanQuery = cleanQuery.slice(p.length).trim();
      break;
    }
  }

  // Default to Global Search for the spoken term (e.g. "ગુલાબ જાંબુ", "કાજુ કતરી", "રમેશભાઈ")
  return {
    intent: 'GLOBAL_SEARCH',
    searchQuery: cleanQuery || rawTranscript,
    spokenText: rawTranscript,
    feedbackGujarati: `શોધી રહ્યું છે: "${cleanQuery || rawTranscript}"`,
    feedbackEnglish: `Searching for: "${cleanQuery || rawTranscript}"`
  };
}
