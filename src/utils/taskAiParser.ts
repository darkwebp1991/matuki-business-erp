// AI Natural Language Task & Intent Parser for Matuki Business ERP
// Supports English, Gujarati, Hindi, and Gujlish phrasing

export interface ParsedTaskIntent {
  cleanTitle: string;
  category: 'Wholesale' | 'Kitchen' | 'Delivery' | 'Payment' | 'Inventory' | 'General';
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
  dueDate: string;
  dueTime: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isRecurring: boolean;
  recurringFrequency: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  detectedKeywords: string[];
}

export function parseTaskIntent(rawInput: string): ParsedTaskIntent {
  if (!rawInput || !rawInput.trim()) {
    const today = new Date().toISOString().split('T')[0];
    return {
      cleanTitle: '',
      category: 'General',
      categoryLabel: 'General / Personal',
      categoryIcon: '📝',
      categoryColor: '#64748b',
      dueDate: today,
      dueTime: '',
      priority: 'MEDIUM',
      isRecurring: false,
      recurringFrequency: 'NONE',
      detectedKeywords: []
    };
  }

  const text = rawInput.trim();
  const lower = text.toLowerCase();
  const detectedKeywords: string[] = [];

  // ==========================================
  // 1. OPERATION CATEGORY DETECTION (AI RULESET)
  // ==========================================
  let category: 'Wholesale' | 'Kitchen' | 'Delivery' | 'Payment' | 'Inventory' | 'General' = 'General';

  // Payment & Bank / Cash Rules
  const paymentKeywords = [
    'payment', 'paisa', 'pay', 'chukavva', 'rokad', 'cash', 'bank', 'cheque', 'check',
    'rojmel', 'udhar', 'jama', 'lena', 'deva', 'khata', 'hisaab', 'hisab', 'bill',
    'light bill', 'baki', 'collection', 'transfer', 'gpay', 'phonepe', 'upi', 'rtgs', 'neft'
  ];
  // Wholesale & Caterers Rules
  const wholesaleKeywords = [
    'caterer', 'caterers', 'caterer payment', 'party', 'wholesale', 'booking', 'advance',
    'prasang', 'mandap', 'hall', 'party plot', 'varni', 'hiyan', 'amreli krishna', 'shree nathji',
    'hulaboo', 'charu', 'baccha party', 'order confirm', 'sample'
  ];
  // Delivery & Drivers Rules
  const deliveryKeywords = [
    'parcel', 'delivery', 'driver', 'rickshaw', 'rikshaw', 'auto', 'van', 'tempo',
    'moklavva', 'ravana', 'slot', 'dispatch', 'vasan return', 'chhas parcel', 'tiffin',
    'mumbai go', 'transport', 'drop', 'pickup', 'pick up'
  ];
  // Kitchen & Sweet Production Rules
  const kitchenKeywords = [
    'sweet', 'mithai', 'kitchen', 'production', 'karigar', 'chef', 'batch', 'chashni',
    'kadai', 'kadhai', 'bhatthi', 'rasgulla', 'kaju', 'katli', 'mohanthal', 'penda',
    'barfi', 'halwa', 'ghari', 'farshan', 'namkeen', 'banavva', 'fry', 'boil', 'bake'
  ];
  // Inventory & Raw Materials Rules
  const inventoryKeywords = [
    'stock', 'ghee', 'mawa', 'khoya', 'sugar', 'khand', 'dudh', 'milk', 'dryfruit',
    'badam', 'pista', 'box', 'packaging', 'dabba', 'tray', 'plastic', 'raw material',
    'purchase', 'kharid', 'mal', 'container', 'supplier'
  ];

  if (paymentKeywords.some(k => lower.includes(k))) {
    category = 'Payment';
    paymentKeywords.forEach(k => { if (lower.includes(k)) detectedKeywords.push(k); });
  } else if (deliveryKeywords.some(k => lower.includes(k))) {
    category = 'Delivery';
    deliveryKeywords.forEach(k => { if (lower.includes(k)) detectedKeywords.push(k); });
  } else if (wholesaleKeywords.some(k => lower.includes(k))) {
    category = 'Wholesale';
    wholesaleKeywords.forEach(k => { if (lower.includes(k)) detectedKeywords.push(k); });
  } else if (kitchenKeywords.some(k => lower.includes(k))) {
    category = 'Kitchen';
    kitchenKeywords.forEach(k => { if (lower.includes(k)) detectedKeywords.push(k); });
  } else if (inventoryKeywords.some(k => lower.includes(k))) {
    category = 'Inventory';
    inventoryKeywords.forEach(k => { if (lower.includes(k)) detectedKeywords.push(k); });
  }

  // ==========================================
  // 2. TIME EXTRACTION (e.g. 4pm, 11:30 am, 12pm)
  // ==========================================
  let dueTime = '';
  // Pattern 1: e.g. "4:30 pm", "11:00am", "4pm", "12 pm", "8am"
  const timeRegex1 = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
  const match1 = text.match(timeRegex1);
  if (match1) {
    let hours = parseInt(match1[1], 10);
    const minutes = match1[2] ? match1[2].padStart(2, '0') : '00';
    const ampm = match1[3].toUpperCase();
    if (hours > 12) hours = hours % 12;
    dueTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    detectedKeywords.push(match1[0]);
  } else {
    // Pattern 2: "at 4", "at 12", "at 5:30"
    const timeRegex2 = /\bat\s+(\d{1,2})(?::(\d{2}))?\b/i;
    const match2 = text.match(timeRegex2);
    if (match2) {
      let hours = parseInt(match2[1], 10);
      const minutes = match2[2] ? match2[2].padStart(2, '0') : '00';
      const ampm = (hours >= 1 && hours <= 7) || hours === 12 ? 'PM' : (hours >= 8 && hours <= 11) ? 'AM' : 'PM';
      dueTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      detectedKeywords.push(match2[0]);
    } else {
      // Pattern 3: Gujlish time e.g. "4 vagye", "11 vage", "sakale 10", "sanji 6"
      const timeRegex3 = /(\d{1,2})\s*(?:vagye|vage|baje)/i;
      const match3 = text.match(timeRegex3);
      if (match3) {
        let hours = parseInt(match3[1], 10);
        const ampm = (hours >= 1 && hours <= 7) || lower.includes('sanji') || lower.includes('bapore') ? 'PM' : 'AM';
        dueTime = `${String(hours).padStart(2, '0')}:00 ${ampm}`;
        detectedKeywords.push(match3[0]);
      }
    }
  }

  // ==========================================
  // 3. DATE EXTRACTION (today, tomorrow, next week)
  // ==========================================
  let dueDate = new Date().toISOString().split('T')[0];
  if (lower.includes('tomorrow') || lower.includes('kaal') || lower.includes('kal') || lower.includes('aavti kale')) {
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    dueDate = tm.toISOString().split('T')[0];
    detectedKeywords.push('tomorrow');
  } else if (lower.includes('parso') || lower.includes('day after tomorrow')) {
    const ps = new Date();
    ps.setDate(ps.getDate() + 2);
    dueDate = ps.toISOString().split('T')[0];
    detectedKeywords.push('parso');
  } else if (lower.includes('next week') || lower.includes('aavta athvadiye')) {
    const nw = new Date();
    nw.setDate(nw.getDate() + 7);
    dueDate = nw.toISOString().split('T')[0];
    detectedKeywords.push('next week');
  }

  // ==========================================
  // 4. PRIORITY DETECTION (urgent, imp, jaldi)
  // ==========================================
  let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (
    lower.includes('urgent') || lower.includes('imp') || lower.includes('important') ||
    lower.includes('jaldi') || lower.includes('strict') || lower.includes('pehle') ||
    lower.includes('pela') || lower.includes('do first')
  ) {
    priority = 'HIGH';
    detectedKeywords.push('urgent');
  } else if (lower.includes('low priority') || lower.includes('aaram thi') || lower.includes('fursat')) {
    priority = 'LOW';
  }

  // ==========================================
  // 5. RECURRING RULES DETECTION (daily, weekly)
  // ==========================================
  let isRecurring = false;
  let recurringFrequency: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'NONE';
  if (lower.includes('daily') || lower.includes('every day') || lower.includes('roj') || lower.includes('darroj')) {
    isRecurring = true;
    recurringFrequency = 'DAILY';
    detectedKeywords.push('daily');
  } else if (lower.includes('weekly') || lower.includes('every week') || lower.includes('dar athvadiye')) {
    isRecurring = true;
    recurringFrequency = 'WEEKLY';
    detectedKeywords.push('weekly');
  } else if (lower.includes('monthly') || lower.includes('every month') || lower.includes('dar mahine')) {
    isRecurring = true;
    recurringFrequency = 'MONTHLY';
    detectedKeywords.push('monthly');
  }

  // Metadata mappings
  const categoryMeta = {
    Wholesale: { label: 'Wholesale & Caterers', icon: '🏢', color: '#2563eb' },
    Kitchen: { label: 'Kitchen & Production', icon: '🥣', color: '#d97706' },
    Delivery: { label: 'Delivery & Drivers', icon: '🛺', color: '#059669' },
    Payment: { label: 'Cash, Bank & Rojmel', icon: '💰', color: '#7c3aed' },
    Inventory: { label: 'Raw Materials & Stock', icon: '📦', color: '#db2777' },
    General: { label: 'General / Personal', icon: '📝', color: '#64748b' }
  }[category];

  return {
    cleanTitle: text,
    category,
    categoryLabel: categoryMeta.label,
    categoryIcon: categoryMeta.icon,
    categoryColor: categoryMeta.color,
    dueDate,
    dueTime,
    priority,
    isRecurring,
    recurringFrequency,
    detectedKeywords
  };
}
